"""
Modelo Rutina de Bienestar (ejercicio, meditación, etc).
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class RutinaBienestar(Base):
    __tablename__ = "rutinas_bienestar"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)

    actividad = Column(String(200), nullable=False)  # ej: "Yoga", "Correr"
    duracion_minutos = Column(Integer, nullable=False)
    fecha = Column(DateTime(timezone=True), nullable=False, index=True)

    # Relación
    usuario = relationship("Usuario", back_populates="rutinas")
