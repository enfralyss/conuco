import { Wind, Sun } from 'lucide-react';

// ════════════════════════════════════════════════════════════════════════════
// SENSOR AMBIENTAL (tercer recuadro del panel — antes "Nivel de pH")
//
// El ESP32 puede llevar conectado:
//   A) DHT22  → Humedad y Temperatura del aire (por defecto)
//   B) BH1750 → Luz solar en lux
//
// Descomenta la opción que tengas conectada y comenta la otra.
// Todo el frontend (tarjetas, gráficas, alertas, umbrales) se adapta solo.
// Recuerda usar el mismo sensor en backend/src/server.js (tipo del Sensor).
// ════════════════════════════════════════════════════════════════════════════

// ── Opción A: DHT22 — Humedad Ambiental ─────────────────────────────────────
export const SENSOR_AMBIENTAL = {
  tipo:        'dht22',
  label:       'Humedad Ambiental',
  labelCorto:  'Hum. Amb.',
  unidad:      '%',
  decimales:   1,
  rangoIdeal:    { min: 40, max: 70 },   // dispara "advertencia" fuera de esto
  rangoCritico:  { min: 30, max: 80 },   // dispara "crítica" fuera de esto
  rangoTexto:  'Ideal: 40–70%',
  dominioGrafica: [0, 100],
  Icono:       Wind,
  // Estilos (Tailwind + color de la serie en la gráfica)
  colorClass:  'text-cyan-500',
  bgClass:     'bg-cyan-50',
  borderClass: 'border-cyan-500',
  pillColor:   'cyan',
  stroke:      '#06b6d4',
  // Límites de los sliders en la página Configuración
  sliders: {
    advAlto:  { min: 50, max: 90 },
    critAlto: { min: 60, max: 100 },
    advBajo:  { min: 20, max: 60 },
    critBajo: { min: 10, max: 50 },
    step: 1,
  },
};

// ── Opción B: BH1750 — Luz Solar ────────────────────────────────────────────
// export const SENSOR_AMBIENTAL = {
//   tipo:        'bh1750',
//   label:       'Luz Solar',
//   labelCorto:  'Luz',
//   unidad:      ' lux',
//   decimales:   0,
//   rangoIdeal:    { min: 15000, max: 50000 },
//   rangoCritico:  { min: 8000,  max: 60000 },
//   rangoTexto:  'Ideal: 15k–50k lux',
//   dominioGrafica: [0, 65000],
//   Icono:       Sun,
//   colorClass:  'text-amber-500',
//   bgClass:     'bg-amber-50',
//   borderClass: 'border-amber-500',
//   pillColor:   'amber',
//   stroke:      '#f59e0b',
//   sliders: {
//     advAlto:  { min: 30000, max: 60000 },
//     critAlto: { min: 40000, max: 65000 },
//     advBajo:  { min: 5000,  max: 30000 },
//     critBajo: { min: 0,     max: 20000 },
//     step: 500,
//   },
// };

// ── Helpers compartidos ─────────────────────────────────────────────────────
export const ambFueraDeIdeal = v =>
  v < SENSOR_AMBIENTAL.rangoIdeal.min || v > SENSOR_AMBIENTAL.rangoIdeal.max;

export const ambFueraDeCritico = v =>
  v < SENSOR_AMBIENTAL.rangoCritico.min || v > SENSOR_AMBIENTAL.rangoCritico.max;

export const formatoAmbiental = v =>
  `${Number(v).toFixed(SENSOR_AMBIENTAL.decimales)}${SENSOR_AMBIENTAL.unidad}`;
