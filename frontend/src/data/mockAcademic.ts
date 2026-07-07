import { Curso, Tarea } from "../interfaces/academic.interface";

export const mockCourses: Curso[] = [
  { id: 1, nombre: "Programación Móvil", descripcion: "Expo, React Native y patrones de UI móvil." },
  { id: 2, nombre: "Nutrición Aplicada", descripcion: "Seguimiento de macros, objetivos y hábitos alimentarios." },
  { id: 3, nombre: "Analítica IoT", descripcion: "Lecturas de sensores y tableros de bienestar." }
];

export const mockTasks: Tarea[] = [
  {
    id: 1,
    titulo: "Preparar prototipo de pantallas",
    descripcion: "Definir flujo principal de autenticación, inicio y módulos.",
    fecha_limite: "2026-06-04T18:00:00.000Z",
    estado: "pendiente",
    prioridad: "alta",
    curso_id: 1,
    usuario_id: 1
  },
  {
    id: 2,
    titulo: "Registrar comidas de la semana",
    descripcion: "Comparar consumo diario contra el plan nutricional.",
    fecha_limite: "2026-06-05T13:00:00.000Z",
    estado: "pendiente",
    prioridad: "media",
    curso_id: 2,
    usuario_id: 1
  },
  {
    id: 3,
    titulo: "Revisar métricas de sensores",
    descripcion: "Validar tendencia de peso y frecuencia cardíaca.",
    fecha_limite: "2026-06-03T20:30:00.000Z",
    estado: "completada",
    prioridad: "baja",
    curso_id: 3,
    usuario_id: 1
  }
];
