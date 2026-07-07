"""
Modelo Recordatorio.
"""
import enum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SAEnum, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base


class TipoRecordatorio(str, enum.Enum):
    estudio = "estudio"
    bienestar = "bienestar"


class Recordatorio(Base):
    __tablename__ = "recordatorios"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = Column(SAEnum(TipoRecordatorio), nullable=False)
    titulo = Column(String(200), nullable=False)
    fecha_hora = Column(DateTime(timezone=True), nullable=False, index=True)
    enviado = Column(Boolean, default=False, nullable=False)

    # Relación
    usuario = relationship("Usuario", back_populates="recordatorios")
