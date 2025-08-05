/**
 * API Gateway Adapter
 *
 * Adapta invocaciones de API Gateway al caso de uso correspondiente.
 * Este adaptador maneja las solicitudes HTTP de API Gateway,
 * transformando la entrada en un formato adecuado para el caso de uso.
 */

// Importar dependencias necesarias
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
// Importar la configuración desde configuración
import { AppConfig } from '@config/app-config';
// Importamos el caso de uso a utilizar

/**
 * Adaptador para manejar solicitudes de API Gateway.
 * @param event Evento de API Gateway que contiene la solicitud HTTP.
 * @param config Objeto de configuración de la aplicación.
 * @returns Resultado de la invocación del caso de uso en formato APIGatewayProxyResult.
 */
export const ApiGatewayAdapter = async (
  event: APIGatewayProxyEvent,
  config: AppConfig
): Promise<APIGatewayProxyResult> => {
  try {
    /**
     * 1) Adaptar entrada
     * 2) Ejecutar caso de uso (incluir como parametro la configuración)
     * 3) Devolver respuesta formateada
     * 4) Capturar y estandarizar errores
     */
    return {
      statusCode: 200,
      // Aquí se debería implementar la lógica del caso de uso
      // Por ahora, devolvemos un mensaje de ejemplo
      body: JSON.stringify({
        message: 'API Gateway Adapter is not yet implemented.',
      }),
    };
  } catch (error) {
    // Capturar y estandarizar errores
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Api Gateway Adapter Error',
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};