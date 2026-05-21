-- ============================================================
--  Conuco Tech — Esquema PostgreSQL
--  Ejecutar: psql -U <usuario> -d <base_de_datos> -f schema.sql
-- ============================================================

-- Usuarios / Productores
CREATE TABLE IF NOT EXISTS usuarios (
  id            VARCHAR(50)  PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol           VARCHAR(20)  NOT NULL DEFAULT 'USUARIO',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Lotes de cultivo
CREATE TABLE IF NOT EXISTS lotes (
  id            VARCHAR(50)   PRIMARY KEY,
  usuario_id    VARCHAR(50)   REFERENCES usuarios(id) ON DELETE CASCADE,
  cultivo       VARCHAR(100)  NOT NULL,
  etapa         VARCHAR(80),
  area_ha       NUMERIC(10,2),
  ubicacion     TEXT,
  fecha_siembra DATE,
  salud         VARCHAR(20)   NOT NULL DEFAULT 'optima',
  imagen        VARCHAR(10),
  temp_actual   NUMERIC(6,2),
  hum_actual    NUMERIC(6,2),
  ph_actual     NUMERIC(5,2),
  activo        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Historial de cultivos (ciclos por lote)
CREATE TABLE IF NOT EXISTS cultivos (
  id             SERIAL        PRIMARY KEY,
  lote_id        VARCHAR(50)   REFERENCES lotes(id) ON DELETE SET NULL,
  lote_nombre    VARCHAR(50),
  cultivo        VARCHAR(100)  NOT NULL,
  etapa          VARCHAR(80),
  fecha_siembra  DATE,
  fecha_cosecha  DATE,
  rendimiento    NUMERIC(8,2),
  unidad         VARCHAR(20)   NOT NULL DEFAULT 'ton/ha',
  estado         VARCHAR(20)   NOT NULL DEFAULT 'en_curso',
  notas          TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Sensores IoT registrados
CREATE TABLE IF NOT EXISTS sensores (
  id         VARCHAR(50) PRIMARY KEY,
  tipo       VARCHAR(30) NOT NULL,  -- TEMPERATURA | HUMEDAD_SUELO | PH
  lote_id    VARCHAR(50) REFERENCES lotes(id) ON DELETE SET NULL,
  activo     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Historial de lecturas de sensores
CREATE TABLE IF NOT EXISTS lecturas_sensores (
  id        SERIAL      PRIMARY KEY,
  sensor_id VARCHAR(50) REFERENCES sensores(id) ON DELETE CASCADE,
  lote_id   VARCHAR(50) REFERENCES lotes(id)    ON DELETE SET NULL,  -- desnormalizado para queries rápidas
  valor     NUMERIC(10,4) NOT NULL,
  unidad    VARCHAR(20),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alertas generadas por umbrales IoT
CREATE TABLE IF NOT EXISTS alertas (
  id          SERIAL      PRIMARY KEY,
  sensor_id   VARCHAR(50) REFERENCES sensores(id) ON DELETE SET NULL,  -- FK al sensor físico
  lote_id     VARCHAR(50) REFERENCES lotes(id)    ON DELETE SET NULL,  -- FK al lote afectado
  sensor      VARCHAR(30) NOT NULL,   -- tipo: temperatura | humedad | ph  (para queries sin JOIN)
  nivel       VARCHAR(20) NOT NULL,   -- critica | advertencia
  mensaje     TEXT        NOT NULL,
  reconocida  BOOLEAN     NOT NULL DEFAULT FALSE,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Umbrales de alerta configurados por usuario/lote
-- lote_id = NULL → umbral global del usuario
-- lote_id = 'Lote-001' → umbral específico para ese lote
CREATE TABLE IF NOT EXISTS umbrales (
  id                    SERIAL      PRIMARY KEY,
  usuario_id            VARCHAR(50) REFERENCES usuarios(id) ON DELETE CASCADE,
  lote_id               VARCHAR(50) REFERENCES lotes(id)   ON DELETE CASCADE,  -- NULL = global
  temp_advertencia_alto NUMERIC(5,2) NOT NULL DEFAULT 28,
  temp_critico_alto     NUMERIC(5,2) NOT NULL DEFAULT 32,
  temp_advertencia_bajo NUMERIC(5,2) NOT NULL DEFAULT 18,
  temp_critico_bajo     NUMERIC(5,2) NOT NULL DEFAULT 14,
  hum_advertencia_alto  NUMERIC(5,2) NOT NULL DEFAULT 75,
  hum_critico_alto      NUMERIC(5,2) NOT NULL DEFAULT 85,
  hum_advertencia_bajo  NUMERIC(5,2) NOT NULL DEFAULT 45,
  hum_critico_bajo      NUMERIC(5,2) NOT NULL DEFAULT 30,
  ph_advertencia_alto   NUMERIC(4,2) NOT NULL DEFAULT 7.0,
  ph_critico_alto       NUMERIC(4,2) NOT NULL DEFAULT 7.5,
  ph_advertencia_bajo   NUMERIC(4,2) NOT NULL DEFAULT 5.5,
  ph_critico_bajo       NUMERIC(4,2) NOT NULL DEFAULT 5.0,
  UNIQUE(usuario_id, lote_id)  -- un registro global + uno por lote
);

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_lecturas_sensor_ts  ON lecturas_sensores(sensor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_lecturas_lote_ts    ON lecturas_sensores(lote_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alertas_timestamp   ON alertas(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alertas_lote        ON alertas(lote_id);
CREATE INDEX IF NOT EXISTS idx_lotes_usuario       ON lotes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_cultivos_lote       ON cultivos(lote_id);
