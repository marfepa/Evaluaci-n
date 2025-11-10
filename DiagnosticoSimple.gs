/**
 * DIAGNÓSTICO SIMPLIFICADO - Ejecutar desde Apps Script Editor
 * 1. Abre Extensiones > Apps Script
 * 2. Copia este archivo completo al editor
 * 3. Ejecuta la función testAlertSystem()
 */

function testAlertSystem() {
  Logger.log('=== DIAGNÓSTICO RÁPIDO DEL SISTEMA DE ALERTAS ===\n');

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 1. Verificar configuración
    Logger.log('1. CONFIGURACIÓN:');
    const cfg = readConfig();
    Logger.log('   Destinatarios: ' + cfg.Destinatarios);
    Logger.log('   SesionesPrevistas: ' + cfg.SesionesPrevistas);
    Logger.log('   AnalisisAutomaticoActivo: ' + cfg.AnalisisAutomaticoActivo);
    Logger.log('   Aus_%1: ' + cfg['Aus_%1'] + '%, Aus_%2: ' + cfg['Aus_%2'] + '%');
    Logger.log('');

    // 2. Verificar hoja RegistroAsistencia
    Logger.log('2. HOJA REGISTROASISTENCIA:');
    const sheet = ss.getSheetByName('RegistroAsistencia');
    if (!sheet) {
      Logger.log('   ❌ ERROR: Hoja "RegistroAsistencia" no encontrada');
      return;
    }
    const data = sheet.getDataRange().getValues();
    Logger.log('   Total filas: ' + (data.length - 1));
    Logger.log('   Columnas: ' + data[0].join(', '));
    Logger.log('');

    // 3. Calcular límites
    Logger.log('3. LÍMITES CALCULADOS (para ' + cfg.SesionesPrevistas + ' sesiones):');
    const sesiones = cfg.SesionesPrevistas || 30;
    Logger.log('   Ausencias: aviso=' + Math.ceil(sesiones * cfg['Aus_%1'] / 100) +
               ', grave=' + Math.ceil(sesiones * cfg['Aus_%2'] / 100));
    Logger.log('   Retrasos: aviso=' + Math.ceil(sesiones * cfg['Ret_%1'] / 100) +
               ', grave=' + Math.ceil(sesiones * cfg['Ret_%2'] / 100));
    Logger.log('   Sin uniforme: aviso=' + Math.ceil(sesiones * cfg['Uni_%1'] / 100) +
               ', grave=' + Math.ceil(sesiones * cfg['Uni_%2'] / 100));
    Logger.log('   Sin aseo: aviso=' + Math.ceil(sesiones * cfg['Ase_%1'] / 100) +
               ', grave=' + Math.ceil(sesiones * cfg['Ase_%2'] / 100));
    Logger.log('');

    // 4. Verificar última fecha de envío
    Logger.log('4. HISTORIAL DE ENVÍOS:');
    const props = PropertiesService.getScriptProperties();
    const lastSent = props.getProperty('LAST_AUTO_ALERT_DATE');
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    if (lastSent) {
      Logger.log('   Último envío: ' + lastSent);
      if (lastSent === today) {
        Logger.log('   ⚠️ Ya se envió email HOY (protección anti-spam activa)');
      } else {
        Logger.log('   ✅ Puede enviar email hoy');
      }
    } else {
      Logger.log('   ℹ️ Nunca se ha enviado un email automático');
    }
    Logger.log('');

    // 5. Probar análisis
    Logger.log('5. PROBANDO ANÁLISIS...');
    const resultado = analizeAttendanceRisk(cfg);
    Logger.log('   Estudiantes en riesgo detectados: ' + resultado.estudiantesEnRiesgo);
    Logger.log('');

    if (resultado.estudiantesEnRiesgo > 0) {
      Logger.log('✅ EL SISTEMA DEBERÍA ENVIAR EMAIL');
      Logger.log('');
      Logger.log('ACCIONES RECOMENDADAS:');
      Logger.log('1. Verifica que los destinatarios sean correctos');
      Logger.log('2. Si ya se envió email hoy, espera hasta mañana o usa envío manual');
      Logger.log('3. Para forzar envío: ⚙️ Automatización > Ejecutar reporte AHORA');
    } else {
      Logger.log('ℹ️ NO HAY ESTUDIANTES EN RIESGO');
      Logger.log('');
      Logger.log('POSIBLES RAZONES:');
      Logger.log('1. Los umbrales son muy altos para los datos actuales');
      Logger.log('2. No hay suficientes registros en la ventana temporal');
      Logger.log('3. Los estudiantes no superan los límites configurados');
    }

    Logger.log('');
    Logger.log('=== FIN DEL DIAGNÓSTICO ===');

  } catch (error) {
    Logger.log('❌ ERROR: ' + error.toString());
    Logger.log('   Stack: ' + error.stack);
  }
}

/**
 * Resetear el bloqueo anti-spam (útil para pruebas)
 */
function resetEmailBlock() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('LAST_AUTO_ALERT_DATE');
  Logger.log('✅ Bloqueo anti-spam eliminado. Ahora puedes enviar email de prueba.');
}

/**
 * Forzar envío de email (ignorando protección anti-spam)
 */
function forceEmailNow() {
  Logger.log('🚀 FORZANDO ENVÍO DE EMAIL...\n');

  // Resetear protección
  resetEmailBlock();

  // Ejecutar notificador
  try {
    dailyAttendanceNotifier();
    Logger.log('✅ Email enviado (revisa tu bandeja de entrada)');
  } catch (error) {
    Logger.log('❌ ERROR al enviar: ' + error.toString());
  }
}
