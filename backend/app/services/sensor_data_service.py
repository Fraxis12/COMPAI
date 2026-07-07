"""
Lógica de negocio para datos de sensores IoT.
"""
import logging
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.models.sensor_data import SensorData, TipoSensor
from app.models.usuario import Usuario
from app.schemas.sensor_data import SensorDataCrear, SensorDataActualizar
from app.schemas.sensor_hardware import LecturaHardwareESP32
from app.core.websocket import manager

logger = logging.getLogger(__name__)

DISPOSITIVO_HARDWARE_ESP32 = "esp32_sensores"


def _verificar_usuario(db: Session, usuario_id: int) -> None:
    if not db.query(Usuario).filter(Usuario.id == usuario_id).first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario {usuario_id} no encontrado",
        )


async def _notificar_lectura(usuario_id: int, lectura: SensorData) -> None:
    try:
        await manager.broadcast_to_user(usuario_id, {
            "tipo": "nueva_lectura",
            "sensor": lectura.tipo_sensor,
            "valor": lectura.valor,
            "unidad": lectura.unidad,
            "dispositivo_id": lectura.dispositivo_id,
            "timestamp": lectura.timestamp.isoformat(),
        })
    except Exception as e:
        logger.error(f"Error al broadcast WebSocket: {e}")


async def crear_lectura_sensor(db: Session, usuario_id: int, datos: SensorDataCrear) -> SensorData:
    """Crea lectura de sensor y notifica a WebSockets."""
    _verificar_usuario(db, usuario_id)
    lectura = SensorData(usuario_id=usuario_id, **datos.model_dump())
    db.add(lectura)
    try:
        db.commit()
        db.refresh(lectura)
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error de integridad al crear lectura: {e}")
        raise HTTPException(status_code=409, detail="La lectura ya existe")
    except Exception as e:
        db.rollback()
        logger.error(f"Error al crear lectura: {e}")
        raise HTTPException(status_code=500, detail="Error al crear lectura")

    await _notificar_lectura(usuario_id, lectura)
    return lectura


async def crear_lecturas_desde_hardware(
    db: Session, usuario_id: int, datos: LecturaHardwareESP32
) -> List[SensorData]:
    """
    Traduce el payload combinado que ya envia el firmware ESP32
    (sensor/main.cpp -> construirJSON(): grupos mpu/aire/ambiente) en una
    lectura por cada sensor que haya respondido en ese ciclo.
    """
    _verificar_usuario(db, usuario_id)
    lecturas: List[SensorData] = []

    if datos.mpu is not None and datos.mpu.distancia_m is not None:
        lecturas.append(SensorData(
            usuario_id=usuario_id, dispositivo_id=DISPOSITIVO_HARDWARE_ESP32,
            tipo_sensor=TipoSensor.MOVIMIENTO, valor=datos.mpu.distancia_m, unidad="m",
            metadatos=datos.mpu.model_dump(exclude={"distancia_m"}, exclude_none=True),
        ))

    if datos.aire is not None and datos.aire.co2_ppm is not None:
        lecturas.append(SensorData(
            usuario_id=usuario_id, dispositivo_id=DISPOSITIVO_HARDWARE_ESP32,
            tipo_sensor=TipoSensor.CALIDAD_AIRE, valor=datos.aire.co2_ppm, unidad="ppm",
            metadatos=datos.aire.model_dump(exclude={"co2_ppm"}, exclude_none=True),
        ))

    if datos.ambiente is not None and datos.ambiente.temperatura_c is not None:
        lecturas.append(SensorData(
            usuario_id=usuario_id, dispositivo_id=DISPOSITIVO_HARDWARE_ESP32,
            tipo_sensor=TipoSensor.AMBIENTE, valor=datos.ambiente.temperatura_c, unidad="°C",
            metadatos=datos.ambiente.model_dump(exclude={"temperatura_c"}, exclude_none=True),
        ))

    if not lecturas:
        return []

    db.add_all(lecturas)
    try:
        db.commit()
        for lectura in lecturas:
            db.refresh(lectura)
    except Exception as e:
        db.rollback()
        logger.error(f"Error al guardar lecturas de hardware: {e}")
        raise HTTPException(status_code=500, detail="Error al guardar lecturas de hardware")

    for lectura in lecturas:
        await _notificar_lectura(usuario_id, lectura)

    return lecturas


def obtener_lecturas(db: Session, usuario_id: int, skip: int = 0, limit: int = 100) -> List[SensorData]:
    return (
        db.query(SensorData)
        .filter(SensorData.usuario_id == usuario_id)
        .order_by(SensorData.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def obtener_lectura(db: Session, lectura_id: int) -> SensorData:
    lectura = db.query(SensorData).filter(SensorData.id == lectura_id).first()
    if not lectura:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lectura {lectura_id} no encontrada",
        )
    return lectura


def obtener_lecturas_recientes(
    db: Session,
    usuario_id: int,
    minutos: int = 60,
) -> List[SensorData]:
    """Obtiene lecturas de los últimos N minutos."""
    _verificar_usuario(db, usuario_id)
    tiempo_limite = datetime.utcnow() - timedelta(minutes=minutos)
    return (
        db.query(SensorData)
        .filter(
            and_(
                SensorData.usuario_id == usuario_id,
                SensorData.timestamp >= tiempo_limite,
            )
        )
        .order_by(SensorData.timestamp.desc())
        .all()
    )


def obtener_lecturas_por_tipo(
    db: Session,
    usuario_id: int,
    tipo_sensor: TipoSensor,
    horas: int = 24,
) -> List[SensorData]:
    """Obtiene lecturas de un tipo de sensor en las últimas N horas."""
    _verificar_usuario(db, usuario_id)
    tiempo_limite = datetime.utcnow() - timedelta(hours=horas)
    return (
        db.query(SensorData)
        .filter(
            and_(
                SensorData.usuario_id == usuario_id,
                SensorData.tipo_sensor == tipo_sensor,
                SensorData.timestamp >= tiempo_limite,
            )
        )
        .order_by(SensorData.timestamp.desc())
        .all()
    )


def obtener_estadisticas(
    db: Session,
    usuario_id: int,
    tipo_sensor: TipoSensor,
    horas: int = 24,
) -> dict:
    """Obtiene estadísticas de un sensor (promedio, mín, máx, count)."""
    _verificar_usuario(db, usuario_id)
    tiempo_limite = datetime.utcnow() - timedelta(hours=horas)

    query = (
        db.query(
            func.avg(SensorData.valor).label("promedio"),
            func.min(SensorData.valor).label("minimo"),
            func.max(SensorData.valor).label("maximo"),
            func.count(SensorData.id).label("count"),
        )
        .filter(
            and_(
                SensorData.usuario_id == usuario_id,
                SensorData.tipo_sensor == tipo_sensor,
                SensorData.timestamp >= tiempo_limite,
            )
        )
    )

    resultado = query.first()
    if resultado:
        return {
            "promedio": resultado.promedio or 0,
            "minimo": resultado.minimo or 0,
            "maximo": resultado.maximo or 0,
            "count": resultado.count or 0,
            "tipo_sensor": tipo_sensor,
            "horas": horas,
        }

    return {
        "promedio": 0,
        "minimo": 0,
        "maximo": 0,
        "count": 0,
        "tipo_sensor": tipo_sensor,
        "horas": horas,
    }


async def crear_lecturas_bulk(db: Session, usuario_id: int, datos_list: List[SensorDataCrear]) -> List[SensorData]:
    """Crea múltiples lecturas en una transacción."""
    _verificar_usuario(db, usuario_id)
    lecturas = []

    for datos in datos_list:
        lectura = SensorData(usuario_id=usuario_id, **datos.model_dump())
        db.add(lectura)
        lecturas.append(lectura)

    try:
        db.commit()
        for lectura in lecturas:
            db.refresh(lectura)
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error de integridad en bulk: {e}")
        raise HTTPException(status_code=409, detail="Error en integridad de datos")
    except Exception as e:
        db.rollback()
        logger.error(f"Error al crear lecturas bulk: {e}")
        raise HTTPException(status_code=500, detail="Error al crear lecturas")

    return lecturas


def actualizar_lectura(db: Session, lectura_id: int, datos: SensorDataActualizar) -> SensorData:
    lectura = obtener_lectura(db, lectura_id)
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(lectura, campo, valor)
    try:
        db.commit()
        db.refresh(lectura)
    except Exception as e:
        db.rollback()
        logger.error(f"Error al actualizar lectura: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar lectura")
    return lectura


def eliminar_lectura(db: Session, lectura_id: int) -> None:
    lectura = obtener_lectura(db, lectura_id)
    db.delete(lectura)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error al eliminar lectura: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar lectura")
