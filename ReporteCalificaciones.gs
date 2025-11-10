
/**
 * Reporte de calificaciones de UN SOLO alumno:
 * — número de evaluaciones, media, mínimo, máximo
 * — tabla con: Fecha, Instrumento, Curso, Nota
 */
function reporteCalificacionPorEstudiante() {
  const ui   = SpreadsheetApp.getUi();
  const resp = ui.prompt('Reporte calificaciones','Introduce el NombreExacto del estudiante:',ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton()!=ui.Button.OK) return;
  const alumno = resp.getResponseText().trim();

  const ss         = SpreadsheetApp.openById(SPREADSHEET_ID);
  const {headers,values} = getSheetData(ss,'CalificacionesDetalladas');

  const colEst      = headers.indexOf('NombreEstudiante');
  const colFecha    = headers.indexOf('FechaEvaluacion');
  const colInst     = headers.indexOf('NombreInstrumento');
  const colCurso    = headers.indexOf('CursoEvaluado');
  const colNota     = headers.indexOf('CalificacionTotalInstrumento');

  if ([colEst,colFecha,colInst,colCurso,colNota].some(i=>i<0)) {
    return ui.alert('Error: Columnas faltantes en CalificacionesDetalladas');
  }

  // Filtrar filas del alumno
  const filas = values.filter(r=>r[colEst]==alumno);
  if (!filas.length) {
    return ui.alert('No se encontraron calificaciones para ' + alumno);
  }

  // Cálculos de estadística
  const notas = filas.map(r=> parseFloat(r[colNota]) );
  const totalEval = notas.length;
  const suma       = notas.reduce((a,b)=>a+b,0);
  const media      = (suma/totalEval).toFixed(2);
  const minimo     = Math.min(...notas).toFixed(2);
  const maximo     = Math.max(...notas).toFixed(2);

  // Preparar hoja
  let hoja = ss.getSheetByName('Reporte_Calif_Estudiante');
  if (!hoja) hoja = ss.insertSheet('Reporte_Calif_Estudiante');
  hoja.clear();
  hoja.appendRow(['Reporte de calificaciones para:', alumno]);
  hoja.appendRow(['Total evals','Media','Mínimo','Máximo']);
  hoja.appendRow([totalEval, media, minimo, maximo]);
  hoja.appendRow([]);
  hoja.appendRow(['Fecha','Instrumento','Curso','Nota']);
  filas.forEach(r=>{
    hoja.appendRow([ r[colFecha], r[colInst], r[colCurso], r[colNota] ]);
  });

  // Gráfico: evolución de la nota a lo largo del tiempo
  const chart = hoja.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(hoja.getRange(4,1,totalEval,4)) // columnas A:D, filas con datos
    .setOption('title','Evolución de calificaciones')
    .setPosition(1,6,0,0)
    .build();
  hoja.insertChart(chart);

  ui.showSidebar(HtmlService
    .createHtmlOutput('✅ Reporte “Reporte_Calif_Estudiante” generado')
    .setWidth(250));
}

/**
 * Reporte de calificaciones de UN SOLO curso:
 * — número de evaluaciones por alumno y su media
 * — tabla con: Alumno, #Eval, Media
 */
function reporteCalificacionPorCurso() {
  const ui   = SpreadsheetApp.getUi();
  const resp = ui.prompt('Reporte calificaciones','Introduce el CursoEvaluado:',ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton()!=ui.Button.OK) return;
  const CursoEvaluado = resp.getResponseText().trim();

  const ss         = SpreadsheetApp.openById(SPREADSHEET_ID);
  const {headers,values} = getSheetData(ss,'CalificacionesDetalladas');

  const colEst   = headers.indexOf('NombreEstudiante');
  const colCurso = headers.indexOf('CursoEvaluado');
  const colNota  = headers.indexOf('CalificacionTotalInstrumento');

  if ([colEst,colCurso,colNota].some(i=>i<0)) {
    return ui.alert('Error: Columnas faltantes en CalificacionesDetalladas');
  }

  // Filtrar filas del curso
  const filasCurso = values.filter(r=>r[colCurso]==CursoEvaluado);
  if (!filasCurso.length) {
    return ui.alert('No hay calificaciones para el curso ' + CursoEvaluado);
  }

  // Agrupar por alumno
  const summary = {};
  filasCurso.forEach(r=>{
    const est = r[colEst];
    const nota= parseFloat(r[colNota]);
    if (!summary[est]) summary[est]={count:0,sum:0};
    summary[est].count++;
    summary[est].sum += nota;
  });

  // Preparar hoja
  let hoja = ss.getSheetByName('Reporte_Calif_Curso');
  if (!hoja) hoja = ss.insertSheet('Reporte_Calif_Curso');
  hoja.clear();
  hoja.appendRow(['Reporte de calificaciones para curso:', CursoEvaluado]);
  hoja.appendRow(['Alumno','#Evals','Media']);
  Object.keys(summary).forEach(est => {
    const rec = summary[est];
    const m   = (rec.sum/rec.count).toFixed(2);
    hoja.appendRow([est, rec.count, m]);
  });

  // Gráfico: medias por alumno
  const num = Object.keys(summary).length;
  const chart = hoja.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(hoja.getRange(3,1,num,3)) // A3:C(row)
    .setOption('title','Media de calificaciones por alumno')
    .setPosition(1,5,0,0)
    .build();
  hoja.insertChart(chart);

  ui.showSidebar(HtmlService
    .createHtmlOutput('✅ Reporte “Reporte_Calif_Curso” generado')
    .setWidth(250));
}

/**
 * Compara la media de dos alumnos y genera gráfico de barras.
 */
function compararCalificacionesEstudiantes() {
  const ui   = SpreadsheetApp.getUi();
  const r1   = ui.prompt('Comparar calificaciones','Primer estudiante (NombreExacto):',ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton()!=ui.Button.OK) return;
  const est1 = r1.getResponseText().trim();
  const r2   = ui.prompt('Comparar calificaciones','Segundo estudiante:',ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton()!=ui.Button.OK) return;
  const est2 = r2.getResponseText().trim();

  const ss         = SpreadsheetApp.openById(SPREADSHEET_ID);
  const {headers,values} = getSheetData(ss,'CalificacionesDetalladas');
  const colEst   = headers.indexOf('NombreEstudiante');
  const colNota  = headers.indexOf('CalificacionTotalInstrumento');

  // Función auxiliar
  function calcMedia(est) {
    const notas = values.filter(r=>r[colEst]==est).map(r=>parseFloat(r[colNota]));
    if (!notas.length) return null;
    const sum = notas.reduce((a,b)=>a+b,0);
    return sum / notas.length;
  }

  const m1 = calcMedia(est1), m2 = calcMedia(est2);
  if (m1===null||m2===null) {
    return ui.alert('Uno de los estudiantes no tiene calificaciones.');
  }

  // Hoja de salida
  let hoja = ss.getSheetByName('Comparativa_Calif_Est');
  if (!hoja) hoja = ss.insertSheet('Comparativa_Calif_Est');
  hoja.clear();
  hoja.appendRow(['Estudiante','Media']);
  hoja.appendRow([est1, m1.toFixed(2)]);
  hoja.appendRow([est2, m2.toFixed(2)]);

  // Gráfico de barras
  const chart = hoja.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(hoja.getRange('A1:B3'))
    .setOption('title','Comparativa de medias entre estudiantes')
    .setPosition(1,4,0,0)
    .build();
  hoja.insertChart(chart);

  ui.showSidebar(HtmlService
    .createHtmlOutput('✅ Comparativa generada en “Comparativa_Calif_Est”')
    .setWidth(250));
}

/**
 * Compara la media de dos cursos y genera gráfico de barras.
 */
function compararCalificacionesCursos() {
  const ui   = SpreadsheetApp.getUi();
  const r1   = ui.prompt('Comparar calificaciones','Primer CursoEvaluado:',ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton()!=ui.Button.OK) return;
  const cur1 = r1.getResponseText().trim();
  const r2   = ui.prompt('Comparar calificaciones','Segundo CursoEvaluado:',ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton()!=ui.Button.OK) return;
  const cur2 = r2.getResponseText().trim();

  const ss         = SpreadsheetApp.openById(SPREADSHEET_ID);
  const {headers,values} = getSheetData(ss,'CalificacionesDetalladas');
  const colCur   = headers.indexOf('CursoEvaluado');
  const colNota  = headers.indexOf('CalificacionTotalInstrumento');

  function calcMediaCurso(cur) {
    const notas = values.filter(r=>r[colCur]==cur).map(r=>parseFloat(r[colNota]));
    if (!notas.length) return null;
    const sum = notas.reduce((a,b)=>a+b,0);
    return sum / notas.length;
  }

  const m1 = calcMediaCurso(cur1), m2 = calcMediaCurso(cur2);
  if (m1===null||m2===null) {
    return ui.alert('Uno de los cursos no tiene calificaciones.');
  }

  let hoja = ss.getSheetByName('Comparativa_Calif_Cursos');
  if (!hoja) hoja = ss.insertSheet('Comparativa_Calif_Cursos');
  hoja.clear();
  hoja.appendRow(['CursoEvaluado','Media']);
  hoja.appendRow([cur1, m1.toFixed(2)]);
  hoja.appendRow([cur2, m2.toFixed(2)]);

  const chart = hoja.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(hoja.getRange('A1:B3'))
    .setOption('title','Comparativa de medias entre cursos')
    .setPosition(1,4,0,0)
    .build();
  hoja.insertChart(chart);

  ui.showSidebar(HtmlService
    .createHtmlOutput('✅ Comparativa generada en “Comparativa_Calif_Cursos”')
    .setWidth(250));
}
