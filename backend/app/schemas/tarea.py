"""
Schemas Pydantic para Tarea.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.tarea import EstadoTarea, PrioridadTarea


class TareaBase(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=200)
    descripcion: Optional[str] = Field(None, max_length=2000)
    fecha_limite: Optional[datetime] = None
    estimacion_minutos: int = Field(25, gt=0, le=480)
    estado: EstadoTarea = EstadoTarea.pendiente
    prioridad: PrioridadTarea = PrioridadTarea.media
    curso_id: Optional[int] = Field(None, description="ID del curso asociado, si aplica")


class TareaCrear(TareaBase):
    usuario_id: int = Field(..., gt=0)


class TareaActualizar(BaseModel):
    titulo: Optional[str] = Field(None, min_length=1, max_length=200)
    descripcion: Optional[str] = Field(None, max_length=2000)
    fecha_limite: Optional[datetime] = None
    estimacion_minutos: Optional[int] = Field(None, gt=0, le=480)
    estado: Optional[EstadoTarea] = None
    prioridad: Optional[PrioridadTarea] = None
    curso_id: Optional[int] = None


class TareaRespuesta(TareaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
    completada_en: Optional[datetime] = None
