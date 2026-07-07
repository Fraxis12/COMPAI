export interface UserPreferences {
  tema?: "claro" | "oscuro";
  idioma?: string;
  notificaciones?: boolean;
  objetivo_diario?: string;
  tono_compai?: string;
  respuestas_breves?: boolean;
  nombre_compai?: string;
  movimiento_offset?: number;
}

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  preferencias: UserPreferences | null;
  creado_en: string;
}

export interface UsuarioCrear {
  nombre: string;
  correo: string;
  preferencias?: UserPreferences | null;
}
