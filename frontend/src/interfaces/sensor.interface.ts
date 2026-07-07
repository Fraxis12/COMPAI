// Categorias del equipo real: MPU6050 (movimiento/odometro), CCS811 (calidad de aire) y DHT11 (ambiente).
export type TipoSensor = "MOVIMIENTO" | "CALIDAD_AIRE" | "AMBIENTE";

export interface SensorData {
  id: number;
  dispositivo_id: string;
  tipo_sensor: TipoSensor;
  valor: number;
  unidad: string;
  metadatos: Record<string, unknown> | null;
  usuario_id: number;
  timestamp: string;
}

export interface SensorDataCrear {
  dispositivo_id: string;
  tipo_sensor: TipoSensor;
  valor: number;
  unidad: string;
  metadatos?: Record<string, unknown> | null;
}

export interface SensorSnapshotMetric {
  tipo_sensor: TipoSensor;
  valor: number;
  unidad: string;
}

export interface SensorSnapshot {
  id: number;
  usuario_id: number;
  lecturas: SensorSnapshotMetric[];
  creado_en: string;
}

export interface SensorInsightMetricInput {
  tipo_sensor: TipoSensor;
  valor: number;
  unidad: string;
  metadatos?: Record<string, unknown>;
}

export interface SensorHistorialLecturaInput {
  tipo_sensor: TipoSensor;
  valor: number;
  unidad: string;
  creado_en: string;
}

export type TendenciaSensor = "subiendo" | "bajando" | "estable" | "sin_datos";

export interface SensorMetricInsight {
  tipo_sensor: TipoSensor;
  significado: string;
  recomendacion: string;
  tendencia: TendenciaSensor;
}

export interface SensorInsight {
  resumen: string;
  metricas: SensorMetricInsight[];
}
