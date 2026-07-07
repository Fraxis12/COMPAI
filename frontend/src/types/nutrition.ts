export type NutritionPlanDifficulty = "Fácil" | "Facil" | "Intermedio";

export interface MacroDistribution {
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

export interface NutritionMealReference {
  id: string;
  nombre: string;
  descripcion: string;
  caloriasAprox: number;
  proteinasG: number;
  carbohidratosG: number;
  grasasG: number;
}

export interface DailyNutritionTargets {
  calorias: number;
  proteinasG: number;
  carbohidratosG: number;
  grasasG: number;
  comidas: number;
}

export interface NutritionReferenceSource {
  nombre: string;
  descripcion: string;
  url?: string;
}

export interface CuratedNutritionPlan {
  id: string;
  nombre: string;
  descripcion: string;
  objetivoRecomendado: string;
  caloriasAproximadas: string;
  objetivosDiarios: DailyNutritionTargets;
  comidasPorDia: number;
  macros: MacroDistribution;
  fuente: NutritionReferenceSource;
  dificultad: NutritionPlanDifficulty;
  etiqueta: string;
  recomendacionGeneral: string;
  comidas: NutritionMealReference[];
  alimentosRecomendados: string[];
  alimentosAModerar: string[];
}

export interface DailyNutritionMeal extends NutritionMealReference {
  estado: "pendiente" | "consumida";
}

export interface ConsumedNutrition {
  calorias: number;
  proteinasG: number;
  carbohidratosG: number;
  grasasG: number;
  comidasConsumidas: number;
}

export interface NutritionProgress {
  consumed: number;
  target: number;
  percent: number;
}

export interface NutritionProviderIntegration {
  id: "open-food-facts" | "usda-fooddata-central";
  nombre: string;
  estado: "preparado";
  requiereBackendSeguro: boolean;
  descripcion: string;
}

export interface FoodAnalysisResult {
  name: string;
  originalText: string;
  translatedText: string;
  displayName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: string;
  translationProvider?: string | null;
  confidence?: number | null;
  isApproximate: boolean;
  message: string;
  notFoundFoods?: string[];
  reviewedByCompAI?: boolean;
  reviewExplanation?: string;
  baseCalories?: number;
}

export interface FoodPhotoAnalysisResult {
  name: string;
  displayName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  isApproximate: boolean;
  message: string;
  source: string;
}

export interface AINutritionReview {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  explanation: string;
}

export interface FoodLog {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source?: string | null;
  loggedAt: string;
}

export interface AINutritionMenuMeal {
  category: "desayuno" | "almuerzo" | "cena" | "refrigerio";
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foods: string[];
}

export interface AINutritionMenu {
  intro: string;
  meals: AINutritionMenuMeal[];
}

export interface AINutritionMealRecommendation {
  message: string;
  meal: AINutritionMenuMeal;
}
