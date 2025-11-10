/**
 * PRUEBA MANUAL DEL SISTEMA DE ALERTAS
 * Ejecuta esta función manualmente para probar el envío de email
 */

/**
 * Test 1: Verificar si se detectan estudiantes en riesgo
 */
function testDeteccionEstudiantes() {
  Logger.log('=== TEST: DETECCIÓN DE ESTUDIANTES ===\n');

  const cfg = readConfig();
  Logger.log('Configuración:');
  Logger.log('  - Destinatarios: ' + cfg.Destinatarios);
  Logger.log('  - AnalisisAutomaticoActivo: ' + cfg.AnalisisAutomaticoActivo);
  Logger.log('');

  const resultado = analizeAttendanceRisk(cfg);
  Logger.log('Resultado del análisis:');
  Logger.log('  - Estudiantes en riesgo: ' + resultado.estudiantesEnRiesgo);
  Logger.log('');

  if (resultado.estudiantesEnRiesgo > 0) {
    Logger.log('✅ SE DETECTARON ESTUDIANTES EN RIESGO');
    Logger.log('   El email DEBERÍA enviarse');
  } else {
    Logger.log('❌ NO se detectaron estudiantes en riesgo');
  }
}

/**
 * Test 2: Simular apertura de hoja (sin enviar email)
 */
function testCheckAttendanceOnOpenDryRun() {
  Logger.log('=== TEST: SIMULACIÓN DE APERTURA (DRY RUN) ===\n');

  try {
    const cfg = readConfig();

    Logger.log('1. Verificando configuración...');
    if (!cfg.AnalisisAutomaticoActivo) {
      Logger.log('   ❌ Análisis automático DESACTIVADO');
      return;
    }
    Logger.log('   ✅ Análisis automático ACTIVADO');

    if (!cfg.Destinatarios || cfg.Destinatarios.trim() === '') {
      Logger.log('   ❌ No hay destinatarios');
      return;
    }
    Logger.log('   ✅ Destinatarios: ' + cfg.Destinatarios);

    Logger.log('');
    Logger.log('2. Verificando último envío...');
    const props = PropertiesService.getScriptProperties();
    const lastSent = props.getProperty('LAST_AUTO_ALERT_DATE');
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

    if (lastSent) {
      Logger.log('   Último envío: ' + lastSent);
      if (lastSent === today) {
        Logger.log('   ⚠️ YA SE ENVIÓ EMAIL HOY - Protección anti-spam activada');
        return;
      }
    } else {
      Logger.log('   ℹ️ Nunca se ha enviado email');
    }
    Logger.log('   ✅ Puede enviar email hoy');

    Logger.log('');
    Logger.log('3. Analizando estudiantes...');
    const resultado = analizeAttendanceRisk(cfg);
    Logger.log('   Estudiantes en riesgo: ' + resultado.estudiantesEnRiesgo);

    if (resultado.estudiantesEnRiesgo > 0) {
      Logger.log('');
      Logger.log('✅ TODAS LAS CONDICIONES SE CUMPLEN');
      Logger.log('   El sistema DEBERÍA enviar email automáticamente');
      Logger.log('   (En este test NO se envía, es solo simulación)');
    } else {
      Logger.log('');
      Logger.log('❌ No hay estudiantes en riesgo');
    }

  } catch (error) {
    Logger.log('❌ ERROR: ' + error.toString());
    Logger.log('   Stack: ' + error.stack);
  }
}

/**
 * Test 3: FORZAR ENVÍO DE EMAIL (ejecuta dailyAttendanceNotifier)
 */
function testForzarEnvioEmail() {
  Logger.log('=== TEST: FORZAR ENVÍO DE EMAIL ===\n');
  Logger.log('⚠️ ADVERTENCIA: Esto ENVIARÁ un email real\n');

  try {
    // Resetear protección anti-spam
    const props = PropertiesService.getScriptProperties();
    const lastSent = props.getProperty('LAST_AUTO_ALERT_DATE');
    if (lastSent) {
      Logger.log('Eliminando protección anti-spam (último envío: ' + lastSent + ')');
      props.deleteProperty('LAST_AUTO_ALERT_DATE');
    }

    Logger.log('Ejecutando dailyAttendanceNotifier()...');
    Logger.log('');

    dailyAttendanceNotifier();

    Logger.log('');
    Logger.log('✅ Ejecución completada');
    Logger.log('   Revisa tu bandeja de entrada');

  } catch (error) {
    Logger.log('❌ ERROR: ' + error.toString());
    Logger.log('   Stack: ' + error.stack);
  }
}

/**
 * Test 4: Ejecutar checkAttendanceOnOpen manualmente
 */
function testCheckAttendanceOnOpenReal() {
  Logger.log('=== TEST: EJECUTAR checkAttendanceOnOpen REAL ===\n');
  Logger.log('⚠️ ADVERTENCIA: Esto puede enviar un email si se cumplen condiciones\n');

  try {
    checkAttendanceOnOpen();
    Logger.log('');
    Logger.log('✅ checkAttendanceOnOpen() ejecutado');
    Logger.log('   Revisa los logs arriba para ver qué pasó');

  } catch (error) {
    Logger.log('❌ ERROR: ' + error.toString());
    Logger.log('   Stack: ' + error.stack);
  }
}

/**
 * Test 5: Verificar si onOpen se ejecuta
 */
function testOnOpenExecution() {
  Logger.log('=== TEST: VERIFICACIÓN DE onOpen ===\n');

  try {
    Logger.log('Intentando ejecutar onOpen()...');
    onOpen();
    Logger.log('✅ onOpen() se ejecutó correctamente');
    Logger.log('');
    Logger.log('NOTA: onOpen() incluye checkAttendanceOnOpen()');
    Logger.log('      Revisa los logs arriba para ver si se ejecutó');

  } catch (error) {
    Logger.log('❌ ERROR en onOpen(): ' + error.toString());
    Logger.log('   Stack: ' + error.stack);
  }
}
