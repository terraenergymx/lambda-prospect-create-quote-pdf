import { Handler, Context, Callback } from 'aws-lambda';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AppConfig, AppEnvironment } from '@config/app-config';
// Importamos los adaptadores primarios
import { ApiGatewayAdapter } from '@adapters/primary/api-gateway.adapter';

export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback
): Promise<any> => {
  // Detectar el ambiente y crear el objeto de configuración
  const env = process.env.ENVIRONMENT?.toUpperCase() || 'UNKNOWN';
  let currentEnvironment: AppEnvironment;

  if (env === 'STAGING') {
    currentEnvironment = 'STAGING';
  } else if (env === 'PRODUCTION') {
    currentEnvironment = 'PRODUCTION';
  } else {
    currentEnvironment = 'UNKNOWN';
  }

  if (currentEnvironment === 'UNKNOWN') {
    console.warn('Environment could not be determined from ENVIRONMENT:', env);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Environment not configured correctly' }),
    };
  }

  // Crear el objeto de configuración
  const appConfig: AppConfig = {
    environment: currentEnvironment,
  };

  console.log(`Running in environment: ${appConfig.environment}`);
  console.log(`Event:`, JSON.stringify(event, null, 2));

  try {
    if (event.httpMethod && typeof event.httpMethod === 'string') {
      const apiEvent = event as APIGatewayProxyEvent;
      const result: APIGatewayProxyResult = await ApiGatewayAdapter(apiEvent);
      return result;
    }

    if (event.requestContext && event.requestContext.http) {
      const apiEvent = event as APIGatewayProxyEvent;
      const result: APIGatewayProxyResult = await ApiGatewayAdapter(apiEvent);
      return result;
    }
    
    throw new Error('Invocation source not supported');
  } catch (error) {
    console.error('Handler routing error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};