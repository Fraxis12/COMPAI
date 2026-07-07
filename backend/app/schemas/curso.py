"""
Schemas Pydantic para Curso/Materia.
"""
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class CursoBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=150)
    descripcion: Optional[str] = Field(None, max_length=2000)


class CursoCrear(CursoBase):
    usuario_id: int | None = None


class CursoActualizar(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=150)
    descripcion: Optional[str] = Field(None, max_length=2000)


class CursoRespuesta(CursoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int | None = None


class CursoConTareas(CursoRespuesta):
    """Curso con la lista de sus tareas asociadas."""
    # Se rellena en tiempo de respuesta usando from_attributes
    tareas: List["TareaRespuesta"] = []


# Import diferido para evitar referencia circular
from app.schemas.tarea import TareaRespuesta  # noqa: E402
CursoConTareas.model_rebuild()
