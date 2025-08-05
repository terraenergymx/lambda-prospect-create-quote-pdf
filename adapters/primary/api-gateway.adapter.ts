/**
 * API Gateway Adapter
 *
 * Adapta invocaciones de API Gateway al caso de uso correspondiente.
 * Este adaptador maneja las solicitudes HTTP de API Gateway,
 * transformando la entrada en un formato adecuado para el caso de uso.
 */

// Importar dependencias necesarias
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
// Importamos el caso de uso a utilizar
import { createProspectQuotePdfUseCase } from '@use-cases/create-prospect-quote-pdf.use-case';
/**
 * Adaptador para manejar solicitudes de API Gateway.
 * @param event Evento de API Gateway que contiene la solicitud HTTP.
 * @param config Objeto de configuración de la aplicación.
 * @returns Resultado de la invocación del caso de uso en formato APIGatewayProxyResult.
 */
export const ApiGatewayAdapter = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    
    // Adaptar la entrada del evento al formato esperado por el caso de uso
    const prospectQuoteRequest = JSON.parse(event.body || '{}');
    console.log('Received event:', event);
    console.log('Parsed request:', prospectQuoteRequest);

    // Implementamos la lógica del caso de uso
    const result = await createProspectQuotePdfUseCase(prospectQuoteRequest);

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    // Capturar y estandarizar errores
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error al generar la cotización del prospecto.',
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};