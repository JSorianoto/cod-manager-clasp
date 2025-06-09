// ===================================================================
// SISTEMA DE DETECCIÓN DE FRAUDE
// ===================================================================
// Archivo: Fraud_Detection.gs
// Descripción: Motor principal de análisis antifraude
// ===================================================================

// ==== FUNCIONES PRINCIPALES DE ANÁLISIS ====

function analizarNuevosPedidos() {
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
    
    // Analizar solo pedidos sin análisis previo (columna R vacía)
    for (let i = 1; i < datos.length; i++) {
      const datosColumnaQ = datos[i][16]; // Columna Q (índice 16)
      const analisisAnterior = datos[i][17]; // Columna R (índice 17)
      
      if (datosColumnaQ && (!analisisAnterior || analisisAnterior.trim() === '')) {
        const resultado = analizarPedidoFraude(datosColumnaQ, i + 1, datos);
        hojaOrders.getRange(i + 1, 18).setValue(resultado.etiqueta); // Columna R
        procesados++;
        
        if (resultado.puntuacion >= 6) {
          sospechosos++;
        }
        
        // Pausa basada en configuración para evitar límites de la API
        Utilities.sleep(configFraude.analisis.pausaEntreConsultas);
      }
    }
    
    SpreadsheetApp.getUi().alert(
      `✅ Análisis completado\n\n` +
      `📊 Pedidos procesados: ${procesados}\n` +
      `🚨 Pedidos sospechosos detectados: ${sospechosos}`
    );
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
    Logger.log('Error en analizarNuevosPedidos: ' + error.toString());
  }
}

function reAnalizarTodosPedidos() {
  const respuesta = SpreadsheetApp.getUi().alert(
    '⚠️ Confirmar Re-análisis',
    'Esto analizará TODOS los pedidos y sobrescribirá el análisis anterior.\n\n¿Continuar?',
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
        const resultado = analizarPedidoFraude(datosColumnaQ, i + 1, datos);
        hojaOrders.getRange(i + 1, 18).setValue(resultado.etiqueta); // Columna R
        procesados++;
        
        if (resultado.puntuacion >= 6) {
          sospechosos++;
        }
        
        // Pausa para evitar límites de API
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
    Logger.log('Error en reAnalizarTodosPedidos: ' + error.toString());
  }
}

// ==== MOTOR PRINCIPAL DE ANÁLISIS ====

function analizarPedidoFraude(datosQ, filaActual, todosDatos) {
  try {
    const config = obtenerConfigFraude();
    // Extraer datos del formato de la columna Q
    const info = extraerInfoPedido(datosQ);
    
    if (!info.ip || !info.provincia) {
      return { 
        puntuacion: 0, 
        etiqueta: '❓ SIN DATOS', 
        detalles: 'Faltan datos para análisis' 
      };
    }
    
    let puntuacion = 0;
    let detalles = [];
    
    // 1. Análisis de geolocalización IP vs Dirección de entrega
    const geoScore = analizarGeolocalizacion(info.ip, info.provincia, info.ciudad, config);
    puntuacion += geoScore.puntos;
    if (geoScore.puntos > 0) detalles.push(geoScore.detalle);
    
    // 2. Análisis de repetición de IP en el mismo día
    const ipScore = analizarRepeticionIP(info.ip, filaActual, todosDatos, config);
    puntuacion += ipScore.puntos;
    if (ipScore.puntos > 0) detalles.push(ipScore.detalle);
    
    // 3. Análisis de IP con múltiples direcciones diferentes
    const multiScore = analizarIPMultiplesDirecciones(info.ip, info.direccionCompleta, filaActual, todosDatos, config);
    puntuacion += multiScore.puntos;
    if (multiScore.puntos > 0) detalles.push(multiScore.detalle);
    
    // Determinar etiqueta final usando umbrales de configuración
    let etiqueta;
    if (puntuacion <= config.umbrales.confiable.max) {
      etiqueta = config.umbrales.confiable.etiqueta;
    } else if (puntuacion <= config.umbrales.revisar.max) {
      etiqueta = config.umbrales.revisar.etiqueta;
    } else {
      etiqueta = config.umbrales.sospechoso.etiqueta;
    }
    
    // Agregar puntuación a la etiqueta
    etiqueta += ` (${puntuacion})`;
    
    return {
      puntuacion: puntuacion,
      etiqueta: etiqueta,
      detalles: detalles.join(' | ')
    };
    
  } catch (error) {
    Logger.log('Error en analizarPedidoFraude: ' + error.toString());
    return { 
      puntuacion: 0, 
      etiqueta: '❌ ERROR', 
      detalles: error.toString() 
    };
  }
}

// ==== FUNCIONES DE EXTRACCIÓN DE DATOS ====

function extraerInfoPedido(datosQ) {
  const lineas = datosQ.split('\n');
  let info = {};
  
  lineas.forEach(linea => {
    const lineaTrim = linea.trim();
    
    if (lineaTrim.includes('Nombre:')) {
      info.nombre = lineaTrim.split('Nombre:')[1]?.trim();
    } else if (lineaTrim.includes('Provincia:')) {
      info.provincia = lineaTrim.split('Provincia:')[1]?.trim();
    } else if (lineaTrim.includes('Ciudad:')) {
      info.ciudad = lineaTrim.split('Ciudad:')[1]?.trim();
    } else if (lineaTrim.includes('IP address:')) {
      info.ip = lineaTrim.split('IP address:')[1]?.trim();
    } else if (lineaTrim.includes('Dirección')) {
      info.direccion = lineaTrim.split('):')[1]?.trim();
    } else if (lineaTrim.includes('Código postal:')) {
      info.codigoPostal = lineaTrim.split('Código postal:')[1]?.trim();
    }
  });
  
  // Crear dirección completa para comparación
  info.direccionCompleta = `${info.direccion || ''} ${info.ciudad || ''} ${info.provincia || ''}`.trim().toLowerCase();
  
  return info;
}

// ==== ANÁLISIS ESPECÍFICOS ====

function analizarGeolocalizacion(ip, provinciaEntrega, ciudadEntrega, config) {
  try {
    // Construir URL de consulta usando la configuración
    const url = `${config.apis.geolocalizacion.url}${ip}?fields=${config.apis.geolocalizacion.camposConsulta}&lang=${config.apis.geolocalizacion.idioma}`;
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, timeout: config.analisis.timeoutAPI });
    const data = JSON.parse(response.getContentText());
    
    if (data.status !== 'success') {
      return { puntos: config.puntuaciones.ipNoLocalizable, detalle: 'IP no localizable' };
    }
    
    // Verificar si es España
    if (data.country !== 'Spain' && data.country !== 'España') {
      return { puntos: config.puntuaciones.ipExtranjera, detalle: `IP desde ${data.country}` };
    }
    
    // Comparar provincia
    const provinciaIP = data.regionName?.toLowerCase() || '';
    const provinciaEntregaLower = provinciaEntrega?.toLowerCase() || '';
    const ciudadIP = data.city?.toLowerCase() || '';
    const ciudadEntregaLower = ciudadEntrega?.toLowerCase() || '';
    
    // Mapeo de códigos de provincia
    const mapaProvincias = obtenerMapaProvincias();
    const nombreProvinciaEntrega = mapaProvincias[provinciaEntrega] || provinciaEntregaLower;
    
    // Verificar coincidencia de provincia
    if (provinciaIP.includes(nombreProvinciaEntrega) || 
        nombreProvinciaEntrega.includes(provinciaIP) ||
        ciudadIP.includes(ciudadEntregaLower) ||
        ciudadEntregaLower.includes(ciudadIP)) {
      return { puntos: 0, detalle: '' };
    }
    
    // Verificar provincias limítrofes (menor puntuación)
    const esProvinciaLejana = config.analisis.provinciasMuyLejanas.some(p =>
      provinciaIP.includes(p) || nombreProvinciaEntrega.includes(p)
    );
    
    if (esProvinciaLejana) {
      return { puntos: config.puntuaciones.ipProvinciaLejana, detalle: `IP desde ${data.regionName}, entrega en ${nombreProvinciaEntrega}` };
    }

    return { puntos: config.puntuaciones.ipProvinciaDistinta, detalle: `IP desde ${data.regionName}, entrega en ${nombreProvinciaEntrega}` };
    
  } catch (error) {
    Logger.log('Error en analizarGeolocalizacion: ' + error.toString());
    return { puntos: 0, detalle: 'Error al verificar IP' };
  }
}

function analizarRepeticionIP(ip, filaActual, todosDatos, config) {
  try {
    const fechaActual = new Date();
    const inicioHoy = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate());
    
    let contadorMismaIP = 0;
    let contadorUltimasHoras = 0;
    
    // Revisar todos los pedidos del día
    for (let i = 1; i < todosDatos.length; i++) {
      if (i === filaActual - 1) continue; // Saltar el pedido actual
      
      const datosQ = todosDatos[i][16]; // Columna Q
      const fechaPedido = todosDatos[i][3]; // Columna D - Fecha
      
      if (!datosQ) continue;
      
      const infoPedido = extraerInfoPedido(datosQ);
      
      if (infoPedido.ip === ip) {
        // Verificar si es del mismo día
        if (fechaPedido && fechaPedido >= inicioHoy) {
          contadorMismaIP++;
          
          // Verificar si es de las últimas N horas según configuración
          const diferenciaHoras = (fechaActual - fechaPedido) / (1000 * 60 * 60);
          if (diferenciaHoras <= config.analisis.ventanaHorasRepeticion) {
            contadorUltimasHoras++;
          }
        }
      }
    }
    
    // Calcular puntuación
    if (contadorUltimasHoras >= 2) {
      return { puntos: config.puntuaciones.ipRepetida2Horas, detalle: `${contadorUltimasHoras + 1} pedidos con misma IP en ${config.analisis.ventanaHorasRepeticion}h` };
    } else if (contadorMismaIP >= 2) {
      return { puntos: config.puntuaciones.ipRepetidaMismoDia, detalle: `${contadorMismaIP + 1} pedidos con misma IP hoy` };
    } else if (contadorMismaIP >= 1) {
      return { puntos: config.puntuaciones.ipRepetidaUnaVez, detalle: `IP repetida hoy` };
    }
    
    return { puntos: 0, detalle: '' };
    
  } catch (error) {
    Logger.log('Error en analizarRepeticionIP: ' + error.toString());
    return { puntos: 0, detalle: 'Error al analizar repetición IP' };
  }
}

function analizarIPMultiplesDirecciones(ip, direccionActual, filaActual, todosDatos, config) {
  try {
    const direccionesUnicas = new Set();
    direccionesUnicas.add(direccionActual);
    
    // Buscar otros pedidos con la misma IP
    for (let i = 1; i < todosDatos.length; i++) {
      if (i === filaActual - 1) continue; // Saltar el pedido actual
      
      const datosQ = todosDatos[i][16]; // Columna Q
      
      if (!datosQ) continue;
      
      const infoPedido = extraerInfoPedido(datosQ);
      
      if (infoPedido.ip === ip && infoPedido.direccionCompleta) {
        direccionesUnicas.add(infoPedido.direccionCompleta);
      }
    }
    
    // Calcular puntuación basada en número de direcciones diferentes
    const numDirecciones = direccionesUnicas.size;

    if (numDirecciones >= config.analisis.maximoDireccionesPorIP) {
      return { puntos: config.puntuaciones.ip4DireccionesMas, detalle: `IP usada en ${numDirecciones} direcciones diferentes` };
    } else if (numDirecciones === 3) {
      return { puntos: config.puntuaciones.ip3Direcciones, detalle: `IP usada en 3 direcciones diferentes` };
    } else if (numDirecciones === 2) {
      return { puntos: config.puntuaciones.ip2Direcciones, detalle: `IP usada en 2 direcciones diferentes` };
    }
    
    return { puntos: 0, detalle: '' };
    
  } catch (error) {
    Logger.log('Error en analizarIPMultiplesDirecciones: ' + error.toString());
    return { puntos: 0, detalle: 'Error al analizar múltiples direcciones' };
  }
}

// ==== FUNCIONES DE APOYO ====

function obtenerMapaProvincias() {
  return {
    'A': 'alicante',
    'AB': 'albacete',
    'AL': 'almería',
    'AV': 'ávila',
    'B': 'barcelona',
    'BA': 'badajoz',
    'BI': 'bizkaia',
    'BU': 'burgos',
    'C': 'coruña',
    'CA': 'cádiz',
    'CC': 'cáceres',
    'CO': 'córdoba',
    'CR': 'ciudad real',
    'CS': 'castellón',
    'CU': 'cuenca',
    'GC': 'las palmas',
    'GI': 'girona',
    'GR': 'granada',
    'GU': 'guadalajara',
    'H': 'huelva',
    'HU': 'huesca',
    'J': 'jaén',
    'L': 'lleida',
    'LE': 'león',
    'LO': 'la rioja',
    'LU': 'lugo',
    'M': 'madrid',
    'MA': 'málaga',
    'MU': 'murcia',
    'NA': 'navarra',
    'O': 'asturias',
    'OR': 'ourense',
    'P': 'palencia',
    'PM': 'baleares',
    'PO': 'pontevedra',
    'S': 'cantabria',
    'SA': 'salamanca',
    'SE': 'sevilla',
    'SG': 'segovia',
    'SO': 'soria',
    'SS': 'gipuzkoa',
    'T': 'tarragona',
    'TE': 'teruel',
    'TF': 'santa cruz de tenerife',
    'TO': 'toledo',
    'V': 'valencia',
    'VA': 'valladolid',
    'VI': 'araba',
    'Z': 'zaragoza',
    'ZA': 'zamora'
  };
}