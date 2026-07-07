"""
Modelo para códigos temporales de recuperación de contraseña.
"""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, func

from app.core.database import Base


class PasswordResetCode(Base):
    __tablename__ = "password_reset_codes"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    codigo_hash = Column(String(255), nullable=False)
    expira_en = Column(DateTime(timezone=True), nullable=False)
    usado = Column(Boolean, nullable=False, default=False)
    intentos = Column(Integer, nullable=False, default=0)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
