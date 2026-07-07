"""
Schema que refleja EXACTAMENTE el JSON que arma `construirJSON()` en
sensor/main.cpp (firmware ESP32). No modificamos el firmware: el backend se
adapta a lo que el equipo ya envía.

Cada grupo es opcional porque el firmware solo lo incluye si ese sensor
respondio correctamente (ver mpu6050_ok / ccs811_ok / lectura valida de DHT11).
"""
from typing import Optional

from pydantic import BaseModel


class MpuLectura(BaseModel):
    accel_x: Optional[float] = None
    accel_y: Optional[float] = None
    accel_z: Optional[float] = None
    gyro_x: Optional[float] = None
    gyro_y: Optional[float] = None
    gyro_z: Optional[float] = None
    velocidad_m_s: Optional[float] = None
    distancia_m: Optional[float] = None


class AireLectura(BaseModel):
    co2_ppm: Optional[float] = None
    tvoc_ppb: Optional[float] = None


class AmbienteLectura(BaseModel):
    temperatura_c: Optional[float] = None
    humedad_pct: Optional[float] = None


class LecturaHardwareESP32(BaseModel):
    mpu: Optional[MpuLectura] = None
    aire: Optional[AireLectura] = None
    ambiente: Optional[AmbienteLectura] = None
    timestamp_ms: Optional[int] = None
