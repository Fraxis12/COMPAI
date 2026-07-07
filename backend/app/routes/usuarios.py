"""
Endpoints CRUD para Usuario.
"""
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.usuario import UsuarioCrear, UsuarioActualizar, UsuarioRespuesta
from app.services import usuario_service

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.post("/", response_model=UsuarioRespuesta, status_code=status.HTTP_201_CREATED,
             summary="Crear un nuevo usuario")
def crear(datos: UsuarioCrear, db: Session = Depends(get_db)):
    return usuario_service.crear_usuario(db, datos)


@router.get("/", response_model=List[UsuarioRespuesta], summary="Listar todos los usuarios")
def listar(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return usuario_service.obtener_usuarios(db, skip, limit)


@router.get("/{usuario_id}", response_model=UsuarioRespuesta, summary="Obtener un usuario por ID")
def obtener(usuario_id: int, db: Session = Depends(get_db)):
    return usuario_service.obtener_usuario(db, usuario_id)


@router.put("/{usuario_id}", response_model=UsuarioRespuesta, summary="Actualizar un usuario")
def actualizar(usuario_id: int, datos: UsuarioActualizar, db: Session = Depends(get_db)):
    return usuario_service.actualizar_usuario(db, usuario_id, datos)


@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar un usuario")
def eliminar(usuario_id: int, db: Session = Depends(get_db)):
    usuario_service.eliminar_usuario(db, usuario_id)
    return None
