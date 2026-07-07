"""
API moderna de nutrición para app móvil.
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.comida import Comida
from app.models.usuario import Usuario
from app.schemas.nutrition import (
    ActivePlanResponse,
    DailySummaryResponse,
    FoodAnalysisRequest,
    FoodAnalysisResponse,
    FoodLogCreate,
    FoodLogResponse,
    FoodPhotoAnalysisResponse,
    NutritionPlanResponse,
    SelectPlanRequest,
)
from app.services import groq_food_vision_service
from app.services.nutrition_analysis_service import nutrition_analysis_service
from app.services.nutrition_catalog import PUBLIC_NUTRITION_GUIDELINE_PLANS, get_plan
from app.services.nutrition_progress_service import get_daily_summary, get_today_logs

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/nutrition", tags=["Nutrición"])

_TIPOS_FOTO_ACEPTADOS = {"image/jpeg", "image/png", "image/webp"}
_TAMANO_MAXIMO_FOTO = 8 * 1024 * 1024


def _food_log_response(comida: Comida) -> FoodLogResponse:
    return FoodLogResponse(
        id=comida.id,
        name=comida.nombre,
        calories=comida.calorias,
        protein=comida.proteinas,
        carbs=comida.carbohidratos,
        fat=comida.grasas,
        source=None,
        loggedAt=comida.fecha,
    )


@router.post("/analyze-food", response_model=FoodAnalysisResponse)
def analyze_food(datos: FoodAnalysisRequest, usuario: Usuario = Depends(get_current_user)):
    return nutrition_analysis_service.analyze_food_text(datos.text, datos.quantity, datos.locale)


@router.post("/analyze-food-photo", response_model=FoodPhotoAnalysisResponse)
async def analyze_food_photo(
    foto: UploadFile = File(...),
    usuario: Usuario = Depends(get_current_user),
):
    """Analiza una foto de comida con un modelo de visión y estima sus valores nutricionales."""
    if foto.content_type not in _TIPOS_FOTO_ACEPTADOS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Solo se aceptan fotos JPEG, PNG o WEBP.")

    contenido = await foto.read()
    if not contenido:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La foto está vacía.")
    if len(contenido) > _TAMANO_MAXIMO_FOTO:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La foto supera el límite de 8 MB.")

    try:
        return groq_food_vision_service.analizar_foto_comida(contenido, foto.content_type)
    except RuntimeError as error:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(error)) from error
    except Exception as error:
        logger.warning("Error inesperado analizando foto de comida: %s", type(error).__name__)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "No pudimos analizar la foto. Inténtalo de nuevo.") from error


@router.post("/food-logs", response_model=FoodLogResponse, status_code=status.HTTP_201_CREATED)
def create_food_log(datos: FoodLogCreate, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    comida = Comida(
        usuario_id=usuario.id,
        nombre=datos.name.strip(),
        calorias=datos.calories,
        proteinas=datos.protein,
        carbohidratos=datos.carbs,
        grasas=datos.fat,
        fecha=datos.loggedAt or datetime.now(timezone.utc),
    )
    db.add(comida)
    db.commit()
    db.refresh(comida)
    return _food_log_response(comida)


@router.get("/food-logs/today", response_model=list[FoodLogResponse])
def food_logs_today(db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return [_food_log_response(comida) for comida in get_today_logs(db, usuario.id)]


@router.get("/daily-summary", response_model=DailySummaryResponse)
def daily_summary(db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return get_daily_summary(db, usuario)


@router.get("/plans", response_model=list[NutritionPlanResponse])
def plans(usuario: Usuario = Depends(get_current_user)):
    return PUBLIC_NUTRITION_GUIDELINE_PLANS


@router.post("/plans/select", response_model=ActivePlanResponse)
def select_plan(datos: SelectPlanRequest, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    plan = get_plan(datos.planId)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan nutricional no encontrado")

    preferencias = dict(usuario.preferencias or {})
    if datos.mode == "tomorrow":
        preferencias["next_nutrition_plan_id"] = datos.planId
        usuario.preferencias = preferencias
        db.commit()
        return ActivePlanResponse(
            activePlan=get_plan(preferencias.get("active_nutrition_plan_id", "")),
            nextPlan=plan,
            message="Tu nuevo plan empezará mañana.",
        )

    preferencias["active_nutrition_plan_id"] = datos.planId
    preferencias.pop("next_nutrition_plan_id", None)
    usuario.preferencias = preferencias
    db.commit()
    return ActivePlanResponse(activePlan=plan, nextPlan=None)


@router.get("/active-plan", response_model=ActivePlanResponse)
def active_plan(usuario: Usuario = Depends(get_current_user)):
    preferencias = usuario.preferencias or {}
    return ActivePlanResponse(
        activePlan=get_plan(preferencias.get("active_nutrition_plan_id", "")),
        nextPlan=get_plan(preferencias.get("next_nutrition_plan_id", "")),
    )
