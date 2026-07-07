"""
Modelo Usuario.
"""
from sqlalchemy import Boolean, Column, Integer, String, JSON, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    correo = Column(String(150), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=True)
    # Preferencias guardadas como JSON: tema, idioma, notificaciones, etc.
    preferencias = Column(JSON, nullable=True, default=dict)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    ultimo_acceso = Column(DateTime(timezone=True), nullable=True)
    activo = Column(Boolean, nullable=False, default=True, server_default="true")

    # Relaciones (1:N) con borrado en cascada
    tareas = relationship("Tarea", back_populates="usuario", cascade="all, delete-orphan")
    recordatorios = relationship("Recordatorio", back_populates="usuario", cascade="all, delete-orphan")
    planes_nutricionales = relationship("PlanNutricional", back_populates="usuario", cascade="all, delete-orphan")
    comidas = relationship("Comida", back_populates="usuario", cascade="all, delete-orphan")
    rutinas = relationship("RutinaBienestar", back_populates="usuario", cascade="all, delete-orphan")
    sensores_datos = relationship("SensorData", back_populates="usuario", cascade="all, delete-orphan")
    reportes = relationship("Reporte", back_populates="usuario", cascade="all, delete-orphan")
