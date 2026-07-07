"""
Schemas Pydantic para Plan Nutricional.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class PlanNutricionalBase(BaseModel):
    tipo_dieta: str = Field(..., min_length=1, max_length=100,
                            description="Tipo de dieta: vegana, keto, mediterránea, etc.")
    objetivos: Optional[str] = Field(None, max_length=1000)
    descripcion: Optional[str] = Field(None, max_length=2000)


class PlanNutricionalCrear(PlanNutricionalBase):
    usuario_id: int = Field(..., gt=0)


class PlanNutricionalActualizar(BaseModel):
    tipo_dieta: Optional[str] = Field(None, min_length=1, max_length=100)
    objetivos: Optional[str] = Field(None, max_length=1000)
    descripcion: Optional[str] = Field(None, max_length=2000)


class PlanNutricionalRespuesta(PlanNutricionalBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
    creado_en: datetime
