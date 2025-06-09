// ===================================================================
// BOT MANAGER - WHATSAPP AUTOMATION
// ===================================================================
// Archivo: BotManager.gs
// Descripción: Lógica centralizada para el bot de WhatsApp y
//              gestión de plantillas y registros
// ===================================================================

const WHATSAPP_CONFIG = {
  apiUrl: PropertiesService.getScriptProperties().getProperty('WHATSAPP_API_URL'),
  apiToken: PropertiesService.getScriptProperties().getProperty('WHATSAPP_API_TOKEN'),
  templatesSheet: 'BOT_TEMPLATES',
  controlSheet: 'BOT_CONTROL'
};

function botWhatsAppActivo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(WHATSAPP_CONFIG.controlSheet);
  if (!sheet) return true; // Por defecto activo
  const estado = sheet.getRange('B2').getValue();
  return estado === true || estado === 'ACTIVO';
}

function enviarMensajeWhatsApp(numero, mensaje) {
  if (!botWhatsAppActivo()) {
    crearLogBot('PAUSADO', `Intento de envío a ${numero}`);
    return null;
  }

  if (!WHATSAPP_CONFIG.apiUrl || !WHATSAPP_CONFIG.apiToken) {
    crearLogBot('ERROR', 'WhatsApp API no configurada');
    return null;
  }

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + WHATSAPP_CONFIG.apiToken },
    payload: JSON.stringify({ to: numero, body: mensaje })
  };

  try {
    const response = UrlFetchApp.fetch(WHATSAPP_CONFIG.apiUrl, options);
    crearLogBot('MENSAJE_WHATSAPP', `A ${numero}: ${mensaje}`);
    return JSON.parse(response.getContentText());
  } catch (error) {
    crearLogBot('ERROR', `WhatsApp ${numero}: ${error}`);
    return null;
  }
}

function obtenerPlantillaWhatsApp(nombre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(WHATSAPP_CONFIG.templatesSheet);
  if (!sheet) return '';
  const datos = sheet.getRange(1, 1, sheet.getLastRow(), 2).getValues();
  for (const fila of datos) {
    if (fila[0] === nombre) {
      return fila[1] || '';
    }
  }
  return '';
}

function enviarPlantillaWhatsApp(numero, nombrePlantilla, variables) {
  let texto = obtenerPlantillaWhatsApp(nombrePlantilla);
  if (!texto) {
    crearLogBot('ERROR', `Plantilla no encontrada: ${nombrePlantilla}`);
    return null;
  }
  if (variables) {
    for (var clave in variables) {
      texto = texto.replace(`{${clave}}`, variables[clave]);
    }
  }
  return enviarMensajeWhatsApp(numero, texto);
}
