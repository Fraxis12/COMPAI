#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_CCS811.h>
#include <MPU6050.h>
#include <DHT.h>

// ================= CONFIGURACIÓN WIFI Y API =================
// El WiFi ya no es fijo: WiFiManager lo pide una sola vez por un portal
// cautivo (ver conectarWiFi()) y lo guarda solo para las siguientes veces.
const char* NOMBRE_PORTAL_WIFI = "CompAI-Setup";
const char* API_URL = "http://compai-api-alb-638313997.us-east-2.elb.amazonaws.com/sensores/hardware/esp32_compa_sk_001";

const unsigned long INTERVALO_ENVIO_MS = 10000; // enviar cada 10 segundos
unsigned long ultimoEnvio = 0;

// Pines I2C por defecto en ESP32 DevKit
const int PIN_SDA = 21;
const int PIN_SCL = 22;

// Pin de datos del DHT11 (ya trae pull-up integrado en el módulo)
const int PIN_DHT  = 4;
const int TIPO_DHT = DHT11;

Adafruit_CCS811 ccs811;
MPU6050 mpu6050;
DHT dht(PIN_DHT, TIPO_DHT);

bool ccs811_ok  = false;
bool mpu6050_ok = false;

// ================= VARIABLES DEL ODÓMETRO (MPU6050) =================
const float SENSIBILIDAD_ACCEL = 16384.0;
const float GRAVEDAD = 9.81;

float offsetAX = 0, offsetAY = 0;

const float UMBRAL_ACELERACION = 0.1;
const float UMBRAL_GIRO_REPOSO = 150;        // unidades crudas del giroscopio (~1.1 grados/s)
const float FACTOR_FUGA_VELOCIDAD = 0.95;    // drena velocidad residual cuando no hay movimiento claro
const float TASA_RECALIBRACION = 0.002;      // que tan rapido se ajusta el offset mientras esta quieto

float velocidadActual = 0;
float distanciaRecorridaM = 0;

unsigned long ultimoCalculoDistancia = 0;

// ================= DECLARACIONES ADELANTADAS =================
void conectarWiFi();
void escanearI2C();
void calibrarAcelerometro();
void actualizarDistanciaRecorrida();
String construirJSON();
void enviarDatos(const String& payload);

// ================= WIFI (aprovisionamiento con portal cautivo) =================
void conectarWiFi() {
  WiFiManager wifiManager;
  // Si nadie configura una red en 3 minutos, sigue el arranque sin WiFi
  // (se puede reintentar despues, ver enviarDatos()).
  wifiManager.setConfigPortalTimeout(180);

  Serial.println("Conectando a WiFi (usa credenciales guardadas si existen)...");
  bool conectado = wifiManager.autoConnect(NOMBRE_PORTAL_WIFI);

  if (conectado) {
    Serial.println("WiFi conectado. IP: " + WiFi.localIP().toString());
  } else {
    Serial.println(
      "No se configuro WiFi (portal cerrado sin datos). "
      "Conectate a la red '" + String(NOMBRE_PORTAL_WIFI) + "' desde tu celular para configurarlo."
    );
  }
}

// ================= ESCÁNER I2C =================
void escanearI2C() {
  Serial.println("\n--- Escaneando bus I2C ---");
  int dispositivosEncontrados = 0;

  for (byte direccion = 1; direccion < 127; direccion++) {
    Wire.beginTransmission(direccion);
    byte error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("Dispositivo encontrado en 0x");
      if (direccion < 16) Serial.print("0");
      Serial.println(direccion, HEX);
      dispositivosEncontrados++;
    }
  }

  if (dispositivosEncontrados == 0) {
    Serial.println("No se encontró ningún dispositivo. Revisa el cableado.");
  } else {
    Serial.printf("Total encontrados: %d\n", dispositivosEncontrados);
  }
  Serial.println("--------------------------\n");
}

// ================= CALIBRACIÓN DEL ACELERÓMETRO =================
void calibrarAcelerometro() {
  Serial.println("Calibrando acelerómetro... no muevas el sensor (2 segundos)");

  const int MUESTRAS = 200;
  long sumaX = 0, sumaY = 0;
  int16_t ax, ay, az, gx, gy, gz;

  for (int i = 0; i < MUESTRAS; i++) {
    mpu6050.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
    sumaX += ax;
    sumaY += ay;
    delay(10);
  }

  offsetAX = (float)sumaX / MUESTRAS;
  offsetAY = (float)sumaY / MUESTRAS;

  Serial.println("Calibración completa.");
}

// ================= CÁLCULO DE DISTANCIA RECORRIDA (ODÓMETRO) =================
void actualizarDistanciaRecorrida() {
  if (!mpu6050_ok) return;

  unsigned long ahora = millis();
  float dt = (ahora - ultimoCalculoDistancia) / 1000.0;
  ultimoCalculoDistancia = ahora;

  if (dt <= 0 || dt > 1.0) return;

  int16_t ax, ay, az, gx, gy, gz;
  mpu6050.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

  // El giroscopio es un indicador confiable de "no lo estan moviendo": si no
  // hay rotacion, aprovechamos para reajustar poco a poco el offset del
  // acelerometro (compensa el sesgo por temperatura que la calibracion
  // inicial de 2 segundos no puede cubrir a largo plazo).
  bool sinRotacion = abs(gx) < UMBRAL_GIRO_REPOSO &&
                     abs(gy) < UMBRAL_GIRO_REPOSO &&
                     abs(gz) < UMBRAL_GIRO_REPOSO;

  if (sinRotacion) {
    offsetAX += (ax - offsetAX) * TASA_RECALIBRACION;
    offsetAY += (ay - offsetAY) * TASA_RECALIBRACION;
  }

  float accelX = ((ax - offsetAX) / SENSIBILIDAD_ACCEL) * GRAVEDAD;
  float accelY = ((ay - offsetAY) / SENSIBILIDAD_ACCEL) * GRAVEDAD;

  float aceleracionHorizontal = sqrt(accelX * accelX + accelY * accelY);

  if (aceleracionHorizontal < UMBRAL_ACELERACION) {
    aceleracionHorizontal = 0;
  }

  // Reposo real: sin rotacion y sin aceleracion horizontal neta.
  bool estaQuieto = sinRotacion && (aceleracionHorizontal == 0);

  if (estaQuieto) {
    velocidadActual = 0;
  } else {
    velocidadActual += aceleracionHorizontal * dt;
    velocidadActual *= FACTOR_FUGA_VELOCIDAD;
  }

  distanciaRecorridaM += velocidadActual * dt;
}

// ================= CONSTRUIR JSON =================
String construirJSON() {
  JsonDocument doc;

  if (mpu6050_ok) {
    int16_t ax, ay, az, gx, gy, gz;
    mpu6050.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
    doc["mpu"]["accel_x"] = ax;
    doc["mpu"]["accel_y"] = ay;
    doc["mpu"]["accel_z"] = az;
    doc["mpu"]["gyro_x"]  = gx;
    doc["mpu"]["gyro_y"]  = gy;
    doc["mpu"]["gyro_z"]  = gz;
    doc["mpu"]["velocidad_m_s"] = velocidadActual;
    doc["mpu"]["distancia_m"]  = distanciaRecorridaM;
  }

  if (ccs811_ok && ccs811.available() && !ccs811.readData()) {
    doc["aire"]["co2_ppm"]  = ccs811.geteCO2();
    doc["aire"]["tvoc_ppb"] = ccs811.getTVOC();
  }

  float temperatura = dht.readTemperature();
  float humedad     = dht.readHumidity();
  if (!isnan(temperatura) && !isnan(humedad)) {
    doc["ambiente"]["temperatura_c"] = temperatura;
    doc["ambiente"]["humedad_pct"]   = humedad;
  }

  doc["timestamp_ms"] = millis();

  String salida;
  serializeJson(doc, salida);
  return salida;
}

// ================= ENVIAR POST A LA API =================
void enviarDatos(const String& payload) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado, reintentando...");
    conectarWiFi();
    return;
  }

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");

  int codigoRespuesta = http.POST(payload);

  if (codigoRespuesta > 0) {
    Serial.printf("POST enviado. Código: %d\n", codigoRespuesta);
  } else {
    Serial.printf("Error al enviar POST: %s\n", http.errorToString(codigoRespuesta).c_str());
  }

  http.end();
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(1000);

  conectarWiFi();

  Wire.begin(PIN_SDA, PIN_SCL);
  escanearI2C();

  Serial.println("Inicializando MPU6050...");
  mpu6050.initialize();
  mpu6050_ok = mpu6050.testConnection();
  if (mpu6050_ok) {
    Serial.println("MPU6050 conectado correctamente.");
    calibrarAcelerometro();
    ultimoCalculoDistancia = millis();
  } else {
    Serial.println("ERROR: MPU6050 no responde. Revisa VCC/GND/SDA/SCL.");
  }

  Serial.println("Inicializando CCS811...");
  ccs811_ok = ccs811.begin();
  if (ccs811_ok) {
    Serial.println("CCS811 conectado correctamente.");
    Serial.println("(Puede tardar ~20 segundos en dar su primera lectura válida)");
  } else {
    Serial.println("ERROR: CCS811 no responde. Revisa VCC/GND/SDA/SCL y el pin WAK a GND.");
  }

  Serial.println("Inicializando DHT11...");
  dht.begin();
  Serial.println("DHT11 listo.");
}

// ================= LOOP =================
const unsigned long INTERVALO_IMPRESION_MS = 2000;
unsigned long ultimaImpresion = 0;

void loop() {
  actualizarDistanciaRecorrida();

  unsigned long ahora = millis();

  if (ahora - ultimoEnvio >= INTERVALO_ENVIO_MS) {
    ultimoEnvio = ahora;
    String json = construirJSON();
    Serial.println("Enviando a la API: " + json);
    enviarDatos(json);
  }

  if (ahora - ultimaImpresion < INTERVALO_IMPRESION_MS) {
    delay(20);
    return;
  }
  ultimaImpresion = ahora;

  Serial.println("=== Lectura de sensores ===");

  if (mpu6050_ok) {
    Serial.println("MPU6050:");
    Serial.printf("  Velocidad estimada  = %.3f m/s\n", velocidadActual);
    Serial.printf("  Distancia recorrida = %.3f m\n", distanciaRecorridaM);
  } else {
    Serial.println("MPU6050: no disponible");
  }

  if (ccs811_ok && ccs811.available() && !ccs811.readData()) {
    Serial.println("CCS811:");
    Serial.printf("  eCO2 = %d ppm\n", ccs811.geteCO2());
    Serial.printf("  TVOC = %d ppb\n", ccs811.getTVOC());
  } else {
    Serial.println("CCS811: no disponible / calentando");
  }

  float temperatura = dht.readTemperature();
  float humedad     = dht.readHumidity();
  if (!isnan(temperatura) && !isnan(humedad)) {
    Serial.println("DHT11:");
    Serial.printf("  Temperatura = %.1f °C\n", temperatura);
    Serial.printf("  Humedad     = %.1f %%\n", humedad);
  } else {
    Serial.println("DHT11: error de lectura");
  }

  Serial.println();
}