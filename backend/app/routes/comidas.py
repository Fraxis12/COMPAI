"""
Endpoints para registro y consulta de Comidas.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.schemas.comida import ComidaCrear, ComidaActualizar, ComidaRespuesta
from app.services import comida_service

router = APIRouter(prefix="/comidas", tags=["Comidas"])


@router.post("/", response_model=ComidaRespuesta, status_code=status.HTTP_201_CREATED,
             summary="Registrar una comida")
def registrar(datos: ComidaCrear, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return comida_service.registrar_comida(db, datos.model_copy(update={"usuario_id": usuario.id}))


@router.get("/", response_model=List[ComidaRespuesta], summary="Listar todas las comidas")
def listar(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return comida_service.listar_comidas_por_usuario(db, usuario.id, None, None)


@router.get("/por-usuario/{usuario_id}", response_model=List[ComidaRespuesta],
            summary="Listar comidas de un usuario en un rango de fechas opcional")
def por_usuario(
    usuario_id: int,
    desde: Optional[datetime] = Query(None),
    hasta: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    if usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    if desde and hasta and desde > hasta:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parámetro 'desde' no puede ser mayor que 'hasta'"
        )
    return comida_service.listar_comidas_por_usuario(db, usuario.id, desde, hasta)


@router.get("/{comida_id}", response_model=ComidaRespuesta, summary="Obtener comida por ID")
def obtener(comida_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    comida = comida_service.obtener_comida(db, comida_id)
    if comida.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    return comida


@router.put("/{comida_id}", response_model=ComidaRespuesta, summary="Actualizar una comida")
def actualizar(comida_id: int, datos: ComidaActualizar, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    comida = comida_service.obtener_comida(db, comida_id)
    if comida.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    return comida_service.actualizar_comida(db, comida_id, datos)


@router.delete("/{comida_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Eliminar registro de comida")
def eliminar(comida_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    comida = comida_service.obtener_comida(db, comida_id)
    if comida.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    comida_service.eliminar_comida(db, comida_id)
    return None
