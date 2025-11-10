/**
 * DIAGNÓSTICO DEL SISTEMA DE ALERTAS
 * Ejecuta este script para identificar problemas en la detección de alertas
 */
function diagnosticarSistemaAlertas() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ui = SpreadsheetApp.getUi();

  Logger.log('========================================');
  Logger.log('🔍 DIAGNÓSTICO DEL SISTEMA DE ALERTAS');
  Logger.log('========================================\n');

  // 1. VERIFICAR CONFIGURACIÓN
  Logger.log('1️⃣ VERIFICANDO CONFIGURACIÓN...');
  const cfg = readConfig();
  Logger.log('   Configuración leída:');
  Logger.log('   - SesionesPrevistas: ' + cfg.SesionesPrevistas);
  Logger.log('   - Destinatarios: ' + cfg.Destinatarios);
  Logger.log('   - AnalisisAutomaticoActivo: ' + cfg.AnalisisAutomaticoActivo);
  Logger.log('   - Aus_%1 (aviso): ' + cfg['Aus_%1'] + '%');
  Logger.log('   - Aus_%2 (grave): ' + cfg['Aus_%2'] + '%');
  Logger.log('   - Ret_%1 (aviso): ' + cfg['Ret_%1'] + '%');
  Logger.log('   - Ret_%2 (grave): ' + cfg['Ret_%2'] + '%');
  Logger.log('   - Uni_%1 (aviso): ' + cfg['Uni_%1'] + '%');
  Logger.log('   - Uni_%2 (grave): ' + cfg['Uni_%2'] + '%');
  Logger.log('   - Ase_%1 (aviso): ' + cfg['Ase_%1'] + '%');
  Logger.log('   - Ase_%2 (grave): ' + cfg['Ase_%2'] + '%\n');

  // Verificar destinatarios
  if (!cfg.Destinatarios || cfg.Destinatarios.trim() === '') {
    Logger.log('   ❌ ERROR: No hay destinatarios configurados\n');
    ui.alert('❌ ERROR', 'No hay destinatarios configurados. Ve a ⚙️ Automatización > Editar alertas', ui.ButtonSet.OK);
    return;
  } else {
    Logger.log('   ✅ Destinatarios configurados correctamente\n');
  }

  // 2. CALCULAR LÍMITES ABSOLUTOS
  Logger.log('2️⃣ CALCULANDO LÍMITES ABSOLUTOS...');
  const sesiones = cfg.SesionesPrevistas || 30;
  const items = ['Aus', 'Ret', 'Uni', 'Ase'];
  const limites = {};
  items.forEach(it => {
    const p1 = (cfg[`${it}_%1`] || 0) / 100;
    const p2 = (cfg[`${it}_%2`] || 0) / 100;
    limites[it] = {
      aviso: Math.ceil(sesiones * p1),
      grave: Math.ceil(sesiones * p2)
    };
    Logger.log(`   ${it}: aviso ≥ ${limites[it].aviso}, grave ≥ ${limites[it].grave}`);
  });
  Logger.log('');

  // 3. VERIFICAR HOJA DE ASISTENCIA
  Logger.log('3️⃣ VERIFICANDO HOJA DE ASISTENCIA...');
  const sheetAsistencia = ss.getSheetByName('RegistroAsistencia');
  if (!sheetAsistencia) {
    Logger.log('   ❌ ERROR: No existe la hoja "RegistroAsistencia"\n');
    ui.alert('❌ ERROR', 'No existe la hoja "RegistroAsistencia"', ui.ButtonSet.OK);
    return;
  }
  Logger.log('   ✅ Hoja "RegistroAsistencia" encontrada');

  const { headers, values } = getSheetData(ss, 'RegistroAsistencia');
  Logger.log('   Total de registros: ' + values.length);

  // Verificar columnas
  const iEst = headers.indexOf('IDEstudiante');
  const iCur = idxDiag(headers, ['CursoID', 'Curso']);
  const iF   = headers.indexOf('Fecha');
  const iP   = headers.indexOf('Presente');
  const iRet = idxDiag(headers, ['Retraso']);
  const iUni = idxDiag(headers, ['SinUniforme', 'Falta uniforme', 'FaltaUniforme']);
  const iAse = idxDiag(headers, ['SinAseo', 'Falta aseo', 'FaltaAseo']);

  Logger.log('   Índices de columnas:');
  Logger.log('   - IDEstudiante: ' + (iEst >= 0 ? iEst : '❌ NO ENCONTRADA'));
  Logger.log('   - CursoID: ' + (iCur >= 0 ? iCur : '❌ NO ENCONTRADA'));
  Logger.log('   - Fecha: ' + (iF >= 0 ? iF : '❌ NO ENCONTRADA'));
  Logger.log('   - Presente: ' + (iP >= 0 ? iP : '❌ NO ENCONTRADA'));
  Logger.log('   - Retraso: ' + (iRet >= 0 ? iRet : '❌ NO ENCONTRADA'));
  Logger.log('   - SinUniforme: ' + (iUni >= 0 ? iUni : '❌ NO ENCONTRADA'));
  Logger.log('   - SinAseo: ' + (iAse >= 0 ? iAse : '❌ NO ENCONTRADA'));

  if ([iEst, iCur, iF, iP, iRet, iUni, iAse].some(x => x < 0)) {
    Logger.log('   ❌ ERROR: Faltan columnas obligatorias\n');
    ui.alert('❌ ERROR', 'Faltan columnas obligatorias en "RegistroAsistencia"', ui.ButtonSet.OK);
    return;
  }
  Logger.log('   ✅ Todas las columnas necesarias existen\n');

  // 4. ANALIZAR VENTANA TEMPORAL
  Logger.log('4️⃣ ANALIZANDO VENTANA TEMPORAL...');
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const desde = new Date(hoy); desde.setDate(hoy.getDate() - sesiones + 1);
  const TZ = Session.getScriptTimeZone();

  Logger.log('   Fecha actual: ' + Utilities.formatDate(hoy, TZ, 'yyyy-MM-dd'));
  Logger.log('   Fecha desde: ' + Utilities.formatDate(desde, TZ, 'yyyy-MM-dd'));
  Logger.log('   Ventana de análisis: ' + sesiones + ' días\n');

  // Filtrar registros en ventana temporal
  const registrosEnVentana = values.filter(r => {
    const f = new Date(r[iF]);
    return f >= desde && f <= hoy;
  });

  Logger.log('   Registros en ventana temporal: ' + registrosEnVentana.length);
  if (registrosEnVentana.length === 0) {
    Logger.log('   ⚠️ ADVERTENCIA: No hay registros en los últimos ' + sesiones + ' días\n');
  }
  Logger.log('');

  // 5. ANALIZAR ESTUDIANTES EN RIESGO
  Logger.log('5️⃣ ANALIZANDO ESTUDIANTES...');
  const info = {};
  registrosEnVentana.forEach(r => {
    const id = r[iEst];
    if (!id) return;

    const a = info[id] = info[id] || {
      tot: 0, asist: 0, ret: 0, uni: 0, ase: 0,
      curso: r[iCur] || 'Sin curso'
    };
    const ok = r[iP] === true;
    a.tot++;
    a.asist += ok ? 1 : 0;
    a.ret += r[iRet] === true ? 1 : 0;
    a.uni += r[iUni] === true ? 1 : 0;
    a.ase += r[iAse] === true ? 1 : 0;
  });

  Logger.log('   Total de estudiantes encontrados: ' + Object.keys(info).length);
  Logger.log('');

  // Analizar cada estudiante
  let estudiantesEnRiesgo = 0;
  const detalleAlertas = [];

  Object.entries(info).forEach(([id, a]) => {
    const aus = a.tot - a.asist;
    const checks = [
      { tipo: 'Aus', valor: aus, limite: limites.Aus },
      { tipo: 'Ret', valor: a.ret, limite: limites.Ret },
      { tipo: 'Uni', valor: a.uni, limite: limites.Uni },
      { tipo: 'Ase', valor: a.ase, limite: limites.Ase }
    ];

    let alerta = '';
    const alertasEspecificas = [];

    checks.forEach(ch => {
      if (ch.valor >= ch.limite.grave) {
        alerta = '🔴';
        alertasEspecificas.push(`🔴 ${ch.tipo}: ${ch.valor} (grave ≥ ${ch.limite.grave})`);
      } else if (ch.valor >= ch.limite.aviso && alerta !== '🔴') {
        if (!alerta) alerta = '⚠️';
        alertasEspecificas.push(`⚠️ ${ch.tipo}: ${ch.valor} (aviso ≥ ${ch.limite.aviso})`);
      }
    });

    if (alerta) {
      estudiantesEnRiesgo++;
      Logger.log(`   ${alerta} ESTUDIANTE ${id} (${a.curso}):`);
      Logger.log(`      Total sesiones: ${a.tot}`);
      Logger.log(`      Ausencias: ${aus}`);
      Logger.log(`      Retrasos: ${a.ret}`);
      Logger.log(`      Sin uniforme: ${a.uni}`);
      Logger.log(`      Sin aseo: ${a.ase}`);
      Logger.log(`      Alertas:`);
      alertasEspecificas.forEach(al => Logger.log(`      - ${al}`));
      Logger.log('');

      detalleAlertas.push({
        id: id,
        curso: a.curso,
        total: a.tot,
        ausencias: aus,
        retrasos: a.ret,
        uniforme: a.uni,
        aseo: a.ase,
        alertas: alertasEspecificas
      });
    }
  });

  // 6. RESUMEN FINAL
  Logger.log('========================================');
  Logger.log('📊 RESUMEN DEL DIAGNÓSTICO');
  Logger.log('========================================');
  Logger.log('✅ Configuración: OK');
  Logger.log('✅ Hoja de datos: OK');
  Logger.log('✅ Columnas: OK');
  Logger.log(`📅 Ventana de análisis: ${sesiones} días`);
  Logger.log(`📝 Registros en ventana: ${registrosEnVentana.length}`);
  Logger.log(`👥 Estudiantes analizados: ${Object.keys(info).length}`);
  Logger.log(`🚨 Estudiantes en riesgo: ${estudiantesEnRiesgo}`);
  Logger.log('========================================\n');

  if (estudiantesEnRiesgo === 0) {
    Logger.log('✅ NO SE DETECTARON ESTUDIANTES EN RIESGO');
    Logger.log('   Posibles razones:');
    Logger.log('   1. Los umbrales configurados son muy altos');
    Logger.log('   2. No hay suficientes datos en la ventana temporal');
    Logger.log('   3. Los estudiantes no han superado los límites configurados\n');

    ui.alert('✅ DIAGNÓSTICO COMPLETO',
             'No se detectaron estudiantes en riesgo.\n\n' +
             'Revisa los logs (Ver > Registros) para más detalles.\n\n' +
             `Estudiantes analizados: ${Object.keys(info).length}\n` +
             `Registros en ventana: ${registrosEnVentana.length}`,
             ui.ButtonSet.OK);
  } else {
    Logger.log('🚨 SE DETECTARON ' + estudiantesEnRiesgo + ' ESTUDIANTES EN RIESGO');
    Logger.log('   El sistema DEBERÍA enviar un email automáticamente\n');

    // Crear mensaje para UI
    let mensaje = `Se detectaron ${estudiantesEnRiesgo} estudiantes en riesgo:\n\n`;
    detalleAlertas.slice(0, 5).forEach(est => {
      mensaje += `${est.id} (${est.curso}):\n`;
      est.alertas.forEach(al => mensaje += `  • ${al}\n`);
      mensaje += '\n';
    });
    if (detalleAlertas.length > 5) {
      mensaje += `... y ${detalleAlertas.length - 5} más\n\n`;
    }
    mensaje += 'Revisa los logs completos en Ver > Registros';

    ui.alert('🚨 ESTUDIANTES EN RIESGO DETECTADOS', mensaje, ui.ButtonSet.OK);
  }

  // 7. VERIFICAR ÚLTIMO ENVÍO
  Logger.log('7️⃣ VERIFICANDO HISTORIAL DE ENVÍOS...');
  const props = PropertiesService.getScriptProperties();
  const lastSent = props.getProperty('LAST_AUTO_ALERT_DATE');
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');

  if (lastSent) {
    Logger.log('   Último email automático enviado: ' + lastSent);
    if (lastSent === today) {
      Logger.log('   ⚠️ Ya se envió un email HOY (protección anti-spam activada)');
      Logger.log('   Para enviar otro email hoy, usa el envío manual desde el menú\n');
    } else {
      Logger.log('   ✅ Se puede enviar email automático hoy\n');
    }
  } else {
    Logger.log('   ℹ️ Nunca se ha enviado un email automático\n');
  }

  Logger.log('========================================');
  Logger.log('🏁 DIAGNÓSTICO COMPLETADO');
  Logger.log('========================================');
}

/**
 * Función auxiliar para buscar índice de columna con múltiples nombres posibles
 * (Solo se define aquí si no existe en Code.gs)
 */
function idxDiag(arr, names) {
  for (const n of names) {
    const i = arr.indexOf(n);
    if (i >= 0) return i;
  }
  return -1;
}
