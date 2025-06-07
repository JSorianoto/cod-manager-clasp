// ===================================================================
// COD MANAGER - ARCHIVO PRINCIPAL
// ===================================================================
// Archivo: COD_Manager_Main.gs
// Descripción: Funciones principales del sistema COD Manager
// ===================================================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('📦 COD Manager')
    .addSubMenu(ui.createMenu('🔄 Actualizar Pedidos')
      .addItem('📡 Desde Dropea API (Automático)', 'actualizarDesdeDropea')
      .addItem('📊 Desde Worksheet (Manual)', 'mostrarDialogoActualizar'))
      .addItem('🧹 Limpiar LOG de sincronización', 'limpiarLogDeSync')
    .addSeparator()
    .addSubMenu(ui.createMenu('🛡️ Análisis de Fraude')
      .addItem('🔍 Analizar Nuevos Pedidos', 'analizarNuevosPedidos')
      .addItem('🔄 Re-analizar Todos', 'reAnalizarTodosPedidos')
      .addItem('📈 Estadísticas de Fraude', 'mostrarEstadisticasFraude')
      .addItem('🚨 IPs Más Sospechosas', 'mostrarIPsSospechosas'))
    .addSeparator()
    .addItem('📊 Ver Estadísticas', 'mostrarEstadisticas')
    .addSeparator()
    .addSubMenu(ui.createMenu('🔧 Herramientas Dropea')
      .addItem('✅ Probar Conexión API', 'testConexionDropea')
      .addItem('📡 Actualizar Estados', 'actualizarDesdeDropea')
      .addItem('📋 Ver LOG Sincronización', 'abrirLogDropea'))
    .addSeparator()
    .addSubMenu(ui.createMenu('❓ Ayuda')
      .addItem('📖 Guía de Uso', 'mostrarGuiaUso')
      .addItem('🛠️ Proceso de Actualización', 'mostrarProcesoActualizacion')
      .addItem('🛡️ Sistema Antifraude', 'mostrarGuiaAntifraude')
      .addItem('📡 Integración Dropea API', 'mostrarGuiaDropea'))
    .addToUi();
}

/**
 * Función auxiliar para abrir la hoja de log
 */
function abrirLogDropea() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaLog = ss.getSheetByName('LOG_Dropea_Sync');
  
  if (hojaLog) {
    ss.setActiveSheet(hojaLog);
    SpreadsheetApp.getUi().alert('📋 Hoja LOG_Dropea_Sync abierta');
  } else {
    SpreadsheetApp.getUi().alert('ℹ️ No existe hoja de log aún.\n\nSe creará automáticamente en la primera sincronización.');
  }
}

// ==== FUNCIONES PRINCIPALES DE ACTUALIZACIÓN ====

function actualizarPedidos() {
  try {
    const { hojaOrders, hojaWorksheet, datosOrders, datosWorksheet } = validarDatosCompletos();
    const cambios = [];
    
    // Mapeo de columnas
    const colOrders = {
      id: 4,        // E - ID del pedido
      nombre: 5,    // F - Nombre del cliente
      telefono: 6,  // G - Teléfono
      estado: 15,   // P - Estado del pedido
      fecha: 3      // D - Fecha del pedido
    };
    
    const colWorksheet = {
      id: 1,        // B - ID del pedido con formato
      estado: 7,    // H - Estado
      nombre: 8,    // I - Nombre del cliente
      telefono: 10  // K - Teléfono
    };
    
    // Procesar cada fila de Worksheet
    for (let i = 1; i < datosWorksheet.length; i++) {
      const filaWorksheet = datosWorksheet[i];
      const idCompleto = filaWorksheet[colWorksheet.id]?.toString() || '';
      const estadoOriginal = filaWorksheet[colWorksheet.estado];
      
      // Extraer el ID limpio (número después del guión)
      const idMatch = idCompleto.match(/- (\d+)$/);
      if (!idMatch) continue;
      
      const idLimpio = idMatch[1];
      
      // Convertir estado
      const nuevoEstado = convertirEstado(estadoOriginal);
      if (!nuevoEstado) continue; // Ignorar estados no válidos
      
      // Buscar en ORDERS
      for (let j = 1; j < datosOrders.length; j++) {
        const filaOrders = datosOrders[j];
        
        if (filaOrders[colOrders.id]?.toString() === idLimpio) {
          const estadoAnterior = filaOrders[colOrders.estado] || 'Sin estado';
          let estadoFinal = nuevoEstado;

          // 🚫 No actualizar si está en estos estados finales
          if (['Entregado', 'I. ENTREGADO', 'Devolucion'].includes(estadoAnterior)) {
            continue;
          }

          // 🚫 No actualizar si el estado es FALLO AGENCIA o NO CONFIRMADO
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
              id: idLimpio,
              nombre: filaOrders[colOrders.nombre],
              estadoAnterior: estadoAnterior,
              estadoNuevo: estadoFinal
            });
          }
        }
      }
    }
    
    // Aplicar los cambios
    if (cambios.length > 0) {
      for (let cambio of cambios) {
        hojaOrders.getRange(cambio.fila, colOrders.estado + 1).setValue(cambio.estadoNuevo);
      }
      crearLogOperacion(cambios);
    }

    return cambios;
    
  } catch (error) {
    Logger.log('Error en actualizarPedidos: ' + error.toString());
    throw error;
  }
}

function convertirEstado(estadoOriginal) {
  const mapeoEstados = {
    'Charged': 'Entregado',
    'Delivered': 'Entregado',
    'Reject': 'Devolucion',
    'Incidence': 'INCIDENCIA'
  };
  
  return mapeoEstados[estadoOriginal] || null;
}

function mostrarDialogoActualizar() {
  try {
    // Ejecutar la actualización
    const cambios = actualizarPedidos();
    
    if (cambios.length === 0) {
      SpreadsheetApp.getUi().alert('No hay cambios para actualizar');
      return;
    }
    
    // Crear el HTML para el diálogo
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
      </style>
      
      <h2>📋 Resumen de Cambios</h2>
      <p>Se encontraron <strong>${cambios.length}</strong> pedidos para actualizar:</p>
      <div>
    `;
    
    // Agregar cada cambio
    cambios.forEach(cambio => {
      const esIncidenciaResuelta = cambio.estadoAnterior === 'INCIDENCIA' && cambio.estadoNuevo === 'I. ENTREGADO';
      
      htmlContent += `
        <div class="cambio ${esIncidenciaResuelta ? 'incidencia-resuelta' : ''}">
          <strong>📅 Fecha:</strong> ${cambio.fecha}<br>
          <strong>🆔 ID:</strong> ${cambio.id}<br>
          <strong>👤 Cliente:</strong> ${cambio.nombre}<br>
          <strong>🔄 Cambio:</strong> ${cambio.estadoAnterior} → ${cambio.estadoNuevo}
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
      .setWidth(400)
      .setHeight(600);
    
    SpreadsheetApp.getUi()
      .showModalDialog(htmlOutput, 'Actualización de Pedidos');
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

function deshacerCambios() {
  SpreadsheetApp.getUi().alert('Los cambios han sido cancelados y no se aplicaron.');
}

// ==== FUNCIONES DE ESTADÍSTICAS ====

function mostrarEstadisticas() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaOrders = ss.getSheetByName('ORDERS');
    
    if (!hojaOrders) {
      throw new Error('No se encontró la hoja ORDERS');
    }
    
    const datos = hojaOrders.getDataRange().getValues();
    const stats = calcularEstadisticas(datos);
    
    // Crear HTML para las estadísticas
    let htmlContent = `
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h2 { color: #333; text-align: center; }
        .stat-container { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 20px; 
          margin-top: 20px;
        }
        .stat-card {
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #f9f9f9;
          text-align: center;
        }
        .stat-value {
          font-size: 36px;
          font-weight: bold;
          color: #333;
          margin: 10px 0;
        }
        .stat-label {
          color: #666;
          font-size: 14px;
        }
        .totals-info {
          margin-top: 20px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        .entregado { color: #4CAF50; }
        .incidencia { color: #FF9800; }
        .devolucion { color: #f44336; }
        .confirmado { color: #2196F3; }
        .incidencia-resuelta { color: #8BC34A; }
      </style>
      
      <h2>📊 Estadísticas del Mes</h2>
      
      <div class="totals-info">
        <p>Total de pedidos: ${stats.totalBruto} | Pedidos válidos: ${stats.total} | Excluidos (NO VALIDO): ${stats.noValidos}</p>
      </div>
      
      <div class="stat-container">
        <div class="stat-card">
          <div class="stat-label">Pedidos Confirmados</div>
          <div class="stat-value confirmado">${stats.confirmadosPorc}%</div>
          <div class="stat-label">${stats.confirmados} de ${stats.total} pedidos válidos</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">Tasa de Entrega</div>
          <div class="stat-value entregado">${stats.entregadosPorc}%</div>
          <div class="stat-label">${stats.entregados} de ${stats.confirmados} confirmados</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">Pedidos en Incidencia</div>
          <div class="stat-value incidencia">${stats.incidenciasPorc}%</div>
          <div class="stat-label">${stats.incidencias} pedidos</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">Pedidos Devueltos</div>
          <div class="stat-value devolucion">${stats.devolucionesPorc}%</div>
          <div class="stat-label">${stats.devoluciones} pedidos</div>
        </div>
      </div>
      
      <div class="stat-container" style="margin-top: 20px;">
        <div class="stat-card">
          <div class="stat-label">Resolución Exitosa de Incidencias</div>
          <div class="stat-value incidencia-resuelta">${stats.incidenciasExitosasPorc}%</div>
          <div class="stat-label">${stats.incidenciasResueltas} resueltas de ${stats.incidenciasTotal} incidencias totales</div>
          <div class="stat-label" style="margin-top: 10px;">
            <span style="color: #8BC34A;">✓ ${stats.incidenciasResueltas} entregadas</span> | 
            <span style="color: #f44336;">✗ ${stats.devoluciones} devueltas</span> |
            <span style="color: #FF9800;">⚠ ${stats.incidencias} pendientes</span>
          </div>
        </div>
      </div>
    `;
    
    // Mostrar el diálogo
    const htmlOutput = HtmlService.createHtmlOutput(htmlContent)
      .setWidth(500)
      .setHeight(450);
    
    SpreadsheetApp.getUi()
      .showModalDialog(htmlOutput, 'Dashboard - Estadísticas del Mes');
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

function calcularEstadisticas(datos) {
  const estadosConfirmados = ['DIRECT', 'WAC', 'CC', 'SHOPIFY'];
  const colEstado = 15; // Columna P (estado del pedido)
  const colConfirmacion = 14; // Columna O (estado de confirmación)
  
  let totalBruto = datos.length - 1; // Sin contar encabezados
  let noValidos = 0;
  let confirmados = 0;
  let entregados = 0;
  let incidencias = 0; // Incidencias activas
  let devoluciones = 0; // Total de devoluciones
  let enTransito = 0;
  let incidenciasResueltas = 0; // Pedidos con estado I. ENTREGADO
  
  // Analizar cada fila (excluyendo encabezados)
  for (let i = 1; i < datos.length; i++) {
    const estadoConfirmacion = datos[i][colConfirmacion];
    const estadoPedido = datos[i][colEstado];
    
    // Contar no válidos
    if (estadoConfirmacion === 'NO VALIDO') {
      noValidos++;
      continue; // Saltar al siguiente pedido
    }
    
    // Contar confirmados
    if (estadosConfirmados.includes(estadoConfirmacion)) {
      confirmados++;
      
      // Contar estados para confirmados
      if (estadoPedido === 'Entregado' || estadoPedido === 'I. ENTREGADO') {
        entregados++;
      } else if (estadoPedido === 'En tránsito') {
        enTransito++;
      }
    }
    
    // Contar estados generales
    if (estadoPedido === 'INCIDENCIA') {
      incidencias++;
    } else if (estadoPedido === 'Devolucion') {
      devoluciones++;
    } else if (estadoPedido === 'I. ENTREGADO') {
      incidenciasResueltas++;
    }
  }
  
  // Calcular total válido
  const total = totalBruto - noValidos;
  
  // Total de incidencias (activas + resueltas + devueltas)
  const incidenciasTotal = incidencias + incidenciasResueltas + devoluciones;
  
  // Calcular porcentajes
  const confirmadosPorc = total > 0 ? Math.round((confirmados / total) * 100) : 0;
  const baseEntregados = confirmados - enTransito;
  const entregadosPorc = baseEntregados > 0 ? Math.round((entregados / baseEntregados) * 100) : 0;
  const incidenciasPorc = total > 0 ? Math.round((incidencias / total) * 100) : 0;
  const devolucionesPorc = total > 0 ? Math.round((devoluciones / total) * 100) : 0;
  
  // Calcular tasa de resolución positiva de incidencias
  const incidenciasExitosasPorc = incidenciasTotal > 0 ? Math.round((incidenciasResueltas / incidenciasTotal) * 100) : 0;
  
  return {
    totalBruto,
    noValidos,
    total, // Este es el total válido (totalBruto - noValidos)
    confirmados,
    entregados,
    incidencias,
    devoluciones,
    enTransito,
    incidenciasResueltas,
    incidenciasTotal,
    confirmadosPorc,
    entregadosPorc,
    incidenciasPorc,
    devolucionesPorc,
    incidenciasExitosasPorc
  };
}