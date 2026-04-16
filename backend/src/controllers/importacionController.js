const xlsx = require('xlsx');
const { Cultivo } = require('../domain/models');

/**
 * Módulo de importación diseñado para procesar el histórico de los
 * pequeños productores (Conucos). Recibe un archivo binario o en memoria.
 */
class ImportacionController {
  
  /**
   * Procesa el Buffer de un archivo Excel, parsea sus hojas y
   * lo convierte en instancias de la clase Cultivo.
   * 
   * @param {Buffer} fileBuffer - Buffer del archivo provisto (ej. desde multer)
   * @param {string} fileName - Nombre del archivo original
   */
  static importarCultivosExcel(fileBuffer, fileName) {
    console.log(`[Importación] Procesando archivo: ${fileName}`);
    const resultados = {
      procesados: 0,
      errores: [],
      cultivos: []
    };

    try {
      // 1. Leer el buffer en memoria usando la librería xlsx
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0]; // Tomar la primera hoja por defecto
      const sheet = workbook.Sheets[sheetName];

      // 2. Convertir la hoja a formato JSON (Arreglo de Objetos)
      const data = xlsx.utils.sheet_to_json(sheet);
      
      console.log(`[Importación] Se encontraron ${data.length} filas. Validando e instanciando...`);

      // 3. Iterar validando y creando Instancias OO
      data.forEach((fila, index) => {
        // Validación básica de campos requeridos
        if (!fila.Nombre || !fila.Etapa || !fila.FechaSiembra) {
          resultados.errores.push(`Fila ${index + 2}: Faltan campos requeridos (Nombre, Etapa o FechaSiembra).`);
          return;
        }

        // Parsear fecha dependiendo del formato de Excel (puede venir como entero o string)
        // Para simplificar, asumimos que se parsea correctamente a JS o viene como MM/DD/YYYY
        let fechaParseada;
        if (typeof fila.FechaSiembra === 'number') {
           // Excel serial date format
           fechaParseada = new Date(Math.round((fila.FechaSiembra - 25569) * 864e5));
        } else {
           fechaParseada = new Date(fila.FechaSiembra);
        }

        // 4. Utilizar modelado de datos orientado a objetos para encapsular
        const uuidMock = `cultivo-${Date.now()}-${index}`;
        const nuevoCultivo = new Cultivo(
          uuidMock,
          fila.Nombre,
          fila.Etapa,
          new Date(fechaParseada)
        );

        resultados.cultivos.push(nuevoCultivo);
        resultados.procesados++;
      });

      console.log(`[Importación] Finalizada. Éxitos: ${resultados.procesados}, Errores: ${resultados.errores.length}`);
      return resultados;

    } catch (error) {
      console.error("[Importación] Fallo crítico al parsear el archivo Excel:", error);
      throw new Error("No se pudo procesar el archivo Excel. Asegúrate de que el formato sea válido.");
    }
  }
}

// Ejemplo de uso local si se ejecuta el controlador suelto
if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  
  // Archivo ficticio asumiendo que existe un test.xlsx en una carpeta local test
  const demoPath = path.join(__dirname, '../../test/test_cultivos.xlsx');
  if (fs.existsSync(demoPath)) {
    const fakeBuffer = fs.readFileSync(demoPath);
    const resumen = ImportacionController.importarCultivosExcel(fakeBuffer, 'test_cultivos.xlsx');
    console.log(resumen);
  } else {
    console.log("Para probar la importación directa, debes tener un 'test_cultivos.xlsx' en /test/");
  }
}

module.exports = ImportacionController;
