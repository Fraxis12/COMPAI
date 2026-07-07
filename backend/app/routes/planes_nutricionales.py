"""
Endpoints para Planes Nutricionales.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.schemas.plan_nutricional import (
    PlanNutricionalCrear, PlanNutricionalActualizar, PlanNutricionalRespuesta
)
from app.services import plan_nutricional_service

router = APIRouter(prefix="/planes-nutricionales", tags=["Planes Nutricionales"])


@router.post("/", response_model=PlanNutricionalRespuesta, status_code=status.HTTP_201_CREATED,
             summary="Crear un plan nutricional")
def crear(datos: PlanNutricionalCrear, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return plan_nutricional_service.crear_plan(db, datos.model_copy(update={"usuario_id": usuario.id}))


@router.get("/", response_model=List[PlanNutricionalRespuesta],
            summary="Listar todos los planes nutricionales")
def listar(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return plan_nutricional_service.obtener_planes_por_usuario(db, usuario.id)


@router.get("/por-usuario/{usuario_id}", response_model=List[PlanNutricionalRespuesta],
            summary="Consultar planes nutricionales de un usuario")
def por_usuario(usuario_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    if usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    return plan_nutricional_service.obtener_planes_por_usuario(db, usuario.id)


@router.get("/{plan_id}", response_model=PlanNutricionalRespuesta,
            summary="Obtener un plan nutricional por ID")
def obtener(plan_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    plan = plan_nutricional_service.obtener_plan(db, plan_id)
    if plan.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    return plan


@router.put("/{plan_id}", response_model=PlanNutricionalRespuesta,
            summary="Actualizar un plan nutricional")
def actualizar(plan_id: int, datos: PlanNutricionalActualizar, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    plan = plan_nutricional_service.obtener_plan(db, plan_id)
    if plan.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    return plan_nutricional_service.actualizar_plan(db, plan_id, datos)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Eliminar un plan nutricional")
def eliminar(plan_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    plan = plan_nutricional_service.obtener_plan(db, plan_id)
    if plan.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    plan_nutricional_service.eliminar_plan(db, plan_id)
    return None
