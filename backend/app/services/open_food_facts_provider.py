"""
Proveedor Open Food Facts preparado para productos empaquetados.
"""
from app.schemas.nutrition import FoodAnalysisResponse
from app.services.nutrition_provider_interface import NutritionProvider


class OpenFoodFactsProvider(NutritionProvider):
    name = "Open Food Facts"

    def analyze_food_text(self, text: str, quantity: str | None, locale: str) -> FoodAnalysisResponse:
        raise ValueError("Open Food Facts esta preparado para productos o codigos de barra, no texto libre.")

    def search_food(self, query: str) -> list[dict]:
        return []

    def get_food_nutrition(self, food_id: str) -> FoodAnalysisResponse:
        raise ValueError("Busqueda por ID no implementada para Open Food Facts.")
