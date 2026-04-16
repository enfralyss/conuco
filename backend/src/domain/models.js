/**
 * Conuco Tech - Entidades de Dominio
 * Arquitectura Orientada a Objetos (OO) para separar la lógica de negocio.
 */

class Cultivo {
  /**
   * @param {string} id - Identificador único
   * @param {string} nombre - Nombre del cultivo (Ej: Tomate, Maíz)
   * @param {string} etapaCrecimiento - Etapa actual (Siembra, Desarrollo, Cosecha)
   * @param {Date} fechaSiembra - Fecha en que se sembró
   */
  constructor(id, nombre, etapaCrecimiento, fechaSiembra) {
    this.id = id;
    this.nombre = nombre;
    this.etapaCrecimiento = etapaCrecimiento;
    this.fechaSiembra = fechaSiembra;
    this.activo = true;
  }

  actualizarEtapa(nuevaEtapa) {
    this.etapaCrecimiento = nuevaEtapa;
    return this.etapaCrecimiento;
  }

  finalizarCultivo() {
    this.activo = false;
  }
}

class Lote {
  /**
   * @param {string} id - Identificador del lote
   * @param {string} ubicacion - Descripción o coordenadas
   * @param {number} areaTotal - Área en metros cuadrados o hectáreas
   */
  constructor(id, ubicacion, areaTotal) {
    this.id = id;
    this.ubicacion = ubicacion;
    this.areaTotal = areaTotal;
    
    // Relaciones
    this.cultivos = [];
    this.sensores = [];
  }

  asignarCultivo(cultivo) {
    if (cultivo instanceof Cultivo) {
      this.cultivos.push(cultivo);
    } else {
      throw new Error("El objeto debe ser una instancia de la clase Cultivo");
    }
  }

  asignarSensor(sensor) {
    if (sensor instanceof Sensor) {
      this.sensores.push(sensor);
    } else {
      throw new Error("El objeto debe ser una instancia de la clase Sensor");
    }
  }

  obtenerSensoresActivos() {
    return this.sensores.filter(s => s.activo);
  }
}

class Sensor {
  /**
   * @param {string} id - MAC Address o ID único del sensor (ESP32 node)
   * @param {string} tipo - 'TEMPERATURA', 'HUMEDAD_SUELO', 'PH'
   * @param {string} loteId - ID del Lote donde se ubica
   */
  constructor(id, tipo, loteId) {
    this.id = id;
    this.tipo = tipo;
    this.loteId = loteId;
    this.activo = true;
    this.historialLecturas = [];
  }

  registrarLectura(valor, unidad) {
    const lectura = {
      valor,
      unidad,
      timestamp: new Date()
    };
    this.historialLecturas.push(lectura);
    return lectura;
  }
  
  obtenerUltimaLectura() {
    if (this.historialLecturas.length === 0) return null;
    return this.historialLecturas[this.historialLecturas.length - 1];
  }
}

module.exports = {
  Cultivo,
  Lote,
  Sensor
};
