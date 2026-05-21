const pool = require('../db/pool');

const DEFAULTS = {
  temp_advertencia_alto: 28, temp_critico_alto:    32,
  temp_advertencia_bajo: 18, temp_critico_bajo:    14,
  hum_advertencia_alto:  75, hum_critico_alto:     85,
  hum_advertencia_bajo:  45, hum_critico_bajo:     30,
  ph_advertencia_alto:  7.0, ph_critico_alto:     7.5,
  ph_advertencia_bajo:  5.5, ph_critico_bajo:     5.0,
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
    ph_advertencia_alto:   parseFloat(row.ph_advertencia_alto),
    ph_critico_alto:       parseFloat(row.ph_critico_alto),
    ph_advertencia_bajo:   parseFloat(row.ph_advertencia_bajo),
    ph_critico_bajo:       parseFloat(row.ph_critico_bajo),
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
           ph_advertencia_alto,   ph_critico_alto,   ph_advertencia_bajo,   ph_critico_bajo)
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
           ph_advertencia_alto   = EXCLUDED.ph_advertencia_alto,
           ph_critico_alto       = EXCLUDED.ph_critico_alto,
           ph_advertencia_bajo   = EXCLUDED.ph_advertencia_bajo,
           ph_critico_bajo       = EXCLUDED.ph_critico_bajo`,
        [usuarioId, loteId,
         valores.temp_advertencia_alto, valores.temp_critico_alto,
         valores.temp_advertencia_bajo, valores.temp_critico_bajo,
         valores.hum_advertencia_alto,  valores.hum_critico_alto,
         valores.hum_advertencia_bajo,  valores.hum_critico_bajo,
         valores.ph_advertencia_alto,   valores.ph_critico_alto,
         valores.ph_advertencia_bajo,   valores.ph_critico_bajo]
      );
      return { loteId, ...valores };
    }

    const key = storeKey(usuarioId, loteId);
    store[key] = { loteId, ...valores };
    return store[key];
  },

  // Usado por el evaluador del simulador (sin usuario, usa defaults globales)
  getSync() {
    const globalKey = Object.keys(store).find(k => k.endsWith(':global'));
    return globalKey ? { ...store[globalKey] } : { ...DEFAULTS };
  },
};

module.exports = repo;
