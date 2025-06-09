// ===================================================================
// BOT AUTOMATION UTILITIES
// ===================================================================
// Archivo: Bot_Automation.gs
// Descripción: Envío y actualización de mensajes mediante Telegram Bot
// ===================================================================

const BOT_TOKEN = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN');

function enviarMensajeBot(chatId, mensaje) {
  if (!BOT_TOKEN) {
    Logger.log('Token de bot no configurado');
    return null;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: mensaje })
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    logBotMensaje(chatId, mensaje);
    return JSON.parse(response.getContentText());
  } catch (error) {
    logBotActualizacion(chatId, `Error enviando mensaje: ${error}`);
    return null;
  }
}

function actualizarMensajeBot(chatId, messageId, nuevoTexto) {
  if (!BOT_TOKEN) {
    Logger.log('Token de bot no configurado');
    return null;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`;
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, message_id: messageId, text: nuevoTexto })
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    logBotActualizacion(chatId, `edit ${messageId}: ${nuevoTexto}`);
    return JSON.parse(response.getContentText());
  } catch (error) {
    logBotActualizacion(chatId, `Error editando mensaje: ${error}`);
    return null;
  }
}
