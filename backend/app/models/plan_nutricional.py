"""
Modelo Plan Nutricional.
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class PlanNutricional(Base):
    __tablename__ = "planes_nutricionales"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo_dieta = Column(String(100), nullable=False)  # ej: vegana, keto, mediterránea
    objetivos = Column(Text, nullable=True)  # ej: perder peso, ganar masa muscular
    descripcion = Column(Text, nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    # Relación
    usuario = relationship("Usuario", back_populates="planes_nutricionales")
