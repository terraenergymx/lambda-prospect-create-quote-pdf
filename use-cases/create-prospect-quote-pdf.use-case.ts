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
import { logoTerraEnergyBase64 } from '@assets/logo-terra-energy-base64';
import { paginaInicialBase64 } from '@assets/pagina-inicial-base64';
import { paginaBeneficiosBase64 } from '@assets/pagina-beneficios-base64';
import { paginaInformacionBase64 } from '@assets/pagina-informacion-base64';

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
    // La cadena Base64 del logo ya está disponible a través de la importación
    const logoBase64 = logoTerraEnergyBase64;
    const paginaInicialBase64Content = paginaInicialBase64;
    const paginaBeneficiosBase64Content = paginaBeneficiosBase64;
    const paginaInformacionBase64Content = paginaInformacionBase64;
    
    // --- Colores ---
    const primaryGreen = '#90AB26'; // Verde de la barra y puntos
    const primaryCyan = '#178285'; // Cian de la barra y puntos
    const lightGrayBg = '#F1F2F0';  // Gris del contenedor redondeado
    const darkGray = '#E0DFDF'; // Gris oscuro
    const darkTextColor = '#353535';
    const lightTextColor = '#8c8c8c';

    // Pagina Inicial
    // Establecer la imagen de la pagina inicial al 100% de la pagina (landscape) y encimar el nombre y folio del prospecto
    doc.addImage(paginaInicialBase64Content, 'PNG', 0, 0, 279.4, 215.9);

    // Nombre del Prospecto en negrita
    doc.setTextColor(darkTextColor);
    doc.setFontSize(60);
    doc.text(prospectQuote.getClientName(), 23, 144).setFont('arial', 'bold');

    // Apellido del Prospecto
    doc.setFontSize(60);
    doc.text(prospectQuote.getClientLastName(), 23, 158).setFont('arial', 'bold');

    // Folio del Prospecto
    doc.setFontSize(28);
    doc.text(prospectQuote.getTerralinkId(), 23, 172);

    // Pagina de beneficios
    doc.addPage();
    doc.addImage(paginaBeneficiosBase64Content, 'PNG', 0, 0, 279.4, 215.9);

    // Pagina de información
    doc.addPage();
    doc.addImage(paginaInformacionBase64Content, 'PNG', 0, 0, 279.4, 215.9);
    // Fecha actual en formato: 01 de enero del 2025
    const currentDate = new Date();
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
    const formattedDate = currentDate.toLocaleDateString('es-MX', options);
    doc.setFontSize(10);
    doc.text(formattedDate, 100, 160);

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
