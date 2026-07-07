from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class Reporte(Base):
    __tablename__ = "reportes"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    categoria = Column(String(60), nullable=False, default="general")
    descripcion = Column(Text, nullable=False)
    estado = Column(String(30), nullable=False, default="pendiente", index=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    usuario = relationship("Usuario", back_populates="reportes")
