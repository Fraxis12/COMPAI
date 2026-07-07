"""
Servicio de análisis nutricional con respuesta normalizada.
"""
from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.nutrition import FoodAnalysisResponse
from app.services.edamam_nutrition_provider import EdamamNutritionProvider
from app.services.nutrition_provider_interface import NutritionProviderNotConfigured
from app.services.argos_translate_provider import TranslationServiceError
from app.services.usda_food_data_provider import USDAFoodDataProvider


class NutritionAnalysisService:
    def __init__(self):
        provider = settings.NUTRITION_PROVIDER.strip().upper()
        if provider == "EDAMAM":
            self.providers = [EdamamNutritionProvider()]
        else:
            self.providers = [USDAFoodDataProvider()]

    def analyze_food_text(self, text: str, quantity: str | None, locale: str) -> FoodAnalysisResponse:
        last_error: Exception | None = None
        for provider in self.providers:
            try:
                return provider.analyze_food_text(text, quantity, locale)
            except NutritionProviderNotConfigured as exc:
                last_error = exc
            except TranslationServiceError as exc:
                raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
            except ValueError as exc:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
            except RuntimeError as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="No pudimos consultar la base nutricional. Intenta nuevamente en unos segundos.",
                ) from exc

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(last_error or "Servicio nutricional no configurado."),
        )


nutrition_analysis_service = NutritionAnalysisService()
