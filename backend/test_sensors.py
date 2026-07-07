#!/usr/bin/env python3
"""
Script de prueba manual para verificar endpoints de sensores.
Ejecutar: python test_sensors.py (con el backend corriendo en BASE_URL)
"""
import time

import requests

BASE_URL = "http://localhost:8000"
API_KEY = "esp32_compa_sk_001"

HEADERS = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}


def test_post_sensor():
    """Test: POST /sensores/data"""
    print("\n[TEST] POST /sensores/data")

    payload = {
        "dispositivo_id": "esp32_sensores",
        "tipo_sensor": "MOVIMIENTO",
        "valor": 12.5,
        "unidad": "cm"
    }

    try:
        response = requests.post(
            f"{BASE_URL}/sensores/data",
            headers=HEADERS,
            json=payload
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 201:
            data = response.json()
            print(f"✓ Lectura creada: ID={data['id']}, timestamp={data['timestamp']}")
            return data['id']
        else:
            print(f"✗ Error: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Exception: {e}")
        return None


def test_post_hardware_payload():
    """Test: POST /sensores/hardware/{api_key} con el JSON real que arma el firmware ESP32."""
    print("\n[TEST] POST /sensores/hardware/{api_key} (payload real del firmware)")

    payload = {
        "mpu": {
            "accel_x": 120, "accel_y": -80, "accel_z": 16200,
            "gyro_x": 3, "gyro_y": -1, "gyro_z": 0,
            "velocidad_m_s": 0.021, "distancia_m": 0.084
        },
        "aire": {"co2_ppm": 480, "tvoc_ppb": 12},
        "ambiente": {"temperatura_c": 24.3, "humedad_pct": 55.2},
        "timestamp_ms": 123456
    }

    try:
        response = requests.post(
            f"{BASE_URL}/sensores/hardware/{API_KEY}",
            headers={"Content-Type": "application/json"},
            json=payload
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 201:
            data = response.json()
            print(f"✓ Lecturas creadas: {[item['tipo_sensor'] for item in data]}")
        else:
            print(f"✗ Error: {response.text}")
    except Exception as e:
        print(f"✗ Exception: {e}")


def test_get_recent():
    """Test: GET /sensores/recientes/historial"""
    print("\n[TEST] GET /sensores/recientes/historial?minutos=60")

    try:
        response = requests.get(
            f"{BASE_URL}/sensores/recientes/historial?minutos=60",
            headers=HEADERS
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Lecturas encontradas: {len(data)}")
            if data:
                print(f"  Primera lectura: {data[0]}")
        else:
            print(f"✗ Error: {response.text}")
    except Exception as e:
        print(f"✗ Exception: {e}")


def test_get_by_type():
    """Test: GET /sensores/por-tipo/MOVIMIENTO"""
    print("\n[TEST] GET /sensores/por-tipo/MOVIMIENTO?horas=24")

    try:
        response = requests.get(
            f"{BASE_URL}/sensores/por-tipo/MOVIMIENTO?horas=24",
            headers=HEADERS
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Lecturas MOVIMIENTO encontradas: {len(data)}")
        else:
            print(f"✗ Error: {response.text}")
    except Exception as e:
        print(f"✗ Exception: {e}")


def test_get_statistics():
    """Test: GET /sensores/estadisticas/MOVIMIENTO"""
    print("\n[TEST] GET /sensores/estadisticas/MOVIMIENTO?horas=24")

    try:
        response = requests.get(
            f"{BASE_URL}/sensores/estadisticas/MOVIMIENTO?horas=24",
            headers=HEADERS
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Estadísticas:")
            print(f"  Promedio: {data['promedio']}")
            print(f"  Mínimo: {data['minimo']}")
            print(f"  Máximo: {data['maximo']}")
            print(f"  Count: {data['count']}")
        else:
            print(f"✗ Error: {response.text}")
    except Exception as e:
        print(f"✗ Exception: {e}")


def test_invalid_api_key():
    """Test: POST con API Key inválida"""
    print("\n[TEST] POST con API Key inválida")

    bad_headers = {
        "X-API-Key": "invalid_key",
        "Content-Type": "application/json"
    }

    payload = {
        "dispositivo_id": "esp32_test",
        "tipo_sensor": "MOVIMIENTO",
        "valor": 1,
        "unidad": "cm"
    }

    try:
        response = requests.post(
            f"{BASE_URL}/sensores/data",
            headers=bad_headers,
            json=payload
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 401:
            print(f"✓ Rechazado correctamente (401)")
        else:
            print(f"✗ Expected 401, got {response.status_code}")
    except Exception as e:
        print(f"✗ Exception: {e}")


def test_bulk_sensors():
    """Test: Crear los 3 tipos de sensores del equipo real"""
    print("\n[TEST] Crear los 3 tipos de sensores")

    tipos = [
        ("MOVIMIENTO", 8.4, "cm"),
        ("CALIDAD_AIRE", 480, "ppm"),
        ("AMBIENTE", 24.3, "°C"),
    ]

    for tipo, valor, unidad in tipos:
        payload = {
            "dispositivo_id": "esp32_sensores",
            "tipo_sensor": tipo,
            "valor": valor,
            "unidad": unidad
        }

        try:
            response = requests.post(
                f"{BASE_URL}/sensores/data",
                headers=HEADERS,
                json=payload
            )
            if response.status_code == 201:
                print(f"✓ {tipo}: enviado correctamente")
            else:
                print(f"✗ {tipo}: error {response.status_code}")
        except Exception as e:
            print(f"✗ {tipo}: exception {e}")

        time.sleep(0.5)  # Pequeña pausa


if __name__ == "__main__":
    print("=" * 60)
    print("PRUEBAS DE ENDPOINTS DE SENSORES")
    print(f"Backend: {BASE_URL}")
    print(f"API Key: {API_KEY}")
    print("=" * 60)

    # Ejecutar pruebas
    test_post_sensor()
    time.sleep(1)
    test_post_hardware_payload()
    test_get_recent()
    test_get_by_type()
    test_get_statistics()
    test_invalid_api_key()
    test_bulk_sensors()

    print("\n" + "=" * 60)
    print("PRUEBAS COMPLETADAS")
    print("=" * 60)
