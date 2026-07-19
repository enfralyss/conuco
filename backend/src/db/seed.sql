-- ============================================================
--  Conuco Tech — Datos Iniciales (Seed)
--  Ejecutar DESPUÉS del schema.sql:
--    psql -U <usuario> -d <base_de_datos> -f seed.sql
--
--  Para generar el hash del password 'admin123':
--    node -e "require('bcryptjs').hash('admin123',10).then(h=>console.log(h))"
--  Reemplaza <HASH_ADMIN123> con el resultado antes de ejecutar.
-- ============================================================

-- ── 1. Usuario por defecto ───────────────────────────────────────────────────
INSERT INTO usuarios
  (id, nombre, email, password_hash, rol)
VALUES
  ('usr-default', 'Enfranly (Productor)', 'admin@lab.com', '<HASH_ADMIN123>', 'USUARIO')
ON CONFLICT
(email) DO NOTHING;

-- ── 2. Lotes de cultivo ───────────────────────────────────────────────────────
INSERT INTO lotes
  (id, usuario_id, cultivo, etapa, area_ha, ubicacion, fecha_siembra, salud, imagen, temp_actual, hum_actual, amb_actual)
VALUES
  ('Lote-001', 'usr-default', 'Maíz Amarillo', 'Siembra Tardía', 2.40, 'Sector Norte, Parcela A', '2026-02-10', 'optima', '🌽', 26.3, 68.5, 58.0),
  ('Lote-002', 'usr-default', 'Habichuelas Rojas', 'Desarrollo Vegetativo', 1.80, 'Sector Sur, Parcela B', '2026-01-25', 'advertencia', '🫘', 29.7, 43.2, 38.5),
  ('Lote-003', 'usr-default', 'Plátano Barahonero', 'Floración', 3.10, 'Sector Este, Parcela C', '2025-11-05', 'optima', '🍌', 27.1, 71.0, 64.0),
  ('Lote-004', 'usr-default', 'Yuca Blanca', 'Engorde', 0.90, 'Sector Oeste, Parcela D', '2025-12-18', 'critica', '🌿', 33.5, 28.0, 25.0)
ON CONFLICT
(id) DO NOTHING;

-- ── 3. Sensores IoT registrados ───────────────────────────────────────────────
INSERT INTO sensores
  (id, tipo, lote_id, activo)
VALUES
  ('ESP32-A1', 'TEMPERATURA', 'Lote-001', TRUE),
  ('ESP32-A2', 'HUMEDAD_SUELO', 'Lote-001', TRUE),
  -- Sensor ambiental: 'HUMEDAD_AMBIENTAL' (DHT22) o 'LUZ_SOLAR' (BH1750)
  ('ESP32-A3', 'HUMEDAD_AMBIENTAL', 'Lote-001', TRUE)
ON CONFLICT
(id) DO NOTHING;

-- ── 4. Historial de cultivos ──────────────────────────────────────────────────
INSERT INTO cultivos
  (lote_id, lote_nombre, cultivo, etapa, fecha_siembra, fecha_cosecha, rendimiento, unidad, estado, notas)
VALUES
  ('Lote-001', 'Lote-001', 'Maíz Amarillo', 'Cosechado', '2025-09-01', '2026-01-15', 4.2, 'ton/ha', 'completado', 'Excelente rendimiento, condiciones ideales.'),
  ('Lote-002', 'Lote-002', 'Habichuelas Rojas', 'Cosechado', '2025-08-20', '2025-12-10', 1.8, 'ton/ha', 'completado', 'Afectado por humedad baja en etapa de engorde.'),
  ('Lote-003', 'Lote-003', 'Plátano Barahonero', 'En curso', '2025-11-05', NULL, NULL, 'ton/ha', 'en_curso', 'Floración en progreso.'),
  ('Lote-001', 'Lote-001', 'Yuca Blanca', 'Cosechado', '2025-06-15', '2025-11-30', 12.5, 'ton/ha', 'completado', ''),
  ('Lote-004', 'Lote-004', 'Batata Amarilla', 'Abandonado', '2025-07-01', '2025-09-20', 0, 'ton/ha', 'abandonado', 'Plaga de áfidos. Cultivo perdido.'),
  ('Lote-002', 'Lote-002', 'Maíz Amarillo', 'Cosechado', '2025-03-10', '2025-07-25', 3.9, 'ton/ha', 'completado', ''),
  ('Lote-003', 'Lote-003', 'Ají Caballero', 'En curso', '2026-01-20', NULL, NULL, 'ton/ha', 'en_curso', 'Desarrollo vegetativo normal.'),
  ('Lote-001', 'Lote-001', 'Sorgo', 'Cosechado', '2024-11-01', '2025-03-15', 5.1, 'ton/ha', 'completado', 'Rotación de cultivo exitosa.');

-- ── 5. Lecturas iniciales de sensores (últimas 10 por sensor) ─────────────────
INSERT INTO lecturas_sensores
  (sensor_id, lote_id, valor, unidad, timestamp)
VALUES
  -- Temperatura (ESP32-A1)
  ('ESP32-A1', 'Lote-001', 25.1, '°C', NOW() - INTERVAL '50 minutes'),
  ('ESP32-A1', 'Lote-001', 25.4, '°C', NOW() - INTERVAL '45 minutes'),
  ('ESP32-A1', 'Lote-001', 25.8, '°C', NOW() - INTERVAL '40 minutes'),
  ('ESP32-A1', 'Lote-001', 26.2, '°C', NOW() - INTERVAL '35 minutes'),
  ('ESP32-A1', 'Lote-001', 26.5, '°C', NOW() - INTERVAL '30 minutes'),
  ('ESP32-A1', 'Lote-001', 26.7, '°C', NOW() - INTERVAL '25 minutes'),
  ('ESP32-A1', 'Lote-001', 26.3, '°C', NOW() - INTERVAL '20 minutes'),
  ('ESP32-A1', 'Lote-001', 26.9, '°C', NOW() - INTERVAL '15 minutes'),
  ('ESP32-A1', 'Lote-001', 27.1, '°C', NOW() - INTERVAL '10 minutes'),
  ('ESP32-A1', 'Lote-001', 26.8, '°C', NOW() - INTERVAL '5 minutes'),
  -- Humedad del suelo (ESP32-A2)
  ('ESP32-A2', 'Lote-001', 70.5, '%', NOW() - INTERVAL '50 minutes'),
  ('ESP32-A2', 'Lote-001', 70.1, '%', NOW() - INTERVAL '45 minutes'),
  ('ESP32-A2', 'Lote-001', 69.8, '%', NOW() - INTERVAL '40 minutes'),
  ('ESP32-A2', 'Lote-001', 69.3, '%', NOW() - INTERVAL '35 minutes'),
  ('ESP32-A2', 'Lote-001', 68.9, '%', NOW() - INTERVAL '30 minutes'),
  ('ESP32-A2', 'Lote-001', 68.5, '%', NOW() - INTERVAL '25 minutes'),
  ('ESP32-A2', 'Lote-001', 68.2, '%', NOW() - INTERVAL '20 minutes'),
  ('ESP32-A2', 'Lote-001', 67.8, '%', NOW() - INTERVAL '15 minutes'),
  ('ESP32-A2', 'Lote-001', 67.5, '%', NOW() - INTERVAL '10 minutes'),
  ('ESP32-A2', 'Lote-001', 68.0, '%', NOW() - INTERVAL '5 minutes'),
  -- Humedad ambiental DHT22 (ESP32-A3)
  ('ESP32-A3', 'Lote-001', 56.0, '%', NOW() - INTERVAL '50 minutes'),
  ('ESP32-A3', 'Lote-001', 56.8, '%', NOW() - INTERVAL '45 minutes'),
  ('ESP32-A3', 'Lote-001', 57.5, '%', NOW() - INTERVAL '40 minutes'),
  ('ESP32-A3', 'Lote-001', 58.2, '%', NOW() - INTERVAL '35 minutes'),
  ('ESP32-A3', 'Lote-001', 57.9, '%', NOW() - INTERVAL '30 minutes'),
  ('ESP32-A3', 'Lote-001', 58.6, '%', NOW() - INTERVAL '25 minutes'),
  ('ESP32-A3', 'Lote-001', 59.1, '%', NOW() - INTERVAL '20 minutes'),
  ('ESP32-A3', 'Lote-001', 58.4, '%', NOW() - INTERVAL '15 minutes'),
  ('ESP32-A3', 'Lote-001', 57.7, '%', NOW() - INTERVAL '10 minutes'),
  ('ESP32-A3', 'Lote-001', 58.0, '%', NOW() - INTERVAL '5 minutes');

-- ── 6. Alertas de ejemplo ─────────────────────────────────────────────────────
INSERT INTO alertas
  (sensor_id, lote_id, sensor, nivel, mensaje, reconocida, timestamp)
VALUES
  ('ESP32-A1', 'Lote-001', 'temperatura', 'critica', 'Temperatura muy alta: 33.2°C', FALSE, NOW() - INTERVAL
'18 minutes'),
('ESP32-A2', 'Lote-001', 'humedad',     'advertencia', 'Humedad baja: 44.8%',          FALSE, NOW
() - INTERVAL '11 minutes'),
('ESP32-A3', 'Lote-001', 'ambiental',   'advertencia', 'Humedad ambiental elevada: 72.4%', TRUE,  NOW
() - INTERVAL '6 minutes'),
('ESP32-A3', 'Lote-001', 'ambiental',   'critica',     'Humedad ambiental muy baja: 27.9%', FALSE, NOW
() - INTERVAL '2 minutes');

-- ── 7. Umbrales por defecto para el usuario ───────────────────────────────────
INSERT INTO umbrales
  (
  usuario_id,
  temp_advertencia_alto, temp_critico_alto, temp_advertencia_bajo, temp_critico_bajo,
  hum_advertencia_alto, hum_critico_alto, hum_advertencia_bajo, hum_critico_bajo,
  amb_advertencia_alto, amb_critico_alto, amb_advertencia_bajo, amb_critico_bajo
  )
VALUES
  (
    'usr-default',
    28, 32, 18, 14,
    75, 85, 45, 30,
    70, 80, 40, 30
)
ON CONFLICT
(usuario_id, lote_id) DO NOTHING;
