const fs   = require('fs');
const path = require('path');
const pool = require('./pool');

/**
 * Inicializa la BD al arrancar el servidor:
 *  1. Ejecuta schema.sql (todo es CREATE ... IF NOT EXISTS → idempotente).
 *  2. Si la tabla de lotes está vacía, siembra lotes, sensores y cultivos
 *     de ejemplo (el usuario lo siembra AuthService en server.js).
 * Evita tener que abrir la BD al público para correr los .sql a mano.
 */
async function bootstrap() {
  if (!pool) return;

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM lotes');
  if (rows[0].n > 0) {
    console.log('[🌱] BD ya inicializada — bootstrap omitido');
    return;
  }

  await pool.query(`
    INSERT INTO lotes
      (id, cultivo, etapa, area_ha, ubicacion, fecha_siembra, salud, imagen, temp_actual, hum_actual, amb_actual)
    VALUES
      ('Lote-001', 'Maíz Amarillo',      'Siembra Tardía',        2.40, 'Sector Norte, Parcela A', '2026-02-10', 'optima',      '🌽', 26.3, 68.5, 58.0),
      ('Lote-002', 'Habichuelas Rojas',  'Desarrollo Vegetativo', 1.80, 'Sector Sur, Parcela B',   '2026-01-25', 'advertencia', '🫘', 29.7, 43.2, 38.5),
      ('Lote-003', 'Plátano Barahonero', 'Floración',             3.10, 'Sector Este, Parcela C',  '2025-11-05', 'optima',      '🍌', 27.1, 71.0, 64.0),
      ('Lote-004', 'Yuca Blanca',        'Engorde',               0.90, 'Sector Oeste, Parcela D', '2025-12-18', 'critica',     '🌿', 33.5, 28.0, 25.0)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO sensores (id, tipo, lote_id, activo) VALUES
      ('ESP32-A1', 'TEMPERATURA',       'Lote-001', TRUE),
      ('ESP32-A2', 'HUMEDAD_SUELO',     'Lote-001', TRUE),
      ('ESP32-A3', 'HUMEDAD_AMBIENTAL', 'Lote-001', TRUE)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO cultivos
      (lote_id, lote_nombre, cultivo, etapa, fecha_siembra, fecha_cosecha, rendimiento, unidad, estado, notas)
    VALUES
      ('Lote-001', 'Lote-001', 'Maíz Amarillo',      'Cosechado',  '2025-09-01', '2026-01-15', 4.2,  'ton/ha', 'completado', 'Excelente rendimiento, condiciones ideales.'),
      ('Lote-002', 'Lote-002', 'Habichuelas Rojas',  'Cosechado',  '2025-08-20', '2025-12-10', 1.8,  'ton/ha', 'completado', 'Afectado por humedad baja en etapa de engorde.'),
      ('Lote-003', 'Lote-003', 'Plátano Barahonero', 'En curso',   '2025-11-05', NULL,         NULL, 'ton/ha', 'en_curso',   'Floración en progreso.'),
      ('Lote-001', 'Lote-001', 'Yuca Blanca',        'Cosechado',  '2025-06-15', '2025-11-30', 12.5, 'ton/ha', 'completado', ''),
      ('Lote-004', 'Lote-004', 'Batata Amarilla',    'Abandonado', '2025-07-01', '2025-09-20', 0,    'ton/ha', 'abandonado', 'Plaga de áfidos. Cultivo perdido.'),
      ('Lote-002', 'Lote-002', 'Maíz Amarillo',      'Cosechado',  '2025-03-10', '2025-07-25', 3.9,  'ton/ha', 'completado', ''),
      ('Lote-003', 'Lote-003', 'Ají Caballero',      'En curso',   '2026-01-20', NULL,         NULL, 'ton/ha', 'en_curso',   'Desarrollo vegetativo normal.'),
      ('Lote-001', 'Lote-001', 'Sorgo',              'Cosechado',  '2024-11-01', '2025-03-15', 5.1,  'ton/ha', 'completado', 'Rotación de cultivo exitosa.');
  `);

  console.log('[🌱] BD inicializada: schema + seed de lotes/sensores/cultivos');
}

module.exports = bootstrap;
