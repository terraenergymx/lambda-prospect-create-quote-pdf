/**
 * Cognito Adapter
 *
 * Adapta interacciones con Amazon Cognito para autenticación de usuarios.
 * Este adaptador maneja la autenticación de usuarios utilizando Cognito,
 * incluyendo la gestión de secretos y el cálculo del SecretHash.
 * Utiliza AWS Secrets Manager para obtener el secreto del cliente de forma segura.
 */

// Importar las dependencias necesarias
import { createHmac } from 'crypto';
// Importar los clientes de AWS SDK
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
// Importar el cliente de AWS Secrets Manager
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
// Importar la configuración de la aplicación
import { AppConfig } from '@config/app-config';

/**
 * Adaptador Secundario para interactuar con Amazon Cognito.
 */
export class CognitoAdapter {
  // Clientes de AWS para Cognito y Secrets Manager
  private cognitoClient: CognitoIdentityProviderClient;
  // Cliente de Secrets Manager
  private secretsManagerClient: SecretsManagerClient;
  
  // Client ID y Secret Name según el ambiente
  private clientId: string;
  // Nombre del secreto en Secrets Manager
  private secretName: string;

  // Caché para el secreto para evitar llamadas repetidas
  private cachedClientSecret: string | null = null;

  /**
   * Constructor del adaptador Cognito.
   * @param config Configuración de la aplicación que contiene el ambiente.
   */
  constructor(config: AppConfig) {
    const region = process.env.COGNITO_REGION;
    // Validar que la región esté configurada
    if (!region) {
      throw new Error('COGNITO_REGION environment variable not set.');
    }

    // Inicializar los clientes de AWS
    this.cognitoClient = new CognitoIdentityProviderClient({ region });
    // Inicializar el cliente de Secrets Manager
    this.secretsManagerClient = new SecretsManagerClient({ region });

    // Seleccionar el Client ID y el Secret Name según el ambiente
    this.clientId = process.env.COGNITO_CLIENT_ID!;
    this.secretName = process.env.COGNITO_SECRET_NAME!;
    

    // Validar que el Client ID y el Secret Name estén configurados
    if (!this.clientId) {
      throw new Error(`Cognito Client ID for environment ${config.environment} is not configured.`);
    }
    if (!this.secretName) {
      throw new Error(`Secret Name for environment ${config.environment} is not configured.`);
    }
  }

  /**
   * Obtiene el secreto de cliente desde Secrets Manager, usando una caché interna.
   */
  private async getClientSecret(): Promise<string> {
    if (this.cachedClientSecret) {
      return this.cachedClientSecret;
    }

    console.log(`Fetching secret "${this.secretName}" from Secrets Manager...`);
    const command = new GetSecretValueCommand({ SecretId: this.secretName });
    const response = await this.secretsManagerClient.send(command);

    if (response.SecretString) {
      this.cachedClientSecret = response.SecretString;
      return this.cachedClientSecret;
    }
    
    throw new Error(`Could not retrieve SecretString from secret: ${this.secretName}`);
  }

  /**
   * Calcula el SecretHash requerido por Cognito.
   * @param email El email del usuario.
   * @param clientSecret El secreto del cliente obtenido de Secrets Manager.
   * @return El SecretHash calculado en base64.
   */
  private calculateSecretHash(email: string, clientSecret: string): string {
    const hmac = createHmac('sha256', clientSecret);
    hmac.update(email + this.clientId);
    return hmac.digest('base64');
  }

  /**
   * 
   * Autentica a un usuario contra Cognito, manejando el SecretHash.
   * @param email El email del usuario a autenticar.
   * @param password La contraseña del usuario.
   * @return El token de acceso obtenido de Cognito.
   * @throws Error si la autenticación falla o si no se obtiene el AccessToken.
   */
  public async authenticate(email: string, password: string): Promise<string> {
    console.log(`Authenticating user ${email} with Client ID ${this.clientId}...`);

    try {
      // Obtener el secreto de forma segura
      const clientSecret = await this.getClientSecret();
      
      // Calcular el SecretHash
      const secretHash = this.calculateSecretHash(email, clientSecret);

      // Iniciar la autenticación con Cognito
      console.log(`Initiating authentication for user ${email}...`);
      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          SECRET_HASH: secretHash,
        },
      });

      // Enviar el comando a Cognito
      const response = await this.cognitoClient.send(command);
      // Log de la respuesta completa para depuración
      console.log('Cognito authentication successful.');
      console.log('Full Cognito Response:', JSON.stringify(response, null, 2));
      const token = response.AuthenticationResult?.AccessToken;
      if (!token) {
        throw new Error('AccessToken not found in Cognito response. A challenge was likely issued.');
      }
      return token;

    } catch (error) {
      // Manejo de errores con logs detallados
      console.error('Error from AWS during authentication:', error);
      if (error instanceof Error) {
        throw new Error(`Cognito adapter failed: ${error.message}`);
      }
      throw new Error('Cognito adapter failed with an unknown error.');
    }
  }
}