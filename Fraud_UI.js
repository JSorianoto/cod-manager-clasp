// ===================================================================
// INTERFACES DE USUARIO - SISTEMA ANTIFRAUDE
// ===================================================================
// Archivo: Fraud_UI.gs
// Descripción: Diálogos y interfaces del sistema de detección de fraude
// ===================================================================

// ==== ESTADÍSTICAS DE FRAUDE ====

function mostrarEstadisticasFraude() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaOrders = ss.getSheetByName('ORDERS');
    
    if (!hojaOrders) {
      throw new Error('No se encontró la hoja ORDERS');
    }
    
    const datos = hojaOrders.getDataRange().getValues();
    const stats = calcularEstadisticasFraude(datos);
    
    const htmlContent = `
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h2 { color: #333; text-align: center; margin-bottom: 30px; }
        .stats-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 20px; 
          margin-bottom: 30px;
        }
        .stat-card {
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #f9f9f9;
          text-align: center;
        }
        .stat-value {
          font-size: 32px;
          font-weight: bold;
          margin: 10px 0;
        }
        .stat-label {
          color: #666;
          font-size: 14px;
        }
        .confiable { color: #4CAF50; }
        .revisar { color: #FF9800; }
        .sospechoso { color: #f44336; }
        .sin-analizar { color: #9E9E9E; }
        .progress-bar {
          width: 100%;
          height: 20px;
          background: #f0f0f0;
          border-radius: 10px;
          overflow: hidden;
          margin: 10px 0;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4CAF50, #FF9800, #f44336);
          transition: width 0.3s;
        }
        .detail-section {
          margin-top: 30px;
          padding: 20px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
        }
        .detail-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 15px;
          color: #333;
        }
      </style>
      
      <h2>🛡️ Dashboard Antifraude</h2>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Pedidos Analizados</div>
          <div class="stat-value">${stats.analizados}</div>
          <div class="stat-label">de ${stats.total} pedidos totales</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${stats.porcentajeAnalizado}%"></div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">Tasa de Fraude Detectado</div>
          <div class="stat-value sospechoso">${stats.tasaFraude}%</div>
          <div class="stat-label">${stats.sospechosos} pedidos sospechosos</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">Pedidos Confiables</div>
          <div class="stat-value confiable">${stats.confiables}</div>
          <div class="stat-label">${stats.porcentajeConfiables}% del total analizado</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">Requieren Revisión</div>
          <div class="stat-value revisar">${stats.revisar}</div>
          <div class="stat-label">${stats.porcentajeRevisar}% del total analizado</div>
        </div>
      </div>
      
      <div class="detail-section">
        <div class="detail-title">📊 Distribución de Análisis</div>
        <p><span class="confiable">✅ Confiables:</span> ${stats.confiables} pedidos (${stats.porcentajeConfiables}%)</p>
        <p><span class="revisar">⚠️ Para revisar:</span> ${stats.revisar} pedidos (${stats.porcentajeRevisar}%)</p>
        <p><span class="sospechoso">🚨 Sospechosos:</span> ${stats.sospechosos} pedidos (${stats.porcentajeSospechosos}%)</p>
        <p><span class="sin-analizar">❓ Sin analizar:</span> ${stats.sinAnalizar} pedidos</p>
      </div>
      
      <div class="detail-section">
        <div class="detail-title">🎯 Recomendaciones</div>
        ${stats.sinAnalizar > 0 ? 
          `<p>• Hay <strong>${stats.sinAnalizar}</strong> pedidos sin analizar. Ejecuta "Analizar Nuevos Pedidos".</p>` : 
          '<p>• ✅ Todos los pedidos están analizados.</p>'
        }
        ${stats.sospechosos > 0 ? 
          `<p>• Revisa los <strong>${stats.sospechosos}</strong> pedidos marcados como sospechosos.</p>` : 
          '<p>• ✅ No hay pedidos sospechosos detectados.</p>'
        }
        ${stats.revisar > 0 ? 
          `<p>• Considera revisar los <strong>${stats.revisar}</strong> pedidos marcados para revisión.</p>` : 
          ''
        }
      </div>
    `;
    
    const htmlOutput = HtmlService.createHtmlOutput(htmlContent)
      .setWidth(600)
      .setHeight(500);
    
    SpreadsheetApp.getUi()
      .showModalDialog(htmlOutput, 'Estadísticas del Sistema Antifraude');
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
    Logger.log('Error en mostrarEstadisticasFraude: ' + error.toString());
  }
}

function calcularEstadisticasFraude(datos) {
  let total = datos.length - 1; // Sin contar encabezados
  let analizados = 0;
  let confiables = 0;
  let revisar = 0;
  let sospechosos = 0;
  let sinAnalizar = 0;
  
  // Analizar cada fila (excluyendo encabezados)
  for (let i = 1; i < datos.length; i++) {
    const datosQ = datos[i][16]; // Columna Q
    const analisis = datos[i][17]; // Columna R
    
    // Solo contar pedidos que tienen datos en columna Q
    if (!datosQ || datosQ.trim() === '') {
      total--; // No contar pedidos sin datos
      continue;
    }
    
    if (!analisis || analisis.trim() === '') {
      sinAnalizar++;
    } else {
      analizados++;
      
      if (analisis.includes('✅ CONFIABLE')) {
        confiables++;
      } else if (analisis.includes('⚠️ REVISAR')) {
        revisar++;
      } else if (analisis.includes('🚨 SOSPECHOSO')) {
        sospechosos++;
      }
    }
  }
  
  // Calcular porcentajes
  const porcentajeAnalizado = total > 0 ? Math.round((analizados / total) * 100) : 0;
  const tasaFraude = analizados > 0 ? Math.round((sospechosos / analizados) * 100) : 0;
  const porcentajeConfiables = analizados > 0 ? Math.round((confiables / analizados) * 100) : 0;
  const porcentajeRevisar = analizados > 0 ? Math.round((revisar / analizados) * 100) : 0;
  const porcentajeSospechosos = analizados > 0 ? Math.round((sospechosos / analizados) * 100) : 0;
  
  return {
    total,
    analizados,
    confiables,
    revisar,
    sospechosos,
    sinAnalizar,
    porcentajeAnalizado,
    tasaFraude,
    porcentajeConfiables,
    porcentajeRevisar,
    porcentajeSospechosos
  };
}

// ==== IPS MÁS SOSPECHOSAS ====

function mostrarIPsSospechosas() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaOrders = ss.getSheetByName('ORDERS');
    
    if (!hojaOrders) {
      throw new Error('No se encontró la hoja ORDERS');
    }
    
    const datos = hojaOrders.getDataRange().getValues();
    const ipsData = analizarIPsSospechosas(datos);
    
    let htmlContent = `
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h2 { color: #333; text-align: center; margin-bottom: 30px; }
        .ip-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .ip-table th {
          background: #f5f5f5;
          padding: 12px;
          text-align: left;
          border: 1px solid #ddd;
          font-weight: bold;
        }
        .ip-table td {
          padding: 10px 12px;
          border: 1px solid #ddd;
          vertical-align: top;
        }
        .ip-table tr:nth-child(even) {
          background: #f9f9f9;
        }
        .risk-high { color: #f44336; font-weight: bold; }
        .risk-medium { color: #FF9800; font-weight: bold; }
        .risk-low { color: #4CAF50; }
        .ip-address { font-family: monospace; font-weight: bold; }
        .location { font-size: 12px; color: #666; }
        .no-data {
          text-align: center;
          padding: 40px;
          color: #666;
          font-style: italic;
        }
        .summary {
          background: #e3f2fd;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
      </style>
      
      <h2>🚨 IPs Más Sospechosas</h2>
      
      <div class="summary">
        <strong>📊 Resumen:</strong> Se encontraron ${ipsData.length} IPs con actividad sospechosa
      </div>
    `;
    
    if (ipsData.length === 0) {
      htmlContent += `
        <div class="no-data">
          🎉 ¡Excelente! No se detectaron IPs con patrones sospechosos.
        </div>
      `;
    } else {
      htmlContent += `
        <table class="ip-table">
          <thead>
            <tr>
              <th>IP Address</th>
              <th>Nivel de Riesgo</th>
              <th>Pedidos</th>
              <th>Direcciones Únicas</th>
              <th>Detalles</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      ipsData.forEach(ip => {
        let riskClass = 'risk-low';
        let riskLabel = '🟢 Bajo';
        
        if (ip.riesgo >= 7) {
          riskClass = 'risk-high';
          riskLabel = '🔴 Alto';
        } else if (ip.riesgo >= 4) {
          riskClass = 'risk-medium';
          riskLabel = '🟡 Medio';
        }
        
        htmlContent += `
          <tr>
            <td>
              <span class="ip-address">${ip.ip}</span>
              ${ip.ubicacion ? `<br><span class="location">${ip.ubicacion}</span>` : ''}
            </td>
            <td class="${riskClass}">${riskLabel} (${ip.riesgo})</td>
            <td>${ip.totalPedidos}</td>
            <td>${ip.direccionesUnicas}</td>
            <td>${ip.detalles}</td>
          </tr>
        `;
      });
      
      htmlContent += `
          </tbody>
        </table>
      `;
    }
    
    htmlContent += `
      <div class="summary">
        <strong>💡 Tip:</strong> IPs con puntuación ≥7 requieren atención inmediata. 
        IPs con múltiples direcciones de entrega son especialmente sospechosas.
      </div>
    `;
    
    const htmlOutput = HtmlService.createHtmlOutput(htmlContent)
      .setWidth(700)
      .setHeight(500);
    
    SpreadsheetApp.getUi()
      .showModalDialog(htmlOutput, 'Análisis de IPs Sospechosas');
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
    Logger.log('Error en mostrarIPsSospechosas: ' + error.toString());
  }
}

function analizarIPsSospechosas(datos) {
  const ipsMap = new Map();
  
  // Recopilar datos de todas las IPs
  for (let i = 1; i < datos.length; i++) {
    const datosQ = datos[i][16]; // Columna Q
    const analisis = datos[i][17]; // Columna R
    
    if (!datosQ) continue;
    
    const info = extraerInfoPedido(datosQ);
    if (!info.ip) continue;
    
    if (!ipsMap.has(info.ip)) {
      ipsMap.set(info.ip, {
        ip: info.ip,
        pedidos: [],
        direcciones: new Set(),
        ubicaciones: new Set(),
        maxRiesgo: 0
      });
    }
    
    const ipData = ipsMap.get(info.ip);
    ipData.pedidos.push({
      fila: i + 1,
      direccion: info.direccionCompleta,
      analisis: analisis,
      fecha: datos[i][3] // Columna D
    });
    
    if (info.direccionCompleta) {
      ipData.direcciones.add(info.direccionCompleta);
    }
    
    // Extraer puntuación del análisis
    if (analisis && analisis.includes('(')) {
      const match = analisis.match(/\((\d+)\)/);
      if (match) {
        const puntuacion = parseInt(match[1]);
        ipData.maxRiesgo = Math.max(ipData.maxRiesgo, puntuacion);
      }
    }
  }
  
  // Filtrar y ordenar IPs sospechosas
  const ipsSospechosas = [];
  
  ipsMap.forEach((data, ip) => {
    // Considerar sospechosa si:
    // 1. Puntuación alta (≥4)
    // 2. Múltiples pedidos (≥2)
    // 3. Múltiples direcciones (≥2)
    
    const esSospechosa = data.maxRiesgo >= 4 || 
                        data.pedidos.length >= 2 || 
                        data.direcciones.size >= 2;
    
    if (esSospechosa) {
      // Calcular riesgo combinado
      let riesgoTotal = data.maxRiesgo;
      
      if (data.pedidos.length >= 3) riesgoTotal += 2;
      else if (data.pedidos.length >= 2) riesgoTotal += 1;
      
      if (data.direcciones.size >= 3) riesgoTotal += 2;
      else if (data.direcciones.size >= 2) riesgoTotal += 1;
      
      let detalles = [];
      if (data.pedidos.length > 1) {
        detalles.push(`${data.pedidos.length} pedidos`);
      }
      if (data.direcciones.size > 1) {
        detalles.push(`${data.direcciones.size} direcciones`);
      }
      if (data.maxRiesgo >= 4) {
        detalles.push(`Score máx: ${data.maxRiesgo}`);
      }
      
      ipsSospechosas.push({
        ip: ip,
        riesgo: Math.min(riesgoTotal, 10), // Máximo 10
        totalPedidos: data.pedidos.length,
        direccionesUnicas: data.direcciones.size,
        detalles: detalles.join(', '),
        ubicacion: '' // Se podría agregar geolocalización aquí
      });
    }
  });
  
  // Ordenar por riesgo descendente
  return ipsSospechosas.sort((a, b) => b.riesgo - a.riesgo);
}

// ==== GUÍA DEL SISTEMA ANTIFRAUDE ====

function mostrarGuiaAntifraude() {
  const htmlContent = `
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
      h2 { color: #333; margin-top: 0; text-align: center; }
      h3 { color: #555; margin-top: 25px; }
      .section { margin-bottom: 20px; }
      .highlight { 
        background: #f0f8ff; 
        padding: 15px; 
        border-left: 4px solid #2196F3; 
        margin: 15px 0;
      }
      .warning { 
        background: #fff3e0; 
        padding: 15px; 
        border-left: 4px solid #FF9800; 
        margin: 15px 0;
      }
      .success { 
        background: #e8f5e9; 
        padding: 15px; 
        border-left: 4px solid #4CAF50; 
        margin: 15px 0;
      }
      .score-table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
      }
      .score-table th, .score-table td {
        border: 1px solid #ddd;
        padding: 10px;
        text-align: left;
      }
      .score-table th {
        background: #f5f5f5;
        font-weight: bold;
      }
      ul { margin-left: 20px; }
    </style>
    
    <h2>🛡️ Guía del Sistema Antifraude</h2>
    
    <div class="section">
      <h3>¿Cómo Funciona?</h3>
      <p>El sistema analiza automáticamente cada pedido usando múltiples criterios para detectar patrones sospechosos de fraude.</p>
      
      <div class="highlight">
        <strong>🔍 Criterios de Análisis:</strong>
        <ul>
          <li><strong>Geolocalización:</strong> Compara la ubicación de la IP con la dirección de entrega</li>
          <li><strong>Repetición de IP:</strong> Detecta IPs que hacen múltiples pedidos el mismo día</li>
          <li><strong>Múltiples direcciones:</strong> Identifica IPs que envían a diferentes ubicaciones</li>
        </ul>
      </div>
    </div>
    
    <div class="section">
      <h3>📊 Sistema de Puntuación</h3>
      <table class="score-table">
        <tr>
          <th>Puntuación</th>
          <th>Etiqueta</th>
          <th>Significado</th>
          <th>Acción Recomendada</th>
        </tr>
        <tr>
          <td>0-2</td>
          <td>✅ CONFIABLE</td>
          <td>Pedido sin señales de alarma</td>
          <td>Procesar normalmente</td>
        </tr>
        <tr>
          <td>3-5</td>
          <td>⚠️ REVISAR</td>
          <td>Algunas señales de alarma</td>
          <td>Verificación manual recomendada</td>
        </tr>
        <tr>
          <td>6-10</td>
          <td>🚨 SOSPECHOSO</td>
          <td>Múltiples señales de alarma</td>
          <td>Revisión obligatoria antes de procesar</td>
        </tr>
      </table>
    </div>
    
    <div class="section">
      <h3>🚨 Señales de Alarma Principales</h3>
      
      <div class="warning">
        <strong>⚠️ IP desde país extranjero (4 puntos)</strong><br>
        La IP del pedido proviene de fuera de España
      </div>
      
      <div class="warning">
        <strong>⚠️ IP muy alejada de entrega (2-3 puntos)</strong><br>
        La IP está en una provincia muy distante de la dirección de entrega
      </div>
      
      <div class="warning">
        <strong>⚠️ IP repetida en pocas horas (3 puntos)</strong><br>
        La misma IP ha hecho 2+ pedidos en las últimas 2 horas
      </div>
      
      <div class="warning">
        <strong>⚠️ IP con múltiples direcciones (1-3 puntos)</strong><br>
        La misma IP ha enviado pedidos a 2+ direcciones diferentes
      </div>
    </div>
    
    <div class="section">
      <h3>🔧 Funciones Disponibles</h3>
      
      <div class="success">
        <strong>🔍 Analizar Nuevos Pedidos</strong><br>
        Analiza solo los pedidos que aún no han sido procesados por el sistema antifraude
      </div>
      
      <div class="success">
        <strong>🔄 Re-analizar Todos</strong><br>
        Vuelve a analizar todos los pedidos (sobrescribe análisis anteriores)
      </div>
      
      <div class="success">
        <strong>📈 Estadísticas de Fraude</strong><br>
        Muestra un dashboard con métricas del sistema antifraude
      </div>
      
      <div class="success">
        <strong>🚨 IPs Más Sospechosas</strong><br>
        Lista las IPs que han mostrado los patrones más sospechosos
      </div>
    </div>
    
    <div class="section">
      <h3>💡 Mejores Prácticas</h3>
      <ul>
        <li>Ejecuta "Analizar Nuevos Pedidos" diariamente</li>
        <li>Revisa manualmente todos los pedidos marcados como 🚨 SOSPECHOSO</li>
        <li>Considera verificar pedidos ⚠️ REVISAR de alto valor</li>
        <li>Usa las estadísticas para identificar tendencias</li>
        <li>Revisa periódicamente la lista de IPs sospechosas</li>
      </ul>
    </div>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(htmlContent)
    .setWidth(600)
    .setHeight(600);
  
  SpreadsheetApp.getUi()
    .showModalDialog(htmlOutput, 'Guía del Sistema Antifraude');
}

// ==== GESTIÓN DE CACHE DE IPs ====

function limpiarCacheIPsUI() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.alert('¿Limpiar la cache de IPs almacenadas?', ui.ButtonSet.YES_NO);
  if (resp === ui.Button.YES) {
    const ok = limpiarCacheIPs();
    ui.alert(ok ? 'Cache de IPs limpiada.' : 'Error al limpiar la cache.');
  }
}

function mostrarEstadisticasCache() {
  try {
    const total = obtenerIPsEnCache().length;
    SpreadsheetApp.getUi().alert(`Actualmente hay ${total} IP(s) en cache.`);
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
    Logger.log('Error en mostrarEstadisticasCache: ' + error.toString());
  }
}
