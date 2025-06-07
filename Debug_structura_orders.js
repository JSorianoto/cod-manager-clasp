function debugEstructuraORDERS() {
  try {
    console.log('🔍 ANALIZANDO ESTRUCTURA DE HOJA ORDERS...');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaOrders = ss.getSheetByName('ORDERS');
    const datosOrders = hojaOrders.getDataRange().getValues();
    
    console.log(`📊 Total filas: ${datosOrders.length}`);
    
    // Mostrar encabezados (fila 1)
    console.log('\n=== ENCABEZADOS (FILA 1) ===');
    for (let col = 0; col < Math.min(20, datosOrders[0].length); col++) {
      const letra = String.fromCharCode(65 + col); // A, B, C...
      console.log(`${letra}: "${datosOrders[0][col]}"`);
    }
    
    // Buscar en qué columna están los IDs de Shopify
    console.log('\n=== BUSCANDO IDs DE SHOPIFY EN TODAS LAS COLUMNAS ===');
    
    // Probamos las primeras 10 filas de datos
    for (let fila = 1; fila <= Math.min(10, datosOrders.length - 1); fila++) {
      console.log(`\nFila ${fila + 1}:`);
      
      for (let col = 0; col < Math.min(20, datosOrders[fila].length); col++) {
        const valor = datosOrders[fila][col];
        const letra = String.fromCharCode(65 + col);
        
        // Solo mostrar valores que no estén vacíos
        if (valor !== "" && valor !== null && valor !== undefined) {
          console.log(`  ${letra}: "${valor}"`);
          
          // Detectar si parece un ID de Shopify (número largo)
          if (typeof valor === 'number' && valor.toString().length > 10) {
            console.log(`    🎯 POSIBLE ID SHOPIFY: ${valor}`);
          }
          if (typeof valor === 'string' && /^\d{11,15}$/.test(valor)) {
            console.log(`    🎯 POSIBLE ID SHOPIFY: ${valor}`);
          }
        }
      }
    }
    
    // Buscar específicamente los IDs de Dropea en toda la hoja
    console.log('\n=== BUSCANDO IDs ESPECÍFICOS DE DROPEA ===');
    const idsDropeaBuscar = ['11347392102726', '11347331875142', '11346451136838'];
    
    for (let idBuscado of idsDropeaBuscar) {
      console.log(`\nBuscando ID: ${idBuscado}`);
      let encontrado = false;
      
      for (let fila = 0; fila < datosOrders.length; fila++) {
        for (let col = 0; col < datosOrders[fila].length; col++) {
          const valor = datosOrders[fila][col]?.toString();
          
          if (valor === idBuscado) {
            const letra = String.fromCharCode(65 + col);
            console.log(`  ✅ ENCONTRADO en fila ${fila + 1}, columna ${letra}`);
            encontrado = true;
          }
        }
      }
      
      if (!encontrado) {
        console.log(`  ❌ NO ENCONTRADO en ninguna parte`);
      }
    }
    
    SpreadsheetApp.getUi().alert('🔍 Análisis completado. Revisa el log para ver la estructura.');
    
  } catch (error) {
    console.log('💥 Error:', error.toString());
    SpreadsheetApp.getUi().alert('💥 Error: ' + error.toString());
  }
}