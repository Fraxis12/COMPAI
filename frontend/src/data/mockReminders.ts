import { Recordatorio } from "../interfaces/reminder.interface";

export const mockReminders: Recordatorio[] = [
  {
    id: 1,
    tipo: "estudio",
    titulo: "Repasar tareas pendientes",
    fecha_hora: "2026-06-03T21:00:00.000Z",
    usuario_id: 1,
    enviado: false
  },
  {
    id: 2,
    tipo: "bienestar",
    titulo: "Pausa activa y respiración",
    fecha_hora: "2026-06-04T10:30:00.000Z",
    usuario_id: 1,
    enviado: false
  }
];
