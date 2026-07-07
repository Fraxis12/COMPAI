"""
Subida de documentos academicos (silabos, programas de curso) para que CompAI
cree cursos y tareas automaticamente a partir de lo que lee.
"""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.documento_academico import DocumentoAcademico
from app.models.usuario import Usuario
from app.schemas.documento_academico import DocumentoAcademicoRespuesta
from app.services import documento_academico_service

router = APIRouter(prefix="/documentos-academicos", tags=["Documentos Académicos"])

_TIPOS_ACEPTADOS = {"application/pdf", "text/plain"}
_TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024


@router.post("/", response_model=DocumentoAcademicoRespuesta, status_code=status.HTTP_201_CREATED)
async def subir_documento(
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """
    Sube un documento (PDF con texto seleccionable, o .txt), lo guarda, extrae
    su texto y le pide a CompAI que identifique cursos y tareas para crearlos
    automaticamente en la cuenta del usuario.
    """
    if archivo.content_type not in _TIPOS_ACEPTADOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Por ahora solo se aceptan archivos PDF o de texto plano (.txt).",
        )

    contenido = await archivo.read()
    if len(contenido) > _TAMANO_MAXIMO_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo supera el límite de 10 MB.")
    if not contenido:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo está vacío.")

    return documento_academico_service.procesar_documento(db, usuario.id, archivo.filename or "documento", contenido)


@router.get("/", response_model=list[DocumentoAcademicoRespuesta])
def listar_documentos(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    return (
        db.query(DocumentoAcademico)
        .filter(DocumentoAcademico.usuario_id == usuario.id)
        .order_by(DocumentoAcademico.creado_en.desc())
        .all()
    )
