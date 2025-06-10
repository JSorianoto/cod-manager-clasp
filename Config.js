// ===================================================================
// CONFIGURACIÓN DEL SISTEMA COD MANAGER
// ===================================================================
// Archivo: Config.gs
// Descripción: Configuración centralizada y constantes del sistema
// ===================================================================

// ==== CONFIGURACIÓN PRINCIPAL ====

/**
 * Configuración principal del sistema COD Manager
 * Modificar estos valores para ajustar el comportamiento del sistema
 */
const CONFIG = {
  
  // ==== CONFIGURACIÓN GENERAL ====
  version: '2.0.0',
  nombre: 'COD Manager Pro',
  desarrollador: 'Sistema Antifraude Integrado',
  
  // ==== MAPEO DE COLUMNAS ORDERS ====
  columnas: {
    orders: {
      fecha: 3,          // D - Fecha del pedido
      id: 4,             // E - ID del pedido
      nombre: 5,         // F - Nombre del cliente
      telefono: 6,       // G - Teléfono
      confirmacion: 14,  // O - Estado de confirmación
      estado: 15,        // P - Estado del pedido
      ip: 13,            // N - IP del pedido
      datosCompletos: 16, // Q - Datos completos del pedido
      analisisFraude: 17  // R - Análisis antifraude
    },
    
    worksheet: {
      id: 1,        // B - ID del pedido con formato
      estado: 7,    // H - Estado
      nombre: 8,    // I - Nombre del cliente
      telefono: 10  // K - Teléfono
    }
  },
  
  // ==== ESTADOS Y CONVERSIONES ====
  estados: {
    conversion: {
      'Charged': 'Entregado',
      'Delivered': 'Entregado', 
      'Reject': 'Devolucion',
      'Incidence': 'INCIDENCIA'
    },
    
    confirmados: ['DIRECT', 'WAC', 'CC', 'SHOPIFY'],
    
    finales: ['Entregado', 'I. ENTREGADO', 'Devolucion'],
    
    noActualizar: ['FALLO AGENCIA', 'NO CONFIRMADO'],
    
    incidenciaResuelta: {
      desde: 'INCIDENCIA',
      hacia: 'Entregado',
      resultado: 'I. ENTREGADO'
    }
  } 
};

// ==== MAPEO ESTADOS DROPEA ====
/**
 * Conversión de estados devueltos por la API de Dropea
 * hacia los valores utilizados en la hoja ORDERS.
 */
const DROPEA_STATUS_MAP = {
  'DELIVERED': 'Entregado',
  'CHARGED': 'Entregado',
  'REJECTED': 'Devolucion',
  'CANCELLED': 'Devolucion',
  'RETURNED': 'Devolucion',
  'TRANSIT': 'En tránsito',
  'PREPARED': 'En tránsito',
  'PENDING': 'En tránsito',
  'INCIDENCE': 'INCIDENCIA'
};

/**
 * Devuelve el estado equivalente usado en la hoja ORDERS.
 * Si el valor proporcionado no está en el mapeo,
 * se devuelve "INCIDENCIA".
 */
function convertirEstadoDropea(estado) {
  return DROPEA_STATUS_MAP[estado] || 'INCIDENCIA';
}

// ==== CONFIGURACIÓN SISTEMA ANTIFRAUDE ====

/**
 * Configuración específica del sistema de detección de fraude
 */
const FRAUD_CONFIG = {
  
  // ==== PUNTUACIONES DE RIESGO ====
  puntuaciones: {
    // Geolocalización
    ipExtranjera: 4,              // IP desde fuera de España
    ipProvinciaLejana: 3,         // IP desde provincia muy alejada
    ipProvinciaDistinta: 2,       // IP desde provincia diferente
    ipNoLocalizable: 1,           // IP que no se puede localizar
    
    // Repetición de IP
    ipRepetida2Horas: 3,          // 2+ pedidos con misma IP en 2 horas
    ipRepetidaMismoDia: 2,        // 2+ pedidos con misma IP mismo día
    ipRepetidaUnaVez: 1,          // IP usada 2 veces en el día
    
    // Múltiples direcciones
    ip4DireccionesMas: 3,         // IP usada en 4+ direcciones diferentes
    ip3Direcciones: 2,            // IP usada en 3 direcciones diferentes
    ip2Direcciones: 1             // IP usada en 2 direcciones diferentes
  },
  
  // ==== UMBRALES DE CLASIFICACIÓN ====
  umbrales: {
    confiable: {
      min: 0,
      max: 2,
      etiqueta: '✅ CONFIABLE',
      color: '#4CAF50',
      accion: 'Procesar normalmente'
    },
    
    revisar: {
      min: 3,
      max: 5,
      etiqueta: '⚠️ REVISAR',
      color: '#FF9800',
      accion: 'Verificación manual recomendada'
    },
    
    sospechoso: {
      min: 6,
      max: 10,
      etiqueta: '🚨 SOSPECHOSO',
      color: '#f44336',
      accion: 'Revisión obligatoria antes de procesar'
    }
  },
  
  // ==== CONFIGURACIÓN DE ANÁLISIS ====
  analisis: {
    ventanaHorasRepeticion: 2,    // Horas para considerar repetición sospechosa
    maximoDireccionesPorIP: 4,    // Máximo direcciones diferentes por IP
    pausaEntreConsultas: 100,     // Milisegundos entre consultas API
    timeoutAPI: 5000,             // Timeout para consultas API en ms
    
    // Provincias consideradas "muy lejanas" entre sí
    provinciasMuyLejanas: [
      'canarias', 'baleares', 'ceuta', 'melilla'
    ]
  },

  // ==== CONFIGURACIÓN DE HISTORIAL ====
  historial: {
    diasAnalisis: 30,             // Días hacia atrás para revisar historial
    repeticionesSospechosas: 3,   // Pedidos previos necesarios para sumar puntos
    puntosPorRepeticion: 2        // Puntos extra al superar el umbral
  },

  // ==== CONFIGURACIÓN DE APIs ====
  apis: {
    geolocalizacion: {
      proveedor: 'ip-api.com',
      url: 'http://ip-api.com/json/',
      camposConsulta: 'status,country,regionName,region,city',
      idioma: 'es',
      limiteMensual: 1000,
      cacheDuracion: 86400 // 24 horas en segundos
    }
  }
};

// ==== MAPEO DE PROVINCIAS ESPAÑOLAS ====

/**
 * Mapeo de códigos de provincia a nombres completos
 * Usado para comparar ubicación IP con dirección de entrega
 */
const MAPA_PROVINCIAS = {
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

// ==== CONFIGURACIÓN DE LOGS Y AUDITORÍA ====

/**
 * Configuración del sistema de logs y auditoría
 */
const LOG_CONFIG = {
  
  hojas: {
    actualizaciones: 'LOG_ACTUALIZACIONES',
    antifraude: 'LOG_ANTIFRAUDE',
    bot: 'LOG_BOT'
  },
  
  encabezados: {
    actualizaciones: [
      'Fecha/Hora', 'Tipo', 'ID Pedido', 'Nombre Cliente', 
      'Estado Anterior', 'Estado Nuevo', 'Usuario', 'Observaciones'
    ],
    antifraude: [
      'Fecha/Hora', 'Tipo Análisis', 'Pedidos Analizados',
      'Sospechosos Detectados', 'Tasa Detección', 'Usuario'
    ],
    bot: [
      'Fecha/Hora', 'Evento', 'Detalle', 'Usuario'
    ]
  },
  
  colores: {
    encabezados: '#f1f3f4',
    encabezadosAntifraude: '#fff3e0',
    encabezadosBot: '#e8eaf6'
  },
  
  retencion: {
    mesesAntiguedad: 3, // Meses antes de limpiar logs antiguos
    limpiezaAutomatica: true
  }
};

// ==== CONFIGURACIÓN DE NOTIFICACIONES ====

/**
 * Configuración del sistema de notificaciones
 */
const NOTIFICATION_CONFIG = {
  
  email: {
    habilitado: false, // Cambiar a true para habilitar emails
    remitente: '', // Email del remitente
    asuntoPrefijo: '🚨 COD Manager: '
  },
  
  umbrales: {
    notificarSiSospechosos: 1, // Notificar si hay 1+ pedidos sospechosos
    notificarSiTasaAlta: 10    // Notificar si tasa de fraude > 10%
  },
  
  plantillas: {
    fraudeDetectado: {
      asunto: 'Pedidos sospechosos detectados',
      cuerpo: `Se han detectado {CANTIDAD} pedidos sospechosos que requieren revisión:

{LISTA_PEDIDOS}

Revisa estos pedidos en la hoja ORDERS (columna R) antes de procesarlos.

Análisis realizado el {FECHA} por {USUARIO}`
    }
  }
};

// ==== CONFIGURACIÓN DE MANTENIMIENTO ====

/**
 * Configuración del sistema de mantenimiento automático
 */
const MAINTENANCE_CONFIG = {
  
  cache: {
    limpiezaAutomatica: true,
    duracionIP: 86400, // 24 horas en segundos
    maximoEntradas: 1000
  },
  
  limpieza: {
    ejecutarAutomaticamente: true,
    frecuenciaDias: 7, // Cada 7 días
    mantenerLogsMeses: 3
  },
  
  validaciones: {
    verificarEstructura: true,
    repararAutomaticamente: false,
    notificarProblemas: true
  }
};

// ==== FUNCIONES DE ACCESO A CONFIGURACIÓN ====

/**
 * Obtiene la configuración completa del sistema
 */
function obtenerConfiguracionCompleta() {
  return {
    general: CONFIG,
    fraude: FRAUD_CONFIG,
    provincias: MAPA_PROVINCIAS,
    logs: LOG_CONFIG,
    notificaciones: NOTIFICATION_CONFIG,
    mantenimiento: MAINTENANCE_CONFIG
  };
}

/**
 * Obtiene configuración específica del sistema antifraude
 */
function obtenerConfigFraude() {
  return FRAUD_CONFIG;
}

/**
 * Obtiene el mapeo de provincias
 */
function obtenerMapaProvincias() {
  return MAPA_PROVINCIAS;
}

/**
 * Devuelve el mapeo de columnas para la hoja ORDERS
 */
function obtenerColumnasOrders() {
  return CONFIG.columnas.orders;
}

/**
 * Obtiene configuración de una sección específica
 */
function obtenerConfigSeccion(seccion) {
  const configs = {
    'general': CONFIG,
    'fraude': FRAUD_CONFIG,
    'provincias': MAPA_PROVINCIAS,
    'logs': LOG_CONFIG,
    'notificaciones': NOTIFICATION_CONFIG,
    'mantenimiento': MAINTENANCE_CONFIG
  };
  
  return configs[seccion] || null;
}

/**
 * Actualiza configuración de una sección específica
 * USAR CON PRECAUCIÓN - Solo para ajustes avanzados
 */
function actualizarConfigSeccion(seccion, nuevaConfig) {
  try {
    // Validar que la sección existe
    if (!obtenerConfigSeccion(seccion)) {
      throw new Error(`Sección de configuración no encontrada: ${seccion}`);
    }
    
    // Aquí se podría implementar validación específica por sección
    // y persistencia en hoja de configuración
    
    Logger.log(`Configuración actualizada para sección: ${seccion}`);
    return true;
    
  } catch (error) {
    Logger.log(`Error actualizando configuración: ${error.toString()}`);
    return false;
  }
}

// ==== FUNCIONES DE VALIDACIÓN DE CONFIGURACIÓN ====

/**
 * Valida que la configuración del sistema sea correcta
 */
function validarConfiguracion() {
  const errores = [];
  
  try {
    // Validar configuración general
    if (!CONFIG.version || !CONFIG.nombre) {
      errores.push('Configuración general incompleta');
    }
    
    // Validar configuración de fraude
    if (!FRAUD_CONFIG.puntuaciones || !FRAUD_CONFIG.umbrales) {
      errores.push('Configuración de fraude incompleta');
    }
    
    // Validar umbrales lógicos
    const umbrales = FRAUD_CONFIG.umbrales;
    if (umbrales.confiable.max >= umbrales.revisar.min) {
      errores.push('Umbrales de clasificación superpuestos');
    }
    
    // Validar configuración de API
    if (!FRAUD_CONFIG.apis.geolocalizacion.url) {
      errores.push('URL de API de geolocalización no configurada');
    }
    
    return {
      valida: errores.length === 0,
      errores: errores
    };
    
  } catch (error) {
    return {
      valida: false,
      errores: [`Error validando configuración: ${error.toString()}`]
    };
  }
}

/**
 * Muestra información del sistema y configuración actual
 */
function mostrarInfoSistema() {
  const config = obtenerConfiguracionCompleta();
  const validacion = validarConfiguracion();
  
  const info = `
=== COD MANAGER - INFORMACIÓN DEL SISTEMA ===

Versión: ${config.general.version}
Nombre: ${config.general.nombre}
Desarrollador: ${config.general.desarrollador}

=== CONFIGURACIÓN ANTIFRAUDE ===
API Geolocalización: ${config.fraude.apis.geolocalizacion.proveedor}
Límite mensual API: ${config.fraude.apis.geolocalizacion.limiteMensual}
Provincias mapeadas: ${Object.keys(config.provincias).length}

=== UMBRALES DE CLASIFICACIÓN ===
Confiable: ${config.fraude.umbrales.confiable.min}-${config.fraude.umbrales.confiable.max} puntos
Revisar: ${config.fraude.umbrales.revisar.min}-${config.fraude.umbrales.revisar.max} puntos  
Sospechoso: ${config.fraude.umbrales.sospechoso.min}-${config.fraude.umbrales.sospechoso.max} puntos

=== ESTADO DE CONFIGURACIÓN ===
Válida: ${validacion.valida ? 'SÍ' : 'NO'}
${validacion.errores.length > 0 ? 'Errores: ' + validacion.errores.join(', ') : ''}

=== FECHA DE CONSULTA ===
${new Date().toLocaleString('es-ES')}
`;

  Logger.log(info);
  return info;
}