"""
Contrato comun para extraer texto de un documento subido.

El proveedor LOCAL de hoy lee PDFs de verdad (texto, no escaneados) y .txt
sin depender de AWS. Cuando haya credenciales, se agrega un
TextractDocumentExtraction que ademas soporte documentos escaneados/imagenes,
seleccionable con DOCUMENT_EXTRACTION_PROVIDER=TEXTRACT, sin tocar las rutas.
"""
from abc import ABC, abstractmethod


class DocumentExtractionError(Exception):
    """No se pudo extraer texto util del documento."""


class DocumentExtraction(ABC):
    nombre_proveedor: str

    @abstractmethod
    def extraer_texto(self, nombre_archivo: str, contenido: bytes) -> str:
        raise NotImplementedError
