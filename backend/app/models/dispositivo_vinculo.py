"""
Vinculo dinamico entre un dispositivo IoT (identificado por su API Key) y el
usuario que lo esta usando en este momento.

La app vincula el equipo automaticamente a la cuenta activa apenas el usuario
abre la pantalla de Sensores (sin pasos manuales): basta con que tenga su
hardware conectado para que sus lecturas empiecen a llegar a su cuenta.
"""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func

from app.core.database import Base


class DispositivoVinculo(Base):
    __tablename__ = "dispositivos_vinculados"

    id = Column(Integer, primary_key=True, index=True)
    api_key = Column(String(100), nullable=False, unique=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    vinculado_en = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
