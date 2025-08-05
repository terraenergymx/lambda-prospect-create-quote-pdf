/**
 * RDS Adapter (Funciones)
 *
 * Adapta interacciones con Amazon RDS para operaciones de base de datos MySQL.
 * Este adaptador maneja la conexión a la base de datos, la gestión de credenciales
 * a través de AWS Secrets Manager y la ejecución de transacciones SQL.
 */

// Importar las dependencias necesarias
import mysql, { Pool, PoolConnection } from 'mysql2/promise';
// Importar el cliente de AWS Secrets Manager
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

/**
 * Interfaz para las credenciales de la base de datos.
 */
interface DbCredentials {
    host: string;
    user: string;
    password?: string;
    database: string;
    port: number;
}

// Nombre del secreto en Secrets Manager que contiene las credenciales de la DB
const SECRET_NAME = process.env.DB_SECRET_NAME;

// Validar que el nombre del secreto esté configurado al inicio
if (!SECRET_NAME) {
    throw new Error("La variable de entorno DB_SECRET_NAME no está configurada.");
}

// Cliente de Secrets Manager, inicializado una vez
const secretsManagerClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Pool de conexiones a la base de datos MySQL, inicialmente nulo
let pool: Pool | null = null;

/**
 * Obtiene las credenciales de la base de datos desde AWS Secrets Manager.
 * Utiliza las variables de entorno para sobrescribir valores si están presentes.
 * @returns Una promesa que resuelve con un objeto de credenciales de la base de datos.
 * @throws Error si no se pueden obtener las credenciales o si el secreto está vacío.
 */
async function getDbCredentials(): Promise<DbCredentials> {
    try {
        console.log(`Fetching DB secret "${SECRET_NAME}" from Secrets Manager...`);
        const command = new GetSecretValueCommand({ SecretId: SECRET_NAME });
        const data = await secretsManagerClient.send(command);

        if (data.SecretString) {
            // Parsear la cadena JSON del secreto
            const secret = JSON.parse(data.SecretString);
            return {
                // Usar variables de entorno si existen, de lo contrario, usar el secreto
                host: process.env.DB_HOST || secret.host,
                user: secret.username,
                password: secret.password,
                database: process.env.DB_NAME || secret.dbname,
                // Convertir el puerto a número, usando 3306 como valor por defecto
                port: parseInt(process.env.DB_PORT || secret.port, 10) || 3306,
            };
        }
        // Lanzar un error si SecretString está vacío
        throw new Error("El secreto no contiene una cadena de texto.");
    } catch (error) {
        // Log y relanzar el error para un manejo externo
        console.error("Error al obtener el secreto de Secrets Manager:", error);
        throw error;
    }
}

/**
 * Inicializa el pool de conexiones MySQL.
 * Esta función debe ser llamada y esperada una vez al inicio de la aplicación
 * antes de realizar cualquier operación de base de datos.
 * @returns Una promesa que se resuelve cuando el pool está inicializado.
 * @throws Error si falla la inicialización del pool.
 */
export async function initializePool(): Promise<void> {
    if (pool) {
        console.log("Pool de conexiones ya inicializado.");
        return; // Evitar la reinicialización si ya está configurado
    }
    console.log("Inicializando pool de conexiones MySQL...");
    try {
        // Obtener las credenciales de forma segura
        const dbCredentials = await getDbCredentials();

        // Crear el pool de conexiones con las credenciales obtenidas
        pool = mysql.createPool({
            host: dbCredentials.host,
            user: dbCredentials.user,
            password: dbCredentials.password,
            database: dbCredentials.database,
            port: dbCredentials.port,
            waitForConnections: true, // Esperar si no hay conexiones disponibles
            connectionLimit: 10,      // Número máximo de conexiones en el pool
            queueLimit: 0             // Cola ilimitada para solicitudes de conexión
        });
        console.log("Pool de conexiones MySQL inicializado con credenciales de Secrets Manager.");
    } catch (error) {
        console.error("Fallo al inicializar el pool de conexiones:", error);
        throw error; // Propagar el error para que la aplicación pueda manejarlo
    }
}

/**
 * Obtiene el pool de conexiones actual.
 * @returns El pool de conexiones MySQL.
 * @throws Error si el pool no ha sido inicializado.
 */
function getPool(): mysql.Pool {
    if (!pool) {
        // Asegurarse de que initializePool() se haya llamado previamente
        throw new Error("El pool de conexiones no está inicializado. Asegúrate de llamar a initializePool() al inicio de tu aplicación.");
    }
    return pool;
}

/**
 * Inicia una transacción de base de datos.
 * Obtiene una conexión del pool y comienza una transacción.
 * @returns Una promesa que resuelve con un objeto `PoolConnection` para usar en la transacción.
 * @throws Error si no se puede obtener una conexión o iniciar la transacción.
 */
export async function beginTransaction(): Promise<PoolConnection> {
    const currentPool = getPool();
    const connection = await currentPool.getConnection(); // Obtener una conexión del pool
    try {
        await connection.beginTransaction(); // Iniciar la transacción
        return connection;
    } catch (error) {
        connection.release(); // Liberar la conexión si falla el inicio de la transacción
        console.error("Error al iniciar la transacción:", error);
        throw error;
    }
}

/**
 * Ejecuta una sentencia SQL.
 * Este método debe usarse con una conexión obtenida de `beginTransaction` para operaciones transaccionales.
 * @param connection La conexión de la base de datos (obtenida de `beginTransaction`).
 * @param sql La sentencia SQL a ejecutar, con placeholders de interrogación (?).
 * @param parameters Un array de valores para los placeholders en la sentencia SQL.
 * @returns Una promesa que resuelve con los resultados de la consulta.
 * @throws Error si la ejecución de la consulta falla.
 */
export async function execute(
    connection: PoolConnection,
    sql: string,
    parameters: any[] = []
): Promise<any> {
    try {
        // Ejecutar la sentencia SQL con los parámetros
        const [rows] = await connection.execute(sql, parameters);
        return rows;
    } catch (error) {
        console.error("Error al ejecutar la consulta:", error);
        throw error;
    }
}

/**
 * Confirma una transacción y libera la conexión de vuelta al pool.
 * @param connection La conexión de la transacción.
 * @returns Una promesa que se resuelve cuando la transacción es confirmada.
 * @throws Error si la confirmación de la transacción falla.
 */
export async function commitTransaction(connection: PoolConnection): Promise<void> {
    try {
        await connection.commit(); // Confirmar la transacción
    } catch (error) {
        console.error("Error al confirmar la transacción:", error);
        throw error;
    } finally {
        connection.release(); // Siempre liberar la conexión al pool
    }
}

/**
 * Revierte una transacción y libera la conexión de vuelta al pool.
 * @param connection La conexión de la transacción.
 * @returns Una promesa que se resuelve cuando la transacción es revertida.
 * @throws Error si la reversión de la transacción falla.
 */
export async function rollbackTransaction(connection: PoolConnection): Promise<void> {
    try {
        await connection.rollback(); // Revertir la transacción
    } catch (error) {
        console.error("Error al revertir la transacción:", error);
        throw error;
    } finally {
        connection.release(); // Siempre liberar la conexión al pool
    }
}

/**
 * Cierra el pool de conexiones de la base de datos.
 * Esta función debe llamarse al apagar la aplicación para asegurar
 * que todas las conexiones sean liberadas correctamente.
 * @returns Una promesa que se resuelve cuando el pool está cerrado.
 */
export async function closePool(): Promise<void> {
    if (pool) {
        console.log("Cerrando pool de conexiones MySQL...");
        await pool.end(); // Cerrar todas las conexiones en el pool
        pool = null; // Resetear el pool a null
        console.log("Pool de conexiones MySQL cerrado.");
    }
}
