"""
Lógica de negocio para Rutinas de Bienestar.
"""
import logging
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.models.rutina_bienestar import RutinaBienestar
from app.models.usuario import Usuario
from app.schemas.rutina_bienestar import RutinaBienestarCrear, RutinaBienestarActualizar

logger = logging.getLogger(__name__)


def _verificar_usuario(db: Session, usuario_id: int) -> None:
    if not db.query(Usuario).filter(Usuario.id == usuario_id).first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario {usuario_id} no encontrado",
        )


def crear_rutina(db: Session, datos: RutinaBienestarCrear) -> RutinaBienestar:
    _verificar_usuario(db, datos.usuario_id)
    rutina = RutinaBienestar(**datos.model_dump())
    db.add(rutina)
    try:
        db.commit()
        db.refresh(rutina)
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error de integridad al crear rutina: {e}")
        raise HTTPException(status_code=409, detail="La rutina ya existe")
    except Exception as e:
        db.rollback()
        logger.error(f"Error al crear rutina: {e}")
        raise HTTPException(status_code=500, detail="Error al crear rutina")
    return rutina


def obtener_rutinas(db: Session, skip: int = 0, limit: int = 100) -> List[RutinaBienestar]:
    return db.query(RutinaBienestar).offset(skip).limit(limit).all()


def obtener_rutina(db: Session, rutina_id: int) -> RutinaBienestar:
    rutina = db.query(RutinaBienestar).filter(RutinaBienestar.id == rutina_id).first()
    if not rutina:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Rutina {rutina_id} no encontrada",
        )
    return rutina


def listar_rutinas_por_usuario(db: Session, usuario_id: int) -> List[RutinaBienestar]:
    _verificar_usuario(db, usuario_id)
    return db.query(RutinaBienestar).filter(
        RutinaBienestar.usuario_id == usuario_id
    ).order_by(RutinaBienestar.fecha.desc()).all()


def actualizar_rutina(db: Session, rutina_id: int, datos: RutinaBienestarActualizar) -> RutinaBienestar:
    rutina = obtener_rutina(db, rutina_id)
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(rutina, campo, valor)
    try:
        db.commit()
        db.refresh(rutina)
    except Exception as e:
        db.rollback()
        logger.error(f"Error al actualizar rutina: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar rutina")
    return rutina


def eliminar_rutina(db: Session, rutina_id: int) -> None:
    rutina = obtener_rutina(db, rutina_id)
    db.delete(rutina)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error al eliminar rutina: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar rutina")
