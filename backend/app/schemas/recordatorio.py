"""
Schemas Pydantic para Recordatorio.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.recordatorio import TipoRecordatorio


class RecordatorioBase(BaseModel):
    tipo: TipoRecordatorio
    titulo: str = Field(..., min_length=1, max_length=200)
    fecha_hora: datetime


class RecordatorioCrear(RecordatorioBase):
    usuario_id: int = Field(..., gt=0)


class RecordatorioActualizar(BaseModel):
    tipo: Optional[TipoRecordatorio] = None
    titulo: Optional[str] = Field(None, min_length=1, max_length=200)
    fecha_hora: Optional[datetime] = None
    enviado: Optional[bool] = None


class RecordatorioRespuesta(RecordatorioBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
    enviado: bool
