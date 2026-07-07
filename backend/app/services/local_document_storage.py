"""
Guarda los documentos subidos en el disco del backend. Sirve para desarrollar
y probar todo el flujo (subir -> extraer -> crear cursos) sin credenciales de
AWS. Cuando haya cuenta de AWS, se reemplaza por S3DocumentStorage.
"""
import re
import uuid
from pathlib import Path

from app.core.config import settings
from app.services.document_storage_interface import DocumentStorage

_NOMBRE_INVALIDO = re.compile(r"[^A-Za-z0-9._-]+")


class LocalDocumentStorage(DocumentStorage):
    nombre_proveedor = "local"

    def __init__(self):
        self.base_dir = Path(settings.DOCUMENT_STORAGE_LOCAL_DIR)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def guardar(self, usuario_id: int, nombre_archivo: str, contenido: bytes) -> str:
        carpeta_usuario = self.base_dir / str(usuario_id)
        carpeta_usuario.mkdir(parents=True, exist_ok=True)

        nombre_seguro = _NOMBRE_INVALIDO.sub("_", nombre_archivo)[-100:]
        ruta = carpeta_usuario / f"{uuid.uuid4().hex}_{nombre_seguro}"
        ruta.write_bytes(contenido)
        return str(ruta)
