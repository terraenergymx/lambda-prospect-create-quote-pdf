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

    // ========= Atajos a los datos (usamos exactamente lo que llega) =========
    const sp = request.quote_details.system_proposed;
    const qd = request.quote_details;

    const potenciaTxt   = fmtPower(sp.system_power_w);
    const areaTxt       = fmtArea(sp.required_area_m2);

    // const suscripcionMensualTxt = fmtCurrency(qd.terraenergy_info.suscription_bill);
    // const ahorroMensualTxt      = fmtCurrency(qd.savings.period_mxn);
    // const ahorroAnualTxt        = fmtCurrency(qd.savings.annual_mxn);

    // const cfeActualTxt          = fmtCurrency(qd.cfe_info.actual_payment);
    // const totalPeriodoTxt       = fmtCurrency(qd.total_period_payment);

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
    doc.text(potenciaTxt, P.potencia.x, P.potencia.y, { align: 'center', baseline: 'middle' });
    doc.text(areaTxt,     P.espacio.x,  P.espacio.y,  { align: 'center', baseline: 'middle' });

    // “Suscripción mensual:”
    // doc.setFontSize(18);
    // doc.text(suscripcionMensualTxt, P.suscripcionMensual.x, P.suscripcionMensual.y, { align: 'center' });

    // // Cinta negra “___ de ahorro” (solo el número; la palabra está en la plantilla)
    // doc.setTextColor('#FFFFFF');      // texto blanco sobre cinta negra
    // doc.setFontSize(24);
    // doc.text(ahorroMensualTxt, P.ahorroMensualCinta.x, P.ahorroMensualCinta.y, { align: 'center' });
    // doc.setTextColor(darkTextColor);  // restaurar color

    // // Card izquierdo: “Actualmente pagas” (CFE) y “Con Terra Energy pagarás”
    // doc.setFontSize(16);
    // doc.text(cfeActualTxt,    P.cfeActualmentePagas.x, P.cfeActualmentePagas.y, { align: 'center' });
    // doc.text(totalPeriodoTxt, P.terraPagaras.x,        P.terraPagaras.y,        { align: 'center' });

    // // Card derecho: “Pago — TOTAL de suscripción + CFE”
    // doc.setFontSize(18);
    // doc.text(totalPeriodoTxt, P.pagoTotalPeriodo.x, P.pagoTotalPeriodo.y, { align: 'center' });

    // Franja inferior
    // “Con tu contrato a …” -> Solo el texto central (el label negro y el *Ahorro aproximado están en plantilla)
    doc.setFontSize(12);
    const periodLabelMap: Record<string, string> = {
    monthly: 'mensual',
    bimonthly: 'bimestral',
    quarterly: 'trimestral',
    annual: 'anual',
    };
    const periodLabel = periodLabelMap[qd.source_consumption.period] ?? qd.source_consumption.period;
    doc.text(periodLabel, P.contratoPeriodoTexto.x, P.contratoPeriodoTexto.y, { align: 'center' });

    // Pastilla derecha “ahorrarás ___”
    doc.setFontSize(16);
    // doc.text(ahorroAnualTxt, P.ahorroAnualPastilla.x, P.ahorroAnualPastilla.y, { align: 'center' });

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
    doc.text(formattedDate, 95, 164.5).setFont('', 'bold');

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