export type EstadoTarea = "pendiente" | "completada";
export type PrioridadTarea = "baja" | "media" | "alta";

export interface Curso {
  id: number;
  nombre: string;
  descripcion: string | null;
  usuario_id?: number | null;
}

export interface Tarea {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha_limite: string | null;
  estimacion_minutos?: number;
  estado: EstadoTarea;
  prioridad: PrioridadTarea;
  completada_en?: string | null;
  curso_id: number | null;
  usuario_id: number;
}

export interface CursoConTareas extends Curso {
  tareas: Tarea[];
}

export interface CursoCrear {
  nombre: string;
  descripcion?: string | null;
  usuario_id?: number | null;
}

export interface TareaCrear {
  titulo: string;
  descripcion?: string | null;
  fecha_limite?: string | null;
  estimacion_minutos?: number;
  estado?: EstadoTarea;
  prioridad?: PrioridadTarea;
  curso_id?: number | null;
  usuario_id: number;
}
