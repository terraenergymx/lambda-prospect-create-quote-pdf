# Plantilla Lambda con Arquitectura Limpia en TypeScript

Esta es una plantilla para crear funciones AWS Lambda utilizando TypeScript y siguiendo los principios de la Arquitectura Limpia. El objetivo es proporcionar una base sólida y escalable para desarrollar funciones Lambda que sean fáciles de mantener, probar y evolucionar.

## Características

- **Arquitectura Limpia**: Separación de responsabilidades en capas (Dominio, Casos de Uso, Adaptadores, etc.).
- **TypeScript**: Tipado estático para un desarrollo más seguro.
- **Despliegue Automatizado**: Workflow de GitHub Actions para despliegue continuo en AWS.
- **Manejo de Entornos**: Configuración para entornos de `STAGING` y `PRODUCTION`.
- **Adaptadores Flexibles**: Preparado para interactuar con servicios como API Gateway y Cognito.

## Estructura del Proyecto

.
├── .github/workflows/   # Workflows de GitHub Actions
│   └── deploy.yml
├── adapters/            # Adaptadores para interactuar con el mundo exterior
│   ├── primary/         # Adaptadores que inician la ejecución (ej. API Gateway)
│   └── secondary/       # Adaptadores para servicios externos (ej. Cognito, BD)
├── config/              # Configuración de la aplicación
├── domain/              # Lógica y entidades del negocio
├── errors/              # Clases de error personalizadas
├── node_modules/
├── repositories/        # Abstracciones para el acceso a datos
├── use-cases/           # Casos de uso de la aplicación
├── .gitignore
├── index.ts             # Punto de entrada de la Lambda
├── package.json
├── tsconfig.json
└── README.md


## Empezando

### Prerrequisitos

- Node.js (versión 18 o superior)
- Cuenta de AWS con credenciales configuradas

### Instalación

1.  **Clona el repositorio:**
    ```bash
    git clone [https://github.com/tu-usuario/tu-repositorio.git](https://github.com/tu-usuario/tu-repositorio.git)
    cd tu-repositorio
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```

### Configuración de Variables de Entorno

Para el despliegue y la ejecución, se necesita configurar los siguientes secretos en el repositorio de GitHub (en `Settings > Secrets and variables > Actions`):

-   `AWS_ACCESS_KEY_ID`: Access Key ID de AWS.
-   `AWS_SECRET_ACCESS_KEY`: Secret Access Key de AWS.
-   `AWS_REGION`: La región de AWS donde desplegarás la Lambda (ej. `us-east-1`).
-   `LAMBDA_FUNCTION_NAME_PRODUCTION`: El nombre de función Lambda para el entorno de producción.
-   `LAMBDA_FUNCTION_NAME_STAGING`: El nombre de función Lambda para el entorno de staging.
-   `COGNITO_CLIENT_ID_PRODUCTION`: El Client ID de Cognito para producción.
-   `COGNITO_SECRET_NAME_PRODUCTION`: El nombre del secreto en AWS Secrets Manager para el Client Secret de Cognito en producción.
-   `COGNITO_CLIENT_ID_STAGING`: El Client ID de Cognito para staging.
-   `COGNITO_SECRET_NAME_STAGING`: El nombre del secreto en AWS Secrets Manager para el Client Secret de Cognito en staging.

## Uso

### Compilar el Código

Para compilar el código de TypeScript a JavaScript, ejecuta:

```bash
npm run build