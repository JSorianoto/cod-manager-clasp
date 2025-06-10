// ===================================================================
// COD MANAGER - INTERFAZ WEB PARA AGENTES  
// ===================================================================

/**
 * Función principal para servir la aplicación web
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('webapp_interface')
    .evaluate()
    .setTitle('COD Manager - Panel de Control')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Función para incluir archivos CSS/JS en el HTML
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * API: Obtener estadísticas generales
 */
function getEstadisticasGenerales() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaOrders = ss.getSheetByName('ORDERS');
    
    if (!hojaOrders) {
      return { error: 'No se encontró la hoja ORDERS' };
    }
    
    const datos = hojaOrders.getDataRange().getValues();
    const stats = calcularEstadisticas(datos);
    
    return {
      success: true,
      stats: stats,
      timestamp: new Date().toLocaleString('es-ES')
    };
  } catch (error) {
    return { error: error.toString() };
  }
}

/**
 * API: Obtener estadísticas de fraude
 */
function getEstadisticasFraude() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaOrders = ss.getSheetByName('ORDERS');
    
    if (!hojaOrders) {
      return { error: 'No se encontró la hoja ORDERS' };
    }
    
    const datos = hojaOrders.getDataRange().getValues();
    const stats = calcularEstadisticasFraude(datos);
    
    return {
      success: true,
      stats: stats,
      timestamp: new Date().toLocaleString('es-ES')
    };
  } catch (error) {
    return { error: error.toString() };
  }
}

/**
 * API: Ejecutar actualización desde Worksheet
 */
function ejecutarActualizacionWorksheet() {
  try {
    const cambios = actualizarPedidos();
    
    return {
      success: true,
      cambios: cambios,
      total: cambios.length,
      mensaje: cambios.length === 0 ? 'No hay cambios para actualizar' : `Se actualizaron ${cambios.length} pedidos`
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.toString() 
    };
  }
}

/**
 * API: Ejecutar actualización desde Dropea
 */
function ejecutarActualizacionDropea() {
  try {
    const cambios = actualizarPedidosDesdeDropea();
    
    return {
      success: true,
      cambios: cambios,
      total: cambios.length,
      mensaje: cambios.length === 0 ? 'No hay cambios para actualizar' : `Se actualizaron ${cambios.length} pedidos desde Dropea`
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.toString() 
    };
  }
}

/**
 * API: Ejecutar análisis antifraude
 */
function ejecutarAnalisisAntifraude() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaOrders = ss.getSheetByName('ORDERS');
    
    if (!hojaOrders) {
      return { error: 'No se encontró la hoja ORDERS' };
    }
    
    const datos = hojaOrders.getDataRange().getValues();
    let procesados = 0;
    let sospechosos = 0;
    
    // Analizar solo pedidos sin análisis previo
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
        
        const pausa =
          (typeof FRAUD_CONFIG !== 'undefined' &&
            FRAUD_CONFIG.analisis &&
            FRAUD_CONFIG.analisis.pausaEntreConsultas) ||
          100;
        Utilities.sleep(pausa);
      }
    }
    
    return {
      success: true,
      procesados: procesados,
      sospechosos: sospechosos,
      mensaje: `Análisis completado: ${procesados} pedidos procesados, ${sospechosos} sospechosos detectados`
    };
    
  } catch (error) {
    return { 
      success: false, 
      error: error.toString() 
    };
  }
}

/**
 * API: Probar conexión Dropea
 */
function ejecutarPruebaDropea() {
  try {
    const pedidos = obtenerPedidosDropea();
    
    return {
      success: true,
      pedidos: pedidos.length,
      muestra: pedidos.slice(0, 3).map(p => ({
        id: p.id,
        shopify_id: p.external_order_id,
        estado: p.status,
        tracking: p.tracking_code
      })),
      mensaje: `Conexión exitosa: ${pedidos.length} pedidos obtenidos`
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.toString() 
    };
  }
}

/**
 * API: Debug de estructura
 */
function ejecutarDebugEstructura() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaOrders = ss.getSheetByName('ORDERS');
    const datosOrders = hojaOrders.getDataRange().getValues();
    
    const encabezados = [];
    for (let col = 0; col < Math.min(20, datosOrders[0].length); col++) {
      const letra = String.fromCharCode(65 + col);
      encabezados.push({
        columna: letra,
        valor: datosOrders[0][col]
      });
    }
    
    // Buscar IDs de Shopify en las primeras filas
    const muestraFilas = [];
    for (let fila = 1; fila <= Math.min(5, datosOrders.length - 1); fila++) {
      const filaData = {};
      for (let col = 0; col < Math.min(10, datosOrders[fila].length); col++) {
        const letra = String.fromCharCode(65 + col);
        const valor = datosOrders[fila][col];
        if (valor !== "" && valor !== null && valor !== undefined) {
          filaData[letra] = valor;
        }
      }
      muestraFilas.push({
        fila: fila + 1,
        datos: filaData
      });
    }
    
    return {
      success: true,
      totalFilas: datosOrders.length,
      encabezados: encabezados,
      muestraFilas: muestraFilas,
      mensaje: `Estructura analizada: ${datosOrders.length} filas, ${datosOrders[0].length} columnas`
    };
    
  } catch (error) {
    return { 
      success: false, 
      error: error.toString() 
    };
  }
}

/**
 * API: Información del sistema
 */
function getSistemaInfo() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojas = ss.getSheets().map(h => h.getName());
    
    return {
      success: true,
      spreadsheetName: ss.getName(),
      hojas: hojas,
      usuario: Session.getActiveUser().getEmail(),
      timestamp: new Date().toLocaleString('es-ES')
    };
  } catch (error) {
    return { error: error.toString() };
  }
}