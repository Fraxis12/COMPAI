"""
Endpoints para Recordatorios: CRUD, envío y consulta filtrada.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.recordatorio import TipoRecordatorio
from app.models.usuario import Usuario
from app.schemas.recordatorio import RecordatorioCrear, RecordatorioActualizar, RecordatorioRespuesta
from app.services import recordatorio_service

router = APIRouter(prefix="/recordatorios", tags=["Recordatorios"])


@router.post("/", response_model=RecordatorioRespuesta, status_code=status.HTTP_201_CREATED,
             summary="Crear / registrar un recordatorio")
def crear(datos: RecordatorioCrear, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return recordatorio_service.crear_recordatorio(db, datos.model_copy(update={"usuario_id": usuario.id}))


@router.get("/", response_model=List[RecordatorioRespuesta],
            summary="Listar recordatorios (con filtros opcionales)")
def listar(
    usuario_id: Optional[int] = Query(None, gt=0),
    tipo: Optional[TipoRecordatorio] = Query(None),
    desde: Optional[datetime] = Query(None),
    hasta: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    if desde and hasta and desde > hasta:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parámetro 'desde' no puede ser mayor que 'hasta'"
        )
    if usuario_id and usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    return recordatorio_service.consultar_recordatorios(db, usuario.id, tipo, desde, hasta)


@router.get("/{recordatorio_id}", response_model=RecordatorioRespuesta,
            summary="Obtener un recordatorio por ID")
def obtener(recordatorio_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    recordatorio = recordatorio_service.obtener_recordatorio(db, recordatorio_id)
    if recordatorio.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    return recordatorio


@router.put("/{recordatorio_id}", response_model=RecordatorioRespuesta,
            summary="Actualizar un recordatorio")
def actualizar(recordatorio_id: int, datos: RecordatorioActualizar, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    recordatorio = recordatorio_service.obtener_recordatorio(db, recordatorio_id)
    if recordatorio.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    return recordatorio_service.actualizar_recordatorio(db, recordatorio_id, datos)


@router.post("/{recordatorio_id}/enviar", response_model=RecordatorioRespuesta,
             summary="Marcar un recordatorio como enviado (simula notificación)")
def enviar(recordatorio_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    recordatorio = recordatorio_service.obtener_recordatorio(db, recordatorio_id)
    if recordatorio.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    return recordatorio_service.marcar_como_enviado(db, recordatorio_id)


@router.delete("/{recordatorio_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Eliminar un recordatorio")
def eliminar(recordatorio_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    recordatorio = recordatorio_service.obtener_recordatorio(db, recordatorio_id)
    if recordatorio.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    recordatorio_service.eliminar_recordatorio(db, recordatorio_id)
    return None
