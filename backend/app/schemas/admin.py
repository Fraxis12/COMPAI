from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=200)


class AdminLoginResponse(BaseModel):
    token: str
    expiresIn: int = 28800


class AdminUserSummary(BaseModel):
    id: int
    nombre: str
    correo: str
    estado: Literal["activo", "inactivo"]
    estadoUso: Literal["activo", "uso_bajo", "sin_actividad"]
    ultimaConexion: datetime | None
    creadoEn: datetime


class AdminUserDetail(AdminUserSummary):
    cursos: int
    tareas: int
    tareasCompletadas: int
    comidasRegistradas: int
    rutinasRegistradas: int
    reportesEnviados: int


class AdminAlert(BaseModel):
    level: Literal["info", "warning", "critical"]
    title: str
    message: str


class AdminRegistroDia(BaseModel):
    fecha: str
    cantidad: int


class AdminDispositivo(BaseModel):
    apiKey: str
    usuarioId: int
    usuarioNombre: str
    vinculadoEn: datetime
    ultimaLectura: datetime | None
    enLinea: bool


class AdminDashboardResponse(BaseModel):
    totalUsuarios: int
    usuariosActivos: int
    activosUltimos7Dias: int
    reportesEnviados: int
    reportesPendientes: int
    totalTareas: int
    totalComidas: int
    totalRutinas: int
    totalLecturasSensores: int
    ultimaConexion: datetime | None
    alertas: list[AdminAlert]
    usuarios: list[AdminUserSummary]
    registrosPorDia: list[AdminRegistroDia]
    dispositivos: list[AdminDispositivo]
    dispositivosEnLinea: int


class AdminReporte(BaseModel):
    id: int
    usuarioId: int
    usuarioNombre: str
    categoria: str
    descripcion: str
    estado: str
    creadoEn: datetime


class AdminReporteUpdate(BaseModel):
    estado: Literal["pendiente", "en_revision", "resuelto"]
