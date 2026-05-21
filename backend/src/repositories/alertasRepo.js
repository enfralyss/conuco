const pool = require('../db/pool');

let nextId = 1;
const store = [];

// Throttle: una alerta por sensor/nivel cada 60s
const ultimaAlerta = {};

function rowToAlerta(row) {
  return {
    id:         row.id,
    sensorId:   row.sensor_id ?? row.sensorId ?? null,
    loteId:     row.lote_id   ?? row.loteId   ?? null,
    sensor:     row.sensor,
    nivel:      row.nivel,
    msg:        row.mensaje ?? row.msg,
    timestamp:  row.timestamp ? new Date(row.timestamp).getTime() : row.timestamp,
    reconocida: row.reconocida,
  };
}

const repo = {
  async findAll(limit = 50, loteId = null) {
    if (pool) {
      if (loteId) {
        const { rows } = await pool.query(
          'SELECT * FROM alertas WHERE lote_id = $1 ORDER BY timestamp DESC LIMIT $2',
          [loteId, limit]
        );
        return rows.map(rowToAlerta);
      }
      const { rows } = await pool.query(
        'SELECT * FROM alertas ORDER BY timestamp DESC LIMIT $1', [limit]
      );
      return rows.map(rowToAlerta);
    }
    const base = loteId ? store.filter(a => a.loteId === loteId) : store;
    return [...base].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  },

  // sensorId: 'ESP32-A1' | loteId: 'Lote-001' | sensor: 'temperatura' (tipo para display)
  async add(sensor, nivel, mensaje, sensorId = null, loteId = null) {
    const ahora = Date.now();
    const key   = `${sensor}-${nivel}`;

    if (ultimaAlerta[key] && ahora - ultimaAlerta[key] < 60_000) return null;
    ultimaAlerta[key] = ahora;

    if (pool) {
      const { rows } = await pool.query(
        'INSERT INTO alertas (sensor_id, lote_id, sensor, nivel, mensaje) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [sensorId, loteId, sensor, nivel, mensaje]
      );
      return rowToAlerta(rows[0]);
    }
    const alerta = { id: nextId++, sensorId, loteId, sensor, nivel, msg: mensaje, timestamp: ahora, reconocida: false };
    store.unshift(alerta);
    if (store.length > 100) store.splice(100);
    return alerta;
  },

  async reconocer(id) {
    if (pool) {
      const { rows } = await pool.query(
        'UPDATE alertas SET reconocida = TRUE WHERE id = $1 RETURNING *', [id]
      );
      return rows[0] ? rowToAlerta(rows[0]) : null;
    }
    const alerta = store.find(a => a.id === Number(id));
    if (!alerta) return null;
    alerta.reconocida = true;
    return alerta;
  },

  async reconocerTodas() {
    if (pool) {
      await pool.query('UPDATE alertas SET reconocida = TRUE WHERE reconocida = FALSE');
      return;
    }
    store.forEach(a => { a.reconocida = true; });
  },
};

module.exports = repo;
