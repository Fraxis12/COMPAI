from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SnapshotMetric(BaseModel):
    tipo_sensor: str = Field(..., min_length=1, max_length=50)
    valor: float
    unidad: str = Field(..., max_length=20)


class SensorSnapshotCreate(BaseModel):
    # El equipo real tiene 3 sensores (MPU6050, CCS811, DHT11); alguno puede
    # faltar en una lectura puntual si aun no responde, por eso el minimo es 1.
    lecturas: list[SnapshotMetric] = Field(..., min_length=1, max_length=3)


class SensorSnapshotResponse(SensorSnapshotCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
    creado_en: datetime

