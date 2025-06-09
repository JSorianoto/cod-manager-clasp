// ===================================================================
// UTILIDADES Y FUNCIONES COMPARTIDAS
// ===================================================================
// Archivo: Utilities.gs
// Descripción: Funciones de apoyo, validaciones y utilidades comunes
// ===================================================================

// ==== VALIDACIONES Y VERIFICACIONES ====

function validarDatosCompletos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaOrders = ss.getSheetByName('ORDERS');
  const hojaWorksheet = ss.getSheetByName('Worksheet');
  
  if (!hojaOrders) {
    throw new Error('La hoja ORDERS no existe');
  }
  
  if (!hojaWorksheet) {
    throw new Error('La hoja Worksheet no existe. Asegúrate de importarla antes de actualizar.');
  }
  
  // Verificar que las hojas tengan datos
  const datosOrders = hojaOrders.getDataRange().getValues();
  const datosWorksheet = hojaWorksheet.getDataRange().getValues();
  
  if (datosOrders.length <= 1) {
    throw new Error('La hoja ORDERS está vacía');
  }
  
  if (datosWorksheet.length <= 1) {
    throw new Error('La hoja Worksheet está vacía');
  }
  
  return { hojaOrders, hojaWorksheet, datosOrders, datosWorksheet };
}

function validarEstructuraHoja() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaOrders = ss.getSheetByName('ORDERS');
    
    if (!hojaOrders) {
      return { valida: false, error: 'Hoja ORDERS no encontrada' };
    }
    
    const datos = hojaOrders.getDataRange().getValues();
    
    if (datos.length < 2) {
      return { valida: false, error: 'La hoja ORDERS no tiene datos suficientes' };
    }
    
    // Verificar que existan las columnas necesarias
    const encabezados = datos[0];
    const columnasRequeridas = ['IP', 'Datos Completos']; // Columnas N y Q
    
    // Verificar columna Q (índice 16) para datos completos
    if (encabezados.length < 17) {
      return { valida: false, error: 'La hoja no tiene suficientes columnas para el análisis antifraude' };
    }
    
    return { valida: true, error: null };
    
  } catch (error) {
    return { valida: false, error: error.toString() };
  }
}

// ==== FUNCIONES DE LIMPIEZA Y FORMATEO ====

function limpiarID(id) {
  if (typeof id !== 'string') {
    id = id.toString();
  }
  
  // Eliminar espacios y caracteres especiales, mantener solo números
  return id.trim().replace(/[^0-9]/g, '');
}

function formatearTelefono(telefono) {
  if (typeof telefono !== 'string') {
    telefono = telefono.toString();
  }
  
  // Remover caracteres no numéricos
  return telefono.replace(/\D/g, '');
}

function normalizarTexto(texto) {
  if (!texto) return '';
  
  return texto.toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9\s]/g, '') // Solo letras, números y espacios
    .replace(/\s+/g, ' '); // Múltiples espacios a uno solo
}

function validarIP(ip) {
  if (!ip) return false;
  
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip.trim());
}

// ==== SISTEMA DE LOGS Y AUDITORÍA ====

function crearLogOperacion(cambios, tipoOperacion = 'ACTUALIZACION') {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let hojaLog = ss.getSheetByName('LOG_ACTUALIZACIONES');
    
    // Crear hoja de log si no existe
    if (!hojaLog) {
      hojaLog = ss.insertSheet('LOG_ACTUALIZACIONES');
      // Agregar encabezados
      hojaLog.getRange(1, 1, 1, 8).setValues([
        ['Fecha/Hora', 'Tipo', 'ID Pedido', 'Nombre Cliente', 'Estado Anterior', 'Estado Nuevo', 'Usuario', 'Observaciones']
      ]);
      
      // Formatear encabezados
      const headerRange = hojaLog.getRange(1, 1, 1, 8);
      headerRange.setBackground('#f1f3f4');
      headerRange.setFontWeight('bold');
    }
    
    // Agregar los cambios al log
    const timestamp = new Date();
    const usuario = Session.getActiveUser().getEmail();
    
    const nuevasFilas = cambios.map(cambio => [
      timestamp,
      tipoOperacion,
      cambio.id,
      cambio.nombre || 'N/A',
      cambio.estadoAnterior || 'N/A',
      cambio.estadoNuevo || 'N/A',
      usuario,
      `${tipoOperacion} automática - ${cambios.length} cambios`
    ]);
    
    if (nuevasFilas.length > 0) {
      const ultimaFila = hojaLog.getLastRow();
      hojaLog.getRange(ultimaFila + 1, 1, nuevasFilas.length, 8).setValues(nuevasFilas);
    }
    
  } catch (error) {
    Logger.log('Error al crear log: ' + error.toString());
  }
}

function crearLogAntifraude(analisisRealizados, sospechososDetectados) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let hojaLogFraude = ss.getSheetByName('LOG_ANTIFRAUDE');
    
    // Crear hoja de log si no existe
    if (!hojaLogFraude) {
      hojaLogFraude = ss.insertSheet('LOG_ANTIFRAUDE');
      // Agregar encabezados
      hojaLogFraude.getRange(1, 1, 1, 6).setValues([
        ['Fecha/Hora', 'Tipo Análisis', 'Pedidos Analizados', 'Sospechosos Detectados', 'Tasa Detección', 'Usuario']
      ]);
      
      // Formatear encabezados
      const headerRange = hojaLogFraude.getRange(1, 1, 1, 6);
      headerRange.setBackground('#fff3e0');
      headerRange.setFontWeight('bold');
    }
    
    const timestamp = new Date();
    const usuario = Session.getActiveUser().getEmail();
    const tasaDeteccion = analisisRealizados > 0 ? Math.round((sospechososDetectados / analisisRealizados) * 100) : 0;
    
    const nuevaFila = [
      timestamp,
      'ANÁLISIS AUTOMÁTICO',
      analisisRealizados,
      sospechososDetectados,
      tasaDeteccion + '%',
      usuario
    ];
    
    const ultimaFila = hojaLogFraude.getLastRow();
    hojaLogFraude.getRange(ultimaFila + 1, 1, 1, 6).setValues([nuevaFila]);
    
  } catch (error) {
    Logger.log('Error al crear log antifraude: ' + error.toString());
  }
}

function crearLogBot(evento, detalle) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let hojaLogBot = ss.getSheetByName('LOG_BOT');

    if (!hojaLogBot) {
      hojaLogBot = ss.insertSheet('LOG_BOT');
      hojaLogBot.getRange(1, 1, 1, 4).setValues([
        ['Fecha/Hora', 'Evento', 'Detalle', 'Usuario']
      ]);
      const headerRange = hojaLogBot.getRange(1, 1, 1, 4);
      headerRange.setBackground('#e8eaf6');
      headerRange.setFontWeight('bold');
    }

    const timestamp = new Date();
    const usuario = Session.getActiveUser().getEmail();
    const nuevaFila = [timestamp, evento, detalle || 'N/A', usuario];
    const ultimaFila = hojaLogBot.getLastRow();
    hojaLogBot.getRange(ultimaFila + 1, 1, 1, 4).setValues([nuevaFila]);

  } catch (error) {
    Logger.log('Error al crear log bot: ' + error.toString());
  }
}

function logBotMensaje(chatId, mensaje) {
  crearLogBot('MENSAJE', `Chat ${chatId}: ${mensaje}`);
}

function logBotActualizacion(chatId, descripcion) {
  crearLogBot('ACTUALIZACION', `Chat ${chatId}: ${descripcion}`);
}

// ==== FUNCIONES DE FECHA Y TIEMPO ====

function obtenerFechaHoy() {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
}

function esDelMismoMes(fecha) {
  if (!fecha || !(fecha instanceof Date)) return false;
  
  const hoy = new Date();
  return fecha.getFullYear() === hoy.getFullYear() && 
         fecha.getMonth() === hoy.getMonth();
}

function calcularDiferenciaHoras(fecha1, fecha2) {
  if (!fecha1 || !fecha2) return 0;
  
  const diff = Math.abs(fecha2 - fecha1);
  return diff / (1000 * 60 * 60); // Convertir a horas
}

function formatearFecha(fecha) {
  if (!fecha || !(fecha instanceof Date)) return 'N/A';
  
  return fecha.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ==== FUNCIONES DE RENDIMIENTO Y OPTIMIZACIÓN ====

function limpiarCacheIP() {
  try {
    // Limpiar cache de consultas IP si existe
    const cache = CacheService.getScriptCache();
    cache.removeAll(['ip_cache']);
    
    return true;
  } catch (error) {
    Logger.log('Error al limpiar cache: ' + error.toString());
    return false;
  }
}

function consultarIPConCache(ip) {
  try {
    const config = obtenerConfigFraude();
    const cache = CacheService.getScriptCache();
    const cacheKey = `ip_${ip}`;
    
    // Intentar obtener del cache (válido por 24 horas)
    let resultado = cache.get(cacheKey);
    
    if (resultado) {
      return JSON.parse(resultado);
    }
    
    // Si no está en cache, hacer consulta nueva
    const url = `${config.apis.geolocalizacion.url}${ip}?fields=${config.apis.geolocalizacion.camposConsulta}&lang=${config.apis.geolocalizacion.idioma}`;
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, timeout: config.analisis.timeoutAPI });
    const data = JSON.parse(response.getContentText());
    
    // Guardar en cache según configuración
    if (data.status === 'success') {
      cache.put(cacheKey, JSON.stringify(data), config.apis.geolocalizacion.cacheDuracion);
    }
    
    return data;
    
  } catch (error) {
    Logger.log('Error en consultarIPConCache: ' + error.toString());
    return { status: 'fail', message: error.toString() };
  }
}


// ==== FUNCIONES DE NOTIFICACIÓN ====

function enviarNotificacionFraude(pedidosSospechosos) {
  try {
    if (!pedidosSospechosos || pedidosSospechosos.length === 0) {
      return;
    }
    
    const usuario = Session.getActiveUser().getEmail();
    const asunto = `🚨 COD Manager: ${pedidosSospechosos.length} pedidos sospechosos detectados`;
    
    let mensaje = `Se han detectado ${pedidosSospechosos.length} pedidos sospechosos que requieren revisión:\n\n`;
    
    pedidosSospechosos.forEach((pedido, index) => {
      mensaje += `${index + 1}. ID: ${pedido.id} - Cliente: ${pedido.nombre} - Puntuación: ${pedido.puntuacion}\n`;
    });
    
    mensaje += `\nRevisa estos pedidos en la hoja ORDERS (columna R) antes de procesarlos.\n`;
    mensaje += `\nAnálisis realizado el ${formatearFecha(new Date())} por ${usuario}`;
    
    // Enviar email (comentado por defecto, descomentar si se desea usar)
    // GmailApp.sendEmail(usuario, asunto, mensaje);
    
    Logger.log('Notificación de fraude preparada: ' + mensaje);
    
  } catch (error) {
    Logger.log('Error al enviar notificación: ' + error.toString());
  }
}

// ==== FUNCIONES DE MANTENIMIENTO ====

function limpiarDatosAntiguos() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Limpiar logs antiguos (más de 3 meses)
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - 3);
    
    const hojas = ['LOG_ACTUALIZACIONES', 'LOG_ANTIFRAUDE'];
    
    hojas.forEach(nombreHoja => {
      const hoja = ss.getSheetByName(nombreHoja);
      if (!hoja) return;
      
      const datos = hoja.getDataRange().getValues();
      const filasAEliminar = [];
      
      for (let i = 1; i < datos.length; i++) {
        const fechaFila = datos[i][0];
        if (fechaFila instanceof Date && fechaFila < fechaLimite) {
          filasAEliminar.push(i + 1);
        }
      }
      
      // Eliminar filas antiguas (de abajo hacia arriba)
      filasAEliminar.reverse().forEach(fila => {
        hoja.deleteRow(fila);
      });
    });
    
    // Limpiar cache
    limpiarCacheIP();
    
    Logger.log('Limpieza de datos antiguos completada');
    return true;
    
  } catch (error) {
    Logger.log('Error en limpieza de datos: ' + error.toString());
    return false;
  }
}

function ejecutarMantenimientoAutomatico() {
  try {
    // Esta función puede ser llamada periódicamente
    
    // 1. Limpiar datos antiguos
    limpiarDatosAntiguos();
    
    // 2. Verificar integridad de la hoja
    const validacion = validarEstructuraHoja();
    if (!validacion.valida) {
      Logger.log('Advertencia: ' + validacion.error);
    }
    
    // 3. Limpiar cache IP
    limpiarCacheIP();
    
    Logger.log('Mantenimiento automático completado: ' + new Date());
    
  } catch (error) {
    Logger.log('Error en mantenimiento automático: ' + error.toString());
  }
}