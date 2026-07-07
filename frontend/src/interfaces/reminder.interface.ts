export type TipoRecordatorio = "estudio" | "bienestar";

export interface Recordatorio {
  id: number;
  tipo: TipoRecordatorio;
  titulo: string;
  fecha_hora: string;
  usuario_id: number;
  enviado: boolean;
}

export interface RecordatorioCrear {
  tipo: TipoRecordatorio;
  titulo: string;
  fecha_hora: string;
  usuario_id: number;
}
