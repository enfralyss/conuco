const pool = require('../db/pool');

// ── Seed in-memory (usado cuando no hay PostgreSQL) ──────────────────────────
const store = [
  { id: 'Lote-001', cultivo: 'Maíz Amarillo',      etapa: 'Siembra Tardía',          area: 2.4, ubicacion: 'Sector Norte, Parcela A', fechaSiembra: '2026-02-10', salud: 'optima',      imagen: '🌽', tempActual: 26.3, humActual: 68.5, phActual: 6.4 },
  { id: 'Lote-002', cultivo: 'Habichuelas Rojas',   etapa: 'Desarrollo Vegetativo',   area: 1.8, ubicacion: 'Sector Sur, Parcela B',   fechaSiembra: '2026-01-25', salud: 'advertencia', imagen: '🫘', tempActual: 29.7, humActual: 43.2, phActual: 6.8 },
  { id: 'Lote-003', cultivo: 'Plátano Barahonero',  etapa: 'Floración',               area: 3.1, ubicacion: 'Sector Este, Parcela C',  fechaSiembra: '2025-11-05', salud: 'optima',      imagen: '🍌', tempActual: 27.1, humActual: 71.0, phActual: 6.2 },
  { id: 'Lote-004', cultivo: 'Yuca Blanca',          etapa: 'Engorde',                 area: 0.9, ubicacion: 'Sector Oeste, Parcela D', fechaSiembra: '2025-12-18', salud: 'critica',     imagen: '🌿', tempActual: 33.5, humActual: 28.0, phActual: 7.8 },
];

// ── Helpers de conversión ────────────────────────────────────────────────────

function rowToLote(row) {
  return {
    id:           row.id,
    cultivo:      row.cultivo,
    etapa:        row.etapa,
    area:         parseFloat(row.area_ha ?? row.area),
    ubicacion:    row.ubicacion,
    fechaSiembra: row.fecha_siembra ?? row.fechaSiembra,
    salud:        row.salud,
    imagen:       row.imagen,
    sensores: {
      temperatura: parseFloat(row.temp_actual ?? row.tempActual),
      humedad:     parseFloat(row.hum_actual  ?? row.humActual),
      ph:          parseFloat(row.ph_actual   ?? row.phActual),
    },
  };
}

// ── Repositorio ──────────────────────────────────────────────────────────────

const repo = {
  async findAll() {
    if (pool) {
      const { rows } = await pool.query(
        'SELECT * FROM lotes WHERE activo = TRUE ORDER BY created_at ASC'
      );
      return rows.map(rowToLote);
    }
    return store.map(rowToLote);
  },

  async findById(id) {
    if (pool) {
      const { rows } = await pool.query('SELECT * FROM lotes WHERE id = $1', [id]);
      return rows[0] ? rowToLote(rows[0]) : null;
    }
    const found = store.find(l => l.id === id);
    return found ? rowToLote(found) : null;
  },

  async create(lote) {
    if (pool) {
      const { rows } = await pool.query(
        `INSERT INTO lotes
          (id, cultivo, etapa, area_ha, ubicacion, fecha_siembra, salud, imagen, temp_actual, hum_actual, ph_actual)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [lote.id, lote.cultivo, lote.etapa, lote.area, lote.ubicacion,
         lote.fechaSiembra, lote.salud, lote.imagen,
         lote.tempActual, lote.humActual, lote.phActual]
      );
      return rowToLote(rows[0]);
    }
    store.push(lote);
    return rowToLote(lote);
  },

  async update(id, cambios) {
    if (pool) {
      const { rows } = await pool.query(
        `UPDATE lotes SET
           cultivo      = COALESCE($2, cultivo),
           etapa        = COALESCE($3, etapa),
           area_ha      = COALESCE($4, area_ha),
           ubicacion    = COALESCE($5, ubicacion),
           fecha_siembra= COALESCE($6, fecha_siembra),
           salud        = COALESCE($7, salud),
           imagen       = COALESCE($8, imagen),
           temp_actual  = COALESCE($9,  temp_actual),
           hum_actual   = COALESCE($10, hum_actual),
           ph_actual    = COALESCE($11, ph_actual)
         WHERE id = $1 RETURNING *`,
        [id, cambios.cultivo, cambios.etapa, cambios.area, cambios.ubicacion,
         cambios.fechaSiembra, cambios.salud, cambios.imagen,
         cambios.tempActual, cambios.humActual, cambios.phActual]
      );
      return rows[0] ? rowToLote(rows[0]) : null;
    }
    const idx = store.findIndex(l => l.id === id);
    if (idx === -1) return null;
    store[idx] = { ...store[idx], ...cambios };
    return rowToLote(store[idx]);
  },

  async remove(id) {
    if (pool) {
      await pool.query('UPDATE lotes SET activo = FALSE WHERE id = $1', [id]);
      return true;
    }
    const idx = store.findIndex(l => l.id === id);
    if (idx === -1) return false;
    store.splice(idx, 1);
    return true;
  },

  // Actualiza solo las lecturas de sensores de un lote (usado por el simulador)
  async updateSensores(id, temp, hum, ph) {
    if (pool) {
      await pool.query(
        'UPDATE lotes SET temp_actual=$2, hum_actual=$3, ph_actual=$4 WHERE id=$1',
        [id, temp, hum, ph]
      );
      return;
    }
    const lote = store.find(l => l.id === id);
    if (lote) { lote.tempActual = temp; lote.humActual = hum; lote.phActual = ph; }
  },
};

module.exports = repo;
