export interface RutinaBienestar {
  id: number;
  actividad: string;
  duracion_minutos: number;
  fecha: string;
  usuario_id: number;
}

export interface RutinaBienestarCrear {
  actividad: string;
  duracion_minutos: number;
  fecha: string;
  usuario_id: number;
}
