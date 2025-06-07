// ===================================================================
// COD MANAGER - INTEGRACIÓN CON DROPEA API
// ===================================================================
// Archivo: COD_Manager_Dropea.gs
// Descripción: Versión adaptada para usar Dropea API directamente
// ===================================================================

function actualizarPedidosDesdeDropea() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaOrders = ss.getSheetByName('ORDERS');
    
    if (!hojaOrders) {
      throw new Error('No se encontró la hoja ORDERS');
    }
    
    // Obtener datos de la hoja ORDERS
    const datosOrders = hojaOrders.getDataRange().getValues();
    
    // Obtener pedidos de Dropea API
    const pedidosDropea = obtenerPedidosDropea();
    
    if (!pedidosDropea || pedidosDropea.length === 0) {
      SpreadsheetApp.getUi().alert('No se obtuvieron pedidos de Dropea');
      return [];
    }
    
    const cambios = [];
    
    // Mapeo de columnas (igual que tu función original)
    const colOrders = {
      id: 4,        // E - ID del pedido (Shopify)
      nombre: 5,    // F - Nombre del cliente
      telefono: 6,  // G - Teléfono
      estado: 15,   // P - Estado del pedido
      fecha: 3      // D - Fecha del pedido
    };
    
    // Procesar cada pedido de Dropea
    for (let pedidoDropea of pedidosDropea) {
      const idShopify = pedidoDropea.external_order_id?.toString();
      const estadoDropea = pedidoDropea.status;
      
      if (!idShopify || !estadoDropea) continue;
      
      // Convertir estado de Dropea a tu sistema
      const nuevoEstado = convertirEstadoDropea(estadoDropea);
      if (!nuevoEstado) continue; // Ignorar estados no válidos
      
      // Buscar en ORDERS por ID de Shopify
      for (let j = 1; j < datosOrders.length; j++) {
        const filaOrders = datosOrders[j];
        
        if (filaOrders[colOrders.id]?.toString() === idShopify) {
          const estadoAnterior = filaOrders[colOrders.estado] || 'Sin estado';
          let estadoFinal = nuevoEstado;

          // 🚫 MISMAS VALIDACIONES QUE TU FUNCIÓN ORIGINAL
          // No actualizar si está en estos estados finales
          if (['Entregado', 'I. ENTREGADO', 'Devolucion'].includes(estadoAnterior)) {
            continue;
          }

          // No actualizar si el estado es FALLO AGENCIA o NO CONFIRMADO
          if (['FALLO AGENCIA', 'NO CONFIRMADO'].includes(estadoAnterior)) {
            continue;
          }

          // ✅ Si viene de INCIDENCIA y ahora es Entregado → I. ENTREGADO
          if (estadoAnterior === 'INCIDENCIA' && nuevoEstado === 'Entregado') {
            estadoFinal = 'I. ENTREGADO';
          }

          // Solo actualizar si el estado es diferente
          if (estadoAnterior !== estadoFinal) {
            cambios.push({
              fila: j + 1,
              fecha: filaOrders[colOrders.fecha],
              id: idShopify,
              nombre: filaOrders[colOrders.nombre],
              estadoAnterior: estadoAnterior,
              estadoNuevo: estadoFinal,
              tracking: pedidoDropea.tracking_code || null // NUEVO: tracking automático
            });
          }
        }
      }
    }
    
    // Aplicar los cambios (igual que tu función original)
    if (cambios.length > 0) {
      for (let cambio of cambios) {
        hojaOrders.getRange(cambio.fila, colOrders.estado + 1).setValue(cambio.estadoNuevo);
      }
      crearLogOperacion(cambios);
    }

    return cambios;
    
  } catch (error) {
    Logger.log('Error en actualizarPedidosDesdeDropea: ' + error.toString());
    throw error;
  }
}

// Función para obtener pedidos de Dropea API
function obtenerPedidosDropea() {
  const TOKEN = 'AIza0g6jlFCN1vqnxCPj1Pr0-qgmIG2HNIgZcFiF6C522IQ=';
  
  try {
    Logger.log('📡 Consultando pedidos desde Dropea API...');
    
    // Consultar pedidos recientes (último mes)
    const query = `
      query {
        orders(limit: 50) {
          data {
            id
            status
            external_order_id
            tracking_code
            created_at
            delivered_at
          }
        }
      }
    `;
    
    const options = {
      method: 'POST',
      headers: {
        'X-api-key': TOKEN,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({ query: query })
    };
    
    const response = UrlFetchApp.fetch('https://api.dropea.com/graphql/dropshippers', options);
    
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      
      if (data.data && data.data.orders && data.data.orders.data) {
        Logger.log(`✅ Obtenidos ${data.data.orders.data.length} pedidos de Dropea`);
        return data.data.orders.data;
      } else {
        Logger.log('⚠️ No se encontraron pedidos en Dropea');
        return [];
      }
    } else {
      Logger.log(`❌ Error HTTP: ${response.getResponseCode()}`);
      return [];
    }
    
  } catch (error) {
    Logger.log('💥 Error obteniendo pedidos de Dropea: ' + error.toString());
    return [];
  }
}

// Función para convertir estados de Dropea a tu sistema
function convertirEstadoDropea(estadoDropea) {
  const mapeoEstados = {
    'CHARGED': 'Entregado',     // Cobrado = Entregado
    'DELIVERED': 'Entregado',   // Entregado = Entregado  
    'REJECTED': 'Devolucion',   // Rechazado = Devolucion
    'INCIDENCE': 'INCIDENCIA'   // Incidencia = INCIDENCIA
  };
  
  return mapeoEstados[estadoDropea] || null;
}

// Función para mostrar el diálogo con los cambios (adaptada)
function mostrarDialogoActualizarDropea() {
  try {
    // Ejecutar la actualización desde Dropea
    const cambios = actualizarPedidosDesdeDropea();
    
    if (cambios.length === 0) {
      SpreadsheetApp.getUi().alert(
        '✅ Sin cambios para actualizar.\n\n' +
        'Esto puede ser porque:\n' +
        '• Los estados ya están actualizados\n' +
        '• No hay pedidos nuevos en Dropea\n' +
        '• Los pedidos están en estados finales'
      );
      return;
    }
    
    // Crear el HTML para el diálogo (mejorado con tracking)
    let htmlContent = `
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h2 { color: #333; margin-top: 0; }
        .cambio { 
          margin: 10px 0; 
          padding: 10px; 
          border: 1px solid #ddd;
          background: #f9f9f9;
        }
        .botones { 
          margin-top: 20px; 
          text-align: center; 
        }
        .btn { 
          padding: 10px 20px; 
          margin: 5px; 
          font-size: 16px;
          cursor: pointer;
        }
        .confirmar { 
          background: #4CAF50; 
          color: white; 
          border: none;
        }
        .cancelar { 
          background: #f44336; 
          color: white; 
          border: none;
        }
        .incidencia-resuelta {
          border-left: 4px solid #FF9800;
        }
        .tracking {
          color: #666;
          font-size: 12px;
          margin-top: 5px;
        }
      </style>
      
      <h2>📋 Actualización desde Dropea API</h2>
      <p>Se encontraron <strong>${cambios.length}</strong> pedidos para actualizar:</p>
      <div>
    `;
    
    // Agregar cada cambio
    cambios.forEach(cambio => {
      const esIncidenciaResuelta = cambio.estadoAnterior === 'INCIDENCIA' && cambio.estadoNuevo === 'I. ENTREGADO';
      
      htmlContent += `
        <div class="cambio ${esIncidenciaResuelta ? 'incidencia-resuelta' : ''}">
          <strong>📅 Fecha:</strong> ${cambio.fecha}<br>
          <strong>🆔 ID Shopify:</strong> ${cambio.id}<br>
          <strong>👤 Cliente:</strong> ${cambio.nombre}<br>
          <strong>🔄 Cambio:</strong> ${cambio.estadoAnterior} → ${cambio.estadoNuevo}
          ${cambio.tracking ? `<div class="tracking">📦 Tracking: ${cambio.tracking}</div>` : ''}
          ${esIncidenciaResuelta ? '<br><strong>✅ Incidencia Resuelta Exitosamente</strong>' : ''}
        </div>
      `;
    });
    
    htmlContent += `
      </div>
      <div class="botones">
        <button class="btn confirmar" onclick="confirmarCambios()">✅ Confirmar Cambios</button>
        <button class="btn cancelar" onclick="cancelarCambios()">❌ Cancelar</button>
      </div>
      
      <script>
        function confirmarCambios() {
          google.script.host.close();
        }
        
        function cancelarCambios() {
          google.script.run.deshacerCambios();
          google.script.host.close();
        }
      </script>
    `;
    
    // Mostrar el diálogo
    const htmlOutput = HtmlService.createHtmlOutput(htmlContent)
      .setWidth(450)
      .setHeight(600);
    
    SpreadsheetApp.getUi()
      .showModalDialog(htmlOutput, '🔄 Actualización automática desde Dropea');
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}