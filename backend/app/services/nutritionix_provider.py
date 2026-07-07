"""
Proveedor Nutritionix preparado para texto libre.
"""
from app.core.config import settings
from app.schemas.nutrition import FoodAnalysisResponse
from app.services.nutrition_provider_interface import NutritionProvider, NutritionProviderNotConfigured


class NutritionixProvider(NutritionProvider):
    name = "Nutritionix"

    def _configured(self) -> bool:
        return bool(settings.NUTRITIONIX_APP_ID and settings.NUTRITIONIX_APP_KEY)

    def analyze_food_text(self, text: str, quantity: str | None, locale: str) -> FoodAnalysisResponse:
        if not self._configured():
            raise NutritionProviderNotConfigured("Servicio nutricional no configurado.")
        raise ValueError("Nutritionix esta preparado, pero Edamam es el proveedor principal para esta ruta.")

    def search_food(self, query: str) -> list[dict]:
        if not self._configured():
            raise NutritionProviderNotConfigured("Servicio nutricional no configurado.")
        return []

    def get_food_nutrition(self, food_id: str) -> FoodAnalysisResponse:
        if not self._configured():
            raise NutritionProviderNotConfigured("Servicio nutricional no configurado.")
        raise ValueError("Busqueda por ID no implementada para Nutritionix.")
