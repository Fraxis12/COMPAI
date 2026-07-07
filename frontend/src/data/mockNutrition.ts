import { Comida, PlanNutricional } from "../interfaces/nutrition.interface";

export const mockNutritionPlans: PlanNutricional[] = [
  {
    id: 1,
    tipo_dieta: "Mediterránea balanceada",
    objetivos: "Mantener energía estable para estudio y ejercicio ligero.",
    descripcion: "Priorizar proteína magra, verduras, grasas saludables y carbohidratos complejos.",
    usuario_id: 1,
    creado_en: "2026-05-28T08:00:00.000Z"
  }
];

export const mockMeals: Comida[] = [
  {
    id: 1,
    nombre: "Avena con fruta y yogurt",
    calorias: 420,
    proteinas: 22,
    carbohidratos: 58,
    grasas: 10,
    fecha: "2026-06-03T08:20:00.000Z",
    usuario_id: 1
  },
  {
    id: 2,
    nombre: "Pollo, arroz integral y ensalada",
    calorias: 680,
    proteinas: 46,
    carbohidratos: 72,
    grasas: 18,
    fecha: "2026-06-03T13:10:00.000Z",
    usuario_id: 1
  },
  {
    id: 3,
    nombre: "Batido de proteína",
    calorias: 240,
    proteinas: 28,
    carbohidratos: 18,
    grasas: 6,
    fecha: "2026-06-03T17:30:00.000Z",
    usuario_id: 1
  }
];
