// src/config/index.ts

/**
 * Configuración de entorno para la aplicación
 * Lee variables desde process.env y exporta valores tipados
 */

// Cognito
export const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID!;
export const COGNITO_SECRET_NAME = process.env.COGNITO_SECRET_NAME!;
export const COGNITO_REGION = process.env.COGNITO_REGION!;