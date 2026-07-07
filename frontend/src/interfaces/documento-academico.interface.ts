export type EstadoDocumento = "procesando" | "procesado" | "error";

export interface DocumentoAcademico {
  id: number;
  nombre_archivo: string;
  estado: EstadoDocumento;
  error_mensaje: string | null;
  cursos_creados: number;
  creado_en: string;
}
