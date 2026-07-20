const pool        = require('./db/pool'); // inicializa conexión pg al arrancar
const bootstrapDb = require('./db/bootstrap');
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
// SIMULADOR_ACTIVO=false → no genera lecturas falsas (usar cuando el ESP32
// físico envía datos reales por /api/sensores/ingesta; si no, las pisaría).
const SIMULADOR_ACTIVO = process.env.SIMULADOR_ACTIVO !== 'false';

const sensorTemp = new Sensor('ESP32-A1', 'TEMPERATURA',   'Lote-001');
const sensorHum  = new Sensor('ESP32-A2', 'HUMEDAD_SUELO', 'Lote-001');
// Tercer sensor: DHT22 (humedad del aire) o BH1750 (luz solar).
// Descomenta el que corresponda — igual que en frontend/src/config/sensorAmbiental.js
const sensorAmb  = new Sensor('ESP32-A3', 'HUMEDAD_AMBIENTAL', 'Lote-001');
// const sensorAmb  = new Sensor('ESP32-A3', 'LUZ_SOLAR',        'Lote-001');

const simulador = new SimuladorIoT([sensorTemp, sensorHum, sensorAmb]);
if (SIMULADOR_ACTIVO) {
  simulador.iniciarSimulacion(5000);
} else {
  console.log('[📡] Simulador IoT desactivado (SIMULADOR_ACTIVO=false) — esperando lecturas reales del ESP32');
}

// ── Lecturas IoT (polling del dashboard) ─────────────────────────────────────
// El nodo (ESP32 o simulador) envía cada 5s; con más de 20s sin lecturas
// nuevas se reporta nodoEnLinea = false para que el panel marque "sin señal".
const NODO_TIMEOUT_MS = 20000;

app.get('/api/sensores/lecturas', (req, res) => {
  const timestamps = [sensorTemp, sensorHum, sensorAmb]
    .map(s => s.obtenerUltimaLectura()?.timestamp)
    .filter(Boolean);
  const ultimaLectura = timestamps.length
    ? new Date(Math.max(...timestamps.map(t => t.getTime())))
    : null;

  res.json({
    timestamp:     new Date(),
    temperatura:   sensorTemp.obtenerUltimaLectura()?.valor || 0,
    humedad:       sensorHum.obtenerUltimaLectura()?.valor  || 0,
    ambiental:     sensorAmb.obtenerUltimaLectura()?.valor  || 0,
    ultimaLectura,
    nodoEnLinea:   ultimaLectura !== null && Date.now() - ultimaLectura.getTime() <= NODO_TIMEOUT_MS,
  });
});

app.get('/api/sensores/historial', (req, res) => {
  const hTemp = sensorTemp.historialLecturas.slice(-15);
  const hHum  = sensorHum.historialLecturas.slice(-15);
  const hAmb  = sensorAmb.historialLecturas.slice(-15);

  const combinados = hTemp.map((lt, i) => ({
    time:        new Date(lt.timestamp).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    temperatura: lt.valor,
    humedad:     hHum[i]?.valor ?? 0,
    ambiental:   hAmb[i]?.valor ?? 0,
  }));

  res.json(combinados);
});

// ── Ingesta de Lecturas IoT (Para integración física con ESP32 / Arduino) ──────
// Tipos de sensor: TEMPERATURA | HUMEDAD_SUELO | HUMEDAD_AMBIENTAL | LUZ_SOLAR
// Tipo especial ADVERTENCIA: el nodo reporta un fallo de hardware (sensor
// desconectado, lectura NaN, etc.) → genera una alerta, NO una lectura.
const SENSOR_DISPLAY = { 'ESP32-A1': 'temperatura', 'ESP32-A2': 'humedad', 'ESP32-A3': 'ambiental' };

app.post('/api/sensores/ingesta', async (req, res) => {
  const { sensorId, tipo, valor, unidad, loteId, mensaje } = req.body;

  if (!sensorId || tipo == null || valor == null) {
    return res.status(400).json({ status: 'error', mensaje: 'sensorId, tipo y valor son requeridos' });
  }

  try {
    const tipoUp = String(tipo).toUpperCase();

    // Auto-registro del sensor si no existe (aplica a lecturas y advertencias)
    if (pool) {
      const { rows } = await pool.query('SELECT id FROM sensores WHERE id = $1', [sensorId]);
      if (rows.length === 0) {
        await pool.query(
          'INSERT INTO sensores (id, tipo, lote_id, activo) VALUES ($1, $2, $3, $4)',
          [sensorId, tipoUp === 'ADVERTENCIA' ? 'DESCONOCIDO' : tipoUp, loteId || 'Lote-001', true]
        );
      }
    }

    // Advertencia de hardware del nodo → alerta, sin registrar lectura
    if (tipoUp === 'ADVERTENCIA') {
      await alertasRepo.add(
        SENSOR_DISPLAY[sensorId] || 'hardware',
        'advertencia',
        mensaje || `Advertencia de hardware del nodo ${sensorId}`,
        sensorId,
        loteId || 'Lote-001'
      );
      return res.status(201).json({ status: 'ok', mensaje: 'Advertencia de hardware registrada' });
    }

    const valFloat = parseFloat(valor);

    // 1. Alimentar las variables en caliente en el simulador en memoria
    if (sensorId === 'ESP32-A1' || tipoUp === 'TEMPERATURA') {
      sensorTemp.registrarLectura(valFloat);
    } else if (sensorId === 'ESP32-A2' || tipoUp === 'HUMEDAD_SUELO' || tipoUp === 'HUMEDAD') {
      sensorHum.registrarLectura(valFloat);
    } else if (sensorId === 'ESP32-A3' || tipoUp === 'HUMEDAD_AMBIENTAL' || tipoUp === 'LUZ_SOLAR') {
      sensorAmb.registrarLectura(valFloat);
    }

    // 2. Si la BD PostgreSQL está conectada, almacenar
    if (pool) {
      
      // Registrar lectura (lote_id desnormalizado — lo usa la exportación a Excel)
      await pool.query(
        `INSERT INTO lecturas_sensores (sensor_id, lote_id, valor, unidad, timestamp)
         VALUES ($1, $2, $3, $4, NOW())`,
        [sensorId, loteId || 'Lote-001', valFloat, unidad || '']
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
        if (r.tipo === 'HUMEDAD_AMBIENTAL') agrupado[r.fecha]['Humedad Ambiental (%)'] = parseFloat(r.valor);
        if (r.tipo === 'LUZ_SOLAR') agrupado[r.fecha]['Luz Solar (lux)'] = parseFloat(r.valor);
      });
      data = Object.values(agrupado);
    } else {
      // Fallback en memoria
      const hTemp = sensorTemp.historialLecturas;
      const hHum  = sensorHum.historialLecturas;
      const hAmb  = sensorAmb.historialLecturas;
      const ambCol = sensorAmb.tipo === 'LUZ_SOLAR' ? 'Luz Solar (lux)' : 'Humedad Ambiental (%)';
      data = hTemp.map((lt, i) => ({
        'Fecha y Hora': new Date(lt.timestamp).toLocaleString('es-DO'),
        'Temperatura (°C)': lt.valor,
        'Humedad del Suelo (%)': hHum[i]?.valor ?? 0,
        [ambCol]: hAmb[i]?.valor ?? 0,
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
      { wch: 22 }, // Humedad suelo
      { wch: 22 }  // Sensor ambiental
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
  try {
  const temp = sensorTemp.obtenerUltimaLectura()?.valor;
  const hum  = sensorHum.obtenerUltimaLectura()?.valor;
  const amb  = sensorAmb.obtenerUltimaLectura()?.valor;
  if (temp == null) return;

  const u = await umbralesRepo.getParaEvaluador();

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
      sensor: 'ambiental', sensorId: 'ESP32-A3', valor: amb,
      nombre: sensorAmb.tipo === 'LUZ_SOLAR' ? 'Luz solar' : 'Humedad ambiental',
      critico_alto: u.amb_critico_alto,          advertencia_alto: u.amb_advertencia_alto,
      advertencia_bajo: u.amb_advertencia_bajo,   critico_bajo: u.amb_critico_bajo,
      unidad: sensorAmb.tipo === 'LUZ_SOLAR' ? ' lux' : '%',
    },
  ];

  for (const c of checks) {
    let nivel = null;
    let msg   = null;

    const nombre = c.nombre ?? capitalize(c.sensor);
    if (c.valor >= c.critico_alto) {
      nivel = 'critica';
      msg   = `${nombre} muy alta: ${c.valor.toFixed(2)}${c.unidad}`;
    } else if (c.valor <= c.critico_bajo) {
      nivel = 'critica';
      msg   = `${nombre} muy baja: ${c.valor.toFixed(2)}${c.unidad}`;
    } else if (c.valor >= c.advertencia_alto) {
      nivel = 'advertencia';
      msg   = `${nombre} elevada: ${c.valor.toFixed(2)}${c.unidad}`;
    } else if (c.valor <= c.advertencia_bajo) {
      nivel = 'advertencia';
      msg   = `${nombre} baja: ${c.valor.toFixed(2)}${c.unidad}`;
    }

    // Pasa sensorId y loteId para mantener las FK en la tabla alertas
    if (nivel) await alertasRepo.add(c.sensor, nivel, msg, c.sensorId, 'Lote-001');
  }

  // Actualiza las lecturas actuales del Lote-001 en la tabla de lotes
  await lotesRepo.updateSensores('Lote-001', temp, hum, amb);
  } catch (err) {
    // Un fallo puntual de BD no debe tumbar el proceso (unhandled rejection)
    console.error('[❌] Evaluador de umbrales:', err.message);
  }
}, 5000);

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Inicialización de BD + semilla de usuario por defecto ────────────────────
(async () => {
  try {
    await bootstrapDb(); // crea tablas (idempotente) y siembra lotes/sensores si la BD está vacía
  } catch (err) {
    console.error('[❌] Error inicializando BD:', err.message);
  }
  try {
    await AuthService.registrar('Enfranly (Productor)', 'admin@lab.com', 'admin123');
    console.log('[🔑] Usuario semilla: admin@lab.com | Pass: admin123');
  } catch {
    // ya existe
  }
})();

app.listen(PORT, () => {
  console.log(`[🚀] Conuco Tech API → http://localhost:${PORT}`);
  console.log(SIMULADOR_ACTIVO ? '[📡] Simulador IoT activo (5s)' : '[📡] Simulador IoT desactivado — modo ESP32 real');
});
