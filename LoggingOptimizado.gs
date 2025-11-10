/**
 * ========================================================================
 * SISTEMA DE LOGGING OPTIMIZADO CON NIVELES
 * ========================================================================
 *
 * Reemplaza el sistema DEBUG simple con un sistema robusto de logging
 * que incluye niveles, timestamps, y desactivación automática en producción
 *
 * Mejoras:
 * - Niveles de log: ERROR, WARN, INFO, DEBUG, TRACE
 * - Desactivación automática en producción
 * - Timestamps en cada log
 * - Métricas de rendimiento
 * - Límite de logs para evitar overhead
 * ========================================================================
 */

// ===== CONFIGURACIÓN DE LOGGING =====

const LOG_CONFIG = {
  // Nivel de logging (solo se mostrarán logs de este nivel o superior)
  // ERROR = 0, WARN = 1, INFO = 2, DEBUG = 3, TRACE = 4
  LEVEL: 2, // INFO por defecto (cambiar a 0 para producción)

  // Activar/desactivar sistema completo
  ENABLED: true, // Cambiar a false en producción para máximo rendimiento

  // Activar timestamps
  SHOW_TIMESTAMPS: true,

  // Activar prefijos de colores (solo funciona en algunos entornos)
  USE_COLORS: false,

  // Límite de caracteres por log (evitar logs gigantes)
  MAX_LOG_LENGTH: 1000,

  // Activar métricas de rendimiento
  TRACK_PERFORMANCE: true,

  // Auto-detectar entorno de producción
  AUTO_DETECT_PROD: true
};

// Niveles de log
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

// Nombres de niveles
const LEVEL_NAMES = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];

// Prefijos de colores (ANSI)
const COLOR_CODES = {
  ERROR: '\x1b[31m', // Rojo
  WARN: '\x1b[33m',  // Amarillo
  INFO: '\x1b[32m',  // Verde
  DEBUG: '\x1b[36m', // Cyan
  TRACE: '\x1b[90m', // Gris
  RESET: '\x1b[0m'
};

// ===== DETECCIÓN AUTOMÁTICA DE ENTORNO =====

/**
 * Detectar si estamos en producción
 * Heurística: Si hay triggers programados o si fue desplegado como web app
 */
function isProductionEnvironment() {
  if (!LOG_CONFIG.AUTO_DETECT_PROD) {
    return false;
  }

  try {
    // Si hay triggers time-based activos, probablemente es producción
    const triggers = ScriptApp.getProjectTriggers();
    if (triggers.length > 2) {
      return true;
    }

    // Si ScriptApp.getService() funciona, es una web app desplegada
    try {
      const service = ScriptApp.getService();
      if (service && service.getUrl()) {
        return true;
      }
    } catch (e) {
      // No es web app
    }

    return false;
  } catch (error) {
    return false;
  }
}

// Auto-ajustar nivel en producción
if (isProductionEnvironment() && LOG_CONFIG.AUTO_DETECT_PROD) {
  LOG_CONFIG.LEVEL = LOG_LEVELS.ERROR; // Solo errores en producción
  LOG_CONFIG.ENABLED = true; // Mantener errores activos
  Logger.log('🚀 Production environment detected - Logging set to ERROR level only');
}

// ===== CLASE DE LOGGER OPTIMIZADA =====

class OptimizedLogger {
  constructor() {
    this.performanceMarks = new Map();
    this.logCount = 0;
    this.maxLogsPerExecution = 100; // Evitar spam de logs
  }

  /**
   * Log genérico con nivel
   */
  log(level, message, ...args) {
    // Verificaciones rápidas primero (early return)
    if (!LOG_CONFIG.ENABLED) return;
    if (level > LOG_CONFIG.LEVEL) return;
    if (this.logCount >= this.maxLogsPerExecution) return;

    this.logCount++;

    // Formatear mensaje
    let formattedMessage = this.formatMessage(level, message, args);

    // Truncar si es muy largo
    if (formattedMessage.length > LOG_CONFIG.MAX_LOG_LENGTH) {
      formattedMessage = formattedMessage.substring(0, LOG_CONFIG.MAX_LOG_LENGTH) + '... (truncated)';
    }

    // Escribir al log
    Logger.log(formattedMessage);

    // Si es un error, también escribir al stackdriver si está disponible
    if (level === LOG_LEVELS.ERROR && typeof console !== 'undefined') {
      try {
        console.error(formattedMessage);
      } catch (e) {
        // console no disponible
      }
    }
  }

  /**
   * Formatear mensaje de log
   */
  formatMessage(level, message, args) {
    const parts = [];

    // Timestamp
    if (LOG_CONFIG.SHOW_TIMESTAMPS) {
      const now = new Date();
      const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss.SSS');
      parts.push(`[${timestamp}]`);
    }

    // Nivel con color opcional
    const levelName = LEVEL_NAMES[level];
    if (LOG_CONFIG.USE_COLORS) {
      const color = COLOR_CODES[levelName] || '';
      parts.push(`${color}${levelName}${COLOR_CODES.RESET}`);
    } else {
      parts.push(`[${levelName}]`);
    }

    // Mensaje principal
    parts.push(String(message));

    // Argumentos adicionales
    if (args.length > 0) {
      args.forEach(arg => {
        if (typeof arg === 'object') {
          try {
            parts.push(JSON.stringify(arg));
          } catch (e) {
            parts.push(String(arg));
          }
        } else {
          parts.push(String(arg));
        }
      });
    }

    return parts.join(' ');
  }

  // ===== MÉTODOS POR NIVEL =====

  error(message, ...args) {
    this.log(LOG_LEVELS.ERROR, message, ...args);
  }

  warn(message, ...args) {
    this.log(LOG_LEVELS.WARN, message, ...args);
  }

  info(message, ...args) {
    this.log(LOG_LEVELS.INFO, message, ...args);
  }

  debug(message, ...args) {
    this.log(LOG_LEVELS.DEBUG, message, ...args);
  }

  trace(message, ...args) {
    this.log(LOG_LEVELS.TRACE, message, ...args);
  }

  // ===== MÉTRICAS DE RENDIMIENTO =====

  /**
   * Iniciar medición de tiempo
   */
  time(label) {
    if (!LOG_CONFIG.TRACK_PERFORMANCE) return;

    this.performanceMarks.set(label, Date.now());
    this.debug(`⏱️ Timer started: ${label}`);
  }

  /**
   * Finalizar medición de tiempo
   */
  timeEnd(label) {
    if (!LOG_CONFIG.TRACK_PERFORMANCE) return;

    const startTime = this.performanceMarks.get(label);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.info(`⏱️ ${label}: ${duration}ms`);
      this.performanceMarks.delete(label);
      return duration;
    } else {
      this.warn(`⏱️ Timer not found: ${label}`);
      return null;
    }
  }

  /**
   * Log de rendimiento con clasificación automática
   */
  perf(label, duration) {
    if (!LOG_CONFIG.TRACK_PERFORMANCE) return;

    let emoji = '⚡';
    let level = LOG_LEVELS.INFO;

    if (duration < 100) {
      emoji = '⚡'; // Muy rápido
    } else if (duration < 500) {
      emoji = '✅'; // Rápido
    } else if (duration < 1000) {
      emoji = '⚠️';  // Lento
      level = LOG_LEVELS.WARN;
    } else {
      emoji = '🐌'; // Muy lento
      level = LOG_LEVELS.WARN;
    }

    this.log(level, `${emoji} ${label}: ${duration}ms`);
  }

  // ===== UTILIDADES =====

  /**
   * Log de objeto con formato bonito
   */
  object(obj, label = 'Object') {
    if (LOG_LEVELS.DEBUG > LOG_CONFIG.LEVEL) return;

    try {
      const json = JSON.stringify(obj, null, 2);
      this.debug(`${label}:`, json);
    } catch (error) {
      this.debug(`${label}: [Circular or unserializable]`);
    }
  }

  /**
   * Log de tabla (array de objetos)
   */
  table(data, label = 'Table') {
    if (LOG_LEVELS.DEBUG > LOG_CONFIG.LEVEL) return;
    if (!Array.isArray(data) || data.length === 0) {
      this.debug(`${label}: Empty or invalid data`);
      return;
    }

    this.debug(`${label} (${data.length} rows):`);
    data.slice(0, 10).forEach((row, i) => { // Máximo 10 filas
      this.debug(`  [${i}]`, row);
    });

    if (data.length > 10) {
      this.debug(`  ... and ${data.length - 10} more rows`);
    }
  }

  /**
   * Obtener estadísticas del logger
   */
  getStats() {
    return {
      enabled: LOG_CONFIG.ENABLED,
      level: LEVEL_NAMES[LOG_CONFIG.LEVEL],
      logCount: this.logCount,
      activeTimers: this.performanceMarks.size,
      isProduction: isProductionEnvironment()
    };
  }

  /**
   * Resetear contador de logs
   */
  reset() {
    this.logCount = 0;
    this.performanceMarks.clear();
  }
}

// ===== INSTANCIA GLOBAL =====

const Log = new OptimizedLogger();

// ===== FUNCIONES DE COMPATIBILIDAD CON CÓDIGO EXISTENTE =====

/**
 * Reemplazar función D() antigua
 * Uso: D('mensaje') -> Log.debug('mensaje')
 */
function D(msg) {
  Log.debug(msg);
}

/**
 * Configurar nivel de logging dinámicamente
 */
function setLogLevel(level) {
  if (typeof level === 'string') {
    level = LOG_LEVELS[level.toUpperCase()];
  }

  if (level !== undefined && level >= 0 && level <= 4) {
    LOG_CONFIG.LEVEL = level;
    Logger.log(`📝 Log level set to: ${LEVEL_NAMES[level]}`);
  } else {
    Logger.log(`⚠️ Invalid log level: ${level}`);
  }
}

/**
 * Activar/desactivar logging
 */
function setLoggingEnabled(enabled) {
  LOG_CONFIG.ENABLED = enabled;
  Logger.log(`📝 Logging ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Configuración rápida para producción
 */
function configureForProduction() {
  LOG_CONFIG.LEVEL = LOG_LEVELS.ERROR;
  LOG_CONFIG.ENABLED = true;
  LOG_CONFIG.TRACK_PERFORMANCE = false;
  LOG_CONFIG.SHOW_TIMESTAMPS = false;
  Logger.log('🚀 Logging configured for PRODUCTION (errors only)');
}

/**
 * Configuración rápida para desarrollo
 */
function configureForDevelopment() {
  LOG_CONFIG.LEVEL = LOG_LEVELS.DEBUG;
  LOG_CONFIG.ENABLED = true;
  LOG_CONFIG.TRACK_PERFORMANCE = true;
  LOG_CONFIG.SHOW_TIMESTAMPS = true;
  Logger.log('🔧 Logging configured for DEVELOPMENT (debug level)');
}

// ===== DIAGNÓSTICO =====

/**
 * Mostrar configuración actual de logging
 */
function diagnosticarLogging() {
  const stats = Log.getStats();

  Logger.log('========================================');
  Logger.log('DIAGNÓSTICO DEL SISTEMA DE LOGGING');
  Logger.log('========================================');
  Logger.log(`Estado: ${stats.enabled ? 'ACTIVO' : 'DESACTIVADO'}`);
  Logger.log(`Nivel: ${stats.level}`);
  Logger.log(`Entorno: ${stats.isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}`);
  Logger.log(`Logs escritos: ${stats.logCount}`);
  Logger.log(`Timers activos: ${stats.activeTimers}`);
  Logger.log(`Timestamps: ${LOG_CONFIG.SHOW_TIMESTAMPS ? 'SÍ' : 'NO'}`);
  Logger.log(`Performance tracking: ${LOG_CONFIG.TRACK_PERFORMANCE ? 'SÍ' : 'NO'}`);
  Logger.log('========================================');

  // Ejemplos de cada nivel
  Logger.log('\nEjemplos de cada nivel:');
  Log.error('Esto es un ERROR');
  Log.warn('Esto es un WARNING');
  Log.info('Esto es INFO');
  Log.debug('Esto es DEBUG');
  Log.trace('Esto es TRACE');

  return stats;
}

// ===== EXPORTACIÓN =====

/**
 * INSTRUCCIONES DE USO:
 *
 * 1. REEMPLAZAR en Code.gs:
 *    const DEBUG = true;
 *    function D(msg) { if (DEBUG) Logger.log(msg); }
 *
 *    POR: (eliminar esas líneas, este archivo las reemplaza)
 *
 * 2. USAR en tu código:
 *    Log.info('Cargando estudiantes...');
 *    Log.debug('Datos:', datos);
 *    Log.error('Error al guardar:', error);
 *
 *    Log.time('operacion');
 *    // ... código ...
 *    Log.timeEnd('operacion');
 *
 * 3. CONFIGURAR para producción:
 *    En el menú de Apps Script, antes de desplegar:
 *    configureForProduction();
 *
 * 4. COMPATIBILIDAD con código existente:
 *    La función D() sigue funcionando, pero ahora usa Log.debug()
 */
