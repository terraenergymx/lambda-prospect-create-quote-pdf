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
        orientation: 'p',
        unit: 'mm',
        format: 'letter'
    });

    // --- Cargar Recursos ---
    var img = new Image()
    img.src = '@assets/logo-terra-energy.png'; // Ruta al logo de Terra Energy

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
    doc.addImage(img, 'png', 20, 25, 40, 10); // x, y, ancho, alto

    // 3. Contenedor gris redondeado
    doc.setFillColor(lightGrayBg);
    doc.roundedRect(80, 40, 120, 180, 5, 5, 'F'); // x, y, ancho, alto, radioX, radioY, estilo

    // 4. Imagen de los paneles solares (dentro del contenedor gris)
    doc.addImage(img, 'png', 85, 45, 110, 150);

    // 5. Texto "terraenergy.mx"
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(lightTextColor);
    doc.text("terraenergy.mx", 168, 215);

    // 6. Gráfico de puntos
    doc.addImage(img, 'png', 20, 80, 15, 15);

    // 7. Texto Principal (Cliente y Proyecto)
    doc.setFont("CustomFont", "normal"); // Usa la fuente personalizada
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