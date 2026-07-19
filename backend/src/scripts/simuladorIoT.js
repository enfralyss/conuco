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
      TEMPERATURA: 25.0,          // °C
      HUMEDAD_SUELO: 60.0,        // %
      HUMEDAD_AMBIENTAL: 55.0,    // % (DHT22)
      LUZ_SOLAR: 30000,           // lux (BH1750)
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
        case 'HUMEDAD_AMBIENTAL':
          // Humedad del aire (DHT22): varía con más soltura que la del suelo
          this.estadoActual.HUMEDAD_AMBIENTAL = GeneradorAleatorio.derivar(this.estadoActual.HUMEDAD_AMBIENTAL, 1.5, 20, 95);
          valorLeido = this.estadoActual.HUMEDAD_AMBIENTAL;
          unidad = '%';
          break;
        case 'LUZ_SOLAR':
          // Luz solar (BH1750): fluctúa por nubes y hora del día
          this.estadoActual.LUZ_SOLAR = GeneradorAleatorio.derivar(this.estadoActual.LUZ_SOLAR, 2000, 0, 65000);
          valorLeido = this.estadoActual.LUZ_SOLAR;
          unidad = 'lux';
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
  const sensorAmb = new Sensor('ESP32-A3', 'HUMEDAD_AMBIENTAL', 'Lote-001');

  const simulador = new SimuladorIoT([sensorTemp, sensorHum, sensorAmb]);
  simulador.iniciarSimulacion(2000); // 2 segundos para test rápido
}

module.exports = SimuladorIoT;
