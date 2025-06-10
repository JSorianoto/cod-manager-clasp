// ===================================================================
// COD MANAGER - INTEGRACIÓN CON DROPEA API
// ===================================================================
// Archivo: COD_Manager_Dropea.gs
// Descripción: Versión adaptada para usar Dropea API directamente.
//              La función `obtenerPedidosDropea` recorre todas las páginas
//              de la API usando los parámetros `page` y `limit` y devuelve
//              un único arreglo con todos los pedidos encontrados.
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
    
    // Mapeo de columnas tomado de la configuración central
    const colOrders = obtenerColumnasOrders();
    
    // Procesar cada pedido de Dropea
    for (let pedidoDropea of pedidosDropea) {
      const idShopify = pedidoDropea.external_order_id?.toString();
      const estadoDropea = pedidoDropea.status;
      
      if (!idShopify || !estadoDropea) continue;
      
      // Convertir estado de Dropea a tu sistema usando el mapeo global
      const nuevoEstado = convertirEstadoDropea(estadoDropea);
      if (!DROPEA_STATUS_MAP[estadoDropea]) {
        Logger.log(`⚠️ Estado ${estadoDropea} no mapeado para pedido ${idShopify}, usando INCIDENCIA`);
      }
      
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
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('DROPEA_API_KEY');
  const apiUrl = props.getProperty('DROPEA_API_URL') ||
    'https://api.dropea.com/graphql/dropshippers';

  const pedidos = [];
  const limit = 50;
  let page = 1;
  let totalPages = 1;

  try {
    Logger.log('📡 Consultando pedidos desde Dropea API...');

    while (page <= totalPages) {
      const query = `
        query ($page: Int!, $limit: Int!) {
          orders(page: $page, limit: $limit) {
            data {
              id
              status
              external_order_id
              tracking_code
              created_at
              delivered_at
            }
            pagination {
              page
              pages
            }
          }
        }
      `;

      const payload = {
        query: query,
        variables: { page: page, limit: limit }
      };

      const options = {
        method: 'POST',
        headers: {
          'X-api-key': token,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(payload)
      };

      const response = UrlFetchApp.fetch(apiUrl, options);

      if (response.getResponseCode() !== 200) {
        Logger.log(`❌ Error HTTP: ${response.getResponseCode()}`);
        break;
      }

      const data = JSON.parse(response.getContentText());

      if (data.data && data.data.orders && data.data.orders.data) {
        pedidos.push.apply(pedidos, data.data.orders.data);
        if (data.data.orders.pagination) {
          totalPages = data.data.orders.pagination.pages || totalPages;
        }
        Logger.log(`📄 Página ${page} obtenida (${data.data.orders.data.length} pedidos)`);
      } else {
        Logger.log('⚠️ Respuesta inesperada de Dropea');
        break;
      }

      page++;
    }

    Logger.log(`✅ Total de pedidos obtenidos: ${pedidos.length}`);
    return pedidos;

  } catch (error) {
    Logger.log('💥 Error obteniendo pedidos de Dropea: ' + error.toString());
    return [];
  }
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