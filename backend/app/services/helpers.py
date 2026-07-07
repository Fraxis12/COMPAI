"""
Funciones compartidas para validación en servicios.
Centraliza lógica común para evitar duplicación.
"""
from sqlalchemy.orm import Session
from sqlalchemy import exists
from fastapi import HTTPException, status
from app.models.usuario import Usuario
from app.models.curso import Curso


def verificar_usuario(db: Session, usuario_id: int) -> None:
    """
    Verifica que un usuario existe.
    Lanza HTTPException 404 si no existe.
    """
    if not db.query(exists(Usuario).where(Usuario.id == usuario_id)).scalar():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario {usuario_id} no encontrado",
        )


def verificar_curso(db: Session, curso_id: int) -> None:
    """
    Verifica que un curso existe.
    Lanza HTTPException 404 si no existe.
    """
    if not db.query(exists(Curso).where(Curso.id == curso_id)).scalar():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Curso {curso_id} no encontrado",
        )
