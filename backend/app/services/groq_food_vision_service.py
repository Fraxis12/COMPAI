"""
Analiza una foto de comida con un modelo de vision open-source (Meta Llama 4 Scout)
servido por Groq, y devuelve una estimacion nutricional en el mismo formato que ya
usa el resto del flujo de "Registrar comida" (analisis por texto + revision CompAI).
"""
import base64
import json
import logging
import re

import requests

from app.core.config import settings
from app.schemas.nutrition import FoodPhotoAnalysisResponse

logger = logging.getLogger(__name__)

_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

_PROMPT = """
Identifica el plato de comida en esta foto y estima sus valores nutricionales para la porcion
que se ve en la imagen. Da contexto de comida latinoamericana/peruana cuando el plato lo sugiera.
Si la imagen no muestra comida reconocible, dilo en el campo "explicacion" y usa confidence bajo (0.1).
No inventes precision que no puedes tener a partir de una foto. Responde unicamente JSON valido,
sin bloques de codigo ni texto adicional, con esta forma exacta:
{"name":"nombre del plato","calories":0,"protein":0,"carbs":0,"fat":0,"confidence":0.0,"explicacion":"que identificaste y por que"}
"""


def _extraer_json(texto: str) -> dict:
    limpio = texto.strip()
    limpio = re.sub(r"^```(?:json)?\s*", "", limpio)
    limpio = re.sub(r"\s*```$", "", limpio)
    return json.loads(limpio)


def analizar_foto_comida(imagen_bytes: bytes, media_type: str) -> FoodPhotoAnalysisResponse:
    if not settings.GROQ_API_KEY:
        raise RuntimeError("El análisis de fotos todavía no está configurado.")

    imagen_b64 = base64.b64encode(imagen_bytes).decode("utf-8")

    try:
        respuesta = requests.post(
            _GROQ_URL,
            headers={
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.GROQ_VISION_MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": _PROMPT},
                            {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{imagen_b64}"}},
                        ],
                    }
                ],
                "max_tokens": 400,
            },
            timeout=30,
        )
        respuesta.raise_for_status()
        contenido = respuesta.json()["choices"][0]["message"]["content"]
        datos = _extraer_json(contenido)

        return FoodPhotoAnalysisResponse(
            name=datos["name"],
            displayName=datos["name"],
            calories=float(datos["calories"]),
            protein=float(datos["protein"]),
            carbs=float(datos["carbs"]),
            fat=float(datos["fat"]),
            confidence=float(datos.get("confidence", 0.5)),
            message=datos.get("explicacion", "Estimación generada a partir de la foto."),
        )
    except requests.RequestException as error:
        logger.warning("Error llamando a Groq (vision): %s", type(error).__name__)
        raise RuntimeError("No pudimos conectarnos con el servicio de análisis de fotos.") from error
    except (KeyError, ValueError, json.JSONDecodeError) as error:
        logger.warning("Respuesta inesperada del modelo de vision: %s", type(error).__name__)
        raise RuntimeError("No pudimos interpretar el análisis de la foto. Inténtalo de nuevo.") from error
