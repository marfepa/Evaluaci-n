
/**
 * Reporte individual por alumno (igual que antes).
 */
function reportePorEstudiante() {
  const ui   = SpreadsheetApp.getUi();
  const resp = ui.prompt('Reporte por alumno', 'Introduce el IDEstudiante:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() != ui.Button.OK) return;
  const alumno = resp.getResponseText().trim();

  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const { headers, values } = getSheetData(ss, 'RegistroAsistencia');
  const colID    = headers.indexOf('IDEstudiante');
  const colFecha = headers.indexOf('Fecha');
  const colCurso = headers.indexOf('CursoID');
  const colPres  = headers.indexOf('Presente');

  const filas = values.filter(r => r[colID] == alumno);
  if (!filas.length) {
    return ui.alert('No hay registros para ' + alumno);
  }

  // Cálculos
  const total  = filas.length;
  const asist  = filas.filter(r => r[colPres] === true).length;
  const faltas = total - asist;
  const pct    = (asist / total * 100).toFixed(1) + '%';

  // Hoja de salida
  let hoja = ss.getSheetByName('Reporte_Asistencia');
  if (!hoja) hoja = ss.insertSheet('Reporte_Asistencia');
  hoja.clear();

  // Preparar todos los datos para escritura batch
  const dataRows = [
    ['Reporte de alumno:', alumno],
    ['Total clases', 'Asistencias', 'Faltas', '% Asistencia'],
    [total, asist, faltas, pct],
    [],
    ['Fecha', 'CursoID', 'Presente']
  ];

  // Agregar las filas de detalle
  filas.forEach(r => {
    dataRows.push([r[colFecha], r[colCurso], r[colPres] ? '✅' : '❌']);
  });

  // Escribir todo de una vez
  hoja.getRange(1, 1, dataRows.length, 3).setValues(dataRows);

  ui.showSidebar(
    HtmlService.createHtmlOutput('✅ Reporte generado en hoja “Reporte_Asistencia”')
      .setWidth(250)
  );
}

/**
 * Reporte individual por curso (igual que antes).
 */
function reportePorCurso() {
  const ui   = SpreadsheetApp.getUi();
  const resp = ui.prompt('Reporte por curso', 'Introduce el CursoID:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() != ui.Button.OK) return;
  const cursoID = resp.getResponseText().trim();

  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const { headers, values } = getSheetData(ss, 'RegistroAsistencia');
  const colID    = headers.indexOf('IDEstudiante');
  const colCurso = headers.indexOf('CursoID');
  const colPres  = headers.indexOf('Presente');

  const filasCurso = values.filter(r => r[colCurso] == cursoID);
  if (!filasCurso.length) {
    return ui.alert('No hay registros para curso ' + cursoID);
  }

  // Agrupar por estudiante
  const info = {};
  filasCurso.forEach(r => {
    const est = r[colID];
    if (!info[est]) info[est] = { total: 0, asist: 0 };
    info[est].total++;
    if (r[colPres] === true) info[est].asist++;
  });

  let hoja = ss.getSheetByName('Reporte_Asistencia');
  if (!hoja) hoja = ss.insertSheet('Reporte_Asistencia');
  hoja.clear();

  // Preparar todos los datos para escritura batch
  const dataRows = [
    ['Reporte de curso:', cursoID],
    ['ID Estudiante', 'Total', 'Asistencias', '% Asistencia']
  ];

  // Agregar datos de cada estudiante
  Object.keys(info).forEach(est => {
    const rec = info[est];
    const pct = (rec.asist / rec.total * 100).toFixed(1) + '%';
    dataRows.push([est, rec.total, rec.asist, pct]);
  });

  // Escribir todo de una vez
  hoja.getRange(1, 1, dataRows.length, 4).setValues(dataRows);

  ui.showSidebar(
    HtmlService.createHtmlOutput('✅ Reporte generado en hoja “Reporte_Asistencia”')
      .setWidth(250)
  );
}

/**
 * Compara dos alumnos: totales, asistencias, faltas y %,
 * y añade un gráfico de barras con sus % de asistencia.
 */
function compararEstudiantes() {
  const ui   = SpreadsheetApp.getUi();
  const r1 = ui.prompt('Comparar estudiantes', 'Introduce el primer IDEstudiante:', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() != ui.Button.OK) return;
  const est1 = r1.getResponseText().trim();

  const r2 = ui.prompt('Comparar estudiantes', 'Introduce el segundo IDEstudiante:', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() != ui.Button.OK) return;
  const est2 = r2.getResponseText().trim();

  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const { headers, values } = getSheetData(ss, 'RegistroAsistencia');
  const colID   = headers.indexOf('IDEstudiante');
  const colPres = headers.indexOf('Presente');

  // Datos de cada alumno
  const calc = id => {
    const f = values.filter(r => r[colID] == id);
    const tot = f.length;
    const att = f.filter(r => r[colPres] === true).length;
    const abs = tot - att;
    const pct = tot ? (att / tot * 100).toFixed(1) : '0.0';
    return [id, tot, att, abs, pct];
  };
  const data1 = calc(est1);
  const data2 = calc(est2);

  // Hoja de salida
  let hoja = ss.getSheetByName('Comparativa_Estudiantes');
  if (!hoja) hoja = ss.insertSheet('Comparativa_Estudiantes');
  hoja.clear();

  // Escribir datos en batch
  const dataRows = [
    ['IDEstudiante', 'Total', 'Asistencias', 'Faltas', '% Asistencia'],
    data1,
    data2
  ];
  hoja.getRange(1, 1, dataRows.length, 5).setValues(dataRows);

  // Gráfico de barras
  const chart = hoja.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(hoja.getRange('A1:E3'))       // datos + encabezado
    .setOption('title', 'Comparativa de % Asistencia')
    .setOption('series', {
      4: { targetAxisIndex: 0 }             // serie del % (col E)
    })
    .setPosition(1, 7, 0, 0)                // col G fila 1
    .build();
  hoja.insertChart(chart);

  ui.showSidebar(
    HtmlService.createHtmlOutput('✅ Comparativa generada en hoja “Comparativa_Estudiantes”')
      .setWidth(250)
  );
}

/**
 * Compara dos cursos: totales, asistencias, faltas y %,
 * y añade un gráfico de barras con sus % de asistencia.
 */
function compararCursos() {
  const ui   = SpreadsheetApp.getUi();
  const r1 = ui.prompt('Comparar cursos', 'Introduce el primer CursoID:', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() != ui.Button.OK) return;
  const cur1 = r1.getResponseText().trim();

  const r2 = ui.prompt('Comparar cursos', 'Introduce el segundo CursoID:', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() != ui.Button.OK) return;
  const cur2 = r2.getResponseText().trim();

  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const { headers, values } = getSheetData(ss, 'RegistroAsistencia');
  const colCurso = headers.indexOf('CursoID');
  const colPres  = headers.indexOf('Presente');

  const calc = id => {
    const f = values.filter(r => r[colCurso] == id);
    const tot = f.length;
    const att = f.filter(r => r[colPres] === true).length;
    const abs = tot - att;
    const pct = tot ? (att / tot * 100).toFixed(1) : '0.0';
    return [id, tot, att, abs, pct];
  };
  const d1 = calc(cur1);
  const d2 = calc(cur2);

  let hoja = ss.getSheetByName('Comparativa_Cursos');
  if (!hoja) hoja = ss.insertSheet('Comparativa_Cursos');
  hoja.clear();

  // Escribir datos en batch
  const dataRows = [
    ['CursoID', 'Total', 'Asistencias', 'Faltas', '% Asistencia'],
    d1,
    d2
  ];
  hoja.getRange(1, 1, dataRows.length, 5).setValues(dataRows);

  const chart = hoja.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(hoja.getRange('A1:E3'))
    .setOption('title', 'Comparativa de % Asistencia por Curso')
    .setPosition(1, 7, 0, 0)
    .build();
  hoja.insertChart(chart);

  ui.showSidebar(
    HtmlService.createHtmlOutput('✅ Comparativa generada en hoja “Comparativa_Cursos”')
      .setWidth(250)
  );
}
