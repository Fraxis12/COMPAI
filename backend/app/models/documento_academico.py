"""
Documentos academicos que el usuario sube (ej. silabo/programa de curso) para
que la IA los lea y cree cursos/tareas automaticamente.

El almacenamiento y la extraccion de texto estan detras de interfaces
(app/services/document_storage_interface.py y document_extraction_interface.py)
para poder cambiar del proveedor local actual a S3 + Textract sin tocar este
modelo ni las rutas.
"""
import enum

from sqlalchemy import Column, DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class EstadoDocumento(str, enum.Enum):
    procesando = "procesando"
    procesado = "procesado"
    error = "error"


class DocumentoAcademico(Base):
    __tablename__ = "documentos_academicos"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre_archivo = Column(String(255), nullable=False)
    proveedor_almacenamiento = Column(String(20), nullable=False, default="local")
    ruta_almacenamiento = Column(String(500), nullable=False)
    texto_extraido = Column(Text, nullable=True)
    estado = Column(SAEnum(EstadoDocumento), nullable=False, default=EstadoDocumento.procesando)
    error_mensaje = Column(Text, nullable=True)
    cursos_creados = Column(Integer, nullable=False, default=0)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario")
