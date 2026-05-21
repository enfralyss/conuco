const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

if (pool) {
  pool.connect()
    .then(client => {
      console.log('[🐘] PostgreSQL conectado correctamente');
      client.release();
    })
    .catch(err => console.error('[❌] Error conectando PostgreSQL:', err.message));
} else {
  console.log('[⚠️]  DATABASE_URL no definida — usando almacenamiento en memoria');
}

module.exports = pool;
