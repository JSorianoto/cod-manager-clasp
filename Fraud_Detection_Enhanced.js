// ===================================================================
// SISTEMA DE DETECCIÓN DE FRAUDE CON HISTORIAL
// ===================================================================
// Archivo: Fraud_Detection_Enhanced.js
// Descripción: Motor de análisis antifraude que incluye
//              verificación de historial por IP.
// ===================================================================

function analizarNuevosPedidosHistorico() {
  try {
    const configFraude = obtenerConfigFraude();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaOrders = ss.getSheetByName('ORDERS');

    if (!hojaOrders) {
      throw new Error('No se encontró la hoja ORDERS');
    }

    const datos = hojaOrders.getDataRange().getValues();
    let procesados = 0;
    let sospechosos = 0;

    for (let i = 1; i < datos.length; i++) {
      const datosColumnaQ = datos[i][16]; // Columna Q
      const analisisAnterior = datos[i][17]; // Columna R

      if (datosColumnaQ && (!analisisAnterior || analisisAnterior.trim() === '')) {
        const resultado = analizarPedidoFraudeHistorico(datosColumnaQ, i + 1, datos);
        hojaOrders.getRange(i + 1, 18).setValue(resultado.etiqueta);
        procesados++;

        if (resultado.puntuacion >= 6) {
          sospechosos++;
        }

        Utilities.sleep(configFraude.analisis.pausaEntreConsultas);
      }
    }

    SpreadsheetApp.getUi().alert(
      `✅ Análisis con historial completado\n\n` +
      `📊 Pedidos procesados: ${procesados}\n` +
      `🚨 Pedidos sospechosos detectados: ${sospechosos}`
    );

  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
    Logger.log('Error en analizarNuevosPedidosHistorico: ' + error.toString());
  }
}

function reAnalizarTodosPedidosHistorico() {
  const respuesta = SpreadsheetApp.getUi().alert(
    '⚠️ Confirmar Re-análisis',
    'Esto analizará TODOS los pedidos con historial y sobrescribirá el análisis anterior.\n\n¿Continuar?',
    SpreadsheetApp.getUi().Button.YES_NO
  );

  if (respuesta !== SpreadsheetApp.getUi().Button.YES) {
    return;
  }

  try {
    const configFraude = obtenerConfigFraude();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaOrders = ss.getSheetByName('ORDERS');
    const datos = hojaOrders.getDataRange().getValues();

    let procesados = 0;
    let sospechosos = 0;

    for (let i = 1; i < datos.length; i++) {
      const datosColumnaQ = datos[i][16]; // Columna Q

      if (datosColumnaQ && datosColumnaQ.trim() !== '') {
        const resultado = analizarPedidoFraudeHistorico(datosColumnaQ, i + 1, datos);
        hojaOrders.getRange(i + 1, 18).setValue(resultado.etiqueta);
        procesados++;

        if (resultado.puntuacion >= 6) {
          sospechosos++;
        }

        Utilities.sleep(configFraude.analisis.pausaEntreConsultas);
      }
    }

    SpreadsheetApp.getUi().alert(
      `✅ Re-análisis completado\n\n` +
      `📊 Pedidos procesados: ${procesados}\n` +
      `🚨 Pedidos sospechosos detectados: ${sospechosos}`
    );

  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
    Logger.log('Error en reAnalizarTodosPedidosHistorico: ' + error.toString());
  }
}

function analizarPedidoFraudeHistorico(datosQ, filaActual, todosDatos) {
  const base = analizarPedidoFraude(datosQ, filaActual, todosDatos);

  try {
    const config = obtenerConfigFraude();
    const info = extraerInfoPedido(datosQ);

    if (!info.ip) {
      return base;
    }

    const hist = contarHistorialIP(info.ip, filaActual, todosDatos, config.historial.diasAnalisis);

    if (hist.total >= config.historial.repeticionesSospechosas) {
      base.puntuacion += config.historial.puntosPorRepeticion;
      const detalle = `${hist.total} pedidos con misma IP en ${config.historial.diasAnalisis} días`;
      base.detalles = base.detalles ? base.detalles + ' | ' + detalle : detalle;
    }

    base.etiqueta = calcularEtiqueta(base.puntuacion, config);
    return base;

  } catch (error) {
    Logger.log('Error en analizarPedidoFraudeHistorico: ' + error.toString());
    return base;
  }
}

function contarHistorialIP(ip, filaActual, datos, dias) {
  const limite = new Date();
  limite.setDate(limite.getDate() - dias);
  let total = 0;

  for (let i = 1; i < datos.length; i++) {
    if (i === filaActual - 1) continue;
    const datosQ = datos[i][16];
    if (!datosQ) continue;

    const info = extraerInfoPedido(datosQ);
    if (info.ip === ip) {
      const fecha = datos[i][3];
      if (fecha && fecha >= limite) {
        total++;
      }
    }
  }

  return { total };
}

function calcularEtiqueta(puntuacion, config) {
  let etiqueta;
  if (puntuacion <= config.umbrales.confiable.max) {
    etiqueta = config.umbrales.confiable.etiqueta;
  } else if (puntuacion <= config.umbrales.revisar.max) {
    etiqueta = config.umbrales.revisar.etiqueta;
  } else {
    etiqueta = config.umbrales.sospechoso.etiqueta;
  }
  return `${etiqueta} (${puntuacion})`;
}
