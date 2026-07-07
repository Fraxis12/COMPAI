"""
Endpoints CRUD para Curso/Materia.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.schemas.curso import CursoCrear, CursoActualizar, CursoRespuesta, CursoConTareas
from app.services import curso_service

router = APIRouter(prefix="/cursos", tags=["Cursos"])


@router.post("/", response_model=CursoRespuesta, status_code=status.HTTP_201_CREATED,
             summary="Crear un nuevo curso/materia")
def crear(datos: CursoCrear, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return curso_service.crear_curso(db, datos.model_copy(update={"usuario_id": usuario.id}))


@router.get("/", response_model=List[CursoRespuesta], summary="Listar todos los cursos")
def listar(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return curso_service.obtener_cursos_por_usuario(db, usuario.id)


@router.get("/{curso_id}", response_model=CursoConTareas,
            summary="Obtener un curso con su lista de tareas")
def obtener(curso_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    curso = curso_service.obtener_curso(db, curso_id)
    if curso.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    return curso


@router.put("/{curso_id}", response_model=CursoRespuesta, summary="Actualizar un curso")
def actualizar(curso_id: int, datos: CursoActualizar, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    curso = curso_service.obtener_curso(db, curso_id)
    if curso.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    return curso_service.actualizar_curso(db, curso_id, datos)


@router.delete("/{curso_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar un curso")
def eliminar(curso_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    curso = curso_service.obtener_curso(db, curso_id)
    if curso.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    curso_service.eliminar_curso(db, curso_id)
    return None
