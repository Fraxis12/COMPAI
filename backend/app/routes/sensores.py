"""
Rutas REST y WebSocket para sensores IoT.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import validate_api_key, resolver_usuario_por_api_key
from app.core.security import get_current_user
from app.core.websocket import manager
from app.schemas.sensor_data import SensorDataCrear, SensorDataActualizar, SensorDataRespuesta
from app.schemas.sensor_hardware import LecturaHardwareESP32
from app.schemas.dispositivo_vinculo import VincularDispositivoRequest, VincularDispositivoRespuesta
from app.schemas.usuario import UsuarioRespuesta
from app.services import sensor_data_service
from app.models.sensor_data import SensorData, TipoSensor
from app.models.usuario import Usuario
from app.models.dispositivo_vinculo import DispositivoVinculo

router = APIRouter(prefix="/sensores", tags=["Sensores IoT"])


@router.post("/data", response_model=SensorDataRespuesta, status_code=201)
async def recibir_datos_sensor(
    datos: SensorDataCrear,
    db: Session = Depends(get_db),
    usuario_id: int = Depends(validate_api_key),
):
    """
    Recibe lectura de sensor desde ESP32.

    Headers requeridos:
    - X-API-Key: API key del dispositivo

    Body esperado:
    ```json
    {
        "usuario_id": 1,
        "dispositivo_id": "esp32_living_room",
        "tipo_sensor": "MOVIMIENTO",
        "valor": 12.5,
        "unidad": "cm",
        "metadatos": {"ubicacion": "living room"}
    }
    ```
    """
    lectura = await sensor_data_service.crear_lectura_sensor(db, usuario_id, datos)
    return lectura


@router.post("/hardware/{api_key}", response_model=List[SensorDataRespuesta], status_code=201)
async def recibir_datos_hardware_esp32(
    api_key: str,
    datos: LecturaHardwareESP32,
    db: Session = Depends(get_db),
):
    """
    Recibe el payload combinado que ya envia el equipo ESP32
    (sensor/main.cpp -> construirJSON(), un solo JSON con los grupos
    mpu/aire/ambiente en vez de una lectura por request).

    El firmware no manda un header propio de autenticacion (solo
    Content-Type), por eso la API Key va en la URL. En sensor/main.cpp,
    configura:

        API_URL = "http://<IP_DEL_SERVIDOR>:8000/sensores/hardware/esp32_compa_sk_001"

    Body esperado (igual al que ya produce el firmware):
    ```json
    {
        "mpu": {"distancia_m": 0.125, "velocidad_m_s": 0.031, "accel_x": 120, ...},
        "aire": {"co2_ppm": 480, "tvoc_ppb": 12},
        "ambiente": {"temperatura_c": 24.3, "humedad_pct": 55.2},
        "timestamp_ms": 123456
    }
    ```
    Cada grupo es opcional: si un sensor no respondio en ese ciclo, el
    firmware simplemente omite su clave y aqui no se crea esa lectura.
    """
    usuario_id = resolver_usuario_por_api_key(api_key, db)
    lecturas = await sensor_data_service.crear_lecturas_desde_hardware(db, usuario_id, datos)
    if not lecturas:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El payload no contiene lecturas de ningun sensor (mpu/aire/ambiente vacios)",
        )
    return lecturas


@router.post("/vincular", response_model=VincularDispositivoRespuesta)
def vincular_dispositivo(
    payload: VincularDispositivoRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """
    La app llama esto automaticamente al abrir la pantalla de Sensores: el
    usuario logueado reclama el dispositivo para que, a partir de ahora, sus
    lecturas se guarden en su cuenta. No requiere ninguna accion manual del
    usuario, solo tener su equipo conectado.
    """
    from app.core.auth import VALID_API_KEYS

    if payload.api_key not in VALID_API_KEYS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispositivo no reconocido")

    vinculo = db.query(DispositivoVinculo).filter(DispositivoVinculo.api_key == payload.api_key).first()
    if vinculo:
        vinculo.usuario_id = usuario.id
    else:
        vinculo = DispositivoVinculo(api_key=payload.api_key, usuario_id=usuario.id)
        db.add(vinculo)
    db.commit()

    return VincularDispositivoRespuesta(vinculado=True, dispositivo=payload.api_key)


@router.post("/reiniciar-movimiento", response_model=UsuarioRespuesta)
def reiniciar_movimiento(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """
    El odometro de MOVIMIENTO vive en el firmware del ESP32 (no se puede
    resetear a distancia). En vez de eso, guardamos la lectura mas reciente
    como punto de referencia en las preferencias del usuario: la app le resta
    ese offset a las lecturas nuevas antes de mostrarlas, asi el usuario ve la
    metrica "en cero" sin perder ni una lectura real del historial.
    """
    ultima = (
        db.query(SensorData)
        .filter(SensorData.usuario_id == usuario.id, SensorData.tipo_sensor == TipoSensor.MOVIMIENTO)
        .order_by(SensorData.timestamp.desc())
        .first()
    )
    offset = ultima.valor if ultima else 0.0

    preferencias = dict(usuario.preferencias or {})
    preferencias["movimiento_offset"] = offset
    usuario.preferencias = preferencias
    db.commit()
    db.refresh(usuario)
    return usuario


@router.get("/", response_model=List[SensorDataRespuesta])
def listar_lecturas(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Lista todas las lecturas del usuario autenticado."""
    return sensor_data_service.obtener_lecturas(db, usuario.id, skip, limit)


@router.get("/lectura/{lectura_id}", response_model=SensorDataRespuesta)
def obtener_lectura_por_id(
    lectura_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Obtiene una lectura específica (solo si pertenece al usuario)."""
    lectura = sensor_data_service.obtener_lectura(db, lectura_id)
    if lectura.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    return lectura


@router.get("/recientes/historial", response_model=List[SensorDataRespuesta])
def obtener_historial_reciente(
    minutos: int = 60,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Obtiene lecturas de los últimos N minutos."""
    return sensor_data_service.obtener_lecturas_recientes(db, usuario.id, minutos)


@router.get("/por-tipo/{tipo_sensor}", response_model=List[SensorDataRespuesta])
def obtener_lecturas_sensor(
    tipo_sensor: TipoSensor,
    horas: int = 24,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Obtiene lecturas de un tipo de sensor en las últimas N horas."""
    return sensor_data_service.obtener_lecturas_por_tipo(db, usuario.id, tipo_sensor, horas)


@router.get("/estadisticas/{tipo_sensor}")
def obtener_estadisticas_sensor(
    tipo_sensor: TipoSensor,
    horas: int = 24,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Retorna promedio, mín, máx de lecturas de un sensor."""
    return sensor_data_service.obtener_estadisticas(db, usuario.id, tipo_sensor, horas)


@router.put("/{lectura_id}", response_model=SensorDataRespuesta)
def actualizar_lectura(
    lectura_id: int,
    datos: SensorDataActualizar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Actualiza una lectura (solo si pertenece al usuario)."""
    lectura = sensor_data_service.obtener_lectura(db, lectura_id)
    if lectura.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    return sensor_data_service.actualizar_lectura(db, lectura_id, datos)


@router.delete("/{lectura_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_lectura(
    lectura_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Elimina una lectura (solo si pertenece al usuario)."""
    lectura = sensor_data_service.obtener_lectura(db, lectura_id)
    if lectura.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    sensor_data_service.eliminar_lectura(db, lectura_id)


@router.websocket("/ws/{usuario_id}")
async def websocket_endpoint(websocket: WebSocket, usuario_id: int, db: Session = Depends(get_db)):
    """
    WebSocket para dashboard en vivo de sensores (seguro).

    Conexión:
    - URL: ws://localhost:8000/sensores/ws/1
    - Header: Authorization: Bearer esp32_compa_sk_001
    """
    # Validar Authorization header
    auth_header = websocket.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing Authorization header")
        return

    api_key = auth_header.replace("Bearer ", "")
    try:
        usuario_actual = resolver_usuario_por_api_key(api_key, db)
    except HTTPException:
        usuario_actual = None
    if usuario_actual != usuario_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized")
        return

    await manager.connect(usuario_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        pass
    finally:
        await manager.disconnect(usuario_id, websocket)
