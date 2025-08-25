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

    // Pagina Inicial
    // Establecer la imagen de la pagina inicial al 100% de la pagina (landscape) y encimar el nombre y folio del prospecto
    doc.addImage(paginaInicialBase64Content, 'PNG', 0, 0, 279.4, 215.9);

    // Nombre del Prospecto en negrita
    doc.setTextColor(darkTextColor);
    doc.setFontSize(50);

    doc.text(prospectQuote.getClientName(), 30, 145);

    // Apellido del Prospecto
    doc.text(prospectQuote.getClientLastName(), 30, 165);

    // Folio del Prospecto
    doc.setFontSize(25);
    doc.text(prospectQuote.getTerralinkId(), 30, 180);

    // Pagina de desgloce (Pagina principal de la cotización)
    doc.addPage();
    doc.addImage(paginaDesgloceBase64Content, 'PNG', 0, 0, 279.4, 215.9);

    // ========= Posiciones (en mm) =========
    // Carta apaisada: W=279.4, H=215.9
    const W = 279.4, H = 215.9;
    const pct = (x: number, y: number) => ({ x: x * W, y: y * H });

    // Coordenadas aproximadas según maqueta (ajustables ±2–4 mm si hace falta)
    const P = {
    potencia:                pct(0.190, 0.335),
    espacio:                 pct(0.370, 0.335),
    suscripcionMensual:      pct(0.745, 0.310),
    ahorroMensualCinta:      pct(0.730, 0.430),
    cfeActualmentePagas:     pct(0.190, 0.565),
    terraPagaras:            pct(0.350, 0.565),
    pagoTotalPeriodo:        pct(0.660, 0.635),
    contratoPeriodoTexto:    pct(0.500, 0.665),
    ahorroAnualPastilla:     pct(0.845, 0.670),
    };

    // ========= Estilos por bloque (solo tipografía y alineación) =========
    // Chips (potencia/espacio)
    doc.setFontSize(16);
    doc.setTextColor(darkTextColor);
    // doc.text("01", (0.1*W), (0.1*H), { align: 'center', baseline: 'middle' });
    // doc.text("01", (0.1*W), (0.2*H), { align: 'center', baseline: 'middle' });
    // doc.text("01", (0.1*W), (0.3*H), { align: 'center', baseline: 'middle' });
    // doc.text("01", (0.1*W), (0.4*H), { align: 'center', baseline: 'middle' });
    // doc.text("01", (0.1*W), (0.5*H), { align: 'center', baseline: 'middle' });
    // doc.text("01", (0.1*W), (0.6*H), { align: 'center', baseline: 'middle' });
    // doc.text("01", (0.1*W), (0.7*H), { align: 'center', baseline: 'middle' });
    // doc.text("01", (0.1*W), (0.8*H), { align: 'center', baseline: 'middle' });
    // doc.text("01", (0.1*W), (0.9*H), { align: 'center', baseline: 'middle' });
    // doc.text("02", (0.2*W), (0.1*H), { align: 'center', baseline: 'middle' });
    // doc.text("02", (0.2*W), (0.2*H), { align: 'center', baseline: 'middle' });
    // doc.text("02", (0.2*W), (0.3*H), { align: 'center', baseline: 'middle' });
    // doc.text("02", (0.2*W), (0.4*H), { align: 'center', baseline: 'middle' });
    // doc.text("02", (0.2*W), (0.5*H), { align: 'center', baseline: 'middle' });
    // doc.text("02", (0.2*W), (0.6*H), { align: 'center', baseline: 'middle' });
    // doc.text("02", (0.2*W), (0.7*H), { align: 'center', baseline: 'middle' });
    // doc.text("02", (0.2*W), (0.8*H), { align: 'center', baseline: 'middle' });
    // doc.text("02", (0.2*W), (0.9*H), { align: 'center', baseline: 'middle' });
    // doc.text("03", (0.3*W), (0.1*H), { align: 'center', baseline: 'middle' });
    // doc.text("03", (0.3*W), (0.2*H), { align: 'center', baseline: 'middle' });
    // doc.text("03", (0.3*W), (0.3*H), { align: 'center', baseline: 'middle' });
    // doc.text("03", (0.3*W), (0.4*H), { align: 'center', baseline: 'middle' });
    // doc.text("03", (0.3*W), (0.5*H), { align: 'center', baseline: 'middle' });
    // doc.text("03", (0.3*W), (0.6*H), { align: 'center', baseline: 'middle' });
    // doc.text("03", (0.3*W), (0.7*H), { align: 'center', baseline: 'middle' });
    // doc.text("03", (0.3*W), (0.8*H), { align: 'center', baseline: 'middle' });
    // doc.text("03", (0.3*W), (0.9*H), { align: 'center', baseline: 'middle' });
    // doc.text("04", (0.4*W), (0.1*H), { align: 'center', baseline: 'middle' });
    // doc.text("04", (0.4*W), (0.2*H), { align: 'center', baseline: 'middle' });
    // doc.text("04", (0.4*W), (0.3*H), { align: 'center', baseline: 'middle' });
    // doc.text("04", (0.4*W), (0.4*H), { align: 'center', baseline: 'middle' });
    // doc.text("04", (0.4*W), (0.5*H), { align: 'center', baseline: 'middle' });
    // doc.text("04", (0.4*W), (0.6*H), { align: 'center', baseline: 'middle' });
    // doc.text("04", (0.4*W), (0.7*H), { align: 'center', baseline: 'middle' });
    // doc.text("04", (0.4*W), (0.8*H), { align: 'center', baseline: 'middle' });
    // doc.text("04", (0.4*W), (0.9*H), { align: 'center', baseline: 'middle' });
    // doc.text("05", (0.5*W), (0.1*H), { align: 'center', baseline: 'middle' });
    // doc.text("05", (0.5*W), (0.2*H), { align: 'center', baseline: 'middle' });
    // doc.text("05", (0.5*W), (0.3*H), { align: 'center', baseline: 'middle' });
    // doc.text("05", (0.5*W), (0.4*H), { align: 'center', baseline: 'middle' });
    // doc.text("05", (0.5*W), (0.5*H), { align: 'center', baseline: 'middle' });
    // doc.text("05", (0.5*W), (0.6*H), { align: 'center', baseline: 'middle' });
    // doc.text("05", (0.5*W), (0.7*H), { align: 'center', baseline: 'middle' });
    // doc.text("05", (0.5*W), (0.8*H), { align: 'center', baseline: 'middle' });
    // doc.text("05", (0.5*W), (0.9*H), { align: 'center', baseline: 'middle' });
    // doc.text("06", (0.6*W), (0.1*H), { align: 'center', baseline: 'middle' });
    // doc.text("06", (0.6*W), (0.2*H), { align: 'center', baseline: 'middle' });
    // doc.text("06", (0.6*W), (0.3*H), { align: 'center', baseline: 'middle' });
    // doc.text("06", (0.6*W), (0.4*H), { align: 'center', baseline: 'middle' });
    // doc.text("06", (0.6*W), (0.5*H), { align: 'center', baseline: 'middle' });
    // doc.text("06", (0.6*W), (0.6*H), { align: 'center', baseline: 'middle' });
    // doc.text("06", (0.6*W), (0.7*H), { align: 'center', baseline: 'middle' });
    // doc.text("06", (0.6*W), (0.8*H), { align: 'center', baseline: 'middle' });
    // doc.text("06", (0.6*W), (0.9*H), { align: 'center', baseline: 'middle' });
    // doc.text("07", (0.7*W), (0.1*H), { align: 'center', baseline: 'middle' });
    // doc.text("07", (0.7*W), (0.2*H), { align: 'center', baseline: 'middle' });
    // doc.text("07", (0.7*W), (0.3*H), { align: 'center', baseline: 'middle' });
    // doc.text("07", (0.7*W), (0.4*H), { align: 'center', baseline: 'middle' });
    // doc.text("07", (0.7*W), (0.5*H), { align: 'center', baseline: 'middle' });
    // doc.text("07", (0.7*W), (0.6*H), { align: 'center', baseline: 'middle' });
    // doc.text("07", (0.7*W), (0.7*H), { align: 'center', baseline: 'middle' });
    // doc.text("07", (0.7*W), (0.8*H), { align: 'center', baseline: 'middle' });
    // doc.text("07", (0.7*W), (0.9*H), { align: 'center', baseline: 'middle' });
    // doc.text("08", (0.8*W), (0.1*H), { align: 'center', baseline: 'middle' });
    // doc.text("08", (0.8*W), (0.2*H), { align: 'center', baseline: 'middle' });
    // doc.text("08", (0.8*W), (0.3*H), { align: 'center', baseline: 'middle' });
    // doc.text("08", (0.8*W), (0.4*H), { align: 'center', baseline: 'middle' });
    // doc.text("08", (0.8*W), (0.5*H), { align: 'center', baseline: 'middle' });
    // doc.text("08", (0.8*W), (0.6*H), { align: 'center', baseline: 'middle' });
    // doc.text("08", (0.8*W), (0.7*H), { align: 'center', baseline: 'middle' });
    // doc.text("08", (0.8*W), (0.8*H), { align: 'center', baseline: 'middle' });
    // doc.text("08", (0.8*W), (0.9*H), { align: 'center', baseline: 'middle' });
    // doc.text("09", (0.9*W), (0.1*H), { align: 'center', baseline: 'middle' });
    // doc.text("09", (0.9*W), (0.2*H), { align: 'center', baseline: 'middle' });
    // doc.text("09", (0.9*W), (0.3*H), { align: 'center', baseline: 'middle' });
    // doc.text("09", (0.9*W), (0.4*H), { align: 'center', baseline: 'middle' });
    // doc.text("09", (0.9*W), (0.5*H), { align: 'center', baseline: 'middle' });
    // doc.text("09", (0.9*W), (0.6*H), { align: 'center', baseline: 'middle' });
    // doc.text("09", (0.9*W), (0.7*H), { align: 'center', baseline: 'middle' });
    // doc.text("09", (0.9*W), (0.8*H), { align: 'center', baseline: 'middle' });

    doc.text(prospectQuote.getSourceConsumptionPeriod(), (0.28*W), (0.08*H), { align: 'center', baseline: 'middle' });
    doc.setTextColor(primaryGreen);
    doc.text(prospectQuote.getSourceConsumptionKWh().toString(), (0.14*W), (0.12*H), { align: 'center', baseline: 'middle' });
    doc.setTextColor(darkTextColor);

    doc.text(prospectQuote.getTotalSystemPowerW().toString(), (0.21*W), (0.22*H), { align: 'center', baseline: 'middle' });
    doc.text(prospectQuote.getSystemEnergyKWh().toString(), (0.51*W), (0.22*H), { align: 'center', baseline: 'middle' });
    doc.text(prospectQuote.getRequiredAreaM2().toString() + ' m2', (0.81*W), (0.22*H), { align: 'center', baseline: 'middle' });

    doc.setFontSize(12);
    doc.text(prospectQuote.getCfePriceKWh().toString(), (0.18*W), (0.45*H), { align: 'center', baseline: 'middle' });
    doc.setFontSize(16);
    doc.text(prospectQuote.getCfeActualBimontlyPayment().toString(), (0.15*W), (0.57*H), { align: 'center', baseline: 'middle' });

    doc.setFontSize(12);
    doc.text(prospectQuote.getTerraPriceKWh().toString(), (0.42*W), (0.45*H), { align: 'center', baseline: 'middle' });
    doc.setFontSize(16);
    doc.setTextColor(primaryGreen);
    doc.text(prospectQuote.getTerraBimontlyPayment().toString(), (0.39*W), (0.57*H), { align: 'center', baseline: 'middle' });
    doc.text(prospectQuote.getTerraMontlyPayment().toString(), (0.42*W), (0.71*H), { align: 'center', baseline: 'middle' });


    doc.setFontSize(32);
    doc.setTextColor(lightGrayBg);
    doc.text(prospectQuote.getSavingsPercentage().toString(), (0.7*W), (0.4*H), { align: 'center', baseline: 'middle' });
    doc.setFontSize(16);
    doc.setTextColor(darkTextColor);
    doc.text(prospectQuote.getSavingsPeriodLabel().toString(), (0.67*W), (0.53*H), { align: 'center', baseline: 'middle' });
    doc.text(prospectQuote.getSavingsYearPeriodLabel().toString(), (0.595*W), (0.62*H), { align: 'center', baseline: 'middle' });
    doc.text(prospectQuote.getSavingsEightYearsAmount().toString(), (0.71*W), (0.67*H), { align: 'center', baseline: 'middle' });
    doc.setTextColor(primaryGreen);
    doc.text(prospectQuote.getSavingsPeriodLabel().toString(), (0.89*W), (0.53*H), { align: 'center', baseline: 'middle' });
    doc.text(prospectQuote.getSavingsYearPeriodLabel().toString(), (0.89*W), (0.61*H), { align: 'center', baseline: 'middle' });
    doc.text(prospectQuote.getSavingsEightYearsAmount().toString(), (0.89*W), (0.68*H), { align: 'center', baseline: 'middle' });

    // Restaurar color/estilo
    doc.setTextColor(darkTextColor);
    doc.setFontSize(8);

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
    doc.text(formattedDate, 100, 162.5).setFont('', 'bold');

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