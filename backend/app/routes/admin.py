import hmac
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_admin_token, get_current_admin, verify_password
from app.models.comida import Comida
from app.models.curso import Curso
from app.models.dispositivo_vinculo import DispositivoVinculo
from app.models.reporte import Reporte
from app.models.rutina_bienestar import RutinaBienestar
from app.models.sensor_data import SensorData
from app.models.tarea import EstadoTarea, Tarea
from app.models.usuario import Usuario
from app.schemas.admin import (
    AdminDashboardResponse,
    AdminDispositivo,
    AdminLoginRequest,
    AdminLoginResponse,
    AdminRegistroDia,
    AdminReporte,
    AdminReporteUpdate,
    AdminUserDetail,
    AdminUserSummary,
)

DISPOSITIVO_EN_LINEA_MINUTOS = 5

router = APIRouter(prefix="/admin", tags=["Administración"])


def _usage_status(last_access: datetime | None) -> str:
    if last_access is None:
        return "sin_actividad"
    value = last_access if last_access.tzinfo else last_access.replace(tzinfo=timezone.utc)
    age = datetime.now(timezone.utc) - value
    if age <= timedelta(days=7):
        return "activo"
    if age <= timedelta(days=30):
        return "uso_bajo"
    return "sin_actividad"


def _summary(user: Usuario) -> AdminUserSummary:
    return AdminUserSummary(
        id=user.id,
        nombre=user.nombre,
        correo=user.correo,
        estado="activo" if user.activo else "inactivo",
        estadoUso=_usage_status(user.ultimo_acceso),
        ultimaConexion=user.ultimo_acceso,
        creadoEn=user.creado_en,
    )


@router.post("/login", response_model=AdminLoginResponse)
def admin_login(data: AdminLoginRequest):
    if not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD_HASH:
        raise HTTPException(status_code=503, detail="Acceso administrativo no configurado")
    valid_email = hmac.compare_digest(data.email.lower(), settings.ADMIN_EMAIL.lower())
    valid_password = verify_password(data.password, settings.ADMIN_PASSWORD_HASH)
    if not valid_email or not valid_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")
    return AdminLoginResponse(token=create_admin_token())


@router.get("/dashboard", response_model=AdminDashboardResponse)
def dashboard(
    estado: str = Query("todos", pattern="^(todos|activo|inactivo)$"),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    users_query = db.query(Usuario)
    if estado == "activo":
        users_query = users_query.filter(Usuario.activo.is_(True))
    elif estado == "inactivo":
        users_query = users_query.filter(Usuario.activo.is_(False))
    users = users_query.order_by(Usuario.ultimo_acceso.desc().nullslast(), Usuario.creado_en.desc()).limit(250).all()

    total_users = db.query(func.count(Usuario.id)).scalar() or 0
    active_users = db.query(func.count(Usuario.id)).filter(Usuario.activo.is_(True)).scalar() or 0
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_users = db.query(func.count(Usuario.id)).filter(Usuario.activo.is_(True), Usuario.ultimo_acceso >= seven_days_ago).scalar() or 0
    reports = db.query(func.count(Reporte.id)).scalar() or 0
    pending_reports = db.query(func.count(Reporte.id)).filter(Reporte.estado == "pendiente").scalar() or 0
    latest_access = db.query(func.max(Usuario.ultimo_acceso)).scalar()
    inactive_usage = db.query(func.count(Usuario.id)).filter((Usuario.ultimo_acceso.is_(None)) | (Usuario.ultimo_acceso < datetime.now(timezone.utc) - timedelta(days=30))).scalar() or 0

    # Dispositivos IoT vinculados: cuales estan mandando datos recientes (en linea).
    vinculos = db.query(DispositivoVinculo).order_by(DispositivoVinculo.vinculado_en.desc()).all()
    en_linea_desde = datetime.now(timezone.utc) - timedelta(minutes=DISPOSITIVO_EN_LINEA_MINUTOS)
    dispositivos: list[dict] = []
    dispositivos_en_linea = 0
    for vinculo in vinculos:
        usuario_dispositivo = db.query(Usuario).filter(Usuario.id == vinculo.usuario_id).first()
        # dispositivo_id en SensorData es solo una etiqueta generica del tipo de
        # hardware (no un identificador unico por equipo): la lectura mas
        # reciente relevante es la del usuario al que esta vinculado ahora.
        ultima_lectura = (
            db.query(func.max(SensorData.timestamp))
            .filter(SensorData.usuario_id == vinculo.usuario_id)
            .scalar()
        )
        lectura_valor = None
        if ultima_lectura is not None:
            lectura_valor = ultima_lectura if ultima_lectura.tzinfo else ultima_lectura.replace(tzinfo=timezone.utc)
        en_linea = bool(lectura_valor and lectura_valor >= en_linea_desde)
        if en_linea:
            dispositivos_en_linea += 1
        dispositivos.append({
            "apiKey": vinculo.api_key,
            "usuarioId": vinculo.usuario_id,
            "usuarioNombre": usuario_dispositivo.nombre if usuario_dispositivo else "Usuario eliminado",
            "vinculadoEn": vinculo.vinculado_en,
            "ultimaLectura": ultima_lectura,
            "enLinea": en_linea,
        })

    # Registros de usuarios nuevos por dia, ultimos 14 dias (para la grafica de crecimiento).
    catorce_dias_atras = datetime.now(timezone.utc) - timedelta(days=14)
    registros_raw = (
        db.query(func.date(Usuario.creado_en).label("fecha"), func.count(Usuario.id).label("cantidad"))
        .filter(Usuario.creado_en >= catorce_dias_atras)
        .group_by(func.date(Usuario.creado_en))
        .all()
    )
    registros_por_fecha = {str(fecha): cantidad for fecha, cantidad in registros_raw}
    registros_por_dia = []
    for offset in range(13, -1, -1):
        dia = (datetime.now(timezone.utc) - timedelta(days=offset)).date()
        registros_por_dia.append({"fecha": str(dia), "cantidad": registros_por_fecha.get(str(dia), 0)})

    alerts = []
    if pending_reports:
        alerts.append({"level": "warning", "title": "Reportes pendientes", "message": f"Hay {pending_reports} reportes por revisar."})
    if inactive_usage:
        alerts.append({"level": "info", "title": "Usuarios sin actividad", "message": f"{inactive_usage} usuarios no registran actividad reciente."})
    if vinculos and dispositivos_en_linea == 0:
        alerts.append({"level": "warning", "title": "Sin dispositivos en línea", "message": "Ningún equipo IoT vinculado está enviando datos ahora mismo."})
    if not alerts:
        alerts.append({"level": "info", "title": "Operación estable", "message": "No hay alertas importantes en este momento."})

    return {
        "totalUsuarios": total_users,
        "usuariosActivos": active_users,
        "activosUltimos7Dias": recent_users,
        "reportesEnviados": reports,
        "reportesPendientes": pending_reports,
        "totalTareas": db.query(func.count(Tarea.id)).scalar() or 0,
        "totalComidas": db.query(func.count(Comida.id)).scalar() or 0,
        "totalRutinas": db.query(func.count(RutinaBienestar.id)).scalar() or 0,
        "totalLecturasSensores": db.query(func.count(SensorData.id)).scalar() or 0,
        "ultimaConexion": latest_access,
        "alertas": alerts,
        "usuarios": [_summary(user) for user in users],
        "registrosPorDia": registros_por_dia,
        "dispositivos": dispositivos,
        "dispositivosEnLinea": dispositivos_en_linea,
    }


@router.get("/users/{user_id}", response_model=AdminUserDetail)
def user_detail(user_id: int, db: Session = Depends(get_db), _: dict = Depends(get_current_admin)):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    base = _summary(user).model_dump()
    return {
        **base,
        "cursos": db.query(func.count(Curso.id)).filter(Curso.usuario_id == user_id).scalar() or 0,
        "tareas": db.query(func.count(Tarea.id)).filter(Tarea.usuario_id == user_id).scalar() or 0,
        "tareasCompletadas": db.query(func.count(Tarea.id)).filter(Tarea.usuario_id == user_id, Tarea.estado == EstadoTarea.completada).scalar() or 0,
        "comidasRegistradas": db.query(func.count(Comida.id)).filter(Comida.usuario_id == user_id).scalar() or 0,
        "rutinasRegistradas": db.query(func.count(RutinaBienestar.id)).filter(RutinaBienestar.usuario_id == user_id).scalar() or 0,
        "reportesEnviados": db.query(func.count(Reporte.id)).filter(Reporte.usuario_id == user_id).scalar() or 0,
    }


@router.get("/reportes", response_model=list[AdminReporte])
def listar_reportes(
    estado: str = Query("todos", pattern="^(todos|pendiente|en_revision|resuelto)$"),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    query = db.query(Reporte).join(Usuario, Usuario.id == Reporte.usuario_id)
    if estado != "todos":
        query = query.filter(Reporte.estado == estado)
    reportes = query.order_by(Reporte.creado_en.desc()).limit(200).all()
    return [
        AdminReporte(
            id=reporte.id,
            usuarioId=reporte.usuario_id,
            usuarioNombre=reporte.usuario.nombre if reporte.usuario else "Usuario eliminado",
            categoria=reporte.categoria,
            descripcion=reporte.descripcion,
            estado=reporte.estado,
            creadoEn=reporte.creado_en,
        )
        for reporte in reportes
    ]


@router.patch("/reportes/{reporte_id}", response_model=AdminReporte)
def actualizar_reporte(
    reporte_id: int,
    datos: AdminReporteUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    reporte = db.query(Reporte).filter(Reporte.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    reporte.estado = datos.estado
    db.commit()
    db.refresh(reporte)
    return AdminReporte(
        id=reporte.id,
        usuarioId=reporte.usuario_id,
        usuarioNombre=reporte.usuario.nombre if reporte.usuario else "Usuario eliminado",
        categoria=reporte.categoria,
        descripcion=reporte.descripcion,
        estado=reporte.estado,
        creadoEn=reporte.creado_en,
    )
