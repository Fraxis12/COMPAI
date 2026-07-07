"""
Modelo de datos para lecturas de sensores IoT (ESP32).
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Enum, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class TipoSensor(str, enum.Enum):
    """Categorías soportadas por el equipo ESP32 real (sensor/main.cpp):
    MPU6050 (movimiento/odómetro), CCS811 (calidad de aire) y DHT11 (ambiente)."""
    MOVIMIENTO = "MOVIMIENTO"
    CALIDAD_AIRE = "CALIDAD_AIRE"
    AMBIENTE = "AMBIENTE"


class SensorData(Base):
    __tablename__ = "sensores_datos"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    dispositivo_id = Column(String(100), nullable=False)
    tipo_sensor = Column(Enum(TipoSensor), nullable=False, index=True)
    valor = Column(Float, nullable=False)
    unidad = Column(String(20), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    metadatos = Column(JSON, nullable=True, default=dict)

    usuario = relationship("Usuario", back_populates="sensores_datos")
