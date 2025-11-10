/****************************************************************
 *   AUTOMATIZACIÓN – REPORTE CONSOLIDADO + CONFIG DINÁMICA      *
 *   · Calcula métricas de asistencia sobre los últimos N días   *
 *   · Aplica umbrales leídos de hoja ConfiguracionAlertas       *
 *   · Genera:                                                   *
 *       - Hoja “Reporte_Asistencia_Av”   (por curso)            *
 *       - Hoja “Reporte_Asistencia_Av_Diario” (consolidado)     *
 *       - PDF por curso                                         *
 *       - Correo HTML + adjuntos                                *
 ****************************************************************/

const DIAS_ANALISIS = 30;                                // ventana en días
const TZ            = Session.getScriptTimeZone();

/* ===== 1 · CONFIGURAR TRIGGER (manual)  ====================== */
function setupAsistenciaDailyTrigger() {
  const ui = SpreadsheetApp.getUi();
  const r  = ui.prompt('Trigger diario',
        'Hora local HH o HH:MM (24 h)', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;

  const m = /^(\d{1,2})(?::(\d{2}))?$/.exec(r.getResponseText().trim());
  if (!m) return ui.alert('Formato inválido (usa HH o HH:MM)');

  const h = +m[1], min = +(m[2] || 0);

  // elimina triggers anteriores de esta función
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'dailyAttendanceNotifier')
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('dailyAttendanceNotifier')
    .timeBased().atHour(h).nearMinute(min).everyDays(1).create();

  ui.alert(`Trigger diario creado a las ` +
           `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
}

/* ===== 2 · PRINCIPAL (llamada por trigger o manual) ========= */
function dailyAttendanceNotifier() {

  /* --- cargar configuración de umbrales --- */
  const cfg = Object.assign({
    SesionesPrevistas: DIAS_ANALISIS,
    Destinatarios: ''  // Se debe configurar en el diálogo
  }, readConfig());

  // Validar que haya destinatarios configurados
  if (!cfg.Destinatarios || cfg.Destinatarios.trim() === '') {
    Logger.log('⚠️  No hay destinatarios configurados. Usa el menú "⚙️ Automatización > Editar alertas..." para configurar.');
    return;
  }

  // ——— Cálculo dinámico de límites por ítem ———
  const sesiones = cfg.SesionesPrevistas;
  const items = ['Aus', 'Ret', 'Uni', 'Ase'];
  const limites = {};
  items.forEach(it => {
    const p1 = (cfg[`${it}_%1`] || 0) / 100;
    const p2 = (cfg[`${it}_%2`] || 0) / 100;
    limites[it] = {
      aviso: Math.ceil(sesiones * p1),
      grave: Math.ceil(sesiones * p2)
    };
  });

  /* --- acceder a datos de asistencia --- */
  const ss              = SpreadsheetApp.openById(SPREADSHEET_ID);
  const { headers, values } = getSheetData(ss, 'RegistroAsistencia');

  const iEst = headers.indexOf('IDEstudiante');
  const iCur = idx(headers, ['CursoID', 'Curso']);
  const iF   = headers.indexOf('Fecha');
  const iP   = headers.indexOf('Presente');
  const iRet = idx(headers, ['Retraso']);
  const iUni = idx(headers, ['SinUniforme', 'Falta uniforme', 'FaltaUniforme']);
  const iAse = idx(headers, ['SinAseo', 'Falta aseo', 'FaltaAseo']);

  if ([iEst, iCur, iF, iP, iRet, iUni, iAse].some(x => x < 0)) {
    Logger.log('⚠️  Faltan columnas obligatorias en RegistroAsistencia');
    return;
  }

  /* --- cargar información de estudiantes para obtener nombres --- */
  const estudiantes = getEstudiantes(ss);
  const estudiantesMap = {};
  estudiantes.forEach(est => {
    estudiantesMap[est.IDEstudiante] = {
      nombre: est.NombreEstudiante || est.Nombre || est.Alumno || est.IDEstudiante,
      curso: est.CursoID || est.Curso || est.CursoEvaluado || ''
    };
  });

  /* --- ventana temporal --- */
  const hoy   = new Date(); hoy.setHours(0, 0, 0, 0);
  const desde = new Date(hoy); desde.setDate(hoy.getDate() - DIAS_ANALISIS + 1);

  const dISO = Utilities.formatDate(desde, TZ, 'yyyy-MM-dd');
  const hISO = Utilities.formatDate(hoy,   TZ, 'yyyy-MM-dd');

  /* --- agrupar filas por curso --- */
  const cMap = new Map();
  values.forEach(r => {
    const f = new Date(r[iF]);
    if (f < desde || f > hoy) return;
    const c = r[iCur];
    if (!c) return;
    if (!cMap.has(c)) cMap.set(c, []);
    cMap.get(c).push(r);
  });

  const blobsPDF = [];
  const htmlRows = [];
  const sheetRows = [];

  /* -------- procesar cada curso -------- */
  cMap.forEach((rows, curso) => {

    /* --- métricas por alumno --- */
    const info = {};
    rows.forEach(r => {
      const id = r[iEst]; if (!id) return;
      const a  = info[id] = info[id] || {
        tot: 0, asist: 0, ret: 0, uni: 0, ase: 0,
        streak: 0, maxStreak: 0
      };
      const ok = r[iP] === true;
      a.tot++; a.asist += ok ? 1 : 0;
      a.ret   += r[iRet] === true ? 1 : 0;
      a.uni   += r[iUni] === true ? 1 : 0;
      a.ase   += r[iAse] === true ? 1 : 0;

      if (!ok) {
        a.streak++;
        if (a.streak > a.maxStreak) a.maxStreak = a.streak;
      } else {
        a.streak = 0;
      }
    });

    let cursoEnRiesgo = false;

    Object.entries(info).forEach(([id, a]) => {
      // Calculamos ausencias
      const aus = a.tot - a.asist;
      // Chequeamos cada ítem
      const checks = [
        { tipo: 'Aus', valor: aus },
        { tipo: 'Ret', valor: a.ret },
        { tipo: 'Uni', valor: a.uni },
        { tipo: 'Ase', valor: a.ase }
      ];
      let alerta = '';
      checks.forEach(ch => {
        if (ch.valor >= limites[ch.tipo].grave) {
          alerta = '🔴';
        } else if (ch.valor >= limites[ch.tipo].aviso && alerta !== '🔴') {
          alerta = '⚠️';
        }
      });

      if (alerta) {
        cursoEnRiesgo = true;
        const estInfo = estudiantesMap[id] || { nombre: id, curso: curso };
        const nombreEstudiante = estInfo.nombre;
        const cursoNombre = estInfo.curso || curso;

        // Crear detalle de alertas específicas
        const alertasDetalle = [];
        if (aus >= limites.Aus.grave) alertasDetalle.push('🔴 Ausencias críticas');
        else if (aus >= limites.Aus.aviso) alertasDetalle.push('⚠️ Ausencias');

        if (a.ret >= limites.Ret.grave) alertasDetalle.push('🔴 Retrasos críticos');
        else if (a.ret >= limites.Ret.aviso) alertasDetalle.push('⚠️ Retrasos');

        if (a.uni >= limites.Uni.grave) alertasDetalle.push('🔴 Sin uniforme crítico');
        else if (a.uni >= limites.Uni.aviso) alertasDetalle.push('⚠️ Sin uniforme');

        if (a.ase >= limites.Ase.grave) alertasDetalle.push('🔴 Sin aseo crítico');
        else if (a.ase >= limites.Ase.aviso) alertasDetalle.push('⚠️ Sin aseo');

        htmlRows.push(`<tr>
          <td>${cursoNombre}</td>
          <td><strong>${nombreEstudiante}</strong><br><small>${id}</small></td>
          <td>${((aus / a.tot) * 100).toFixed(1)}%</td>
          <td>${a.ret}</td><td>${a.uni}</td><td>${a.ase}</td>
          <td>${a.maxStreak}</td>
          <td>${alertasDetalle.join('<br>')}</td>
        </tr>`);
        sheetRows.push([
          cursoNombre, `${nombreEstudiante} (${id})`, a.tot, a.asist,
          ((aus / a.tot) * 100).toFixed(1) + '%',
          a.ret, a.uni, a.ase, a.maxStreak, alerta
        ]);
      }
    });

    if (cursoEnRiesgo) {
      reporteAsistenciaAvanzada_core(curso, dISO, hISO);
      const rep = ss.getSheetByName('Reporte_Asistencia_Av');
      const url = ss.getUrl()
        .replace(/edit$/, 'export?format=pdf&gid=' + rep.getSheetId());
      try {
        const resp = UrlFetchApp.fetch(url, {
          headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
          muteHttpExceptions: true
        });
        if (resp.getResponseCode() === 200) {
          blobsPDF.push(resp.getBlob().setName(`Asistencia_${curso}_${hISO}.pdf`));
        }
      } catch (e) { Logger.log(e); }
    }
  });

  if (!htmlRows.length) return;

  /* -------- Hoja consolidada diaria -------- */
  let dSheet = ss.getSheetByName('Reporte_Asistencia_Av_Diario')
              || ss.insertSheet('Reporte_Asistencia_Av_Diario');
  dSheet.clear();
  dSheet.appendRow([
    'Curso', 'Alumno', 'Total', 'Asist', '% Aus',
    'Retrasos', 'Sin uniforme', 'Sin aseo', 'Racha máx', 'Alerta'
  ]);
  dSheet.getRange(1, 1, 1, 10)
        .setFontWeight('bold').setBackground('#cfe2ff');
  dSheet.getRange(2, 1, sheetRows.length, 10).setValues(sheetRows);
  dSheet.autoResizeColumns(1, 10);

  /* -------- Correo -------- */
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto;">
      <h2 style="color: #dc3545;">🚨 Alerta de Asistencia - Alumnos en Riesgo</h2>
      <p style="background: #fff3cd; padding: 12px; border-left: 4px solid #ffc107; margin: 16px 0;">
        <strong>Análisis de los últimos ${DIAS_ANALISIS} días</strong><br>
        Se han detectado alumnos que superan los umbrales configurados de alertas.
      </p>

      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse; width: 100%; margin: 20px 0;">
        <thead style="background:#0d6efd; color: white;">
          <tr>
            <th>Curso</th>
            <th>Alumno</th>
            <th>% Ausencias</th>
            <th>Retrasos</th>
            <th>Sin uniforme</th>
            <th>Sin aseo</th>
            <th>Racha máx</th>
            <th>Tipo de Alerta</th>
          </tr>
        </thead>
        <tbody style="background: white;">${htmlRows.join('')}</tbody>
      </table>

      <div style="background: #e7f3ff; padding: 12px; border-radius: 4px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Leyenda de alertas:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>⚠️ <strong>Aviso:</strong> Se acerca al umbral configurado</li>
          <li>🔴 <strong>Crítico:</strong> Ha superado el umbral grave</li>
        </ul>
      </div>

      <p style="font-size: 14px; color: #666;">
        📎 <strong>PDF por curso</strong> incluidos como adjuntos<br>
        📊 <strong>Hoja consolidada:</strong> "Reporte_Asistencia_Av_Diario" en tu Google Sheet
      </p>
    </div>`;

  // Enviar email a los destinatarios configurados
  // Se pueden separar múltiples destinatarios con comas
  const destinatarios = cfg.Destinatarios.split(',').map(e => e.trim()).join(',');

  GmailApp.sendEmail(
    destinatarios,
    '🚨 Asistencia – alumnos en riesgo',
    'Correo en HTML',
    { htmlBody, attachments: blobsPDF }
  );

  Logger.log(`✅ Reporte enviado a: ${destinatarios}`);
}

/* ===== 3 · Ejecución manual desde menú ====================== */
function dailyAttendanceNotifier_manual() {
  const ui = SpreadsheetApp.getUi();
  if (ui.alert('¿Generar y enviar reportes AHORA?',
               ui.ButtonSet.OK_CANCEL) === ui.Button.OK) {
    dailyAttendanceNotifier();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast('Reporte enviado', 'Asistencia', 5);
  }
}

/* ===== 4 · Análisis automático al abrir (configurable) ====== */
/**
 * Verifica automáticamente la asistencia al abrir la hoja
 * Solo envía email si:
 * - La función está activada en configuración
 * - Hay alumnos en riesgo
 * - No se ha enviado email hoy (evita spam)
 */
function checkAttendanceOnOpen() {
  // ★ IMPORTANTE: onOpen tiene límite de 30 segundos, usar función asíncrona
  // Para evitar timeouts, programamos la ejecución con un pequeño delay
  try {
    // Leer configuración rápidamente
    const cfg = readConfig();

    // Verificar si está activado el análisis automático
    if (!cfg.AnalisisAutomaticoActivo) {
      Logger.log('📊 Análisis automático desactivado');
      return;
    }

    // Verificar si hay destinatarios configurados
    if (!cfg.Destinatarios || cfg.Destinatarios.trim() === '') {
      Logger.log('⚠️ No hay destinatarios configurados para análisis automático');
      return;
    }

    // Verificar si ya se envió email hoy
    const props = PropertiesService.getScriptProperties();
    const lastSent = props.getProperty('LAST_AUTO_ALERT_DATE');
    const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');

    if (lastSent === today) {
      Logger.log('📧 Ya se envió alerta automática hoy: ' + today);
      return;
    }

    Logger.log('🔍 Iniciando análisis automático de asistencia...');

    // ★ EJECUTAR EN SEGUNDO PLANO con trigger programado
    // Esto evita timeouts en onOpen que tiene límite de 30 segundos
    ScriptApp.newTrigger('executeAutoAnalysis')
      .timeBased()
      .after(5000) // Ejecutar después de 5 segundos
      .create();

    Logger.log('✅ Análisis programado para ejecutarse en 5 segundos');

  } catch (error) {
    Logger.log('❌ Error en checkAttendanceOnOpen: ' + error.toString());
  }
}

/**
 * Función auxiliar que ejecuta el análisis en segundo plano
 * Se llama desde un trigger programado para evitar timeouts
 */
function executeAutoAnalysis() {
  try {
    // Eliminar el trigger que nos llamó (para no acumular triggers)
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'executeAutoAnalysis') {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    Logger.log('🔍 Ejecutando análisis automático en segundo plano...');

    const cfg = readConfig();

    // Verificar de nuevo las condiciones (por si cambiaron)
    if (!cfg.AnalisisAutomaticoActivo) {
      Logger.log('📊 Análisis automático desactivado');
      return;
    }

    if (!cfg.Destinatarios || cfg.Destinatarios.trim() === '') {
      Logger.log('⚠️ No hay destinatarios configurados');
      return;
    }

    const props = PropertiesService.getScriptProperties();
    const lastSent = props.getProperty('LAST_AUTO_ALERT_DATE');
    const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');

    if (lastSent === today) {
      Logger.log('📧 Ya se envió alerta hoy: ' + today);
      return;
    }

    // Ejecutar análisis
    const resultado = analizeAttendanceRisk(cfg);

    // Solo enviar email si hay alumnos en riesgo
    if (resultado.estudiantesEnRiesgo > 0) {
      Logger.log(`📧 Enviando email: ${resultado.estudiantesEnRiesgo} estudiantes en riesgo`);

      dailyAttendanceNotifier();
      props.setProperty('LAST_AUTO_ALERT_DATE', today);

      Logger.log(`✅ Alerta automática enviada correctamente`);

      // Mostrar notificación en la hoja (si está abierta)
      try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        ss.toast(
          `Se detectaron ${resultado.estudiantesEnRiesgo} estudiantes en riesgo. Email enviado.`,
          '🚨 Alerta de Asistencia',
          10
        );
      } catch (e) {
        // Si no hay hoja activa, ignorar
        Logger.log('ℹ️ No se pudo mostrar toast (hoja no activa)');
      }
    } else {
      Logger.log('✅ No hay estudiantes en riesgo actualmente');
    }

  } catch (error) {
    Logger.log('❌ Error en executeAutoAnalysis: ' + error.toString());
    Logger.log('   Stack: ' + error.stack);
  }
}

/**
 * Analiza los datos de asistencia y devuelve estadísticas
 * sin enviar emails (función auxiliar)
 */
function analizeAttendanceRisk(cfg) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const { headers, values } = getSheetData(ss, 'RegistroAsistencia');

  const iEst = headers.indexOf('IDEstudiante');
  const iF   = headers.indexOf('Fecha');
  const iP   = headers.indexOf('Presente');
  const iRet = idx(headers, ['Retraso']);
  const iUni = idx(headers, ['SinUniforme', 'Falta uniforme', 'FaltaUniforme']);
  const iAse = idx(headers, ['SinAseo', 'Falta aseo', 'FaltaAseo']);

  if ([iEst, iF, iP, iRet, iUni, iAse].some(x => x < 0)) {
    return { estudiantesEnRiesgo: 0 };
  }

  // Ventana temporal
  const sesiones = cfg.SesionesPrevistas || DIAS_ANALISIS;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const desde = new Date(hoy); desde.setDate(hoy.getDate() - sesiones + 1);

  // Calcular límites
  const items = ['Aus', 'Ret', 'Uni', 'Ase'];
  const limites = {};
  items.forEach(it => {
    const p1 = (cfg[`${it}_%1`] || 0) / 100;
    const p2 = (cfg[`${it}_%2`] || 0) / 100;
    limites[it] = {
      aviso: Math.ceil(sesiones * p1),
      grave: Math.ceil(sesiones * p2)
    };
  });

  // Agrupar por estudiante
  const info = {};
  values.forEach(r => {
    const f = new Date(r[iF]);
    if (f < desde || f > hoy) return;

    const id = r[iEst];
    if (!id) return;

    const a = info[id] = info[id] || { tot: 0, asist: 0, ret: 0, uni: 0, ase: 0 };
    const ok = r[iP] === true;
    a.tot++; a.asist += ok ? 1 : 0;
    a.ret += r[iRet] === true ? 1 : 0;
    a.uni += r[iUni] === true ? 1 : 0;
    a.ase += r[iAse] === true ? 1 : 0;
  });

  // Contar estudiantes en riesgo
  let enRiesgo = 0;
  Object.entries(info).forEach(([id, a]) => {
    const aus = a.tot - a.asist;
    const checks = [
      { tipo: 'Aus', valor: aus },
      { tipo: 'Ret', valor: a.ret },
      { tipo: 'Uni', valor: a.uni },
      { tipo: 'Ase', valor: a.ase }
    ];

    let tieneAlerta = false;
    checks.forEach(ch => {
      if (ch.valor >= limites[ch.tipo].aviso) {
        tieneAlerta = true;
      }
    });

    if (tieneAlerta) enRiesgo++;
  });

  return { estudiantesEnRiesgo: enRiesgo };
}
