import { publicNutritionGuidelinePlans } from "../data/nutritionPlans";
import {
  ConsumedNutrition,
  CuratedNutritionPlan,
  DailyNutritionMeal,
  DailyNutritionTargets,
  NutritionProgress,
  NutritionProviderIntegration
} from "../types/nutrition";

export const nutritionReferenceIntegrations: NutritionProviderIntegration[] = [
  {
    id: "open-food-facts",
    nombre: "Open Food Facts",
    estado: "preparado",
    requiereBackendSeguro: false,
    descripcion: "Preparado para consultar productos y etiquetas nutricionales abiertas."
  },
  {
    id: "usda-fooddata-central",
    nombre: "USDA FoodData Central",
    estado: "preparado",
    requiereBackendSeguro: true,
    descripcion: "Preparado para consultar nutrientes desde un backend seguro, sin exponer API keys en el frontend."
  }
];

export function getPublicNutritionGuidelinePlans(): CuratedNutritionPlan[] {
  return publicNutritionGuidelinePlans;
}

export function getNutritionPlanById(planId: string): CuratedNutritionPlan | undefined {
  return publicNutritionGuidelinePlans.find((plan) => plan.id === planId);
}

export function prepareNutritionPlanPersistence(planId: string) {
  return {
    planId,
    source: "local-guideline-catalog",
    selectedAt: new Date().toISOString()
  };
}

const progressPercent = (consumed: number, target: number) => {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((consumed / target) * 100)));
};

export function calculateConsumedNutrition(meals: DailyNutritionMeal[]): ConsumedNutrition {
  return meals
    .filter((meal) => meal.estado === "consumida")
    .reduce(
      (total, meal) => ({
        calorias: total.calorias + meal.caloriasAprox,
        proteinasG: total.proteinasG + meal.proteinasG,
        carbohidratosG: total.carbohidratosG + meal.carbohidratosG,
        grasasG: total.grasasG + meal.grasasG,
        comidasConsumidas: total.comidasConsumidas + 1
      }),
      { calorias: 0, proteinasG: 0, carbohidratosG: 0, grasasG: 0, comidasConsumidas: 0 }
    );
}

export function getDailyCaloriesProgress(consumed: number, target: number): NutritionProgress {
  return {
    consumed,
    target,
    percent: progressPercent(consumed, target)
  };
}

export function getMacroProgress(consumed: number, target: number): NutritionProgress {
  return {
    consumed,
    target,
    percent: progressPercent(consumed, target)
  };
}

export function resetTodayNutritionProgress(plan: CuratedNutritionPlan): DailyNutritionMeal[] {
  return plan.comidas.map((meal) => ({ ...meal, estado: "pendiente" }));
}

export function selectActiveNutritionPlan(planId: string) {
  const plan = getNutritionPlanById(planId);
  if (!plan) return null;

  return {
    plan,
    targets: plan.objetivosDiarios satisfies DailyNutritionTargets,
    meals: resetTodayNutritionProgress(plan),
    persistence: prepareNutritionPlanPersistence(planId)
  };
}
