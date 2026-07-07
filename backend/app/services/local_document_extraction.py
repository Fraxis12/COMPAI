"""
Extraccion de texto sin AWS: PDFs de texto (no escaneados) via pypdf, y .txt
directo. No hace OCR de imagenes/PDFs escaneados; eso queda para cuando se
conecte Amazon Textract mas adelante.
"""
from io import BytesIO

from pypdf import PdfReader

from app.services.document_extraction_interface import DocumentExtraction, DocumentExtractionError


class LocalDocumentExtraction(DocumentExtraction):
    nombre_proveedor = "local"

    def extraer_texto(self, nombre_archivo: str, contenido: bytes) -> str:
        nombre = nombre_archivo.lower()
        try:
            if nombre.endswith(".pdf"):
                lector = PdfReader(BytesIO(contenido))
                texto = "\n".join(pagina.extract_text() or "" for pagina in lector.pages)
            else:
                texto = contenido.decode("utf-8", errors="ignore")
        except Exception as error:
            raise DocumentExtractionError(f"No se pudo leer el archivo: {error}") from error

        if not texto.strip():
            raise DocumentExtractionError(
                "No se encontro texto en el documento (¿es un PDF escaneado/imagen? "
                "por ahora solo se leen PDFs con texto seleccionable)."
            )
        return texto
