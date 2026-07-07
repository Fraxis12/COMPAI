"""
Proveedor USDA FoodData Central para alimentos comunes y nutrientes.
"""
import json
import re
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

from app.core.config import settings
from app.schemas.nutrition import FoodAnalysisResponse
from app.services.nutrition_provider_interface import NutritionProvider, NutritionProviderNotConfigured
from app.services.argos_translate_provider import get_translation_service


class USDAFoodDataProvider(NutritionProvider):
    name = "USDA FoodData Central"
    BASE_URL = "https://api.nal.usda.gov/fdc/v1"
    DEFAULT_GRAMS_PER_FOOD = 100
    STOP_WORDS = {
        "con", "y", "de", "del", "la", "el", "los", "las", "un", "una",
        "en", "al", "a", "mi", "taza", "plato", "porcion", "porción",
        "with", "and", "of", "the", "a", "an", "cup", "plate", "serving"
    }

    def _configured(self) -> bool:
        return bool(settings.USDA_API_KEY or settings.USDA_FOODDATA_API_KEY)

    def _api_key(self) -> str:
        return settings.USDA_API_KEY or settings.USDA_FOODDATA_API_KEY or ""

    def _normalize(self, value: str) -> str:
        without_accents = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
        return re.sub(r"\s+", " ", without_accents.lower()).strip()

    def _split_foods(self, text: str) -> list[str]:
        normalized = self._normalize(text)
        chunks = re.split(r",|\+|/|\bcon\b|\by\b", normalized)
        foods: list[str] = []
        for chunk in chunks:
            words = [word for word in re.findall(r"[a-zA-Z]+", chunk) if word not in self.STOP_WORDS]
            if words:
                food = " ".join(words).strip()
                if food and food not in foods:
                    foods.append(food)
        return foods[:8]

    def _request_json(self, path: str, params: dict, method: str = "GET") -> dict:
        query = urllib.parse.urlencode({"api_key": self._api_key()})
        data = None
        headers = {"Accept": "application/json"}
        if method == "POST":
            data = json.dumps(params).encode("utf-8")
            headers["Content-Type"] = "application/json"
            url = f"{self.BASE_URL}{path}?{query}"
        else:
            url = f"{self.BASE_URL}{path}?{urllib.parse.urlencode({**params, 'api_key': self._api_key()})}"
        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=12) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"USDA FoodData Central respondió {exc.code}. {detail[:180]}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"No pudimos conectar con USDA FoodData Central: {exc.reason}") from exc

    def _search_first_food(self, query: str) -> dict | None:
        payload = self._request_json("/foods/search", {
            "query": query,
            "pageSize": 1,
            "dataType": ["Foundation", "SR Legacy", "Survey (FNDDS)"],
        }, method="POST")
        foods = payload.get("foods") or []
        return foods[0] if foods else None

    def _nutrient(self, food: dict, nutrient_names: tuple[str, ...], preferred_unit: str | None = None) -> float:
        fallback = 0.0
        for nutrient in food.get("foodNutrients") or []:
            name = self._normalize(str(nutrient.get("nutrientName") or ""))
            if any(self._normalize(expected) in name for expected in nutrient_names):
                value = float(nutrient.get("value") or 0)
                unit = self._normalize(str(nutrient.get("unitName") or ""))
                if preferred_unit and self._normalize(preferred_unit) == unit:
                    return value
                if fallback == 0.0:
                    fallback = value
        return fallback

    def analyze_food_text(self, text: str, quantity: str | None, locale: str) -> FoodAnalysisResponse:
        if not self._configured():
            raise NutritionProviderNotConfigured("Servicio nutricional no configurado.")

        translated_text = get_translation_service().translate_to_english(text, locale)
        foods = self._split_foods(translated_text)
        if not foods:
            raise ValueError("No encontramos alimentos principales para analizar.")

        totals = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0}
        found: list[str] = []
        not_found: list[str] = []

        for food in foods:
            result = self._search_first_food(food)
            if not result:
                not_found.append(food)
                continue

            found.append(food)
            totals["calories"] += self._nutrient(result, ("energy", "energia"), preferred_unit="KCAL")
            totals["protein"] += self._nutrient(result, ("protein", "proteina"))
            totals["carbs"] += self._nutrient(result, ("carbohydrate", "carbohidrato"))
            totals["fat"] += self._nutrient(result, ("total lipid", "total fat", "fat", "grasa"))

        if not found:
            raise ValueError("No encontramos resultados nutricionales para esa comida.")

        used_standard_portion = not quantity or not quantity.strip()
        confidence = max(0.35, min(0.9, len(found) / len(foods)))
        message = "Estimación aproximada basada en alimentos encontrados en USDA FoodData Central. Puedes editar los valores antes de guardar."
        if used_standard_portion:
            message = "No se indicó cantidad. Se usó una porción estándar. " + message
        if not_found:
            message += f" No se encontraron: {', '.join(not_found)}."

        return FoodAnalysisResponse(
            name=text.strip(),
            originalText=text.strip(),
            translatedText=translated_text,
            displayName=text.strip(),
            calories=round(totals["calories"], 1),
            protein=round(totals["protein"], 1),
            carbs=round(totals["carbs"], 1),
            fat=round(totals["fat"], 1),
            source=self.name,
            translationProvider=get_translation_service().name,
            confidence=round(confidence, 2),
            isApproximate=True,
            message=message,
            notFoundFoods=not_found,
        )

    def search_food(self, query: str) -> list[dict]:
        if not self._configured():
            raise NutritionProviderNotConfigured("Servicio nutricional no configurado.")
        payload = self._request_json("/foods/search", {"query": query, "pageSize": 10}, method="POST")
        return payload.get("foods") or []

    def get_food_nutrition(self, food_id: str) -> FoodAnalysisResponse:
        if not self._configured():
            raise NutritionProviderNotConfigured("Servicio nutricional no configurado.")
        raise ValueError("Busqueda por ID no implementada para USDA.")
