# CompAI — Firmware IoT (ESP32)

Firmware para el equipo de sensores físico que envía lecturas en vivo (aire, movimiento, temperatura/humedad) al backend de CompAI, y las vincula automáticamente a la cuenta del usuario que esté usando la app en ese momento.

## Hardware / librerías

- Placa: **ESP32** (`board = esp32dev`, framework Arduino)
- Sensores:
  - **CCS811** (Adafruit) — calidad de aire (eCO2 / TVOC)
  - **MPU6050** — acelerómetro/giroscopio (movimiento)
  - **DHT** (Adafruit DHT sensor library + Adafruit Unified Sensor) — temperatura y humedad
- **ArduinoJson** — construcción del payload JSON enviado al backend
- **WiFiManager** — portal cautivo de configuración de WiFi (ver abajo)

Gestionado con **PlatformIO** (`platformio.ini`).

## Cómo compilar y flashear

```bash
cd sensor
pio run --target upload
pio device monitor    # ver logs seriales en vivo
```

## Configuración de WiFi (WiFiManager)

Al encender por primera vez (o si no logra reconectarse a la red guardada), el equipo abre un punto de acceso llamado **"CompAI-Setup"**. Conéctate a esa red desde el celular, elige tu WiFi real en el portal que aparece automáticamente e ingresa la contraseña.

**Comportamiento importante:**
- Si la red guardada sigue disponible, el equipo se reconecta solo y **no** vuelve a mostrar el portal.
- Si quieres cambiarlo a otra red (p. ej. llevarlo a otro lugar), la forma actual de forzarlo es apagar/deshabilitar la red anterior (o alejarse de su alcance) — al no poder conectarse, WiFiManager reabre el portal "CompAI-Setup" automáticamente.
- No existe todavía un botón físico de reset para forzar el portal manualmente con la red antigua aún disponible.

## Envío de datos al backend

Cada cierto intervalo, el firmware arma un JSON con las lecturas de los tres sensores y hace un `POST` a la API:

```
POST {API_URL}/sensores/datos
X-API-Key: <clave del dispositivo>
```

- `API_URL` está definido como constante en `main.cpp` y apunta al backend desplegado en AWS (API Gateway HTTPS).
- La autenticación del dispositivo es por **API Key fija de hardware** (`X-API-Key`), no por usuario — el backend resuelve a qué cuenta pertenece la lectura mediante la tabla `DispositivoVinculo`.

## Vinculación dinámica a usuarios

El equipo físico no está atado a una cuenta de forma permanente: cada vez que un usuario abre la pantalla de **Sensores** en la app móvil, esta llama a `POST /sensores/vincular` con la API Key configurada (`EXPO_PUBLIC_SENSOR_API_KEY`), y el backend reasigna el dispositivo a esa cuenta ("el último que reclama, gana"). Esto permite que el mismo equipo físico sea usado por distintas personas/cuentas sin reconfigurar nada en el hardware — ver `backend/README.md` para el detalle del endpoint.

## Notas de seguridad

- **No modificar la lógica de lectura de sensores en `main.cpp` sin autorización explícita** — cualquier cambio en timings, pines o cálculos debe confirmarse antes de aplicarse.
- La API Key del dispositivo debe coincidir exactamente con la configurada en el backend (`IOT_API_KEYS` en Secrets Manager) y en la app móvil (`EXPO_PUBLIC_SENSOR_API_KEY` en `eas.json`).
