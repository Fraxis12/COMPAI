"""
Schemas para autenticación de usuarios finales.
"""
from pydantic import BaseModel, EmailStr, Field

from app.schemas.usuario import UsuarioRespuesta


class RegistroUsuario(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=150)
    correo: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginUsuario(BaseModel):
    correo: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class SolicitudRecuperacionPassword(BaseModel):
    correo: EmailStr


class RestablecerPassword(BaseModel):
    correo: EmailStr
    codigo: str = Field(..., min_length=4, max_length=12)
    nueva_password: str = Field(..., min_length=8, max_length=128)


class MensajeRespuesta(BaseModel):
    message: str


class AuthRespuesta(BaseModel):
    user: UsuarioRespuesta
    token: str
    token_type: str = "bearer"
