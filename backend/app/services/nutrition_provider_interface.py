"""
Contrato común para proveedores de nutrición.
"""
from abc import ABC, abstractmethod

from app.schemas.nutrition import FoodAnalysisResponse


class NutritionProvider(ABC):
    name: str

    @abstractmethod
    def analyze_food_text(self, text: str, quantity: str | None, locale: str) -> FoodAnalysisResponse:
        raise NotImplementedError

    @abstractmethod
    def search_food(self, query: str) -> list[dict]:
        raise NotImplementedError

    @abstractmethod
    def get_food_nutrition(self, food_id: str) -> FoodAnalysisResponse:
        raise NotImplementedError


class NutritionProviderNotConfigured(Exception):
    """El proveedor no tiene credenciales configuradas."""
