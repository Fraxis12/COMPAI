"""
Schemas Pydantic para Usuario: validación de entrada y respuesta.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UsuarioBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=150, description="Nombre completo del usuario")
    correo: EmailStr = Field(..., description="Correo electrónico único")
    preferencias: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Diccionario libre de preferencias: tema, idioma, notificaciones, etc."
    )


class UsuarioCrear(UsuarioBase):
    pass


class UsuarioActualizar(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=150)
    correo: Optional[EmailStr] = None
    preferencias: Optional[Dict[str, Any]] = None


class UsuarioRespuesta(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    creado_en: datetime
