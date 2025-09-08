// Modelos
import { CreateProspectQuotePdfRequest } from '@models/create-prospect-quote-pdf-request';
import { CreateProspectQuotePdfResponse } from '@models/create-prospect-quote-pdf-response';
// Entidades de dominio
import { ProspectQuote } from '@entity/prospect-coute';
// Repositorios
import { ProspectQuoteRepository } from '@repositories/prospect-quote.repository';
// Utils
import { titleCaseName } from '@utils/functions';
import { jsPDF } from "jspdf";
// Imagenes de paginas
import { paginaInicialBase64 } from '@assets/pagina-inicial-base64';
import { paginaDesgloceBase64 } from '@assets/pagina-desgloce-base64';
import { paginaBeneficiosBase64 } from '@assets/pagina-beneficios-base64';
import { paginaInformacionBase64 } from '@assets/pagina-informacion-base64';

export async function createProspectQuotePdfUseCase(
    request: CreateProspectQuotePdfRequest,
): Promise<CreateProspectQuotePdfResponse> {
    // Validaciones de entrada
    if (!request.name || !request.last_name || !request.prospect_id || !request.terralink_id) {
        throw new Error('Información de prospecto incompleta.');
    }

    if (!request.quote_details.system_proposed.system_power_w || !request.quote_details.system_proposed.required_area_m2) {
        throw new Error('Información del sistema propuesto faltante.');
    }

    if (!request.quote_details.source_consumption || !request.quote_details.cfe_info || !request.quote_details.savings) {
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

    // Este desarrollo tal ves se ocupe en el futuro
    // Tarifa CFE
    const cfeTariffId = request.quote_details.cfe_info.tariff_type_id;
    // Verificar que exista la tarifa y obtener su nombre
    const cfeTariff = await prospectQuoteRepository.getCfeTariffById(cfeTariffId);
    if (cfeTariff === null) {
        throw new Error(`La tarifa CFE con ID ${cfeTariffId} no existe.`);
    } else {
        request.quote_details.cfe_info = {...request.quote_details.cfe_info, ...cfeTariff};
    }

    // Crear la entidad ProspectQuote
    const prospectQuote = new ProspectQuote(
        formattedName,
        formattedLastName,
        request.prospect_id,
        request.terralink_id,
        request.quote_details
    );

    // ========= Helpers de formato =========
    const fmtCurrency = (n: number | string) =>
    Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

    // Formatear enteros con separador de miles
    const fmtDecimal = (n: number | string) =>
    Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const fmtInt = (n: number | string) => Number(n).toLocaleString('es-MX');

    const fmtPower = (w: number | string) => `${fmtInt(w)} W`;      // sin convertir a kWp
    const fmtArea  = (m2: number | string) => `${fmtInt(m2)} m²`;   // solo unidades

    // Procedemos a generar el PDF
    // 1. Crear un nuevo documento PDF en tamaño carta (215.9 x 279.4 mm)
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter'
    });

    // --- Cargar Recursos ---
    // La cadena Base64 del logo ya está disponible a través de la importación
    const paginaInicialBase64Content = paginaInicialBase64;
    const paginaDesgloceBase64Content = paginaDesgloceBase64;
    const paginaBeneficiosBase64Content = paginaBeneficiosBase64;
    const paginaInformacionBase64Content = paginaInformacionBase64;

    // --- Colores ---
    const primaryGreen = '#90AB26'; // Verde de la barra y puntos
    const primaryCyan = '#178285'; // Cian de la barra y puntos
    const lightGrayBg = '#F1F2F0';  // Gris del contenedor redondeado
    const darkGray = '#E0DFDF'; // Gris oscuro
    const darkTextColor = '#353535';
    
    console.log('Fuentes:', JSON.stringify(doc.getFontList(), null, 2));
    
    // ========= Posiciones (en mm) =========
    // Carta apaisada: W=279.4, H=215.9
    const W = 279.4, H = 215.9;
    
    // Pagina Inicial
    // Establecer la imagen de la pagina inicial al 100% de la pagina (landscape) y encimar el nombre y folio del prospecto
    doc.addImage(paginaInicialBase64Content, 'PNG', 0, 0, 279.4, 215.9);

    // Nombre del Prospecto en negrita
    doc.setTextColor(darkTextColor);
    doc.setFontSize(50);

    doc.text(prospectQuote.getClientName(), (0.08 * W), (0.6 * H));

    // Apellido del Prospecto
    doc.text(prospectQuote.getClientLastName(), (0.08 * W), (0.69 * H));
    
    // Folio del Prospecto
    doc.setFontSize(25);
    doc.text("Folio: " + prospectQuote.getTerralinkId(), (0.08 * W), (0.76 * H));

    doc.setFont('Helvetica', 'bold');

    // Tarifa del Prospecto
    doc.setFontSize(25);
    doc.text(prospectQuote.getCfeTariffType(), (0.25 * W), (0.92 * H));

    // Pagina de desgloce (Pagina principal de la cotización)
    doc.addPage();
    doc.addImage(paginaDesgloceBase64Content, 'PNG', 0, 0, 279.4, 215.9);

    doc.setFontSize(18);
    doc.setTextColor(darkTextColor);
    doc.text(prospectQuote.getSourceConsumptionPeriod(), (0.29*W), (0.071*H), { align: 'center', baseline: 'middle' });
    doc.setTextColor(primaryGreen);
    doc.text(fmtDecimal(prospectQuote.getSourceConsumptionKWh()) + " KWh.", (0.11*W), (0.112*H), { align: 'left', baseline: 'middle' });
    doc.setTextColor(darkTextColor);

    doc.setFontSize(20);
    doc.text(fmtDecimal(prospectQuote.getTotalSystemPowerW()) + " W", (0.21*W), (0.212*H), { align: 'center', baseline: 'middle' });
    doc.text(fmtDecimal(prospectQuote.getSystemEnergyKWh()) + " kWh", (0.5*W), (0.212*H), { align: 'center', baseline: 'middle' });
    doc.text(prospectQuote.getRequiredAreaM2().toString() + ' m2', (0.8*W), (0.212*H), { align: 'center', baseline: 'middle' });

    doc.setFontSize(11);
    doc.text("$" + fmtDecimal(prospectQuote.getCfePriceKWh()), (0.182*W), (0.452*H), { align: 'center', baseline: 'middle' });
    doc.setFontSize(32);
    doc.text(fmtCurrency(prospectQuote.getCfeActualBimontlyPayment()), (0.16*W), (0.57*H), { align: 'center', baseline: 'middle' });

    doc.setFontSize(11);
    doc.text("$" + fmtDecimal(prospectQuote.getTerraPriceKWh()), (0.415*W), (0.452*H), { align: 'center', baseline: 'middle' });
    doc.setFontSize(32);
    doc.setTextColor(primaryGreen);
    doc.text(fmtCurrency(prospectQuote.getTerraBimontlyPayment()), (0.39*W), (0.57*H), { align: 'center', baseline: 'middle' });
    doc.text(fmtCurrency(prospectQuote.getTerraMontlyPayment()), (0.38*W), (0.705*H), { align: 'left', baseline: 'middle' });

    doc.setFontSize(60);
    doc.setTextColor(lightGrayBg);
    doc.text(prospectQuote.getSavingsPercentage().toString() + " %", (0.7*W), (0.4*H), { align: 'center', baseline: 'middle' });
    doc.setFontSize(16);
    doc.setTextColor(darkTextColor);
    doc.text(prospectQuote.getSavingsPeriodLabel().toString(), (0.7*W), (0.516*H), { align: 'center', baseline: 'middle' });
    doc.text(prospectQuote.getSavingsYearPeriodLabel().toString(), (0.616*W), (0.615*H), { align: 'center', baseline: 'middle' });
    doc.text(prospectQuote.getSavingsYearPeriodLabel().toString().slice(0, 1), (0.707*W), (0.67*H), { align: 'center', baseline: 'middle' });
    doc.setTextColor(lightGrayBg);
    doc.text(fmtCurrency(prospectQuote.getSavingsPeriodAmount()), (0.88*W), (0.52*H), { align: 'center', baseline: 'middle' });
    doc.text(fmtCurrency(prospectQuote.getSavingsYearPeriodAmount()), (0.88*W), (0.605*H), { align: 'center', baseline: 'middle' });
    doc.text(fmtCurrency(prospectQuote.getSavingsEightYearsAmount()), (0.88*W), (0.685*H), { align: 'center', baseline: 'middle' });

    // Restaurar color/estilo
    doc.setTextColor(darkTextColor);
    doc.setFontSize(7);

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
    doc.text(formattedDate, (0.369*W), (0.757*H));

    // --- Generar el PDF ---
    const pdfBuffer = doc.output('arraybuffer');

    // --- Generar y Guardar el PDF (usar repositorio) ---
    const epoch = Date.now();
    let key = '';
    if (prospectQuote.getProspectId() == "0") {
        key = `prospect-terralink/${prospectQuote.getTerralinkId()}/quote/${epoch}.pdf`;
    }else {
        key = `prospect/${prospectQuote.getProspectId()}/quote/${epoch}.pdf`;
    }
    
    const uploadResult = await prospectQuoteRepository.uploadPdfToS3(key, Buffer.from(pdfBuffer));
    return {
        message: 'PDF de cotización generado exitosamente.',
        data: uploadResult // Retorna el resultado de la subida a S3
    };
}