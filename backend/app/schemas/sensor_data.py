"""
Schemas Pydantic para datos de sensores IoT.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.models.sensor_data import TipoSensor


class SensorDataBase(BaseModel):
    dispositivo_id: str = Field(..., min_length=1, max_length=100)
    tipo_sensor: TipoSensor
    valor: float
    unidad: str = Field(..., min_length=1, max_length=20)
    metadatos: Optional[Dict[str, Any]] = Field(default_factory=dict)


class SensorDataCrear(SensorDataBase):
    pass


class SensorDataActualizar(BaseModel):
    dispositivo_id: Optional[str] = Field(None, min_length=1, max_length=100)
    tipo_sensor: Optional[TipoSensor] = None
    valor: Optional[float] = None
    unidad: Optional[str] = Field(None, min_length=1, max_length=20)
    metadatos: Optional[Dict[str, Any]] = None


class SensorDataRespuesta(SensorDataBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
    timestamp: datetime
