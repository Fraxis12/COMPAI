"""
Modelo Comida (registro de ingesta).
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class Comida(Base):
    __tablename__ = "comidas"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)

    nombre = Column(String(200), nullable=False)  # ej: "Ensalada de pollo"
    calorias = Column(Float, nullable=False)
    # Macronutrientes en gramos
    proteinas = Column(Float, nullable=False, default=0.0)
    carbohidratos = Column(Float, nullable=False, default=0.0)
    grasas = Column(Float, nullable=False, default=0.0)
    fecha = Column(DateTime(timezone=True), nullable=False, index=True)

    # Relación
    usuario = relationship("Usuario", back_populates="comidas")
