"""
Servicio para resumen diario de nutrición.
"""
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session

from app.models.comida import Comida
from app.models.usuario import Usuario
from app.schemas.nutrition import DailySummaryResponse, MacroTarget
from app.services.nutrition_catalog import get_plan


def _percent(consumed: float, target: float) -> int:
    if target <= 0:
        return 0
    return max(0, min(100, round((consumed / target) * 100)))


def _target(consumed: float, target: float) -> MacroTarget:
    return MacroTarget(consumed=round(consumed, 1), target=round(target, 1), percent=_percent(consumed, target))


PERU_TIMEZONE = ZoneInfo("America/Lima")


def today_bounds() -> tuple[datetime, datetime]:
    """Devuelve el inicio inclusivo y el final exclusivo del día actual en Perú, expresados en UTC."""
    peru_today = datetime.now(PERU_TIMEZONE).date()
    start_peru = datetime.combine(peru_today, time.min, tzinfo=PERU_TIMEZONE)
    end_peru = start_peru + timedelta(days=1)
    return start_peru.astimezone(timezone.utc), end_peru.astimezone(timezone.utc)


def get_today_logs(db: Session, usuario_id: int) -> list[Comida]:
    start, end = today_bounds()
    return (
        db.query(Comida)
        .filter(Comida.usuario_id == usuario_id, Comida.fecha >= start, Comida.fecha < end)
        .order_by(Comida.fecha.desc())
        .all()
    )


def get_daily_summary(db: Session, usuario: Usuario) -> DailySummaryResponse:
    logs = get_today_logs(db, usuario.id)
    prefs = usuario.preferencias or {}
    plan = get_plan(prefs.get("active_nutrition_plan_id", ""))

    calories_target = plan.caloriesTarget if plan else 0
    protein_target = plan.proteinTarget if plan else 0
    carbs_target = plan.carbsTarget if plan else 0
    fat_target = plan.fatTarget if plan else 0

    calories = sum(log.calorias for log in logs)
    protein = sum(log.proteinas for log in logs)
    carbs = sum(log.carbohidratos for log in logs)
    fat = sum(log.grasas for log in logs)

    return DailySummaryResponse(
        calories=_target(calories, calories_target),
        protein=_target(protein, protein_target),
        carbs=_target(carbs, carbs_target),
        fat=_target(fat, fat_target),
        mealsLogged=len(logs),
    )
