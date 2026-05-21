const pool = require('./db/pool'); // inicializa conexión pg al arrancar
const XLSX = require('xlsx');

const express = require('express');
const cors    = require('cors');

const SimuladorIoT = require('./scripts/simuladorIoT');
const { Sensor }   = require('./domain/models');

const authRoutes          = require('./routes/authRoutes');
const lotesRoutes         = require('./routes/lotesRoutes');
const cultivosRoutes      = require('./routes/cultivosRoutes');
const alertasRoutes       = require('./routes/alertasRoutes');
const configuracionRoutes = require('./routes/configuracionRoutes');

const alertasRepo  = require('./repositories/alertasRepo');
const umbralesRepo = require('./repositories/umbralesRepo');
const lotesRepo    = require('./repositories/lotesRepo');
const AuthService  = require('./services/authService');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Simulador IoT ────────────────────────────────────────────────────────────
const sensorTemp = new Sensor('ESP32-A1', 'TEMPERATURA',   'Lote-001');
const sensorHum  = new Sensor('ESP32-A2', 'HUMEDAD_SUELO', 'Lote-001');
const sensorPh   = new Sensor('ESP32-A3', 'PH',            'Lote-001');

const simulador = new SimuladorIoT([sensorTemp, sensorHum, sensorPh]);
simulador.iniciarSimulacion(5000);

// ── Lecturas IoT (polling del dashboard) ─────────────────────────────────────
app.get('/api/sensores/lecturas', (req, res) => {
  res.json({
    timestamp:   new Date(),
    temperatura: sensorTemp.obtenerUltimaLectura()?.valor || 0,
    humedad:     sensorHum.obtenerUltimaLectura()?.valor  || 0,
    ph:          sensorPh.obtenerUltimaLectura()?.valor   || 0,
  });
});

app.get('/api/sensores/historial', (req, res) => {
  const hTemp = sensorTemp.historialLecturas.slice(-15);
  const hHum  = sensorHum.historialLecturas.slice(-15);
  const hPh   = sensorPh.historialLecturas.slice(-15);

  const combinados = hTemp.map((lt, i) => ({
    time:        new Date(lt.timestamp).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    temperatura: lt.valor,
    humedad:     hHum[i]?.valor ?? 0,
    ph:          hPh[i]?.valor  ?? 0,
  }));

  res.json(combinados);
});

// ── Ingesta de Lecturas IoT (Para integración física con ESP32 / Arduino) ──────
app.post('/api/sensores/ingesta', async (req, res) => {
  const { sensorId, tipo, valor, unidad, loteId } = req.body;
  
  if (!sensorId || tipo == null || valor == null) {
    return res.status(400).json({ status: 'error', mensaje: 'sensorId, tipo y valor son requeridos' });
  }

  try {
    const valFloat = parseFloat(valor);
    
    // 1. Alimentar las variables en caliente en el simulador en memoria
    if (sensorId === 'ESP32-A1' || tipo.toUpperCase() === 'TEMPERATURA') {
      sensorTemp.registrarLectura(valFloat);
    } else if (sensorId === 'ESP32-A2' || tipo.toUpperCase() === 'HUMEDAD_SUELO' || tipo.toUpperCase() === 'HUMEDAD') {
      sensorHum.registrarLectura(valFloat);
    } else if (sensorId === 'ESP32-A3' || tipo.toUpperCase() === 'PH') {
      sensorPh.registrarLectura(valFloat);
    }

    // 2. Si la BD PostgreSQL está conectada, almacenar
    if (pool) {
      // Auto-registro del sensor si no existe
      const { rows } = await pool.query('SELECT id FROM sensores WHERE id = $1', [sensorId]);
      if (rows.length === 0) {
        await pool.query(
          'INSERT INTO sensores (id, tipo, lote_id, activo) VALUES ($1, $2, $3, $4)',
          [sensorId, tipo.toUpperCase(), loteId || 'Lote-001', true]
        );
      }
      
      // Registrar lectura
      await pool.query(
        `INSERT INTO lecturas_sensores (sensor_id, valor, unidad, timestamp) 
         VALUES ($1, $2, $3, NOW())`,
        [sensorId, valFloat, unidad || '']
      );
    }

    res.status(201).json({ status: 'ok', mensaje: 'Lectura IoT registrada correctamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', mensaje: 'Error al procesar lectura IoT', error: error.message });
  }
});

// ── Exportación de Historial a Excel (Business Intelligence) ─────────────────
app.get('/api/lotes/:id/exportar', async (req, res) => {
  const loteId = req.params.id;
  try {
    let data = [];

    if (pool) {
      const { rows } = await pool.query(
        `SELECT 
          to_char(ls.timestamp, 'YYYY-MM-DD HH24:MI:SS') as fecha,
          s.tipo,
          ls.valor,
          ls.unidad
         FROM lecturas_sensores ls
         JOIN sensores s ON ls.sensor_id = s.id
         WHERE ls.lote_id = $1
         ORDER BY ls.timestamp DESC LIMIT 200`,
        [loteId]
      );

      // Agrupar lecturas por fecha
      const agrupado = {};
      rows.forEach(r => {
        if (!agrupado[r.fecha]) {
          agrupado[r.fecha] = { 'Fecha y Hora': r.fecha };
        }
        if (r.tipo === 'TEMPERATURA') agrupado[r.fecha]['Temperatura (°C)'] = parseFloat(r.valor);
        if (r.tipo === 'HUMEDAD_SUELO') agrupado[r.fecha]['Humedad del Suelo (%)'] = parseFloat(r.valor);
        if (r.tipo === 'PH') agrupado[r.fecha]['pH del Suelo'] = parseFloat(r.valor);
      });
      data = Object.values(agrupado);
    } else {
      // Fallback en memoria
      const hTemp = sensorTemp.historialLecturas;
      const hHum  = sensorHum.historialLecturas;
      const hPh   = sensorPh.historialLecturas;
      data = hTemp.map((lt, i) => ({
        'Fecha y Hora': new Date(lt.timestamp).toLocaleString('es-DO'),
        'Temperatura (°C)': lt.valor,
        'Humedad del Suelo (%)': hHum[i]?.valor ?? 0,
        'pH del Suelo': hPh[i]?.valor ?? 0,
      }));
    }

    if (data.length === 0) {
      return res.status(404).json({ status: 'error', mensaje: 'No hay datos de sensores para este lote' });
    }

    // Crear libro de Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Formatear anchos de columnas
    ws['!cols'] = [
      { wch: 22 }, // Fecha
      { wch: 18 }, // Temperatura
      { wch: 22 }, // Humedad
      { wch: 15 }  // pH
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Historial_Telemetria');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="Reporte_Telemetria_${loteId}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.end(buffer);
  } catch (error) {
    res.status(500).json({ status: 'error', mensaje: 'Error al exportar reporte de datos', error: error.message });
  }
});

// ── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/lotes',         lotesRoutes);
app.use('/api/cultivos',      cultivosRoutes);
app.use('/api/alertas',       alertasRoutes);
app.use('/api/configuracion', configuracionRoutes);

// ── Salud ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mensaje: 'Conuco Tech Backend Funcionando' });
});


// ── Evaluador de umbrales (genera alertas automáticas cada 5s) ───────────────
setInterval(async () => {
  const temp = sensorTemp.obtenerUltimaLectura()?.valor;
  const hum  = sensorHum.obtenerUltimaLectura()?.valor;
  const ph   = sensorPh.obtenerUltimaLectura()?.valor;
  if (temp == null) return;

  const u = umbralesRepo.getSync();

  const checks = [
    {
      sensor: 'temperatura', sensorId: 'ESP32-A1', valor: temp,
      critico_alto: u.temp_critico_alto,       advertencia_alto: u.temp_advertencia_alto,
      advertencia_bajo: u.temp_advertencia_bajo, critico_bajo: u.temp_critico_bajo,
      unidad: '°C',
    },
    {
      sensor: 'humedad', sensorId: 'ESP32-A2', valor: hum,
      critico_alto: u.hum_critico_alto,         advertencia_alto: u.hum_advertencia_alto,
      advertencia_bajo: u.hum_advertencia_bajo,  critico_bajo: u.hum_critico_bajo,
      unidad: '%',
    },
    {
      sensor: 'ph', sensorId: 'ESP32-A3', valor: ph,
      critico_alto: u.ph_critico_alto,           advertencia_alto: u.ph_advertencia_alto,
      advertencia_bajo: u.ph_advertencia_bajo,    critico_bajo: u.ph_critico_bajo,
      unidad: '',
    },
  ];

  for (const c of checks) {
    let nivel = null;
    let msg   = null;

    if (c.valor >= c.critico_alto) {
      nivel = 'critica';
      msg   = `${capitalize(c.sensor)} muy alta: ${c.valor.toFixed(2)}${c.unidad}`;
    } else if (c.valor <= c.critico_bajo) {
      nivel = 'critica';
      msg   = `${capitalize(c.sensor)} muy baja: ${c.valor.toFixed(2)}${c.unidad}`;
    } else if (c.valor >= c.advertencia_alto) {
      nivel = 'advertencia';
      msg   = `${capitalize(c.sensor)} elevada: ${c.valor.toFixed(2)}${c.unidad}`;
    } else if (c.valor <= c.advertencia_bajo) {
      nivel = 'advertencia';
      msg   = `${capitalize(c.sensor)} baja: ${c.valor.toFixed(2)}${c.unidad}`;
    }

    // Pasa sensorId y loteId para mantener las FK en la tabla alertas
    if (nivel) await alertasRepo.add(c.sensor, nivel, msg, c.sensorId, 'Lote-001');
  }

  // Actualiza las lecturas actuales del Lote-001 en la tabla de lotes
  await lotesRepo.updateSensores('Lote-001', temp, hum, ph);
}, 5000);

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Semilla de usuario por defecto ───────────────────────────────────────────
(async () => {
  try {
    await AuthService.registrar('Randy (Productor)', 'admin@lab.com', 'admin123');
    console.log('[🔑] Usuario semilla: admin@lab.com | Pass: admin123');
  } catch {
    // ya existe
  }
})();

app.listen(PORT, () => {
  console.log(`[🚀] Conuco Tech API → http://localhost:${PORT}`);
  console.log(`[📡] Simulador IoT activo (5s)`);
});
