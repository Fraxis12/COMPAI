"""
Lógica de negocio para Cursos/Materias.
"""
import logging
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.models.curso import Curso
from app.models.usuario import Usuario
from app.schemas.curso import CursoCrear, CursoActualizar

logger = logging.getLogger(__name__)


def _verificar_usuario(db: Session, usuario_id: int | None) -> None:
    if usuario_id is None:
        return
    if not db.query(Usuario).filter(Usuario.id == usuario_id).first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario {usuario_id} no encontrado",
        )


def crear_curso(db: Session, datos: CursoCrear) -> Curso:
    _verificar_usuario(db, datos.usuario_id)
    curso = Curso(**datos.model_dump())
    db.add(curso)
    try:
        db.commit()
        db.refresh(curso)
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error de integridad al crear curso: {e}")
        raise HTTPException(status_code=409, detail="El curso ya existe")
    except Exception as e:
        db.rollback()
        logger.error(f"Error al crear curso: {e}")
        raise HTTPException(status_code=500, detail="Error al crear curso")
    return curso


def obtener_cursos(db: Session, skip: int = 0, limit: int = 100) -> List[Curso]:
    return db.query(Curso).offset(skip).limit(limit).all()


def obtener_cursos_por_usuario(db: Session, usuario_id: int) -> List[Curso]:
    _verificar_usuario(db, usuario_id)
    return db.query(Curso).filter(Curso.usuario_id == usuario_id).order_by(Curso.nombre.asc()).all()


def obtener_curso(db: Session, curso_id: int) -> Curso:
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Curso {curso_id} no encontrado",
        )
    return curso


def actualizar_curso(db: Session, curso_id: int, datos: CursoActualizar) -> Curso:
    curso = obtener_curso(db, curso_id)
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(curso, campo, valor)
    try:
        db.commit()
        db.refresh(curso)
    except Exception as e:
        db.rollback()
        logger.error(f"Error al actualizar curso: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar curso")
    return curso


def eliminar_curso(db: Session, curso_id: int) -> None:
    curso = obtener_curso(db, curso_id)
    db.delete(curso)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error al eliminar curso: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar curso")
