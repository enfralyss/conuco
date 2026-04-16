const express = require('express');
const cors = require('cors');
const SimuladorIoT = require('./scripts/simuladorIoT');
const { Sensor } = require('./domain/models');

const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Montar Rutas de Autenticación
app.use('/api/auth', authRoutes);

// Seeding: Crear usuario por defecto temporal para evitar tener que hacer register manual
const AuthService = require('./services/authService');
(async () => {
  try {
    await AuthService.registrar('Randy (Productor)', 'admin@lab.com', 'admin123');
    console.log('[🔑] Usuario Semilla creado: admin@lab.com | Pass: admin123');
  } catch (err) {
    // Ya existe
  }
})();

// 1. Inicializamos nuestros Sensores Virtuales y el Simulador
const sensorTemp = new Sensor('ESP32-A1', 'TEMPERATURA', 'Lote-001');
const sensorHum = new Sensor('ESP32-A2', 'HUMEDAD_SUELO', 'Lote-001');
const sensorPh = new Sensor('ESP32-A3', 'PH', 'Lote-001');

const simulador = new SimuladorIoT([sensorTemp, sensorHum, sensorPh]);
simulador.iniciarSimulacion(5000); // Actualiza cada 5 segs

// 2. Endpoints de la API REST

// Endpoint base para revisar salud del servidor
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mensaje: 'Conuco Tech Backend Funcionando' });
});

// Obtener la última lectura de todos los sensores (Para el Polling del Dashboard)
app.get('/api/sensores/lecturas', (req, res) => {
  const lecturas = {
    timestamp: new Date(),
    temperatura: sensorTemp.obtenerUltimaLectura()?.valor || 0,
    humedad: sensorHum.obtenerUltimaLectura()?.valor || 0,
    ph: sensorPh.obtenerUltimaLectura()?.valor || 0
  };
  res.json(lecturas);
});

// Devolver el historial para dibujar la gráfica retroactiva (10 últimas lecturas)
app.get('/api/sensores/historial', (req, res) => {
  // Para simplificar, transformamos el historial de los objetos en un array combinando por indices.
  // En la vida real, sacarías esto ordenado de tu DB PostgreSQL.
  
  const hTemp = sensorTemp.historialLecturas.slice(-15);
  const hHum = sensorHum.historialLecturas.slice(-15);
  const hPh = sensorPh.historialLecturas.slice(-15);
  
  const combinados = hTemp.map((lt, index) => {
    return {
      time: new Date(lt.timestamp).toLocaleTimeString(),
      temperatura: lt.valor,
      humedad: hHum[index] ? hHum[index].valor : 0,
      ph: hPh[index] ? hPh[index].valor : 0
    };
  });
  
  res.json(combinados);
});

// Endpoint para subir el archivo de Excel y procesarlo con el Controller (Estructura Mockup)
app.post('/api/cultivos/importar', (req, res) => {
  // Aquí debes inyectar multer. Luego pasar el buffer:
  // ImportacionController.importarCultivosExcel(req.file.buffer, req.file.originalname);
  res.json({ mensaje: 'Endpoint para importación de Excel preparado. Requiere configurar Multer.' });
});

app.listen(PORT, () => {
  console.log(`[🚀] Servidor API Conuco Tech ejecutándose en: http://localhost:${PORT}`);
  console.log(`[📡] Simulador de Sensores integrado.`);
});
