"""
Orquesta el flujo completo de un documento academico subido:
guardar el archivo -> extraer texto -> pedirle a CompAI que identifique
cursos/tareas -> crear esos cursos y tareas para el usuario.

El almacenamiento y la extraccion estan detras de interfaces
intercambiables (ver document_storage_interface.py y
document_extraction_interface.py) para poder pasar a S3 + Textract despues
sin tocar esta orquestacion.
"""
import json
import logging

import requests
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.curso import Curso
from app.models.documento_academico import DocumentoAcademico, EstadoDocumento
from app.models.tarea import Tarea
from app.schemas.documento_academico import AnalisisDocumentoAcademico
from app.services.document_extraction_interface import DocumentExtractionError
from app.services.local_document_extraction import LocalDocumentExtraction
from app.services.local_document_storage import LocalDocumentStorage

logger = logging.getLogger(__name__)

# Limite de caracteres que se manda a la IA (evita prompts gigantes con silabos muy largos).
_MAX_CARACTERES_PROMPT = 12000
# Cuanto del texto extraido se guarda para usarlo despues al "explicar" una tarea.
_MAX_CARACTERES_GUARDADOS = 20000


def _obtener_storage():
    proveedor = settings.DOCUMENT_STORAGE_PROVIDER.strip().upper()
    if proveedor == "LOCAL":
        return LocalDocumentStorage()
    # Cuando haya credenciales de AWS: if proveedor == "S3": return S3DocumentStorage()
    raise ValueError(f"DOCUMENT_STORAGE_PROVIDER '{proveedor}' no esta soportado todavia")


def _obtener_extraccion():
    proveedor = settings.DOCUMENT_EXTRACTION_PROVIDER.strip().upper()
    if proveedor == "LOCAL":
        return LocalDocumentExtraction()
    # Cuando haya credenciales de AWS: if proveedor == "TEXTRACT": return TextractDocumentExtraction()
    raise ValueError(f"DOCUMENT_EXTRACTION_PROVIDER '{proveedor}' no esta soportado todavia")


def analizar_texto_con_ia(texto: str) -> AnalisisDocumentoAcademico:
    if not settings.GROQ_API_KEY:
        raise RuntimeError("CompAI todavía no tiene configurada la conexión con Groq.")

    prompt = f"""
Este es el texto extraido de un documento academico (silabo, programa de curso u horario)
de un estudiante:

{texto[:_MAX_CARACTERES_PROMPT]}

Identifica que curso(s) describe este documento y, si menciona tareas, examenes, entregas o
practicas calificadas, listalas como tareas de ese curso. Si el documento describe un solo curso,
devuelve un solo curso. Si menciona fechas de entrega, ponlas en "fecha_entrega_texto" tal como
aparecen en el texto (no inventes ni calcules una fecha exacta si no esta clara).
No inventes cursos ni tareas que no esten respaldados por el texto. Responde unicamente JSON
valido con esta forma:
{{"cursos":[{{"nombre":"...","profesor":"...","descripcion":"...","tareas":[{{"titulo":"...","descripcion":"...","fecha_entrega_texto":"..."}}]}}]}}
"""
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json={
                "model": settings.GROQ_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "Eres CompAI, un asistente que organiza la vida academica de estudiantes. "
                            "Lees documentos universitarios y extraes cursos y tareas reales, sin inventar "
                            "informacion que no este en el texto. Respondes en español y solo en JSON."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
                "max_completion_tokens": 1500,
                "response_format": {"type": "json_object"},
            },
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json", "User-Agent": "CompAI/1.0"},
            timeout=40,
        )
        response.raise_for_status()
        contenido = response.json()["choices"][0]["message"]["content"]
        return AnalisisDocumentoAcademico.model_validate(json.loads(contenido))
    except (requests.RequestException, KeyError, ValueError, json.JSONDecodeError) as error:
        logger.warning("Error analizando documento academico con CompAI: %s", type(error).__name__)
        raise RuntimeError("CompAI no pudo analizar el documento. Inténtalo nuevamente.") from error


def crear_cursos_desde_analisis(
    db: Session, usuario_id: int, documento_id: int, analisis: AnalisisDocumentoAcademico
) -> int:
    for curso_extraido in analisis.cursos:
        descripcion = curso_extraido.descripcion
        if curso_extraido.profesor:
            descripcion = f"{descripcion}\nProfesor: {curso_extraido.profesor}".strip()

        curso = Curso(
            usuario_id=usuario_id,
            nombre=curso_extraido.nombre,
            descripcion=descripcion or None,
            documento_id=documento_id,
        )
        db.add(curso)
        db.flush()  # asigna curso.id sin cerrar la transaccion

        for tarea_extraida in curso_extraido.tareas:
            descripcion_tarea = tarea_extraida.descripcion
            if tarea_extraida.fecha_entrega_texto:
                nota_fecha = f"Fecha mencionada en el documento: {tarea_extraida.fecha_entrega_texto}"
                descripcion_tarea = f"{descripcion_tarea}\n{nota_fecha}".strip()

            db.add(Tarea(
                usuario_id=usuario_id,
                curso_id=curso.id,
                titulo=tarea_extraida.titulo,
                descripcion=descripcion_tarea or None,
            ))

    db.commit()
    return len(analisis.cursos)


def procesar_documento(db: Session, usuario_id: int, nombre_archivo: str, contenido: bytes) -> DocumentoAcademico:
    storage = _obtener_storage()
    ruta = storage.guardar(usuario_id, nombre_archivo, contenido)

    documento = DocumentoAcademico(
        usuario_id=usuario_id,
        nombre_archivo=nombre_archivo,
        proveedor_almacenamiento=storage.nombre_proveedor,
        ruta_almacenamiento=ruta,
        estado=EstadoDocumento.procesando,
    )
    db.add(documento)
    db.commit()
    db.refresh(documento)

    try:
        texto = _obtener_extraccion().extraer_texto(nombre_archivo, contenido)
        analisis = analizar_texto_con_ia(texto)
        if not analisis.cursos:
            raise RuntimeError("No se identificó ningún curso en el documento.")

        cursos_creados = crear_cursos_desde_analisis(db, usuario_id, documento.id, analisis)
        documento.texto_extraido = texto[:_MAX_CARACTERES_GUARDADOS]
        documento.cursos_creados = cursos_creados
        documento.estado = EstadoDocumento.procesado
    except (DocumentExtractionError, RuntimeError, ValueError) as error:
        documento.estado = EstadoDocumento.error
        documento.error_mensaje = str(error)[:500]

    db.commit()
    db.refresh(documento)
    return documento
