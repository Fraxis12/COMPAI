"""
Schemas para la API moderna de nutrición.
"""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class FoodAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=2, max_length=300)
    quantity: Optional[str] = Field(None, max_length=80)
    locale: str = Field("es-PE", max_length=12)


class FoodAnalysisResponse(BaseModel):
    name: str
    originalText: str
    translatedText: str
    displayName: str
    calories: float
    protein: float
    carbs: float
    fat: float
    source: str
    translationProvider: Optional[str] = None
    confidence: Optional[float] = None
    isApproximate: bool = True
    message: str
    notFoundFoods: list[str] = Field(default_factory=list)


class FoodPhotoAnalysisResponse(BaseModel):
    name: str
    displayName: str
    calories: float
    protein: float
    carbs: float
    fat: float
    confidence: float = Field(..., ge=0, le=1)
    isApproximate: bool = True
    message: str
    source: str = "CompAI (foto)"


class FoodLogCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    calories: float = Field(..., ge=0)
    protein: float = Field(0, ge=0)
    carbs: float = Field(0, ge=0)
    fat: float = Field(0, ge=0)
    source: Optional[str] = Field(None, max_length=80)
    loggedAt: Optional[datetime] = None


class FoodLogResponse(FoodLogCreate):
    id: int
    loggedAt: datetime


class MacroTarget(BaseModel):
    consumed: float
    target: float
    percent: int


class DailySummaryResponse(BaseModel):
    calories: MacroTarget
    protein: MacroTarget
    carbs: MacroTarget
    fat: MacroTarget
    mealsLogged: int


class NutritionMealPlan(BaseModel):
    id: str
    name: str
    description: str
    calories: float
    protein: float
    carbs: float
    fat: float


class NutritionPlanResponse(BaseModel):
    id: str
    name: str
    description: str
    recommendedGoal: str
    caloriesTarget: float
    proteinTarget: float
    carbsTarget: float
    fatTarget: float
    mealsPerDay: int
    macroDistribution: dict[str, int]
    source: str
    difficulty: Literal["Facil", "Intermedio"]
    tag: str
    generalRecommendation: str
    meals: list[NutritionMealPlan]
    recommendedFoods: list[str]
    foodsToModerate: list[str]


class SelectPlanRequest(BaseModel):
    planId: str
    mode: Literal["today", "tomorrow"] = "today"


class ActivePlanResponse(BaseModel):
    activePlan: Optional[NutritionPlanResponse] = None
    nextPlan: Optional[NutritionPlanResponse] = None
    message: Optional[str] = None
