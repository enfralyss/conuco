const pool = require('../db/pool');

const DEFAULTS = {
  temp_advertencia_alto: 28, temp_critico_alto:    32,
  temp_advertencia_bajo: 18, temp_critico_bajo:    14,
  hum_advertencia_alto:  75, hum_critico_alto:     85,
  hum_advertencia_bajo:  45, hum_critico_bajo:     30,
  amb_advertencia_alto:  70, amb_critico_alto:     80,
  amb_advertencia_bajo:  40, amb_critico_bajo:     30,
};

// In-memory: mapa clave "usuarioId:loteId|global"
const store = {};

function storeKey(usuarioId, loteId) {
  return `${usuarioId}:${loteId ?? 'global'}`;
}

function rowToUmbrales(row) {
  return {
    loteId: row.lote_id ?? null,
    temp_advertencia_alto: parseFloat(row.temp_advertencia_alto),
    temp_critico_alto:     parseFloat(row.temp_critico_alto),
    temp_advertencia_bajo: parseFloat(row.temp_advertencia_bajo),
    temp_critico_bajo:     parseFloat(row.temp_critico_bajo),
    hum_advertencia_alto:  parseFloat(row.hum_advertencia_alto),
    hum_critico_alto:      parseFloat(row.hum_critico_alto),
    hum_advertencia_bajo:  parseFloat(row.hum_advertencia_bajo),
    hum_critico_bajo:      parseFloat(row.hum_critico_bajo),
    amb_advertencia_alto:  parseFloat(row.amb_advertencia_alto),
    amb_critico_alto:      parseFloat(row.amb_critico_alto),
    amb_advertencia_bajo:  parseFloat(row.amb_advertencia_bajo),
    amb_critico_bajo:      parseFloat(row.amb_critico_bajo),
  };
}

const repo = {
  // loteId = null → umbrales globales del usuario
  // loteId = 'Lote-001' → umbrales específicos de esa parcela (fallback a global si no existen)
  async get(usuarioId, loteId = null) {
    if (pool) {
      if (loteId) {
        const { rows } = await pool.query(
          'SELECT * FROM umbrales WHERE usuario_id = $1 AND lote_id = $2',
          [usuarioId, loteId]
        );
        if (rows[0]) return rowToUmbrales(rows[0]);
      }
      // Fallback: umbrales globales del usuario
      const { rows } = await pool.query(
        'SELECT * FROM umbrales WHERE usuario_id = $1 AND lote_id IS NULL',
        [usuarioId]
      );
      return rows[0] ? rowToUmbrales(rows[0]) : { loteId: null, ...DEFAULTS };
    }

    const key = storeKey(usuarioId, loteId);
    if (loteId && store[key]) return { ...store[key] };
    const globalKey = storeKey(usuarioId, null);
    return store[globalKey] ? { ...store[globalKey] } : { loteId: null, ...DEFAULTS };
  },

  async save(usuarioId, datos) {
    const loteId = datos.loteId ?? null;
    const valores = { ...datos };
    delete valores.loteId;

    if (pool) {
      await pool.query(
        `INSERT INTO umbrales (usuario_id, lote_id,
           temp_advertencia_alto, temp_critico_alto, temp_advertencia_bajo, temp_critico_bajo,
           hum_advertencia_alto,  hum_critico_alto,  hum_advertencia_bajo,  hum_critico_bajo,
           amb_advertencia_alto,  amb_critico_alto,  amb_advertencia_bajo,  amb_critico_bajo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (usuario_id, lote_id) DO UPDATE SET
           temp_advertencia_alto = EXCLUDED.temp_advertencia_alto,
           temp_critico_alto     = EXCLUDED.temp_critico_alto,
           temp_advertencia_bajo = EXCLUDED.temp_advertencia_bajo,
           temp_critico_bajo     = EXCLUDED.temp_critico_bajo,
           hum_advertencia_alto  = EXCLUDED.hum_advertencia_alto,
           hum_critico_alto      = EXCLUDED.hum_critico_alto,
           hum_advertencia_bajo  = EXCLUDED.hum_advertencia_bajo,
           hum_critico_bajo      = EXCLUDED.hum_critico_bajo,
           amb_advertencia_alto  = EXCLUDED.amb_advertencia_alto,
           amb_critico_alto      = EXCLUDED.amb_critico_alto,
           amb_advertencia_bajo  = EXCLUDED.amb_advertencia_bajo,
           amb_critico_bajo      = EXCLUDED.amb_critico_bajo`,
        [usuarioId, loteId,
         valores.temp_advertencia_alto, valores.temp_critico_alto,
         valores.temp_advertencia_bajo, valores.temp_critico_bajo,
         valores.hum_advertencia_alto,  valores.hum_critico_alto,
         valores.hum_advertencia_bajo,  valores.hum_critico_bajo,
         valores.amb_advertencia_alto,  valores.amb_critico_alto,
         valores.amb_advertencia_bajo,  valores.amb_critico_bajo]
      );
      return { loteId, ...valores };
    }

    const key = storeKey(usuarioId, loteId);
    store[key] = { loteId, ...valores };
    return store[key];
  },

  // Usado por el evaluador de alertas (proceso global del servidor, sin usuario
  // autenticado). Con PostgreSQL lee los umbrales globales guardados; sin BD
  // usa el store en memoria; en ambos casos cae a DEFAULTS.
  async getParaEvaluador() {
    if (pool) {
      const { rows } = await pool.query(
        'SELECT * FROM umbrales WHERE lote_id IS NULL ORDER BY id ASC LIMIT 1'
      );
      return rows[0] ? rowToUmbrales(rows[0]) : { ...DEFAULTS };
    }
    const globalKey = Object.keys(store).find(k => k.endsWith(':global'));
    return globalKey ? { ...store[globalKey] } : { ...DEFAULTS };
  },
};

module.exports = repo;
