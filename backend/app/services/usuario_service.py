"""
Lógica de negocio para Usuarios.
"""
import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCrear, UsuarioActualizar

logger = logging.getLogger(__name__)


def crear_usuario(db: Session, datos: UsuarioCrear) -> Usuario:
    if db.query(Usuario).filter(Usuario.correo == datos.correo).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un usuario con el correo {datos.correo}",
        )
    usuario = Usuario(**datos.model_dump())
    db.add(usuario)
    try:
        db.commit()
        db.refresh(usuario)
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error de integridad al crear usuario: {e}")
        raise HTTPException(status_code=409, detail="El usuario ya existe")
    except Exception as e:
        db.rollback()
        logger.error(f"Error al crear usuario: {e}")
        raise HTTPException(status_code=500, detail="Error al crear usuario")
    return usuario


def obtener_usuarios(db: Session, skip: int = 0, limit: int = 100) -> List[Usuario]:
    return db.query(Usuario).offset(skip).limit(limit).all()


def obtener_usuario(db: Session, usuario_id: int) -> Usuario:
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario {usuario_id} no encontrado",
        )
    return usuario


def actualizar_usuario(db: Session, usuario_id: int, datos: UsuarioActualizar) -> Usuario:
    usuario = obtener_usuario(db, usuario_id)
    actualizaciones = datos.model_dump(exclude_unset=True)

    # Validar correo único en caso de cambio
    if "correo" in actualizaciones and actualizaciones["correo"] != usuario.correo:
        existente = db.query(Usuario).filter(Usuario.correo == actualizaciones["correo"]).first()
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El correo {actualizaciones['correo']} ya está registrado",
            )

    for campo, valor in actualizaciones.items():
        setattr(usuario, campo, valor)
    try:
        db.commit()
        db.refresh(usuario)
    except Exception as e:
        db.rollback()
        logger.error(f"Error al actualizar usuario: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar usuario")
    return usuario


def eliminar_usuario(db: Session, usuario_id: int) -> None:
    usuario = obtener_usuario(db, usuario_id)
    db.delete(usuario)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error al eliminar usuario: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar usuario")
