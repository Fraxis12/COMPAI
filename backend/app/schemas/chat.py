from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1, max_length=30)


class ChatResponse(BaseModel):
    message: str


class ExplicarTareaRequest(BaseModel):
    tarea_id: int = Field(..., gt=0)


class ExplicarTareaResponse(BaseModel):
    explicacion: str


class NutritionMenuRequest(BaseModel):
    plan_name: str = Field(..., min_length=1, max_length=150)
    plan_description: str = Field(..., min_length=1, max_length=1000)
    plan_goal: str = Field(default="", max_length=500)
    plan_guidance: str = Field(default="", max_length=1000)
    macro_distribution: str = Field(default="", max_length=200)
    daily_calories: int = Field(..., ge=500, le=6000)
    protein_target: float = Field(..., ge=0, le=500)
    carbs_target: float = Field(..., ge=0, le=1000)
    fat_target: float = Field(..., ge=0, le=500)
    recommended_foods: list[str] = Field(default_factory=list, max_length=40)
    foods_to_moderate: list[str] = Field(default_factory=list, max_length=40)
    preference: str = Field(default="", max_length=300)


class NutritionMenuMeal(BaseModel):
    category: Literal["desayuno", "almuerzo", "cena", "refrigerio"]
    name: str
    description: str
    calories: int
    protein: float
    carbs: float
    fat: float
    foods: list[str]


class NutritionMenuResponse(BaseModel):
    intro: str
    meals: list[NutritionMenuMeal] = Field(..., min_length=4, max_length=4)


class NutritionMealRequest(NutritionMenuRequest):
    category: Literal["desayuno", "almuerzo", "cena", "refrigerio"]
    previous_suggestion: str = Field(default="", max_length=250)


class NutritionMealResponse(BaseModel):
    message: str
    meal: NutritionMenuMeal


class NutritionReviewRequest(BaseModel):
    food_text: str = Field(..., min_length=2, max_length=300)
    quantity: str = Field(default="", max_length=80)
    detected_name: str = Field(..., min_length=1, max_length=250)
    calories: float = Field(..., ge=0, le=10000)
    protein: float = Field(..., ge=0, le=1000)
    carbs: float = Field(..., ge=0, le=2000)
    fat: float = Field(..., ge=0, le=1000)


class NutritionReviewResponse(BaseModel):
    name: str
    calories: float
    protein: float
    carbs: float
    fat: float
    confidence: float = Field(..., ge=0, le=1)
    explanation: str


class SensorMetricInput(BaseModel):
    tipo_sensor: Literal["MOVIMIENTO", "CALIDAD_AIRE", "AMBIENTE"]
    valor: float
    unidad: str = Field(..., max_length=20)
    metadatos: dict = Field(default_factory=dict)


class SensorHistorialLectura(BaseModel):
    tipo_sensor: Literal["MOVIMIENTO", "CALIDAD_AIRE", "AMBIENTE"]
    valor: float
    unidad: str = Field(..., max_length=20)
    creado_en: datetime


class SensorInsightRequest(BaseModel):
    metricas: list[SensorMetricInput] = Field(..., min_length=1, max_length=3)
    # Lecturas guardadas por el usuario (pantalla "Historial guardado"), para que
    # el analisis considere tendencias y no solo el momento actual.
    historial: list[SensorHistorialLectura] = Field(default_factory=list, max_length=60)


class SensorMetricNarrative(BaseModel):
    tipo_sensor: Literal["MOVIMIENTO", "CALIDAD_AIRE", "AMBIENTE"]
    significado: str
    recomendacion: str


class SensorInsightNarrative(BaseModel):
    """Forma en la que Groq responde: solo texto, sin la tendencia (esa se calcula en código)."""
    resumen: str
    metricas: list[SensorMetricNarrative]


class SensorMetricInsight(BaseModel):
    tipo_sensor: Literal["MOVIMIENTO", "CALIDAD_AIRE", "AMBIENTE"]
    significado: str
    recomendacion: str
    tendencia: Literal["subiendo", "bajando", "estable", "sin_datos"]


class SensorInsightResponse(BaseModel):
    resumen: str
    metricas: list[SensorMetricInsight]
