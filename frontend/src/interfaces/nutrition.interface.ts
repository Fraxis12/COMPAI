export interface PlanNutricional {
  id: number;
  tipo_dieta: string;
  objetivos: string | null;
  descripcion: string | null;
  usuario_id: number;
  creado_en: string;
}

export interface Comida {
  id: number;
  nombre: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  fecha: string;
  usuario_id: number;
}

export interface PlanNutricionalCrear {
  tipo_dieta: string;
  objetivos?: string | null;
  descripcion?: string | null;
  usuario_id: number;
}

export interface ComidaCrear {
  nombre: string;
  calorias: number;
  proteinas?: number;
  carbohidratos?: number;
  grasas?: number;
  fecha: string;
  usuario_id: number;
}
