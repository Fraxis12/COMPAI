"""
Modelo Curso/Materia.
"""
from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class Curso(Base):
    __tablename__ = "cursos"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=True, index=True)
    nombre = Column(String(150), nullable=False, index=True)
    descripcion = Column(Text, nullable=True)
    # Si la IA creo este curso a partir de un documento subido, queda el rastro aqui.
    documento_id = Column(Integer, ForeignKey("documentos_academicos.id", ondelete="SET NULL"), nullable=True)

    # Relación con tareas (1:N)
    tareas = relationship("Tarea", back_populates="curso")
