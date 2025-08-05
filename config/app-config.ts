// Definir tipos para la configuración ---
export type AppEnvironment = 'STAGING' | 'PRODUCTION' | 'UNKNOWN';

export interface AppConfig {
  environment: AppEnvironment;
}