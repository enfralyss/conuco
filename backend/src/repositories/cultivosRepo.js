const pool = require('../db/pool');

// ── Seed in-memory ───────────────────────────────────────────────────────────
let nextId = 9;
const store = [
  { id: 1, lote: 'Lote-001', cultivo: 'Maíz Amarillo',     etapa: 'Cosechado',  fechaSiembra: '2025-09-01', fechaCosecha: '2026-01-15', rendimiento: 4.2,  unidad: 'ton/ha', estado: 'completado', notas: 'Excelente rendimiento, condiciones ideales.' },
  { id: 2, lote: 'Lote-002', cultivo: 'Habichuelas Rojas',  etapa: 'Cosechado',  fechaSiembra: '2025-08-20', fechaCosecha: '2025-12-10', rendimiento: 1.8,  unidad: 'ton/ha', estado: 'completado', notas: 'Afectado por humedad baja en etapa de engorde.' },
  { id: 3, lote: 'Lote-003', cultivo: 'Plátano Barahonero', etapa: 'En curso',   fechaSiembra: '2025-11-05', fechaCosecha: null,          rendimiento: null, unidad: 'ton/ha', estado: 'en_curso',   notas: 'Floración en progreso.' },
  { id: 4, lote: 'Lote-001', cultivo: 'Yuca Blanca',        etapa: 'Cosechado',  fechaSiembra: '2025-06-15', fechaCosecha: '2025-11-30', rendimiento: 12.5, unidad: 'ton/ha', estado: 'completado', notas: '' },
  { id: 5, lote: 'Lote-004', cultivo: 'Batata Amarilla',    etapa: 'Abandonado', fechaSiembra: '2025-07-01', fechaCosecha: '2025-09-20', rendimiento: 0,    unidad: 'ton/ha', estado: 'abandonado', notas: 'Plaga de áfidos. Cultivo perdido.' },
  { id: 6, lote: 'Lote-002', cultivo: 'Maíz Amarillo',     etapa: 'Cosechado',  fechaSiembra: '2025-03-10', fechaCosecha: '2025-07-25', rendimiento: 3.9,  unidad: 'ton/ha', estado: 'completado', notas: '' },
  { id: 7, lote: 'Lote-003', cultivo: 'Ají Caballero',      etapa: 'En curso',   fechaSiembra: '2026-01-20', fechaCosecha: null,          rendimiento: null, unidad: 'ton/ha', estado: 'en_curso',   notas: 'Desarrollo vegetativo normal.' },
  { id: 8, lote: 'Lote-001', cultivo: 'Sorgo',              etapa: 'Cosechado',  fechaSiembra: '2024-11-01', fechaCosecha: '2025-03-15', rendimiento: 5.1,  unidad: 'ton/ha', estado: 'completado', notas: 'Rotación de cultivo exitosa.' },
];

function rowToCultivo(row) {
  return {
    id:           row.id,
    lote:         row.lote_nombre ?? row.lote,
    cultivo:      row.cultivo,
    etapa:        row.etapa,
    fechaSiembra: row.fecha_siembra ?? row.fechaSiembra,
    fechaCosecha: row.fecha_cosecha ?? row.fechaCosecha ?? null,
    rendimiento:  row.rendimiento != null ? parseFloat(row.rendimiento) : null,
    unidad:       row.unidad,
    estado:       row.estado,
    notas:        row.notas ?? '',
  };
}

const repo = {
  async findAll(loteId = null) {
    if (pool) {
      if (loteId) {
        const { rows } = await pool.query(
          'SELECT * FROM cultivos WHERE lote_id = $1 ORDER BY fecha_siembra DESC', [loteId]
        );
        return rows.map(rowToCultivo);
      }
      const { rows } = await pool.query('SELECT * FROM cultivos ORDER BY fecha_siembra DESC');
      return rows.map(rowToCultivo);
    }
    const base = loteId ? store.filter(c => c.lote === loteId) : store;
    return base.map(rowToCultivo);
  },

  async create(cultivo) {
    if (pool) {
      const { rows } = await pool.query(
        `INSERT INTO cultivos
          (lote_id, lote_nombre, cultivo, etapa, fecha_siembra, fecha_cosecha, rendimiento, unidad, estado, notas)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [cultivo.loteId, cultivo.lote, cultivo.cultivo, cultivo.etapa,
         cultivo.fechaSiembra, cultivo.fechaCosecha, cultivo.rendimiento,
         cultivo.unidad || 'ton/ha', cultivo.estado || 'en_curso', cultivo.notas || '']
      );
      return rowToCultivo(rows[0]);
    }
    const nuevo = { ...cultivo, id: nextId++ };
    store.push(nuevo);
    return rowToCultivo(nuevo);
  },
};

module.exports = repo;
