import { SensorData } from "../interfaces/sensor.interface";

export const mockSensorReadings: SensorData[] = [
  {
    id: 1,
    dispositivo_id: "esp32_sensores",
    tipo_sensor: "MOVIMIENTO",
    valor: 0.084,
    unidad: "m",
    metadatos: { velocidad_m_s: 0.021 },
    usuario_id: 1,
    timestamp: "2026-06-03T08:00:00.000Z"
  },
  {
    id: 2,
    dispositivo_id: "esp32_sensores",
    tipo_sensor: "CALIDAD_AIRE",
    valor: 480,
    unidad: "ppm",
    metadatos: { tvoc_ppb: 12 },
    usuario_id: 1,
    timestamp: "2026-06-03T08:05:00.000Z"
  },
  {
    id: 3,
    dispositivo_id: "esp32_sensores",
    tipo_sensor: "AMBIENTE",
    valor: 24.3,
    unidad: "°C",
    metadatos: { humedad_pct: 55.2 },
    usuario_id: 1,
    timestamp: "2026-06-03T07:45:00.000Z"
  }
];
