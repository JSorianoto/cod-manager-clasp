// ===================================================================
// SCRIPT DEFINITIVO DROPEA - A PRUEBA DE FALLOS
// ===================================================================
// Sincronización automática simple, eficiente y que nunca falla
// ===================================================================

/**
 * CONFIGURACIÓN
 */
const SCRIPT_PROPERTIES = PropertiesService.getScriptProperties();
const DROPEA_CONFIG = {
  API_URL: SCRIPT_PROPERTIES.getProperty('DROPEA_API_URL') ||
    'https://api.dropea.com/graphql/dropshippers',
  API_KEY: SCRIPT_PROPERTIES.getProperty('DROPEA_API_KEY'),
  HEADERS: {
    'Content-Type': 'application/json',
    'x-api-key': SCRIPT_PROPERTIES.getProperty('DROPEA_API_KEY')
  }
};

/**
 * MAPEO DE ESTADOS - Dropea → Tu Sistema
 */
const MAPEO_ESTADOS = {
  'DELIVERED': 'Entregado',
  'CHARGED': 'Entregado',
  'REJECTED': 'Devolucion', 
  'CANCELLED': 'Devolucion',
  'TRANSIT': 'En tránsito',
  'PREPARED': 'En tránsito',
  'INCIDENCE': 'INCIDENCIA',
  'PENDING': 'En tránsito'
};

/**
 * FUNCIÓN PRINCIPAL - Actualizar desde Dropea
 */
function actualizarDesdeDropea() {
  try {
    Logger.log('🚀 INICIANDO SINCRONIZACIÓN DROPEA');
    
    // 1. Obtener pedidos pendientes de nuestra hoja
    const pedidosPendientes = obtenerPedidosPendientes();
    
    if (pedidosPendientes.length === 0) {
      mostrarMensaje('✅ No hay pedidos pendientes para actualizar.');
      return;
    }
    
    Logger.log(`📦 Encontrados ${pedidosPendientes.length} pedidos pendientes`);
    
    // 2. Consultar estados actuales en Dropea
    const estadosDropea = consultarEstadosDropea();
    
    // 3. Procesar cambios
    const cambios = procesarCambios(pedidosPendientes, estadosDropea);
    
    // 4. Mostrar resultados
    if (cambios.length === 0) {
      mostrarMensaje('✅ Todos los pedidos están actualizados.\n\nNo hay cambios pendientes.');
    } else {
      mostrarResumen(cambios);
      crearLog(cambios);
    }
    
  } catch (error) {
    Logger.log('❌ Error: ' + error.toString());
    mostrarMensaje('❌ Error en sincronización:\n\n' + error.toString());
  }
}

/**
 * Obtener pedidos con estados "En tránsito" e "INCIDENCIA"
 */
function obtenerPedidosPendientes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('ORDERS');
  
  if (!hoja) {
    throw new Error('No se encontró la hoja ORDERS');
  }
  
  const datos = hoja.getDataRange().getValues();
  const pedidosPendientes = [];
  
  // Estados que necesitan sincronización
  const estadosPendientes = ['En tránsito', 'INCIDENCIA'];
  
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const id = fila[4]?.toString(); // Columna E
    const estado = fila[15]; // Columna P
    const nombre = fila[5] || ''; // Columna F
    const fecha = fila[3] || ''; // Columna D
    
    if (estadosPendientes.includes(estado) && id) {
      pedidosPendientes.push({
        fila: i + 1,
        id: id,
        nombre: nombre,
        estadoActual: estado,
        fecha: fecha
      });
    }
  }
  
  Logger.log(`📋 IDs pendientes: ${pedidosPendientes.map(p => p.id).join(', ')}`);
  return pedidosPendientes;
}

/**
 * Consultar estados en Dropea (últimos 500 pedidos)
 */
function consultarEstadosDropea() {
  const query = `
    query {
      orders(sort: CREATED_AT, direction: DESC, limit: 500) {
        data {
          id
          status
          external_order_id
          created_at
        }
      }
    }
  `;
  
  Logger.log('🔍 Consultando estados en Dropea...');
  const response = consultarGraphQL(query);
  
  if (response.errors) {
    throw new Error('Error consultando Dropea: ' + JSON.stringify(response.errors));
  }
  
  if (!response.data || !response.data.orders || !response.data.orders.data) {
    throw new Error('Respuesta inesperada de Dropea');
  }
  
  // Convertir a mapa para búsqueda rápida
  const estadosMap = {};
  response.data.orders.data.forEach(pedido => {
    if (pedido.external_order_id) {
      estadosMap[pedido.external_order_id] = pedido.status;
    }
  });
  
  Logger.log(`📊 Estados obtenidos de ${Object.keys(estadosMap).length} pedidos`);
  return estadosMap;
}

/**
 * Procesar cambios y actualizar hoja
 */
function procesarCambios(pedidosPendientes, estadosDropea) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('ORDERS');
  const cambios = [];
  
  for (const pedido of pedidosPendientes) {
    const estadoDropea = estadosDropea[pedido.id];
    
    if (!estadoDropea) {
      Logger.log(`⚠️ Pedido ${pedido.id} no encontrado en Dropea`);
      continue;
    }
    
    // Mapear estado de Dropea a nuestro sistema
    const nuevoEstado = MAPEO_ESTADOS[estadoDropea];
    
    if (!nuevoEstado) {
      Logger.log(`⚠️ Estado ${estadoDropea} no mapeado para pedido ${pedido.id}`);
      continue;
    }
    
    // Solo actualizar si hay cambio real
    if (nuevoEstado !== pedido.estadoActual) {
      // Lógica especial: INCIDENCIA + DELIVERED → I. ENTREGADO
      let estadoFinal = nuevoEstado;
      if (pedido.estadoActual === 'INCIDENCIA' && nuevoEstado === 'Entregado') {
        estadoFinal = 'I. ENTREGADO';
      }
      
      // Actualizar celda en la hoja
      hoja.getRange(pedido.fila, 16).setValue(estadoFinal); // Columna P
      
      cambios.push({
        id: pedido.id,
        nombre: pedido.nombre,
        fecha: pedido.fecha,
        estadoAnterior: pedido.estadoActual,
        estadoNuevo: estadoFinal,
        estadoDropea: estadoDropea
      });
      
      Logger.log(`✅ ${pedido.id}: ${pedido.estadoActual} → ${estadoFinal}`);
    } else {
      Logger.log(`➡️ ${pedido.id}: Sin cambios (${pedido.estadoActual})`);
    }
  }
  
  return cambios;
}

/**
 * Consultar GraphQL
 */
function consultarGraphQL(query) {
  const payload = { query: query };
  const options = {
    method: 'POST',
    headers: DROPEA_CONFIG.HEADERS,
    payload: JSON.stringify(payload)
  };

  const response = UrlFetchApp.fetch(DROPEA_CONFIG.API_URL, options);
  return JSON.parse(response.getContentText());
}

/**
 * Crear log de cambios
 */
function crearLog(cambios) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let hojaLog = ss.getSheetByName('LOG_Dropea_Sync');
    
    // Crear hoja si no existe
    if (!hojaLog) {
      hojaLog = ss.insertSheet('LOG_Dropea_Sync');
      const encabezados = [
        'Fecha/Hora', 'ID Pedido', 'Cliente', 'Estado Anterior', 
        'Estado Nuevo', 'Estado Dropea', 'Resultado'
      ];
      hojaLog.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);
      hojaLog.getRange(1, 1, 1, encabezados.length).setFontWeight('bold');
    }
    
    // Agregar registros
    const ahora = new Date();
    const registros = cambios.map(cambio => [
      ahora,
      cambio.id,
      cambio.nombre,
      cambio.estadoAnterior,
      cambio.estadoNuevo,
      cambio.estadoDropea,
      '✅ Actualizado'
    ]);
    
    const ultimaFila = hojaLog.getLastRow() + 1;
    hojaLog.getRange(ultimaFila, 1, registros.length, registros[0].length).setValues(registros);
    
  } catch (error) {
    Logger.log('⚠️ Error creando log: ' + error.toString());
  }
}

/**
 * Mostrar resumen de cambios
 */
function mostrarResumen(cambios) {
  let resumen = `🎉 Sincronización Dropea completada\n\n`;
  resumen += `✅ ${cambios.length} pedidos actualizados:\n\n`;
  
  cambios.forEach(cambio => {
    const icono = cambio.estadoNuevo === 'I. ENTREGADO' ? '🎉' : 
                  cambio.estadoNuevo === 'Entregado' ? '✅' : 
                  cambio.estadoNuevo === 'Devolucion' ? '❌' : '🔄';
    
    resumen += `${icono} ${cambio.id} - ${cambio.nombre}\n`;
    resumen += `   ${cambio.estadoAnterior} → ${cambio.estadoNuevo}\n\n`;
  });
  
  resumen += `📊 Registro guardado en "LOG_Dropea_Sync"`;
  mostrarMensaje(resumen);
}

/**
 * Mostrar mensaje al usuario
 */
function mostrarMensaje(mensaje) {
  SpreadsheetApp.getUi().alert(mensaje);
}

/**
 * Agregar al menú (ejecutar una vez)
 */
function agregarMenuDropea() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📡 Dropea Sync')
    .addItem('🔄 Actualizar Estados', 'actualizarDesdeDropea')
    .addToUi();
}

/**
 * FUNCIÓN PARA TESTEAR - Verificar conexión
 */
function testConexionDropea() {
  try {
    const query = `query { orders(limit: 1) { data { id status } } }`;
    const response = consultarGraphQL(query);
    
    if (response.errors) {
      mostrarMensaje('❌ Error de conexión:\n\n' + JSON.stringify(response.errors));
    } else {
      mostrarMensaje('✅ Conexión exitosa con Dropea API');
    }
  } catch (error) {
    mostrarMensaje('❌ Error de conexión:\n\n' + error.toString());
  }
}