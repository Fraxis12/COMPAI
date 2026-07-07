"""
Lógica de negocio para Plan Nutricional.
"""
import logging
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.models.plan_nutricional import PlanNutricional
from app.models.usuario import Usuario
from app.schemas.plan_nutricional import PlanNutricionalCrear, PlanNutricionalActualizar

logger = logging.getLogger(__name__)


def _verificar_usuario(db: Session, usuario_id: int) -> None:
    if not db.query(Usuario).filter(Usuario.id == usuario_id).first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario {usuario_id} no encontrado",
        )


def crear_plan(db: Session, datos: PlanNutricionalCrear) -> PlanNutricional:
    _verificar_usuario(db, datos.usuario_id)
    plan = PlanNutricional(**datos.model_dump())
    db.add(plan)
    try:
        db.commit()
        db.refresh(plan)
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error de integridad al crear plan: {e}")
        raise HTTPException(status_code=409, detail="El plan ya existe")
    except Exception as e:
        db.rollback()
        logger.error(f"Error al crear plan: {e}")
        raise HTTPException(status_code=500, detail="Error al crear plan")
    return plan


def obtener_planes(db: Session, skip: int = 0, limit: int = 100) -> List[PlanNutricional]:
    return db.query(PlanNutricional).offset(skip).limit(limit).all()


def obtener_plan(db: Session, plan_id: int) -> PlanNutricional:
    plan = db.query(PlanNutricional).filter(PlanNutricional.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plan nutricional {plan_id} no encontrado",
        )
    return plan


def obtener_planes_por_usuario(db: Session, usuario_id: int) -> List[PlanNutricional]:
    _verificar_usuario(db, usuario_id)
    return db.query(PlanNutricional).filter(PlanNutricional.usuario_id == usuario_id).all()


def actualizar_plan(db: Session, plan_id: int, datos: PlanNutricionalActualizar) -> PlanNutricional:
    plan = obtener_plan(db, plan_id)
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(plan, campo, valor)
    try:
        db.commit()
        db.refresh(plan)
    except Exception as e:
        db.rollback()
        logger.error(f"Error al actualizar plan: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar plan")
    return plan


def eliminar_plan(db: Session, plan_id: int) -> None:
    plan = obtener_plan(db, plan_id)
    db.delete(plan)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error al eliminar plan: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar plan")
