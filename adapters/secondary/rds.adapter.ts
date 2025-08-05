import mysql, { PoolConnection } from 'mysql2/promise';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const SECRET_NAME = process.env.DB_SECRET_NAME;

if (!SECRET_NAME) {
    throw new Error("La variable de entorno DB_SECRET_NAME no está configurada.");
}

const secretsManagerClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

async function getDbCredentials() {
    try {
        const command = new GetSecretValueCommand({ SecretId: SECRET_NAME });
        const data = await secretsManagerClient.send(command);

        if (data.SecretString) {
            const secret = JSON.parse(data.SecretString);
            return {
                host: process.env.DB_HOST || secret.host,
                user: secret.username,
                password: secret.password,
                database: process.env.DB_NAME || secret.dbname,
                port: parseInt(process.env.DB_PORT || secret.port, 10) || 3306,
            };
        }
        throw new Error("El secreto no contiene una cadena de texto.");
    } catch (error) {
        console.error("Error al obtener el secreto de Secrets Manager:", error);
        throw error;
    }
}

let pool: mysql.Pool | undefined; // Make it explicitly undefined initially

/**
 * Initializes the MySQL connection pool by fetching credentials from AWS Secrets Manager.
 * This function MUST be called and awaited once before any database operations.
 */
export async function initializePool(): Promise<void> {
    if (pool) {
        console.log("Pool de conexiones ya inicializado.");
        return; // Already initialized, prevent re-initialization
    }
    console.log("Inicializando pool de conexiones MySQL...");
    try {
        const dbCredentials = await getDbCredentials();

        pool = mysql.createPool({
            host: dbCredentials.host,
            user: dbCredentials.user,
            password: dbCredentials.password,
            database: dbCredentials.database,
            port: dbCredentials.port,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        console.log("Pool de conexiones MySQL inicializado con credenciales de Secrets Manager.");
    } catch (error) {
        console.error("Fallo al inicializar el pool de conexiones:", error);
        throw error; // Re-throw to propagate the error and potentially stop the app startup
    }
}

// Helper to ensure the pool is ready before operations
function getPool(): mysql.Pool {
    if (!pool) {
        // This indicates a missing call to initializePool() at app startup
        throw new Error("El pool de conexiones no está inicializado. Asegúrate de llamar a initializePool() al inicio de tu aplicación.");
    }
    return pool;
}

/**
 * Inicia una transacción. Devuelve un objeto de conexión que debe ser usado
 * para todas las operaciones dentro de la transacción.
 */
export async function beginTransaction(): Promise<PoolConnection> {
    const currentPool = getPool();
    const connection = await currentPool.getConnection();
    try {
        await connection.beginTransaction();
        return connection;
    } catch (error) {
        console.error("Error al iniciar la transacción:", error);
        throw error;
    }
}

/**
 * Ejecuta una sentencia SQL usando la conexión de la transacción.
 * @param connection La conexión obtenida de beginTransaction.
 * @param sql La sentencia SQL con placeholders de interrogación (?).
 * @param parameters Un array de valores para los placeholders.
 */
export async function execute(
    connection: PoolConnection,
    sql: string,
    parameters: any[] = []
): Promise<any> {
    try {
        const [rows] = await connection.execute(sql, parameters);
        return rows;
    } catch (error) {
        console.error("Error al ejecutar la consulta:", error);
        throw error;
    }
}

/**
 * Confirma la transacción y libera la conexión.
 */
export async function commitTransaction(connection: PoolConnection): Promise<void> {
    try {
        await connection.commit();
    } catch (error) {
        console.error("Error al confirmar la transacción:", error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Revierte la transacción y libera la conexión.
 */
export async function rollbackTransaction(connection: PoolConnection): Promise<void> {
    try {
        await connection.rollback();
    } catch (error) {
        console.error("Error al revertir la transacción:", error);
        throw error;
    } finally {
        connection.release();
    }
}