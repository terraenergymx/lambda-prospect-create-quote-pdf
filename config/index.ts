// src/config/index.ts

/**
 * Configuración de entorno para la aplicación
 * Lee variables desde process.env y exporta valores tipados
 */

// Base de datos
export const DB_HOST = process.env.DB_HOST!;
export const DB_PORT = parseInt(process.env.DB_PORT!, 10);
export const DB_SECRET_NAME = process.env.DB_SECRET_NAME!;
export const DB_NAME = process.env.DB_NAME!;
// S3
export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME!;