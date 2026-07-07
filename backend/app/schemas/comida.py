"""
Schemas Pydantic para Comida (registro de ingesta).
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ComidaBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=200)
    calorias: float = Field(..., ge=0, description="Calorías totales (kcal)")
    proteinas: float = Field(0.0, ge=0, description="Proteínas en gramos")
    carbohidratos: float = Field(0.0, ge=0, description="Carbohidratos en gramos")
    grasas: float = Field(0.0, ge=0, description="Grasas en gramos")
    fecha: datetime


class ComidaCrear(ComidaBase):
    usuario_id: int = Field(..., gt=0)


class ComidaActualizar(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=200)
    calorias: Optional[float] = Field(None, ge=0)
    proteinas: Optional[float] = Field(None, ge=0)
    carbohidratos: Optional[float] = Field(None, ge=0)
    grasas: Optional[float] = Field(None, ge=0)
    fecha: Optional[datetime] = None


class ComidaRespuesta(ComidaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
