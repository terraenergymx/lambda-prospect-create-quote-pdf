import { CfeInfo } from '@entity/prospect-coute';

import {
  initializePool,
  beginTransaction,
  execute,
  commitTransaction,
  rollbackTransaction,
} from '@adapters/secondary/rds.adapter';

import { 
  initializeS3Client, 
  uploadObject 
} from '@adapters/secondary/s3.adapter';

export function ProspectQuoteRepository() {
  
  // Inicializa el pool de conexiones al inicio de la aplicación
  async function initializeDatabase(): Promise<void> {
    try {
      await initializePool();
      console.log("Base de datos conectada. Aplicación lista.");
      // Inicia tu servidor u otros servicios aquí
    } catch (error) {
      console.error("Error fatal al iniciar la aplicación: No se pudo conectar a la base de datos.", error);
      process.exit(1); // Salir si la conexión a la DB falla
    }
  }

  async function initializeS3(): Promise<void> {
    try {
      await initializeS3Client();
      console.log("Cliente S3 inicializado.");
    } catch (error) {
      console.error("Error fatal al iniciar la aplicación: No se pudo conectar al cliente S3.", error);
      process.exit(1); // Salir si la conexión a S3 falla
    }
  }

  /**
   * Verifica si una tarifa ya existe por id.
   * Utiliza una transacción para asegurar que la conexión se maneje correctamente,
   * dado que 'execute' requiere una conexión de 'beginTransaction'.
   * @param id ID de la tarifa a verificar.
   * @returns true si la tarifa ya existe, false en caso contrario.
   */
  async function getCfeTariffById(id: number): Promise<CfeInfo | null> {
    console.log(`Verificando si la tarifa CFE con ID ${id} existe...`);

    let connection; // Declara la conexión fuera del try para que sea accesible en el finally/catch
    try {
      connection = await beginTransaction();

      const sql = `SELECT id, tariff_code FROM cfe_tariffs WHERE id = ? LIMIT 1;`;
      const params = [id];

      // Ejecuta la consulta usando la conexión obtenida.
      const rows = await execute(connection, sql, params);

      // Confirma la "transacción" para liberar la conexión al pool.
      await commitTransaction(connection);

      if (rows && rows.length > 0) {
        console.log(`La tarifa CFE con ID ${id} existe.`);
        return {
          tariff_type_id: rows[0].id,
          tariff_type: rows[0].tariff_code,
        }; // Retorna la información de la tarifa
      }
      console.log(`La tarifa CFE con ID ${id} no existe.`);
      return null; // Retorna null si no se encontró la tarifa
    } catch (error) {
      console.error(`Error al verificar la tarifa CFE con ID ${id}:`, error);
      // Si hubo un error, revierte la "transacción" para liberar la conexión.
      if (connection) {
        await rollbackTransaction(connection);
      }
      throw new Error('Error al verificar la tarifa CFE');
    }
  }

  /**
   * Sube un archivo PDF generado a S3.
   * @param key Clave del objeto en S3 (ruta/nombre del archivo).
   * @param body Contenido del PDF como Buffer.
   * @returns Objeto con el nombre del bucket y la clave del objeto subido.
   */
  async function uploadPdfToS3(key: string, body: Buffer): Promise<{ bucket: string; key: string }> {
    try {
      const result = await uploadObject(key, body, 'application/pdf');
      return result;
    } catch (error) {
      console.error(`Error al subir el PDF a S3:`, error);
      throw error;
    }
  }

  return {
    initializeDatabase,
    initializeS3,
    getCfeTariffById,
    uploadPdfToS3,
  };
}
