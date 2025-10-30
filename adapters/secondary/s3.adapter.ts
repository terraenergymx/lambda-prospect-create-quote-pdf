import { S3Client, PutObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Define el nombre del secreto para S3 si lo vas a usar para la configuración del bucket,
// o simplemente el nombre del bucket directamente desde las variables de entorno.
// Para este ejemplo, asumiremos que el nombre del bucket viene de una variable de entorno
// y que las credenciales de AWS se manejan a través de roles de IAM o variables de entorno estándar (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY).
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3_SECRET_NAME = process.env.S3_SECRET_NAME; // Opcional: si el nombre del bucket o alguna otra config viene de Secrets Manager

if (!S3_BUCKET_NAME) {
    console.warn("La variable de entorno S3_BUCKET_NAME no está configurada. Asegúrate de que esté definida o que el nombre del bucket se obtenga de Secrets Manager.");
    // No lanzamos un error aquí directamente para permitir la inicialización si el bucket se obtiene de Secrets Manager.
}

const secretsManagerClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

let s3Client: S3Client | undefined;
let initializedBucketName: string | undefined;

/**
 * Función opcional para obtener la configuración del bucket de S3 desde Secrets Manager.
 * Puedes adaptar esto si necesitas otras configuraciones de S3.
 */
async function getS3Config(): Promise<{ bucketName: string }> {
    if (S3_SECRET_NAME) {
        try {
            const command = new GetSecretValueCommand({ SecretId: S3_SECRET_NAME });
            const data = await secretsManagerClient.send(command);

            if (data.SecretString) {
                const secret = JSON.parse(data.SecretString);
                if (secret.bucketName) {
                    return { bucketName: secret.bucketName };
                }
                throw new Error("El secreto de S3 no contiene 'bucketName'.");
            }
            throw new Error("El secreto de S3 no contiene una cadena de texto.");
        } catch (error) {
            console.error("Error al obtener el secreto de S3 de Secrets Manager:", error);
            throw error;
        }
    }
    // Si no hay un secreto definido, usa la variable de entorno directamente
    if (S3_BUCKET_NAME) {
        return { bucketName: S3_BUCKET_NAME };
    }
    throw new Error("Ni S3_BUCKET_NAME ni S3_SECRET_NAME están configurados. No se puede determinar el nombre del bucket.");
}

/**
 * Inicializa el cliente de S3. Esta función DEBE ser llamada y esperada
 * una vez antes de cualquier operación de S3.
 */
export async function initializeS3Client(): Promise<void> {
    if (s3Client && initializedBucketName) {
        console.log("Cliente S3 ya inicializado.");
        return; // Ya inicializado, previene la reinicialización
    }
    console.log("Inicializando cliente S3...");
    try {
        const config = await getS3Config();
        initializedBucketName = config.bucketName;

        s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        console.log(`Cliente S3 inicializado para el bucket: ${initializedBucketName}`);
    } catch (error) {
        console.error("Fallo al inicializar el cliente S3:", error);
        throw error; // Re-lanza para propagar el error y potencialmente detener el inicio de la aplicación
    }
}

// Helper para asegurar que el cliente esté listo antes de las operaciones
function getS3Client(): S3Client {
    if (!s3Client) {
        // Esto indica una llamada faltante a initializeS3Client() al inicio de la aplicación
        throw new Error("El cliente S3 no está inicializado. Asegúrate de llamar a initializeS3Client() al inicio de tu aplicación.");
    }
    return s3Client;
}

/**
 * Sube un objeto (archivo) a un bucket de S3.
 * @param key La clave (ruta/nombre del archivo) en el bucket de S3.
 * @param body El contenido del objeto a subir (Buffer, ReadableStream, Blob, etc.).
 * @param contentType El tipo de contenido (MIME type) del objeto, por ejemplo, 'application/pdf'.
 * @returns Un objeto con el nombre del bucket, la clave y la URL completa del objeto subido.
 */
export async function uploadObject(
    key: string,
    body: Buffer | Uint8Array | Blob | string,
    contentType: string
): Promise<{ bucket: string; key: string; url: string }> {
    const client = getS3Client();
    if (!initializedBucketName) {
        throw new Error("El nombre del bucket no está disponible. Asegúrate de que el cliente S3 se inicializó correctamente.");
    }

    const input: PutObjectCommandInput = {
        Bucket: initializedBucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
    };

    try {
        const command = new PutObjectCommand(input);
        await client.send(command);

        // Obtener la región del cliente para construir la URL
        const region = await client.config.region();
        const url = `https://${initializedBucketName}.s3.${region}.amazonaws.com/${key}`;

        console.log(`Objeto subido exitosamente a S3: ${url}`);
        
        return { 
            bucket: initializedBucketName, 
            key: key, 
            url: url 
        };
    } catch (error) {
        console.error(`Error al subir el objeto ${key} a S3:`, error);
        throw error; // Re-lanza el error para que sea manejado por la lógica de la aplicación
    }
}

// Añadir más funciones aquí para otras operaciones de S3, como:
// - getObject(key: string): Promise<ReadableStream | Blob | undefined>
// - deleteObject(key: string): Promise<void>
// - listObjects(prefix?: string): Promise<string[]>
