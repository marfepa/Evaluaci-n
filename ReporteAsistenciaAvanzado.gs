/********************************************************************
 *  REPORTE AVANZADO DE ASISTENCIA  –  por curso y rango de fechas  *
 *  Genera:
 *    • Hoja “Reporte_Asistencia_Av”  (métricas + alertas, formateada)
 *    • Hoja “Heatmap_Asistencia”     (formato condicional)
 ********************************************************************/

/* ---------- diálogo selector de fechas ---------- */
function reporteAsistenciaAvanzada_UI() {
  const html = HtmlService.createHtmlOutputFromFile('dialog_rango')
               .setWidth(300).setHeight(180);
  SpreadsheetApp.getUi()
    .showModalDialog(html, 'Rango de fechas – Reporte avanzado');
}

/* ---------- lógica principal ---------- */
function reporteAsistenciaAvanzada_core(cursoID, desdeISO, hastaISO) {

  /* — 1 — Fechas */
  const desde = new Date(desdeISO);
  const hasta = new Date(hastaISO); hasta.setHours(23,59,59);

  /* — 2 — Datos */
  const ss                  = SpreadsheetApp.openById(SPREADSHEET_ID);
  const { headers, values } = getSheetData(ss,'RegistroAsistencia');

  const iEst = headers.indexOf('IDEstudiante');
  const iCur = idx(headers,['CursoID','Curso','CursoEvaluado']);
  const iF   = headers.indexOf('Fecha');
  const iP   = headers.indexOf('Presente');
  const iRet = idx(headers,['Retraso']);
  const iUni = idx(headers,['SinUniforme','Falta uniforme','FaltaUniforme']);
  const iAse = idx(headers,['SinAseo','Falta aseo','FaltaAseo']);

  if ([iEst,iCur,iF,iP,iRet,iUni,iAse].some(i=>i<0))
    throw new Error('Faltan columnas: Presente, Retraso, Falta uniforme o Falta aseo');

  /* — 3 — Filtrado */
  const filas = values.filter(r=>{
    const f = new Date(r[iF]);
    return r[iCur] === cursoID && f >= desde && f <= hasta;
  });
  if (!filas.length) {
    SpreadsheetApp.getUi().alert(
      `No hay registros para ${cursoID} entre ${desdeISO} y ${hastaISO}`);
    return;
  }

  /* — 4 — Métricas */
  const alumnos = {};  const fechas = new Set();
  filas.forEach(r=>{
    const id = r[iEst]; if (!id) return;
    const f  = new Date(r[iF]);
    const key= Utilities.formatDate(f, Session.getScriptTimeZone(),'yyyy-MM-dd');
    fechas.add(key);

    alumnos[id] = alumnos[id] || {
      total:0, asist:0, retraso:0, uniforme:0, aseo:0,
      aus:0, maxStreak:0, lastF:false, marks:{}
    };
    const a = alumnos[id];
    const ok = r[iP]===true;

    a.total++;
    a.asist   += ok ? 1 : 0;
    a.retraso += r[iRet]===true ? 1 : 0;
    a.uniforme+= r[iUni]===true ? 1 : 0;
    a.aseo    += r[iAse]===true ? 1 : 0;
    a.marks[key]= ok?1:0;

    if (!ok){
      a.aus = a.lastF ? a.aus+1 : 1;
      if (a.aus > a.maxStreak) a.maxStreak = a.aus;
      a.lastF = true;
    } else { a.aus=0; a.lastF=false; }
  });

  /********************* 5 · Hoja REPORTE ************************/
  let rep = ss.getSheetByName('Reporte_Asistencia_Av')
           || ss.insertSheet('Reporte_Asistencia_Av');
  rep.clear();

  const titulo = [`Asistencia avanzada – CursoID ${cursoID}`,
    `(del ${Utilities.formatDate(desde,'GMT','dd/MM/yyyy')} al `
  +  `${Utilities.formatDate(hasta,'GMT','dd/MM/yyyy')})`];
  rep.appendRow(titulo);
  rep.appendRow(['Alumno','Total','Asist','%','Retrasos',
                 'Sin uniforme','Sin aseo','Racha máx faltas','🚨 Riesgo?']);

  Object.keys(alumnos).sort().forEach(id=>{
    const m = alumnos[id]; const pct = m.asist / m.total;
    rep.appendRow([id,m.total,m.asist,(pct*100).toFixed(1)+'%',
      m.retraso,m.uniforme,m.aseo,m.maxStreak, pct<0.8?'⚠️':'']);
  });

/* —— ESTILOS ——  (sin merge) */
  rep.getRange(1,1,1,9)           // fila-título
   .setFontSize(16)
   .setFontWeight('bold')
   .setBackground('#e0f0ff');

  rep.getRange(2,1,1,9)           // cabecera de tabla
   .setFontWeight('bold')
   .setBackground('#cfe2ff');

  rep.autoResizeColumns(1,9);

  rep.getRange(2,1, rep.getLastRow()-1,9)   // cuerpo
   .setBorder(true,true,true,true,true,true,
              'black',SpreadsheetApp.BorderStyle.SOLID);

  /********************* 6 · Hoja HEAT-MAP ***********************/
  const fechasOrd = Array.from(fechas).sort();
  let heat = ss.getSheetByName('Heatmap_Asistencia')
             || ss.insertSheet('Heatmap_Asistencia');
  heat.clear();
  heat.appendRow(['Alumno / Fecha', ...fechasOrd]);

  Object.keys(alumnos).sort().forEach(id=>{
    const row=[id]; fechasOrd.forEach(f=>row.push(alumnos[id].marks[f] ?? ''));
    heat.appendRow(row);
  });

  heat.setFrozenRows(1);
  heat.setFrozenColumns(1);
  heat.autoResizeColumns(1,fechasOrd.length+1);

  const datos = heat.getRange(2,2, heat.getLastRow()-1, fechasOrd.length);
  const rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('0').setBackground('#ffcccc')
      .setRanges([datos]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('1').setBackground('#ccffcc')
      .setRanges([datos]).build(),
    SpreadsheetApp.newConditionalFormatRule()                 // vacío
      .whenFormulaSatisfied('=ISBLANK(B2)')
      .setBackground('#eeeeee')
      .setRanges([datos]).build()
  ];
  heat.setConditionalFormatRules(rules);

  /* —— toast —— */
  toastOK('Reporte avanzado generado');
}

/* ---------- helper toast ---------- */
function toastOK(msg){
  SpreadsheetApp.getActiveSpreadsheet()
    .toast(msg,'✅ Listo',5);
}