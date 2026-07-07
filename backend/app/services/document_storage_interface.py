"""
Contrato comun para guardar/leer los archivos que suben los usuarios.

Hoy solo existe el proveedor LOCAL (disco del backend). Cuando haya
credenciales de AWS, se agrega una clase S3DocumentStorage que implemente el
mismo contrato y se selecciona con DOCUMENT_STORAGE_PROVIDER=S3 en .env, sin
tocar rutas ni servicios que ya usan esta interfaz.
"""
from abc import ABC, abstractmethod


class DocumentStorage(ABC):
    nombre_proveedor: str

    @abstractmethod
    def guardar(self, usuario_id: int, nombre_archivo: str, contenido: bytes) -> str:
        """Guarda el archivo y retorna la ruta/clave donde quedo almacenado."""
        raise NotImplementedError
