"""
Endpoints para Rutinas de Bienestar.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.schemas.rutina_bienestar import (
    RutinaBienestarCrear, RutinaBienestarActualizar, RutinaBienestarRespuesta
)
from app.services import rutina_service

router = APIRouter(prefix="/rutinas-bienestar", tags=["Rutinas de Bienestar"])


@router.post("/", response_model=RutinaBienestarRespuesta, status_code=status.HTTP_201_CREATED,
             summary="Registrar una rutina de bienestar")
def crear(datos: RutinaBienestarCrear, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return rutina_service.crear_rutina(db, datos.model_copy(update={"usuario_id": usuario.id}))


@router.get("/", response_model=List[RutinaBienestarRespuesta],
            summary="Listar todas las rutinas")
def listar(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return rutina_service.listar_rutinas_por_usuario(db, usuario.id)


@router.get("/por-usuario/{usuario_id}", response_model=List[RutinaBienestarRespuesta],
            summary="Listar rutinas de un usuario")
def por_usuario(usuario_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    if usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    return rutina_service.listar_rutinas_por_usuario(db, usuario.id)


@router.get("/{rutina_id}", response_model=RutinaBienestarRespuesta,
            summary="Obtener una rutina por ID")
def obtener(rutina_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    rutina = rutina_service.obtener_rutina(db, rutina_id)
    if rutina.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    return rutina


@router.put("/{rutina_id}", response_model=RutinaBienestarRespuesta,
            summary="Actualizar una rutina")
def actualizar(rutina_id: int, datos: RutinaBienestarActualizar, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    rutina = rutina_service.obtener_rutina(db, rutina_id)
    if rutina.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    return rutina_service.actualizar_rutina(db, rutina_id, datos)


@router.delete("/{rutina_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Eliminar una rutina")
def eliminar(rutina_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    rutina = rutina_service.obtener_rutina(db, rutina_id)
    if rutina.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    rutina_service.eliminar_rutina(db, rutina_id)
    return None
