"""
Schemas Pydantic para Rutina de Bienestar.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class RutinaBienestarBase(BaseModel):
    actividad: str = Field(..., min_length=1, max_length=200)
    duracion_minutos: int = Field(..., gt=0, le=1440, description="Duración en minutos (máx 24h)")
    fecha: datetime


class RutinaBienestarCrear(RutinaBienestarBase):
    usuario_id: int = Field(..., gt=0)


class RutinaBienestarActualizar(BaseModel):
    actividad: Optional[str] = Field(None, min_length=1, max_length=200)
    duracion_minutos: Optional[int] = Field(None, gt=0, le=1440)
    fecha: Optional[datetime] = None


class RutinaBienestarRespuesta(RutinaBienestarBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
