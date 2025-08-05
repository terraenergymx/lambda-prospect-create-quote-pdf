/**
 * Cognito Repository
 *
 * Encapsula la lógica de autenticación contra AWS Cognito.=
 */

// Adaptador secundario para autenticación contra AWS Cognito
import { CognitoAdapter } from '@adapters/secondary/cognito.adapter';
// Configuración
import { AppConfig } from '@config/app-config';

/**
 * Cognito Repository
 *
 * Encapsula la lógica de autenticación contra Cognito.
 * Devuelve el token de acceso o lanza un AuthenticationError.
 * @param email Correo electrónico del usuario.
 * @param password Contraseña del usuario.
 * @param config Configuración de la aplicación.
 * @return Token de acceso obtenido de Cognito.
 * @throws AuthenticationError si las credenciales son inválidas.
 */
export async function cognitoRepository(
  email: string,
  password: string,
  config: AppConfig
): Promise<string> {
  try {
    const adapter = new CognitoAdapter(config);
    const token = await adapter.authenticate(email, password);
    return token;
  } catch (err) {
    // Imprimimos el error del adaptador para depuración
    console.error('Cognito Repository Error:', err);
    throw new Error('Cognito authentication failed. Please check your credentials.');
  }
}