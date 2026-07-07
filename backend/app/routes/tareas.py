"""
Endpoints para Tareas.
Incluye CRUD y filtros por usuario, materia y fecha.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.curso import Curso
from app.models.usuario import Usuario
from app.schemas.tarea import TareaCrear, TareaActualizar, TareaRespuesta
from app.services import tarea_service

router = APIRouter(prefix="/tareas", tags=["Tareas"])


@router.post("/", response_model=TareaRespuesta, status_code=status.HTTP_201_CREATED,
             summary="Crear una nueva tarea")
def crear(datos: TareaCrear, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    if datos.curso_id is not None:
        curso = db.query(Curso).filter(Curso.id == datos.curso_id).first()
        if not curso or curso.usuario_id != usuario.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Curso no autorizado")
    return tarea_service.crear_tarea(db, datos.model_copy(update={"usuario_id": usuario.id}))


@router.get("/", response_model=List[TareaRespuesta], summary="Listar todas las tareas")
def listar(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return tarea_service.listar_tareas_por_usuario(db, usuario.id)


@router.get("/por-usuario/{usuario_id}", response_model=List[TareaRespuesta],
            summary="Listar tareas de un usuario")
def por_usuario(usuario_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    if usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    return tarea_service.listar_tareas_por_usuario(db, usuario.id)


@router.get("/por-curso/{curso_id}", response_model=List[TareaRespuesta],
            summary="Listar tareas de un curso/materia")
def por_curso(curso_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return [
        tarea for tarea in tarea_service.listar_tareas_por_curso(db, curso_id)
        if tarea.usuario_id == usuario.id
    ]


@router.get("/por-fecha/", response_model=List[TareaRespuesta],
            summary="Listar tareas filtradas por rango de fecha límite")
def por_fecha(
    desde: Optional[datetime] = Query(None, description="Fecha inicial (ISO 8601)"),
    hasta: Optional[datetime] = Query(None, description="Fecha final (ISO 8601)"),
    usuario_id: Optional[int] = Query(None, gt=0, description="Acota al usuario"),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    if desde and hasta and desde > hasta:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parámetro 'desde' no puede ser mayor que 'hasta'"
        )
    return tarea_service.listar_tareas_por_fecha(db, desde, hasta, usuario.id)


@router.get("/{tarea_id}", response_model=TareaRespuesta, summary="Obtener una tarea por ID")
def obtener(tarea_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    tarea = tarea_service.obtener_tarea(db, tarea_id)
    if tarea.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    return tarea


@router.put("/{tarea_id}", response_model=TareaRespuesta, summary="Actualizar una tarea")
def actualizar(tarea_id: int, datos: TareaActualizar, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    tarea = tarea_service.obtener_tarea(db, tarea_id)
    if tarea.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    if datos.curso_id is not None:
        curso = db.query(Curso).filter(Curso.id == datos.curso_id).first()
        if not curso or curso.usuario_id != usuario.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Curso no autorizado")
    return tarea_service.actualizar_tarea(db, tarea_id, datos)


@router.delete("/{tarea_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar una tarea")
def eliminar(tarea_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    tarea = tarea_service.obtener_tarea(db, tarea_id)
    if tarea.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    tarea_service.eliminar_tarea(db, tarea_id)
    return None
