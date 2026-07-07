"""
Lógica de negocio para registro de Comidas.
"""
import logging
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.models.comida import Comida
from app.models.usuario import Usuario
from app.schemas.comida import ComidaCrear, ComidaActualizar

logger = logging.getLogger(__name__)


def _verificar_usuario(db: Session, usuario_id: int) -> None:
    if not db.query(Usuario).filter(Usuario.id == usuario_id).first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario {usuario_id} no encontrado",
        )


def registrar_comida(db: Session, datos: ComidaCrear) -> Comida:
    _verificar_usuario(db, datos.usuario_id)
    comida = Comida(**datos.model_dump())
    db.add(comida)
    try:
        db.commit()
        db.refresh(comida)
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error de integridad al registrar comida: {e}")
        raise HTTPException(status_code=409, detail="La comida ya existe")
    except Exception as e:
        db.rollback()
        logger.error(f"Error al registrar comida: {e}")
        raise HTTPException(status_code=500, detail="Error al registrar comida")
    return comida


def obtener_comidas(db: Session, skip: int = 0, limit: int = 100) -> List[Comida]:
    return db.query(Comida).offset(skip).limit(limit).all()


def obtener_comida(db: Session, comida_id: int) -> Comida:
    comida = db.query(Comida).filter(Comida.id == comida_id).first()
    if not comida:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Comida {comida_id} no encontrada",
        )
    return comida


def listar_comidas_por_usuario(
    db: Session,
    usuario_id: int,
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
) -> List[Comida]:
    _verificar_usuario(db, usuario_id)
    filtros = [Comida.usuario_id == usuario_id]
    if desde:
        filtros.append(Comida.fecha >= desde)
    if hasta:
        filtros.append(Comida.fecha <= hasta)
    return db.query(Comida).filter(and_(*filtros)).order_by(Comida.fecha.desc()).all()


def actualizar_comida(db: Session, comida_id: int, datos: ComidaActualizar) -> Comida:
    comida = obtener_comida(db, comida_id)
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(comida, campo, valor)
    try:
        db.commit()
        db.refresh(comida)
    except Exception as e:
        db.rollback()
        logger.error(f"Error al actualizar comida: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar comida")
    return comida


def eliminar_comida(db: Session, comida_id: int) -> None:
    comida = obtener_comida(db, comida_id)
    db.delete(comida)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error al eliminar comida: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar comida")
