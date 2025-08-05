// Modelos
import { CreateProspectQuotePdfRequest } from '@models/create-prospect-quote-pdf-request';
import { CreateProspectQuotePdfResponse } from '@models/create-prospect-quote-pdf-response';
// Entidades de dominio
import { ProspectQuote } from '@entity/prospect-coute';
// Repositorios
import { ProspectQuoteRepository } from '@repositories/prospect-quote.repository';
// Utils
import { titleCaseName } from '@utils/functions';
// Dependencias
import { jsPDF } from "jspdf";
import * as fs from 'fs'; // Importar el módulo 'fs' para leer archivos
import * as path from 'path'; // Importar el módulo 'path' para manejar rutas

export async function createProspectQuotePdfUseCase(
    request: CreateProspectQuotePdfRequest,
): Promise<CreateProspectQuotePdfResponse> {
    // Validaciones de entrada
    if (!request.name || !request.last_name || !request.prospect_id || !request.terralink_id) {
        throw new Error('Información de prospecto incompleta.');
    }

    if (!request.system_proposed.panel_count || !request.system_proposed.system_power_w || !request.system_proposed.panel_power_w || !request.system_proposed.required_area_m2) {
        throw new Error('Información del sistema propuesto faltante.');
    }

    if (!request.quote_details.source_consumption || !request.quote_details.cfe_info || !request.quote_details.financials) {
        throw new Error('Detalles de cotización incompletos.');
    }

    // Formatear el nombre y apellido
    const formattedName = titleCaseName(request.name);
    const formattedLastName = titleCaseName(request.last_name);


    // Crear instancia del repositorio
    const prospectQuoteRepository = ProspectQuoteRepository();

    // Inicializar la base de datos
    await prospectQuoteRepository.initializeDatabase();
    // Inicializar el cliente S3
    await prospectQuoteRepository.initializeS3();

    // Tarifa CFE
    const cfeTariffId = request.quote_details.cfe_info.tariff_type_id;
    // Verificar que exista la tarifa y obtener su nombre
    const cfeTariff = await prospectQuoteRepository.getCfeTariffById(cfeTariffId);
    if (cfeTariff === null) {
        throw new Error(`La tarifa CFE con ID ${cfeTariffId} no existe.`);
    } else {
        request.quote_details.cfe_info = cfeTariff;
    }

    // Crear la entidad ProspectQuote
    const prospectQuote = new ProspectQuote(
        formattedName,
        formattedLastName,
        request.prospect_id,
        request.terralink_id,
        request.system_proposed,
        request.quote_details
    );

    // Procedemos a generar el PDF
    // 1. Crear un nuevo documento PDF en tamaño carta (215.9 x 279.4 mm)
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter'
    });

    // --- Cargar Recursos ---
    const logoPath = path.join(__dirname, '..', 'assets', 'logo-terra-energy.png');
    // const panelsImagePath = path.join(__dirname, 'assets', 'panels.png');
    // const pointsGraphPath = path.join(__dirname, 'assets', 'points-graph.png');

    let logoBase64: string;
    // let panelsImageBase64: string;
    // let pointsGraphBase64: string;

    try {
        // Leer la imagen del logo como un buffer y convertirla a Base64
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = logoBuffer.toString('base64');
        // const panelsBuffer = fs.readFileSync(panelsImagePath);
        // panelsImageBase64 = panelsBuffer.toString('base64');
        // const pointsGraphBuffer = fs.readFileSync(pointsGraphPath);
        // pointsGraphBase64 = pointsGraphBuffer.toString('base64');

    } catch (error) {
        console.error('Error al cargar una imagen necesaria para el PDF:', error);
        throw new Error('No se pudo cargar una imagen esencial para la generación del PDF. Asegúrate de que los archivos de assets estén incluidos en el paquete de despliegue de Lambda.');
    }
    
    // --- Colores ---
    const primaryGreen = '#99ca3c'; // Verde de la barra y puntos
    const lightGrayBg = '#f6f6f6';  // Gris del contenedor redondeado
    const darkTextColor = '#353535';
    const lightTextColor = '#8c8c8c';

    // --- Dibujar Elementos del Diseño ---

    // 1. Barra verde superior
    doc.setFillColor(primaryGreen);
    doc.rect(0, 0, 215.9, 15, 'F'); // x, y, ancho, alto, estilo ('F' = fill)

    // 2. Logo de Terra Energy
    // Usar la cadena Base64 directamente con jsPDF
    // El segundo argumento es el formato de la imagen (ej. 'PNG', 'JPEG')
    doc.addImage(logoBase64, 'PNG', 20, 25, 40, 10); // x, y, ancho, alto

    // 3. Contenedor gris redondeado
    doc.setFillColor(lightGrayBg);
    doc.roundedRect(80, 40, 120, 180, 5, 5, 'F'); // x, y, ancho, alto, radioX, radioY, estilo

    // 4. Imagen de los paneles solares (dentro del contenedor gris)
    // Si es una imagen diferente, usa su propia variable base64.
    // Si es el mismo logo, puedes reutilizar logoBase64.
    doc.addImage(logoBase64, 'PNG', 85, 45, 110, 150); // Placeholder, reemplaza con 'panelsImageBase64' si aplica

    // 5. Texto "terraenergy.mx"
    doc.setFont('Helvetica', 'normal'); // Asegúrate de que 'Helvetica' es una fuente estándar o está incrustada
    doc.setFontSize(10);
    doc.setTextColor(lightTextColor);
    doc.text("terraenergy.mx", 168, 215);

    // 6. Gráfico de puntos
    // Si es una imagen diferente, usa su propia variable base64.
    doc.addImage(logoBase64, 'PNG', 20, 80, 15, 15); // Placeholder, reemplaza con 'pointsGraphBase64' si aplica

    // 7. Texto Principal (Cliente y Proyecto)
    // NOTA: Si usas doc.setFont("CustomFont", "normal"); debes incrustar la fuente "CustomFont" en jsPDF
    // de antemano para que funcione en Lambda. De lo contrario, usa una fuente estándar como 'Helvetica'.
    doc.setTextColor(darkTextColor);
    doc.setFontSize(28);
    doc.text(prospectQuote.getClientName(), 20, 105);

    doc.setFontSize(16);
    doc.setTextColor(lightTextColor);
    doc.text(prospectQuote.getProjectNumber(), 20, 115);

    // --- Generar el PDF ---
    const pdfBuffer = doc.output('arraybuffer');

    // --- Generar y Guardar el PDF (usar repositorio) ---
    const epoch = Date.now();
    const key = `prospect/${prospectQuote.getProspectId()}/quote/${epoch}.pdf`;

    const uploadResult = await prospectQuoteRepository.uploadPdfToS3(key, Buffer.from(pdfBuffer));
    return {
        message: 'PDF de cotización generado exitosamente.',
        data: uploadResult // Retorna el resultado de la subida a S3
    };
}