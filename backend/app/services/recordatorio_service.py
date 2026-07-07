"""
Lógica de negocio para Recordatorios.
"""
import logging
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.models.recordatorio import Recordatorio, TipoRecordatorio
from app.models.usuario import Usuario
from app.schemas.recordatorio import RecordatorioCrear, RecordatorioActualizar

logger = logging.getLogger(__name__)


def _verificar_usuario(db: Session, usuario_id: int) -> None:
    if not db.query(Usuario).filter(Usuario.id == usuario_id).first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario {usuario_id} no encontrado",
        )


def crear_recordatorio(db: Session, datos: RecordatorioCrear) -> Recordatorio:
    _verificar_usuario(db, datos.usuario_id)
    recordatorio = Recordatorio(**datos.model_dump())
    db.add(recordatorio)
    try:
        db.commit()
        db.refresh(recordatorio)
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error de integridad al crear recordatorio: {e}")
        raise HTTPException(status_code=409, detail="El recordatorio ya existe")
    except Exception as e:
        db.rollback()
        logger.error(f"Error al crear recordatorio: {e}")
        raise HTTPException(status_code=500, detail="Error al crear recordatorio")
    return recordatorio


def obtener_recordatorios(db: Session, skip: int = 0, limit: int = 100) -> List[Recordatorio]:
    return db.query(Recordatorio).offset(skip).limit(limit).all()


def obtener_recordatorio(db: Session, recordatorio_id: int) -> Recordatorio:
    rec = db.query(Recordatorio).filter(Recordatorio.id == recordatorio_id).first()
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recordatorio {recordatorio_id} no encontrado",
        )
    return rec


def actualizar_recordatorio(db: Session, recordatorio_id: int, datos: RecordatorioActualizar) -> Recordatorio:
    rec = obtener_recordatorio(db, recordatorio_id)
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(rec, campo, valor)
    try:
        db.commit()
        db.refresh(rec)
    except Exception as e:
        db.rollback()
        logger.error(f"Error al actualizar recordatorio: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar recordatorio")
    return rec


def eliminar_recordatorio(db: Session, recordatorio_id: int) -> None:
    rec = obtener_recordatorio(db, recordatorio_id)
    db.delete(rec)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error al eliminar recordatorio: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar recordatorio")


def consultar_recordatorios(
    db: Session,
    usuario_id: Optional[int] = None,
    tipo: Optional[TipoRecordatorio] = None,
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
) -> List[Recordatorio]:
    """Consulta recordatorios con filtros opcionales."""
    filtros = []
    if usuario_id:
        _verificar_usuario(db, usuario_id)
        filtros.append(Recordatorio.usuario_id == usuario_id)
    if tipo:
        filtros.append(Recordatorio.tipo == tipo)
    if desde:
        filtros.append(Recordatorio.fecha_hora >= desde)
    if hasta:
        filtros.append(Recordatorio.fecha_hora <= hasta)
    query = db.query(Recordatorio)
    if filtros:
        query = query.filter(and_(*filtros))
    return query.order_by(Recordatorio.fecha_hora.asc()).all()


def marcar_como_enviado(db: Session, recordatorio_id: int) -> Recordatorio:
    """Simula el envío del recordatorio marcándolo como enviado."""
    rec = obtener_recordatorio(db, recordatorio_id)
    rec.enviado = True
    try:
        db.commit()
        db.refresh(rec)
    except Exception as e:
        db.rollback()
        logger.error(f"Error al marcar recordatorio como enviado: {e}")
        raise HTTPException(status_code=500, detail="Error al marcar recordatorio como enviado")
    return rec
