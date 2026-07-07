# Integración de Sensores ESP32 - Guía de Uso

## Descripción General

El backend Compa ahora soporta recepción de datos de sensores IoT desde un ESP32. Los sensores disponibles son:

- **PIR**: Detección de movimiento
- **ULTRASÓNICO**: Medición de distancia
- **FRECUENCIA_CARDÍACA**: Lecturas del MAX30102
- **OXIGENACIÓN**: Niveles de oxígeno (SpO2)
- **PESO**: Mediciones del sensor HX711

## Configuración Inicial

### 1. API Key Configuration

Actualizar `/app/core/auth.py` con tus dispositivos ESP32:

```python
VALID_API_KEYS = {
    "esp32_compa_sk_001": 1,        # ESP32 #1 → Usuario 1
    "esp32_compa_sk_002": 2,        # ESP32 #2 → Usuario 2
    # En producción: guardar en DB con hash
}
```

### 2. Iniciar Backend

```bash
cd /home/francis/Videos/asistente_backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints Disponibles

### POST /sensores/data - Enviar lectura
**Headers**: `X-API-Key: esp32_compa_sk_001`

```bash
curl -X POST http://localhost:8000/sensores/data \
  -H "X-API-Key: esp32_compa_sk_001" \
  -H "Content-Type: application/json" \
  -d '{
    "dispositivo_id": "esp32_living_room",
    "tipo_sensor": "PIR",
    "valor": 1,
    "unidad": "boolean"
  }'
```

**Respuesta (201)**:
```json
{
  "id": 1,
  "usuario_id": 1,
  "dispositivo_id": "esp32_living_room",
  "tipo_sensor": "PIR",
  "valor": 1,
  "unidad": "boolean",
  "metadatos": {},
  "timestamp": "2026-05-22T18:50:00+00:00"
}
```

### GET /sensores/ - Listar lecturas
```bash
curl http://localhost:8000/sensores/ \
  -H "X-API-Key: esp32_compa_sk_001"
```

### GET /sensores/recientes/historial?minutos=60 - Últimas lecturas
```bash
curl "http://localhost:8000/sensores/recientes/historial?minutos=60" \
  -H "X-API-Key: esp32_compa_sk_001"
```

### GET /sensores/por-tipo/{tipo_sensor}?horas=24 - Por tipo de sensor
```bash
curl "http://localhost:8000/sensores/por-tipo/FRECUENCIA_CARDIACA?horas=24" \
  -H "X-API-Key: esp32_compa_sk_001"
```

### GET /sensores/estadisticas/{tipo_sensor}?horas=24 - Estadísticas
```bash
curl "http://localhost:8000/sensores/estadisticas/PESO?horas=24" \
  -H "X-API-Key: esp32_compa_sk_001"
```

**Respuesta**:
```json
{
  "promedio": 75.5,
  "minimo": 75.0,
  "maximo": 76.0,
  "count": 12,
  "tipo_sensor": "PESO",
  "horas": 24
}
```

## WebSocket - Dashboard en Vivo

### Conectar

```javascript
const ws = new WebSocket("ws://localhost:8000/sensores/ws/1/esp32_compa_sk_001");

ws.onopen = () => {
  console.log("Conectado al dashboard de sensores");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Nueva lectura:", data);
  // {
  //   "tipo": "nueva_lectura",
  //   "sensor": "PIR",
  //   "valor": 1,
  //   "unidad": "boolean",
  //   "dispositivo_id": "esp32_living_room",
  //   "timestamp": "2026-05-22T18:50:00.123456+00:00"
  // }
};

ws.onerror = (error) => {
  console.error("Error WebSocket:", error);
};
```

## Ejemplo: Código Arduino/ESP32

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* API_KEY = "esp32_compa_sk_001";
const char* BACKEND_URL = "http://192.168.1.100:8000/sensores/data";
const char* DEVICE_ID = "esp32_living_room";

void enviarDatoSensor(String tipoSensor, float valor, String unidad) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado");
    return;
  }

  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  StaticJsonDocument<256> doc;
  doc["dispositivo_id"] = DEVICE_ID;
  doc["tipo_sensor"] = tipoSensor;
  doc["valor"] = valor;
  doc["unidad"] = unidad;

  String json;
  serializeJson(doc, json);

  int httpResponseCode = http.POST(json);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Respuesta: " + response);
  } else {
    Serial.print("Error: ");
    Serial.println(httpResponseCode);
  }

  http.end();
}

void loop() {
  // Lectura PIR cada 5 minutos
  if (millis() % 300000 == 0) {
    int pirValue = digitalRead(PIR_PIN);
    enviarDatoSensor("PIR", pirValue, "boolean");
  }

  // Lectura ultrasónica cada 5 minutos
  if (millis() % 300000 == 0) {
    float distance = medirDistancia();
    enviarDatoSensor("ULTRASONICO", distance, "cm");
  }

  // Lectura MAX30102 cada 5 minutos
  if (millis() % 300000 == 0) {
    float bpm = max30102.getBPM();
    float spo2 = max30102.getSpO2();
    enviarDatoSensor("FRECUENCIA_CARDIACA", bpm, "bpm");
    enviarDatoSensor("OXIGENACION", spo2, "%");
  }

  // Lectura peso cada 5 minutos
  if (millis() % 300000 == 0) {
    float peso = leerPeso();
    enviarDatoSensor("PESO", peso, "kg");
  }

  delay(1000);
}
```

## Estructura de Base de Datos

**Tabla**: `sensores_datos`

```sql
CREATE TABLE sensores_datos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    dispositivo_id VARCHAR(100) NOT NULL,
    tipo_sensor VARCHAR(20) NOT NULL,
    valor FLOAT NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadatos JSONB,
    INDEX (usuario_id),
    INDEX (tipo_sensor),
    INDEX (timestamp)
);
```

## Pasos Siguientes

1. **Crear migrations** con Alembic para aplicar esquema
   ```bash
   alembic revision --autogenerate -m "Add SensorData model"
   alembic upgrade head
   ```

2. **Actualizar ESP32** con código Arduino para enviar datos

3. **Crear dashboard** en app móvil con WebSocket

4. **Implementar alertas** (ej: frecuencia cardíaca anómala)

5. **Guardar API Keys** en BD con hash (en producción)

## Troubleshooting

**Error 401 - API Key inválida**
- Verificar que X-API-Key existe en VALID_API_KEYS
- Revisar que el header se envía correctamente

**Error 404 - Usuario no encontrado**
- Verificar que el usuario_id existe en DB
- Confirmar que usuario_id corresponde a API Key

**WebSocket no conecta**
- Verificar que `usuario_id` y `api_key` en URL son correctos
- Probar http://localhost:8000/docs para WebSocket

**No recibe datos en WebSocket**
- Asegurar que hay conexión activa (enviar heartbeat)
- Verificar que las lecturas se crean correctamente en POST

## Documentación Swagger

Acceder a: `http://localhost:8000/docs`

Todos los endpoints están documentados interactivamente.
