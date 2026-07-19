/*
 * ============================================================
 *  ESTADO DEL CONUCO - Nodo IoT ESP32 para cultivo de maiz amarillo
 *
 *  Envia las lecturas al backend del proyecto (Node/Express) via
 *  HTTP POST -> /api/sensores/ingesta, que es lo que consume el
 *  panel React (Resumen General, Mis Lotes, Alertas, etc.).
 *
 *  Sensores (todo a 3.3V - NO alimentar las senales con 5V):
 *   1) Humedad de Suelo Capacitivo v1.2/v2.0 -> GPIO34 (ADC1)
 *   2) DHT22 (Humedad + Temperatura del aire) -> GPIO4 (digital)
 *      --- o alternativamente ---
 *      BH1750 (Luz solar en lux) -> I2C (SDA=21, SCL=22)
 *
 *  Ademas expone GET /datos en la IP local del ESP32 (JSON) para
 *  depurar con el navegador sin necesidad del backend.
 *
 *  Librerias (Gestor de Librerias del Arduino IDE):
 *   - "DHT sensor library" de Adafruit (+ Adafruit Unified Sensor)
 *   - "BH1750" de Christopher Laws (solo si usas el sensor de luz)
 * ============================================================
 */

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>

// ================== SELECCION DEL SENSOR AMBIENTAL ==================
// Deja SIN comentar UNA sola de estas dos lineas.
// (Debe coincidir con la opcion elegida en el backend server.js y en
//  frontend/src/config/sensorAmbiental.js)
#define USAR_DHT22          // <- Humedad del aire (DHT22)
// #define USAR_BH1750      // <- Luz solar (BH1750, via I2C)
// ====================================================================

// ================== MODO DE DATOS ==================
// true  = genera datos ficticios (probar el panel sin sensores)
// false = lee los sensores reales
const bool MODO_SIMULACION = false;
// ===================================================

// ------------------- CREDENCIALES WIFI -------------------
const char* WIFI_SSID = "TU_RED_WIFI";
const char* WIFI_PASS = "TU_CLAVE_WIFI";

// ------------------- BACKEND CONUCO TECH -------------------
// IP de la PC donde corre el backend Node (puerto 3001 por defecto).
// En Windows la ves con: ipconfig -> "Direccion IPv4"
const char* BACKEND_HOST = "http://192.168.0.3:3001";
const char* RUTA_INGESTA = "/api/sensores/ingesta";
const char* LOTE_ID      = "Lote-001";

// IDs de sensores que el backend ya reconoce (ver server.js)
const char* ID_SENSOR_TEMP  = "ESP32-A1";  // temperatura (DHT22)
const char* ID_SENSOR_SUELO = "ESP32-A2";  // humedad de suelo
const char* ID_SENSOR_AMB   = "ESP32-A3";  // humedad ambiental o luz

// ------------------- PINES -------------------
// Suelo capacitivo: usar SOLO pines de ADC1 (32-39), porque ADC2
// deja de funcionar cuando el WiFi esta activo.
const int PIN_SUELO = 34;   // GPIO34 (entrada analogica, solo lectura)

#ifdef USAR_DHT22
  #include <DHT.h>
  const int PIN_DHT = 4;    // GPIO4 (dato digital del DHT22)
  #define DHT_TIPO DHT22
  DHT dht(PIN_DHT, DHT_TIPO);
  // El DHT22 funciona bien con 3.3V. Si tu modulo NO trae resistencia
  // pull-up integrada, coloca una de 10k entre DATA y 3.3V.
#endif

#ifdef USAR_BH1750
  #include <Wire.h>
  #include <BH1750.h>
  // I2C por defecto del ESP32: SDA = GPIO21, SCL = GPIO22
  BH1750 sensorLuz;
#endif

// ------------------- CALIBRACION SUELO -------------------
// El ADC del ESP32 es de 12 bits (0-4095) y trabaja a 3.3V.
// Mide tu sensor en aire (seco) y sumergido en agua, y ajusta:
const int SUELO_VALOR_AIRE = 3300;  // lectura con el sensor al aire
const int SUELO_VALOR_AGUA = 1300;  // lectura con el sensor en agua

// Promedio para estabilizar la lectura del ADC (evita fluctuaciones)
const int MUESTRAS_ADC = 20;
const int RETARDO_ENTRE_MUESTRAS_MS = 5;

// ------------------- SERVIDOR LOCAL (DEBUG) -------------------
WebServer servidor(80);

// ------------------- VARIABLES DE LECTURA -------------------
float humedadSuelo = 0;   // %
float tempAmbiente = 0;   // grados C (DHT22)
float valorAmb     = 0;   // % humedad del aire (DHT22) o lux (BH1750)

unsigned long ultimoEnvio = 0;
const unsigned long INTERVALO_ENVIO_MS = 5000; // igual al polling del panel

// ============================================================
//  LECTURA DEL SUELO CON PROMEDIO
// ============================================================
float leerHumedadSuelo() {
  long suma = 0;
  for (int i = 0; i < MUESTRAS_ADC; i++) {
    suma += analogRead(PIN_SUELO);
    delay(RETARDO_ENTRE_MUESTRAS_MS);
  }
  int promedio = suma / MUESTRAS_ADC;

  // Convertir el valor crudo a porcentaje (agua = 100%, aire = 0%)
  float porcentaje = map(promedio, SUELO_VALOR_AIRE, SUELO_VALOR_AGUA, 0, 100);
  return constrain(porcentaje, 0, 100);
}

// ============================================================
//  ACTUALIZAR TODAS LAS LECTURAS
// ============================================================
void actualizarLecturas() {
  if (MODO_SIMULACION) {
    humedadSuelo = 55 + random(-10, 15);   // ~45-70 %
    tempAmbiente = 27 + random(-3, 5);     // ~24-32 C
#ifdef USAR_DHT22
    valorAmb = 55 + random(-15, 15);       // ~40-70 %
#endif
#ifdef USAR_BH1750
    valorAmb = 25000 + random(-10000, 20000); // ~15k-45k lux
#endif
    return;
  }

  humedadSuelo = leerHumedadSuelo();

#ifdef USAR_DHT22
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  // Si la lectura falla (NaN) se conserva el ultimo valor valido
  if (!isnan(h)) valorAmb     = h;
  if (!isnan(t)) tempAmbiente = t;
#endif

#ifdef USAR_BH1750
  float lux = sensorLuz.readLightLevel();
  if (lux >= 0) valorAmb = lux;
#endif
}

// ============================================================
//  ENVIO AL BACKEND (POST /api/sensores/ingesta)
// ============================================================
bool postLectura(const char* sensorId, const char* tipo, float valor, const char* unidad) {
  HTTPClient http;
  String url = String(BACKEND_HOST) + RUTA_INGESTA;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String cuerpo = "{";
  cuerpo += "\"sensorId\":\"" + String(sensorId) + "\"";
  cuerpo += ",\"tipo\":\""    + String(tipo)     + "\"";
  cuerpo += ",\"valor\":"     + String(valor, 2);
  cuerpo += ",\"unidad\":\""  + String(unidad)   + "\"";
  cuerpo += ",\"loteId\":\""  + String(LOTE_ID)  + "\"";
  cuerpo += "}";

  int codigo = http.POST(cuerpo);
  http.end();

  if (codigo == 201) return true;
  Serial.printf("  [!] Fallo al enviar %s (HTTP %d)\n", tipo, codigo);
  return false;
}

void enviarAlBackend() {
  postLectura(ID_SENSOR_SUELO, "HUMEDAD_SUELO", humedadSuelo, "%");

#ifdef USAR_DHT22
  postLectura(ID_SENSOR_TEMP, "TEMPERATURA",        tempAmbiente, "°C");
  postLectura(ID_SENSOR_AMB,  "HUMEDAD_AMBIENTAL",  valorAmb,     "%");
#endif

#ifdef USAR_BH1750
  postLectura(ID_SENSOR_AMB, "LUZ_SOLAR", valorAmb, "lux");
#endif
}

// ============================================================
//  SERVIDOR LOCAL DE DEPURACION
// ============================================================
void manejarDatos() {
  String json = "{";
  json += "\"humedad_suelo\":" + String(humedadSuelo, 1);
  json += ",\"temperatura\":"  + String(tempAmbiente, 1);
#ifdef USAR_DHT22
  json += ",\"humedad_ambiental\":" + String(valorAmb, 1);
#endif
#ifdef USAR_BH1750
  json += ",\"luz_solar\":" + String(valorAmb, 0);
#endif
  json += ",\"simulado\":" + String(MODO_SIMULACION ? "true" : "false");
  json += "}";

  servidor.sendHeader("Access-Control-Allow-Origin", "*");
  servidor.send(200, "application/json", json);
}

// ============================================================
//  SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  // ADC a 12 bits y atenuacion de 11 dB para leer el rango completo
  // de 0 a ~3.3V que entrega el sensor capacitivo.
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_SUELO, ADC_11db);

#ifdef USAR_DHT22
  dht.begin();
  Serial.println("Sensor ambiental: DHT22 (humedad/temperatura del aire)");
#endif

#ifdef USAR_BH1750
  Wire.begin(); // SDA=21, SCL=22
  if (sensorLuz.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
    Serial.println("Sensor ambiental: BH1750 (luz solar)");
  } else {
    Serial.println("ERROR: no se detecta el BH1750. Revisa el cableado I2C.");
  }
#endif

  Serial.printf("Conectando a %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Conectado. IP local del ESP32: http://");
  Serial.println(WiFi.localIP());
  Serial.printf("Enviando lecturas a: %s%s\n", BACKEND_HOST, RUTA_INGESTA);

  servidor.on("/datos", manejarDatos);
  servidor.begin();

  actualizarLecturas();
}

// ============================================================
//  LOOP
// ============================================================
void loop() {
  servidor.handleClient();

  if (millis() - ultimoEnvio >= INTERVALO_ENVIO_MS) {
    ultimoEnvio = millis();
    actualizarLecturas();
    enviarAlBackend();

    Serial.printf("Suelo: %.1f %% | Temp: %.1f C", humedadSuelo, tempAmbiente);
#ifdef USAR_DHT22
    Serial.printf(" | Hum. aire: %.1f %%", valorAmb);
#endif
#ifdef USAR_BH1750
    Serial.printf(" | Luz: %.0f lux", valorAmb);
#endif
    Serial.println(MODO_SIMULACION ? "  [SIMULADO]" : "");
  }
}
