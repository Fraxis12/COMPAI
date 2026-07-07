"""
Proveedor Edamam para análisis de texto libre.
"""
import json
import urllib.error
import urllib.parse
import urllib.request

from app.core.config import settings
from app.schemas.nutrition import FoodAnalysisResponse
from app.services.nutrition_provider_interface import NutritionProvider, NutritionProviderNotConfigured


class EdamamNutritionProvider(NutritionProvider):
    name = "Edamam"

    def _configured(self) -> bool:
        return bool(settings.EDAMAM_APP_ID and settings.EDAMAM_APP_KEY)

    def analyze_food_text(self, text: str, quantity: str | None, locale: str) -> FoodAnalysisResponse:
        if not self._configured():
            raise NutritionProviderNotConfigured("Servicio nutricional no configurado.")

        ingr = f"{quantity} {text}".strip() if quantity else text.strip()
        query = urllib.parse.urlencode({
            "app_id": settings.EDAMAM_APP_ID,
            "app_key": settings.EDAMAM_APP_KEY,
            "nutrition-type": "cooking",
            "ingr": ingr,
        })
        request = urllib.request.Request(
            f"https://api.edamam.com/api/nutrition-data?{query}",
            headers={"Accept": "application/json"},
        )

        try:
            with urllib.request.urlopen(request, timeout=12) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.URLError as exc:
            raise RuntimeError("No pudimos conectar con el servicio nutricional.") from exc

        calories = float(payload.get("calories") or 0)
        total = payload.get("totalNutrients") or {}
        if calories <= 0 or not total:
            raise ValueError("No encontramos resultados nutricionales para esa comida.")

        return FoodAnalysisResponse(
            name=text.strip(),
            originalText=text.strip(),
            translatedText=text.strip(),
            displayName=text.strip(),
            calories=round(calories, 1),
            protein=round(float(total.get("PROCNT", {}).get("quantity") or 0), 1),
            carbs=round(float(total.get("CHOCDF", {}).get("quantity") or 0), 1),
            fat=round(float(total.get("FAT", {}).get("quantity") or 0), 1),
            source=self.name,
            translationProvider=None,
            confidence=0.82,
            isApproximate=True,
            message="Valores aproximados. Puedes editarlos antes de guardar.",
        )

    def search_food(self, query: str) -> list[dict]:
        if not self._configured():
            raise NutritionProviderNotConfigured("Servicio nutricional no configurado.")
        return []

    def get_food_nutrition(self, food_id: str) -> FoodAnalysisResponse:
        if not self._configured():
            raise NutritionProviderNotConfigured("Servicio nutricional no configurado.")
        raise ValueError("Busqueda por ID no implementada para Edamam.")
