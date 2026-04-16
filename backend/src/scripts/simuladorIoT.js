const { Sensor } = require('../domain/models');

/**
 * Genera números aleatorios con un rango de desviación para evitar
 * saltos irreales en las mediciones
 */
class GeneradorAleatorio {
  static derivar(valorActual, variacionMax, min, max) {
    const cambio = (Math.random() * variacionMax * 2) - variacionMax;
    let nuevoValor = valorActual + cambio;
    if (nuevoValor < min) nuevoValor = min;
    if (nuevoValor > max) nuevoValor = max;
    return Number(nuevoValor.toFixed(2));
  }
}

/**
 * Simulador del comportamiento del hardware IoT (ESP32)
 */
class SimuladorIoT {
  constructor(sensores = []) {
    this.sensores = sensores;
    this.intervalId = null;
    
    // Estados iniciales lógicos para empezar la simulación base
    this.estadoActual = {
      TEMPERATURA: 25.0,  // °C
      HUMEDAD_SUELO: 60.0, // %
      PH: 6.5             // pH
    };
  }

  agregarSensor(sensor) {
    this.sensores.push(sensor);
  }

  // Genera datos realistas y actualiza los sensores
  generarLecturas() {
    console.log(`\n[Simulador IoT] Generando lecturas físicas... - ${new Date().toISOString()}`);
    
    this.sensores.forEach(sensor => {
      if (!sensor.activo) return;

      let valorLeido;
      let unidad;

      switch(sensor.tipo) {
        case 'TEMPERATURA':
          this.estadoActual.TEMPERATURA = GeneradorAleatorio.derivar(this.estadoActual.TEMPERATURA, 0.5, 10, 45);
          valorLeido = this.estadoActual.TEMPERATURA;
          unidad = '°C';
          break;
        case 'HUMEDAD_SUELO':
          // Va secándose de a poco a menos que llueva/riegue. Simulamos bajada constante y subidas repentinas (riego).
          const riega = Math.random() > 0.95; // 5% de probabilidad de riego
          if(riega) {
             this.estadoActual.HUMEDAD_SUELO = 80.0;
          } else {
             this.estadoActual.HUMEDAD_SUELO = GeneradorAleatorio.derivar(this.estadoActual.HUMEDAD_SUELO, 0.2, 20, 100);
          }
           valorLeido = this.estadoActual.HUMEDAD_SUELO;
           unidad = '%';
          break;
        case 'PH':
          this.estadoActual.PH = GeneradorAleatorio.derivar(this.estadoActual.PH, 0.05, 4.0, 9.0);
          valorLeido = this.estadoActual.PH;
          unidad = 'pH';
          break;
      }

      const lectura = sensor.registrarLectura(valorLeido, unidad);
      console.log(`Sensor ${sensor.id} [${sensor.tipo}]: ${lectura.valor} ${lectura.unidad}`);
    });
  }

  iniciarSimulacion(intervaloMs = 5000) {
    if (this.intervalId) return;
    console.log(`Iniciando simulación IoT. Intervalo: ${intervaloMs}ms...`);
    this.intervalId = setInterval(() => this.generarLecturas(), intervaloMs);
  }

  detenerSimulacion() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Simulación IoT detenida.');
    }
  }
}

// Ejemplo de uso / Export
if (require.main === module) {
  const sensorTemp = new Sensor('ESP32-A1', 'TEMPERATURA', 'Lote-001');
  const sensorHum = new Sensor('ESP32-A2', 'HUMEDAD_SUELO', 'Lote-001');
  const sensorPh = new Sensor('ESP32-A3', 'PH', 'Lote-001');

  const simulador = new SimuladorIoT([sensorTemp, sensorHum, sensorPh]);
  simulador.iniciarSimulacion(2000); // 2 segundos para test rápido
}

module.exports = SimuladorIoT;
