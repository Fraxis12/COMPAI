"""
Modelo Tarea, vinculado a Usuario y opcionalmente a un Curso.
"""
import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base


class EstadoTarea(str, enum.Enum):
    pendiente = "pendiente"
    completada = "completada"


class PrioridadTarea(str, enum.Enum):
    baja = "baja"
    media = "media"
    alta = "alta"


class Tarea(Base):
    __tablename__ = "tareas"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    curso_id = Column(Integer, ForeignKey("cursos.id", ondelete="SET NULL"), nullable=True, index=True)

    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    fecha_limite = Column(DateTime(timezone=True), nullable=True, index=True)
    estimacion_minutos = Column(Integer, nullable=False, default=25)
    estado = Column(SAEnum(EstadoTarea), nullable=False, default=EstadoTarea.pendiente)
    prioridad = Column(SAEnum(PrioridadTarea), nullable=False, default=PrioridadTarea.media)
    completada_en = Column(DateTime(timezone=True), nullable=True, index=True)

    # Relaciones
    usuario = relationship("Usuario", back_populates="tareas")
    curso = relationship("Curso", back_populates="tareas")
