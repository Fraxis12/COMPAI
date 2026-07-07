import json
import logging
from collections import defaultdict

import requests

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.curso import Curso
from app.models.documento_academico import DocumentoAcademico
from app.models.tarea import Tarea
from app.models.usuario import Usuario
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ExplicarTareaRequest,
    ExplicarTareaResponse,
    NutritionMealRequest,
    NutritionMealResponse,
    NutritionMenuRequest,
    NutritionMenuResponse,
    NutritionReviewRequest,
    NutritionReviewResponse,
    SensorHistorialLectura,
    SensorInsightNarrative,
    SensorInsightRequest,
    SensorInsightResponse,
    SensorMetricInsight,
)

router = APIRouter(prefix="/chat", tags=["CompAI"])
logger = logging.getLogger(__name__)


def _system_prompt(usuario: Usuario) -> str:
    preferences = usuario.preferencias or {}
    preferred_name = preferences.get("nombre_compai") or usuario.nombre
    tone = preferences.get("tono_compai", "Amable")
    goal = preferences.get("objetivo_diario", "Equilibrio")
    tone_instruction = {
        "Amable": "Usa un tono cálido, paciente y cercano; valida la situación sin exagerar.",
        "Directo": "Ve directo a la solución, evita rodeos y prioriza instrucciones concretas.",
        "Motivador": "Usa energía positiva, reconoce avances y termina con un siguiente paso estimulante.",
    }.get(tone, "Usa un tono cálido, paciente y cercano.")
    goal_instruction = {
        "Estudio": "Prioriza organización académica, técnicas de estudio y concentración.",
        "Bienestar": "Prioriza descanso, hábitos saludables y manejo cotidiano del estrés.",
        "Equilibrio": "Busca un balance realista entre estudio, descanso y hábitos saludables.",
    }.get(goal, "Adapta las recomendaciones al objetivo principal indicado por el usuario.")
    length_instruction = (
        "Responde en un máximo de dos párrafos cortos y usa listas solo si ayudan."
        if preferences.get("respuestas_breves", True)
        else "Explica con suficiente contexto, ejemplos y pasos claros, sin extenderte innecesariamente."
    )
    return (
        "Eres CompAI, un asistente inteligente, amigable, directo, motivador y cercano. "
        "Tu objetivo es ser genuinamente útil en cada respuesta. Responde siempre en español. "
        "Habla de forma natural, como un amigo informado. Da primero la respuesta concreta y explica después solo si hace falta. "
        "Usa lenguaje claro y evita tecnicismos innecesarios. Adapta la extensión al tema: sé breve para preguntas simples y desarrolla solo cuando aporte valor. "
        "Responde sin rodeos. No añadas advertencias, descargos de responsabilidad ni recordatorios de limitaciones al final de cada respuesta. "
        "Si algo está fuera de tus capacidades reales, dilo una sola vez y brevemente. Trata al usuario como un adulto capaz de decidir. "
        "No termines con frases como 'consulta a un profesional', 'esto no es consejo profesional' o 'verifica con un experto', salvo cuando el usuario pida orientación médica, legal o financiera de alto riesgo. "
        "Incluso en esos casos, incluye como máximo una advertencia breve por conversación y céntrate en responder útilmente. "
        "No inventes datos, fuentes ni acciones que no realizaste en la app. Ayuda especialmente con organización académica, concentración, nutrición general y bienestar. "
        f"El usuario se llama {usuario.nombre} y prefiere que lo llames {preferred_name}. {tone_instruction} "
        f"{goal_instruction} {length_instruction}"
    )


@router.post("/completions", response_model=ChatResponse)
def create_completion(
    data: ChatRequest,
    usuario: Usuario = Depends(get_current_user),
):
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CompAI todavía no tiene configurada la conexión con Groq.",
        )

    recent_messages = data.messages[-20:]
    payload = {
        "model": settings.GROQ_MODEL,
        "messages": [
            {"role": "system", "content": _system_prompt(usuario)},
            *[{"role": item.role, "content": item.content} for item in recent_messages],
        ],
        "temperature": 0.6,
        "max_completion_tokens": 600,
    }

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json=payload,
            headers={
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "CompAI/1.0",
            },
            timeout=30,
        )
        response.raise_for_status()
        result = response.json()
        message = result["choices"][0]["message"]["content"].strip()
        if not message:
            raise ValueError("Groq devolvió una respuesta vacía")
        return {"message": message}
    except requests.HTTPError as error:
        response_status = error.response.status_code if error.response is not None else 502
        logger.warning("Groq respondió con estado %s", response_status)
        if response_status == 429:
            detail = "CompAI está recibiendo muchas consultas. Inténtalo en un momento."
        elif response_status in (401, 403):
            detail = "La conexión de CompAI necesita ser actualizada."
        else:
            detail = "CompAI no pudo responder en este momento."
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail) from error
    except (requests.RequestException, json.JSONDecodeError, KeyError, ValueError) as error:
        logger.warning("Error al consultar Groq: %s", type(error).__name__)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="CompAI no pudo conectarse. Inténtalo nuevamente.",
        ) from error


@router.post("/nutrition-menu", response_model=NutritionMenuResponse)
def create_nutrition_menu(
    data: NutritionMenuRequest,
    usuario: Usuario = Depends(get_current_user),
):
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="CompAI todavía no tiene configurada la conexión con Groq.")

    prompt = f"""
Genera un menú de un día para {usuario.nombre}, adaptado al contexto gastronómico de Perú.
Plan activo: {data.plan_name}. Descripción: {data.plan_description}.
Objetivo: {data.plan_goal or 'alimentación equilibrada'}.
Cómo se aplica: {data.plan_guidance or 'con variedad y porciones razonables'}.
Distribución del plan: {data.macro_distribution or 'según las metas diarias'}.
Objetivo diario aproximado: {data.daily_calories} kcal, {data.protein_target} g de proteína,
{data.carbs_target} g de carbohidratos y {data.fat_target} g de grasas.
Alimentos recomendados: {', '.join(data.recommended_foods) or 'variados'}.
Alimentos a moderar: {', '.join(data.foods_to_moderate) or 'ninguno indicado'}.
Preferencia del usuario: {data.preference or 'sin preferencia adicional'}.

Propón exactamente cuatro comidas: desayuno, almuerzo, cena y refrigerio.
Adapta el menú a una persona latinoamericana, especialmente al contexto de Perú. Usa platos,
preparaciones e ingredientes habituales y fáciles de encontrar aquí (por ejemplo avena, quinua, frutas
locales, pollo, pescado, menestras, arroz, papa, camote, choclo o verduras), sin forzar que todos los
platos sean tradicionales. Respeta fielmente el enfoque, objetivo y aplicación del plan activo.
Distribuye razonablemente las calorías y macros del día. Los valores son aproximados.
Devuelve únicamente JSON válido con esta forma:
{{"intro":"mensaje breve de CompAI","meals":[{{"category":"desayuno","name":"...","description":"...","calories":0,"protein":0,"carbs":0,"fat":0,"foods":["..."]}}]}}
Cada categoría debe aparecer una sola vez. No incluyas texto fuera del JSON.
"""
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json={
                "model": settings.GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": "Eres CompAI, nutricionista culinario práctico y cercano. Generas menús realistas en JSON."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.75,
                "max_completion_tokens": 1200,
                "response_format": {"type": "json_object"},
            },
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json", "User-Agent": "CompAI/1.0"},
            timeout=35,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return NutritionMenuResponse.model_validate(json.loads(content))
    except (requests.RequestException, KeyError, ValueError, json.JSONDecodeError) as error:
        logger.warning("Error generando menú de CompAI: %s", type(error).__name__)
        raise HTTPException(status_code=502, detail="CompAI no pudo generar el menú. Inténtalo nuevamente.") from error


@router.post("/nutrition-meal", response_model=NutritionMealResponse)
def create_nutrition_meal(
    data: NutritionMealRequest,
    usuario: Usuario = Depends(get_current_user),
):
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="CompAI todavía no tiene configurada la conexión con Groq.")

    previous = (
        f"La recomendación anterior fue '{data.previous_suggestion}'. Propón una opción claramente diferente."
        if data.previous_suggestion
        else ""
    )
    prompt = f"""
Recomienda solamente un {data.category} para {usuario.nombre}, siguiendo fielmente su plan nutricional activo.
Plan: {data.plan_name}.
En qué consiste: {data.plan_description}.
Objetivo del plan: {data.plan_goal or 'mantener una alimentación coherente con el enfoque descrito'}.
Cómo se aplica: {data.plan_guidance or 'priorizando variedad y porciones razonables'}.
Distribución de macros del plan: {data.macro_distribution or 'usa las metas indicadas'}.
Meta diaria: {data.daily_calories} kcal, {data.protein_target} g de proteína,
{data.carbs_target} g de carbohidratos y {data.fat_target} g de grasas.
Alimentos recomendados: {', '.join(data.recommended_foods) or 'variados'}.
Alimentos a moderar: {', '.join(data.foods_to_moderate) or 'ninguno indicado'}.
Preferencia actual: {data.preference or 'sin preferencia adicional'}.
{previous}

La propuesta está dirigida a una persona latinoamericana y debe ser especialmente realista en Perú.
Usa sabores, platos, ingredientes, nombres y porciones habituales de Latinoamérica, fáciles de conseguir
en mercados y supermercados peruanos. Puede ser un plato peruano, latinoamericano o una preparación
cotidiana adaptada al plan; evita comidas estadounidenses poco comunes aquí. Calcula valores aproximados
coherentes para una sola comida. Devuelve únicamente JSON válido con esta forma:
{{"message":"explicación breve y cercana de por qué encaja en el plan","meal":{{"category":"{data.category}","name":"...","description":"...","calories":0,"protein":0,"carbs":0,"fat":0,"foods":["..."]}}}}
No cambies la categoría y no incluyas texto fuera del JSON.
"""
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json={
                "model": settings.GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": "Eres CompAI, asesor culinario práctico para usuarios en Perú. Respondes en JSON."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.9,
                "max_completion_tokens": 550,
                "response_format": {"type": "json_object"},
            },
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json", "User-Agent": "CompAI/1.0"},
            timeout=35,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        result = NutritionMealResponse.model_validate(json.loads(content))
        if result.meal.category != data.category:
            raise ValueError("Groq devolvió una categoría distinta")
        return result
    except (requests.RequestException, KeyError, ValueError, json.JSONDecodeError) as error:
        logger.warning("Error generando recomendación de %s: %s", data.category, type(error).__name__)
        raise HTTPException(status_code=502, detail=f"CompAI no pudo crear el {data.category}. Inténtalo nuevamente.") from error


@router.post("/review-nutrition", response_model=NutritionReviewResponse)
def review_nutrition(
    data: NutritionReviewRequest,
    usuario: Usuario = Depends(get_current_user),
):
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="CompAI todavía no tiene configurada la conexión con Groq.")

    prompt = f"""
Revisa una estimación nutricional obtenida de una base de datos para una comida descrita por una persona en Perú.
Descripción original: {data.food_text}.
Cantidad indicada: {data.quantity or 'una porción estándar'}.
Nombre detectado: {data.detected_name}.
Estimación base: {data.calories} kcal, {data.protein} g proteína, {data.carbs} g carbohidratos y {data.fat} g grasa.

Corrige solamente cuando la porción, los ingredientes habituales del plato latinoamericano/peruano o la
coherencia energética lo justifiquen. Verifica que las kcal sean razonablemente compatibles con
4 kcal/g de proteína, 4 kcal/g de carbohidrato y 9 kcal/g de grasa, considerando redondeos, fibra y otros
componentes. No inventes una precisión imposible. Devuelve una estimación única y realista para la porción indicada.
Responde únicamente JSON válido:
{{"name":"nombre claro del plato","calories":0,"protein":0,"carbs":0,"fat":0,"confidence":0.0,"explanation":"qué revisaste y por qué, en una frase breve"}}
"""
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json={
                "model": settings.GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": "Eres CompAI. Revisas estimaciones nutricionales con prudencia, coherencia matemática y contexto alimentario latinoamericano. Respondes en JSON."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.25,
                "max_completion_tokens": 450,
                "response_format": {"type": "json_object"},
            },
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json", "User-Agent": "CompAI/1.0"},
            timeout=35,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return NutritionReviewResponse.model_validate(json.loads(content))
    except (requests.RequestException, KeyError, ValueError, json.JSONDecodeError) as error:
        logger.warning("Error revisando nutrición con CompAI: %s", type(error).__name__)
        raise HTTPException(status_code=502, detail="CompAI no pudo completar la revisión nutricional. Inténtalo nuevamente.") from error


_SENSOR_LABELS = {
    "MOVIMIENTO": "Movimiento (distancia recorrida, sensor MPU6050)",
    "CALIDAD_AIRE": "Calidad de aire (CO2, sensor CCS811)",
    "AMBIENTE": "Ambiente (temperatura y humedad, sensor DHT11)",
}

# Cuanto tiene que cambiar el promedio (mitad reciente vs mitad antigua del
# historial guardado) para considerarlo una tendencia real y no solo ruido.
_DEADBAND_TENDENCIA = {
    "MOVIMIENTO": 0.05,   # metros
    "CALIDAD_AIRE": 15.0,  # ppm
    "AMBIENTE": 0.5,      # °C
}


def _calcular_estadisticas_historial(historial: list[SensorHistorialLectura]) -> dict[str, dict]:
    """
    Agrupa el historial guardado por tipo de sensor y calcula estadisticas y
    tendencia de forma deterministica (no se le pide a la IA que haga esta
    cuenta, para que el resultado sea siempre exacto).
    """
    por_tipo: dict[str, list[SensorHistorialLectura]] = defaultdict(list)
    for lectura in historial:
        por_tipo[lectura.tipo_sensor].append(lectura)

    estadisticas: dict[str, dict] = {}
    for tipo, lecturas in por_tipo.items():
        ordenadas = sorted(lecturas, key=lambda l: l.creado_en)
        valores = [l.valor for l in ordenadas]
        count = len(valores)

        tendencia = "sin_datos"
        if count >= 2:
            mitad = max(1, count // 2)
            promedio_inicial = sum(valores[:mitad]) / mitad
            promedio_final = sum(valores[-mitad:]) / mitad
            diferencia = promedio_final - promedio_inicial
            deadband = _DEADBAND_TENDENCIA.get(tipo, 0)
            if abs(diferencia) < deadband:
                tendencia = "estable"
            else:
                tendencia = "subiendo" if diferencia > 0 else "bajando"

        estadisticas[tipo] = {
            "count": count,
            "promedio": round(sum(valores) / count, 3),
            "minimo": min(valores),
            "maximo": max(valores),
            "primera_fecha": ordenadas[0].creado_en,
            "ultima_fecha": ordenadas[-1].creado_en,
            "unidad": ordenadas[0].unidad,
            "tendencia": tendencia,
        }
    return estadisticas


@router.post("/sensor-insight", response_model=SensorInsightResponse)
def create_sensor_insight(
    data: SensorInsightRequest,
    usuario: Usuario = Depends(get_current_user),
):
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="CompAI todavía no tiene configurada la conexión con Groq.")

    lecturas_texto = "\n".join(
        f"- {_SENSOR_LABELS.get(metrica.tipo_sensor, metrica.tipo_sensor)}: {metrica.valor} {metrica.unidad}"
        + (f" (datos adicionales: {metrica.metadatos})" if metrica.metadatos else "")
        for metrica in data.metricas
    )
    tipos_presentes = ", ".join(metrica.tipo_sensor for metrica in data.metricas)

    estadisticas_historial = _calcular_estadisticas_historial(data.historial)
    if estadisticas_historial:
        historial_texto = "\n".join(
            f"- {_SENSOR_LABELS.get(tipo, tipo)}: {stats['count']} lecturas guardadas entre "
            f"{stats['primera_fecha'].strftime('%d/%m %H:%M')} y {stats['ultima_fecha'].strftime('%d/%m %H:%M')}, "
            f"promedio {stats['promedio']} {stats['unidad']} (mín {stats['minimo']}, máx {stats['maximo']}), "
            f"tendencia calculada: {stats['tendencia']}"
            for tipo, stats in estadisticas_historial.items()
        )
    else:
        historial_texto = "Todavía no hay lecturas guardadas en el historial de este usuario."

    prompt = f"""
Estas son las lecturas actuales del equipo de sensores de {usuario.nombre} (un estudiante que usa CompAI
para monitorear su entorno y actividad mientras estudia):
{lecturas_texto}

Este es un resumen de su historial guardado (lecturas que el usuario decidió guardar antes), con la
tendencia ya calculada matemáticamente por el sistema (no la recalcules, úsala tal cual):
{historial_texto}

Para cada lectura actual, explica en una frase simple qué significa ese valor en la práctica (sin
tecnicismos), y da una recomendación breve y accionable relacionada a estudiar, descansar o el ambiente
donde está. Si hay historial disponible para ese tipo de sensor, menciona la tendencia (subiendo, bajando
o estable) en tu explicación o recomendación, como lo haría un experto que conoce el contexto del usuario.
Si no hay historial para un tipo, coméntalo solo con la lectura actual, sin inventar tendencias.
No menciones limitaciones técnicas de los sensores, precisión, calibración ni cómo funcionan por dentro:
habla de los valores con seguridad, como un hecho, sin advertencias ni disclaimers.
No inventes datos que no te di. Responde únicamente JSON válido con esta forma:
{{"resumen":"mensaje breve general sobre el estado actual considerando el historial si existe, maximo dos frases","metricas":[{{"tipo_sensor":"...","significado":"...","recomendacion":"..."}}]}}
El campo "metricas" debe tener exactamente una entrada por cada uno de estos tipos, en este orden: {tipos_presentes}.
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
                            "Eres CompAI, un asistente cercano que ayuda a estudiantes a interpretar datos de "
                            "sensores IoT (movimiento, calidad de aire, temperatura/humedad) en lenguaje simple, "
                            "con recomendaciones practicas y realistas, informadas por el historial cuando existe. "
                            "Nunca mencionas limitaciones tecnicas, precision ni calibracion de los sensores; "
                            "hablas de las lecturas con total seguridad. Respondes en español y solo en JSON."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.5,
                "max_completion_tokens": 800,
                "response_format": {"type": "json_object"},
            },
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json", "User-Agent": "CompAI/1.0"},
            timeout=35,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        narrativa = SensorInsightNarrative.model_validate(json.loads(content))
        if len(narrativa.metricas) != len(data.metricas):
            raise ValueError("Groq devolvió una cantidad de métricas distinta a la solicitada")

        metricas_finales = [
            SensorMetricInsight(
                tipo_sensor=item.tipo_sensor,
                significado=item.significado,
                recomendacion=item.recomendacion,
                tendencia=estadisticas_historial.get(item.tipo_sensor, {}).get("tendencia", "sin_datos"),
            )
            for item in narrativa.metricas
        ]
        return SensorInsightResponse(resumen=narrativa.resumen, metricas=metricas_finales)
    except (requests.RequestException, KeyError, ValueError, json.JSONDecodeError) as error:
        logger.warning("Error generando insight de sensores: %s", type(error).__name__)
        raise HTTPException(status_code=502, detail="CompAI no pudo analizar tus sensores. Inténtalo nuevamente.") from error


@router.post("/explicar-tarea", response_model=ExplicarTareaResponse)
def explicar_tarea(
    data: ExplicarTareaRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """
    Explica de que trata una tarea. Si el curso de la tarea vino de un
    documento subido por el usuario, usa el texto de ese documento como
    contexto para una explicacion mas precisa; si no, explica solo con el
    titulo/descripcion de la tarea.
    """
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="CompAI todavía no tiene configurada la conexión con Groq.")

    tarea = db.query(Tarea).filter(Tarea.id == data.tarea_id, Tarea.usuario_id == usuario.id).first()
    if not tarea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")

    contexto_documento = ""
    if tarea.curso_id:
        curso = db.query(Curso).filter(Curso.id == tarea.curso_id).first()
        if curso and curso.documento_id:
            documento = db.query(DocumentoAcademico).filter(DocumentoAcademico.id == curso.documento_id).first()
            if documento and documento.texto_extraido:
                contexto_documento = (
                    f"\n\nExtracto del documento del curso ({curso.nombre}), usalo como contexto si es "
                    f"relevante para esta tarea:\n{documento.texto_extraido[:6000]}"
                )

    prompt = f"""
Explica de forma simple y breve de que trata esta tarea academica, para que el estudiante entienda
que se le pide antes de empezar:

Titulo: {tarea.titulo}
Descripcion: {tarea.descripcion or "(sin descripcion adicional)"}
{contexto_documento}

Responde en un maximo de dos parrafos cortos, en español, con un tono cercano y directo. Si el
contexto del documento no menciona nada especifico sobre esta tarea, explica solo con el titulo y
la descripcion disponibles, sin inventar detalles que no esten ahi.
"""
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json={
                "model": settings.GROQ_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": "Eres CompAI, un asistente que ayuda a estudiantes a entender sus tareas academicas. Respondes en español, de forma clara y directa.",
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.5,
                "max_completion_tokens": 500,
            },
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json", "User-Agent": "CompAI/1.0"},
            timeout=30,
        )
        response.raise_for_status()
        mensaje = response.json()["choices"][0]["message"]["content"].strip()
        if not mensaje:
            raise ValueError("Groq devolvió una respuesta vacía")
        return ExplicarTareaResponse(explicacion=mensaje)
    except (requests.RequestException, KeyError, ValueError, json.JSONDecodeError) as error:
        logger.warning("Error explicando tarea con CompAI: %s", type(error).__name__)
        raise HTTPException(status_code=502, detail="CompAI no pudo explicar esta tarea. Inténtalo nuevamente.") from error
