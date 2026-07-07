"""
Lógica de negocio para Tareas.
Incluye filtros por usuario, materia y rango de fechas.
"""
import logging
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.models.tarea import Tarea
from app.models.usuario import Usuario
from app.models.curso import Curso
from app.schemas.tarea import TareaCrear, TareaActualizar

logger = logging.getLogger(__name__)


def _verificar_usuario(db: Session, usuario_id: int) -> None:
    if not db.query(Usuario).filter(Usuario.id == usuario_id).first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario {usuario_id} no encontrado",
        )


def _verificar_curso(db: Session, curso_id: int) -> None:
    if not db.query(Curso).filter(Curso.id == curso_id).first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Curso {curso_id} no encontrado",
        )


def crear_tarea(db: Session, datos: TareaCrear) -> Tarea:
    _verificar_usuario(db, datos.usuario_id)
    if datos.curso_id is not None:
        _verificar_curso(db, datos.curso_id)
    tarea = Tarea(**datos.model_dump())
    db.add(tarea)
    try:
        db.commit()
        db.refresh(tarea)
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error de integridad al crear tarea: {e}")
        raise HTTPException(status_code=409, detail="La tarea ya existe")
    except Exception as e:
        db.rollback()
        logger.error(f"Error al crear tarea: {e}")
        raise HTTPException(status_code=500, detail="Error al crear tarea")
    return tarea


def obtener_tareas(db: Session, skip: int = 0, limit: int = 100) -> List[Tarea]:
    return db.query(Tarea).offset(skip).limit(limit).all()


def obtener_tarea(db: Session, tarea_id: int) -> Tarea:
    tarea = db.query(Tarea).filter(Tarea.id == tarea_id).first()
    if not tarea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tarea {tarea_id} no encontrada",
        )
    return tarea


def actualizar_tarea(db: Session, tarea_id: int, datos: TareaActualizar) -> Tarea:
    tarea = obtener_tarea(db, tarea_id)
    actualizaciones = datos.model_dump(exclude_unset=True)
    if "curso_id" in actualizaciones and actualizaciones["curso_id"] is not None:
        _verificar_curso(db, actualizaciones["curso_id"])
    if actualizaciones.get("estado") == "completada":
        actualizaciones["completada_en"] = datetime.now(timezone.utc)
    elif actualizaciones.get("estado") == "pendiente":
        actualizaciones["completada_en"] = None
    for campo, valor in actualizaciones.items():
        setattr(tarea, campo, valor)
    try:
        db.commit()
        db.refresh(tarea)
    except Exception as e:
        db.rollback()
        logger.error(f"Error al actualizar tarea: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar tarea")
    return tarea


def eliminar_tarea(db: Session, tarea_id: int) -> None:
    tarea = obtener_tarea(db, tarea_id)
    db.delete(tarea)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error al eliminar tarea: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar tarea")


# === Filtros especializados ===

def listar_tareas_por_usuario(db: Session, usuario_id: int) -> List[Tarea]:
    _verificar_usuario(db, usuario_id)
    return db.query(Tarea).filter(Tarea.usuario_id == usuario_id).all()


def listar_tareas_por_curso(db: Session, curso_id: int) -> List[Tarea]:
    _verificar_curso(db, curso_id)
    return db.query(Tarea).filter(Tarea.curso_id == curso_id).all()


def listar_tareas_por_fecha(
    db: Session,
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
    usuario_id: Optional[int] = None,
) -> List[Tarea]:
    """Filtra tareas en un rango de fechas límite. Opcionalmente acota por usuario."""
    filtros = []
    if desde:
        filtros.append(Tarea.fecha_limite >= desde)
    if hasta:
        filtros.append(Tarea.fecha_limite <= hasta)
    if usuario_id:
        _verificar_usuario(db, usuario_id)
        filtros.append(Tarea.usuario_id == usuario_id)
    query = db.query(Tarea)
    if filtros:
        query = query.filter(and_(*filtros))
    return query.order_by(Tarea.fecha_limite.asc()).all()
