from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.documento_academico import EstadoDocumento


class TareaExtraida(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=200)
    descripcion: str = Field(default="", max_length=1000)
    fecha_entrega_texto: str = Field(default="", max_length=100)


class CursoExtraido(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=150)
    profesor: str = Field(default="", max_length=150)
    descripcion: str = Field(default="", max_length=1000)
    tareas: list[TareaExtraida] = Field(default_factory=list, max_length=20)


class AnalisisDocumentoAcademico(BaseModel):
    cursos: list[CursoExtraido] = Field(default_factory=list, max_length=10)


class DocumentoAcademicoRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre_archivo: str
    estado: EstadoDocumento
    error_mensaje: Optional[str] = None
    cursos_creados: int
    creado_en: datetime
