import { Usuario } from "../interfaces/user.interface";

export const mockUsers: Usuario[] = [
  {
    id: 1,
    nombre: "Francis Riverá",
    correo: "francis@app.test",
    preferencias: {
      tema: "claro",
      idioma: "es",
      notificaciones: true,
      objetivo_diario: "Balancear estudio, nutricion y bienestar"
    },
    creado_en: "2026-05-20T09:15:00.000Z"
  }
];
