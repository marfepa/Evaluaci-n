/**
 * ========================================================================
 * REPORTES DE ASISTENCIA - VERSIÓN OPTIMIZADA
 * ========================================================================
 *
 * Versión mejorada de ReportesAsistencia.gs con las siguientes optimizaciones:
 * ✅ Carga de datos en paralelo y por lotes
 * ✅ Uso de índices para búsquedas O(1)
 * ✅ Escritura por lotes (batch write)
 * ✅ Caché de datos
 * ✅ Mejor manejo de errores
 * ✅ Logging optimizado
 *
 * MEJORA ESPERADA: 3-5x más rápido que la versión original
 * ========================================================================
 */

/**
 * Reporte individual por alumno (OPTIMIZADO)
 * Mejora: Carga de datos con caché + escritura por lotes
 */
function reportePorEstudianteOptimizado() {
  Log.time('reportePorEstudiante');

  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt('Reporte por alumno', 'Introduce el IDEstudiante:', ui.ButtonSet.OK_CANCEL);

  if (resp.getSelectedButton() != ui.Button.OK) {
    Log.debug('User cancelled report');
    return;
  }

  const alumno = resp.getResponseText().trim();
  Log.info(`Generating report for student: ${alumno}`);

  try {
    // Cargar datos optimizados con índices
    const data = loadAttendanceReportData();

    // Buscar estudiante en índice O(1) en vez de buscar en array O(n)
    const estudianteInfo = data.estudiantesIndex.get(alumno);
    if (!estudianteInfo) {
      Log.warn(`Student not found: ${alumno}`);
      ui.alert(`No se encontró el estudiante con ID: ${alumno}`);
      return;
    }

    // Obtener registros de asistencia del estudiante O(1)
    const filas = data.asistenciaPorEstudiante.get(alumno) || [];

    if (filas.length === 0) {
      Log.warn(`No attendance records for: ${alumno}`);
      ui.alert('No hay registros de asistencia para ' + alumno);
      return;
    }

    // Cálculos optimizados
    const total = filas.length;
    const asist = filas.filter(r => r.Presente === true).length;
    const faltas = total - asist;
    const pct = (asist / total * 100).toFixed(1) + '%';

    Log.debug(`Stats: Total=${total}, Present=${asist}, Absent=${faltas}, %=${pct}`);

    // Obtener spreadsheet y preparar hoja
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const hoja = getOrCreateSheet(ss, 'Reporte_Asistencia', true);

    // Preparar TODOS los datos para escritura por lotes
    const dataRows = [
      ['Reporte de alumno:', estudianteInfo.NombreEstudiante || alumno],
      ['ID:', alumno],
      [],
      ['Total clases', 'Asistencias', 'Faltas', '% Asistencia'],
      [total, asist, faltas, pct],
      [],
      ['Fecha', 'CursoID', 'Presente', 'Retraso', 'Sin Uniforme', 'Sin Aseo']
    ];

    // Agregar las filas de detalle
    filas.forEach(r => {
      dataRows.push([
        r.Fecha || '-',
        r.CursoID || '-',
        r.Presente ? '✅ Presente' : '❌ Ausente',
        r.Retraso ? '⚠️ Sí' : '-',
        r.SinUniforme ? '⚠️ Sí' : '-',
        r.SinAseo ? '⚠️ Sí' : '-'
      ]);
    });

    // Escribir TODO de una vez (mega optimización)
    writeDataBatch(hoja, dataRows, 1, 1);

    // Formatear encabezados
    hoja.getRange(1, 1, 1, 2).setFontWeight('bold').setFontSize(12);
    hoja.getRange(4, 1, 1, 4).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
    hoja.getRange(7, 1, 1, 6).setFontWeight('bold').setBackground('#34a853').setFontColor('white');

    // Auto-ajustar columnas
    hoja.autoResizeColumns(1, 6);

    const duration = Log.timeEnd('reportePorEstudiante');
    Log.perf('Generated student report', duration);

    ui.showSidebar(
      HtmlService.createHtmlOutput(`
        <div style="padding: 20px; font-family: Arial;">
          <h3 style="color: #34a853;">✅ Reporte generado</h3>
          <p><strong>${estudianteInfo.NombreEstudiante || alumno}</strong></p>
          <p>Total: ${total} clases</p>
          <p>Asistencias: ${asist} (${pct})</p>
          <p><small>Tiempo: ${duration}ms</small></p>
        </div>
      `).setWidth(300)
    );

    // Invalidar caché de estadísticas
    invalidateCache('statistics_dashboard');

  } catch (error) {
    Log.error('Error generating student report:', error.message, error.stack);
    ui.alert('Error al generar el reporte: ' + error.message);
  }
}

/**
 * Reporte individual por curso (OPTIMIZADO)
 */
function reportePorCursoOptimizado() {
  Log.time('reportePorCurso');

  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt('Reporte por curso', 'Introduce el CursoID:', ui.ButtonSet.OK_CANCEL);

  if (resp.getSelectedButton() != ui.Button.OK) {
    Log.debug('User cancelled report');
    return;
  }

  const cursoID = resp.getResponseText().trim();
  Log.info(`Generating report for course: ${cursoID}`);

  try {
    // Cargar datos optimizados
    const data = loadAttendanceReportData();

    // Obtener registros del curso O(1)
    const filasCurso = data.asistenciaPorCurso.get(cursoID) || [];

    if (filasCurso.length === 0) {
      Log.warn(`No attendance records for course: ${cursoID}`);
      ui.alert('No hay registros de asistencia para el curso ' + cursoID);
      return;
    }

    // Agrupar y agregar por estudiante (versión optimizada)
    const info = groupAndAggregate(filasCurso, 'IDEstudiante', {
      total: { field: 'Presente', func: 'count' },
      asist: { field: 'Presente', func: 'sum' }
    });

    // Enriquecer con nombres de estudiantes
    info.forEach(rec => {
      const est = data.estudiantesIndex.get(rec.IDEstudiante);
      rec.Nombre = est ? (est.NombreEstudiante || rec.IDEstudiante) : rec.IDEstudiante;
      rec.pct = ((rec.asist / rec.total) * 100).toFixed(1) + '%';
      rec.faltas = rec.total - rec.asist;
    });

    // Ordenar por % de asistencia (peores primero)
    info.sort((a, b) => a.asist / a.total - b.asist / b.total);

    // Preparar hoja
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const hoja = getOrCreateSheet(ss, 'Reporte_Asistencia', true);

    // Preparar datos para escritura por lotes
    const dataRows = [
      ['Reporte de curso:', cursoID],
      ['Total de estudiantes:', info.length],
      [],
      ['Estudiante', 'ID', 'Total Clases', 'Asistencias', 'Faltas', '% Asistencia', 'Estado']
    ];

    // Agregar datos de cada estudiante
    info.forEach(rec => {
      let estado = '✅ Bueno';
      const pctNum = parseFloat(rec.pct);

      if (pctNum < 70) {
        estado = '🔴 Crítico';
      } else if (pctNum < 85) {
        estado = '⚠️ Alerta';
      }

      dataRows.push([
        rec.Nombre,
        rec.IDEstudiante,
        rec.total,
        rec.asist,
        rec.faltas,
        rec.pct,
        estado
      ]);
    });

    // Escribir todo de una vez
    writeDataBatch(hoja, dataRows, 1, 1);

    // Formatear
    hoja.getRange(1, 1, 1, 2).setFontWeight('bold').setFontSize(12);
    hoja.getRange(4, 1, 1, 7).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');

    // Colorear filas según estado
    for (let i = 0; i < info.length; i++) {
      const row = 5 + i; // Fila en la hoja (1-indexed)
      const pctNum = parseFloat(info[i].pct);

      if (pctNum < 70) {
        hoja.getRange(row, 1, 1, 7).setBackground('#f4cccc'); // Rojo claro
      } else if (pctNum < 85) {
        hoja.getRange(row, 1, 1, 7).setBackground('#fff2cc'); // Amarillo claro
      }
    }

    hoja.autoResizeColumns(1, 7);

    const duration = Log.timeEnd('reportePorCurso');
    Log.perf('Generated course report', duration);

    // Calcular estadísticas del curso
    const totalClases = info.reduce((sum, r) => sum + r.total, 0) / info.length;
    const promedioAsistencia = info.reduce((sum, r) => sum + r.asist / r.total, 0) / info.length * 100;
    const enRiesgo = info.filter(r => parseFloat(r.pct) < 85).length;

    ui.showSidebar(
      HtmlService.createHtmlOutput(`
        <div style="padding: 20px; font-family: Arial;">
          <h3 style="color: #34a853;">✅ Reporte generado</h3>
          <p><strong>Curso: ${cursoID}</strong></p>
          <p>Estudiantes: ${info.length}</p>
          <p>% Asistencia promedio: ${promedioAsistencia.toFixed(1)}%</p>
          <p>En riesgo (&lt;85%): ${enRiesgo}</p>
          <p><small>Tiempo: ${duration}ms</small></p>
        </div>
      `).setWidth(300)
    );

    invalidateCache('statistics_dashboard');

  } catch (error) {
    Log.error('Error generating course report:', error.message, error.stack);
    ui.alert('Error al generar el reporte: ' + error.message);
  }
}

/**
 * Comparar dos estudiantes (OPTIMIZADO con gráfico mejorado)
 */
function compararEstudiantesOptimizado() {
  Log.time('compararEstudiantes');

  const ui = SpreadsheetApp.getUi();

  const r1 = ui.prompt('Comparar estudiantes', 'Introduce el primer IDEstudiante:', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() != ui.Button.OK) return;
  const est1 = r1.getResponseText().trim();

  const r2 = ui.prompt('Comparar estudiantes', 'Introduce el segundo IDEstudiante:', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() != ui.Button.OK) return;
  const est2 = r2.getResponseText().trim();

  Log.info(`Comparing students: ${est1} vs ${est2}`);

  try {
    // Cargar datos optimizados
    const data = loadAttendanceReportData();

    // Función helper para calcular estadísticas
    const calcStats = (id) => {
      const est = data.estudiantesIndex.get(id);
      const nombre = est ? (est.NombreEstudiante || id) : id;
      const registros = data.asistenciaPorEstudiante.get(id) || [];

      const tot = registros.length;
      const att = registros.filter(r => r.Presente === true).length;
      const abs = tot - att;
      const pct = tot ? ((att / tot) * 100).toFixed(1) : '0.0';

      // Calcular racha de ausencias
      let maxRacha = 0;
      let racha = 0;
      registros.forEach(r => {
        if (!r.Presente) {
          racha++;
          maxRacha = Math.max(maxRacha, racha);
        } else {
          racha = 0;
        }
      });

      return {
        id,
        nombre,
        total: tot,
        asist: att,
        faltas: abs,
        pct: parseFloat(pct),
        pctStr: pct + '%',
        maxRacha
      };
    };

    const data1 = calcStats(est1);
    const data2 = calcStats(est2);

    if (data1.total === 0 && data2.total === 0) {
      ui.alert('No hay datos de asistencia para ninguno de los estudiantes');
      return;
    }

    // Preparar hoja
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const hoja = getOrCreateSheet(ss, 'Comparativa_Estudiantes', true);

    // Preparar datos para escritura por lotes
    const dataRows = [
      ['Comparativa de Estudiantes'],
      [],
      ['Métrica', data1.nombre, data2.nombre, 'Diferencia'],
      ['Total Clases', data1.total, data2.total, Math.abs(data1.total - data2.total)],
      ['Asistencias', data1.asist, data2.asist, Math.abs(data1.asist - data2.asist)],
      ['Faltas', data1.faltas, data2.faltas, Math.abs(data1.faltas - data2.faltas)],
      ['% Asistencia', data1.pctStr, data2.pctStr, Math.abs(data1.pct - data2.pct).toFixed(1) + '%'],
      ['Racha máx ausencias', data1.maxRacha, data2.maxRacha, Math.abs(data1.maxRacha - data2.maxRacha)],
      [],
      ['Análisis'],
      ['Mejor asistencia:', data1.pct >= data2.pct ? data1.nombre : data2.nombre, '', ''],
      ['Diferencia:', Math.abs(data1.pct - data2.pct).toFixed(1) + ' puntos porcentuales', '', '']
    ];

    // Escribir datos
    writeDataBatch(hoja, dataRows, 1, 1);

    // Formatear
    hoja.getRange(1, 1, 1, 4).merge().setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center');
    hoja.getRange(3, 1, 1, 4).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
    hoja.getRange(10, 1, 1, 4).setFontWeight('bold').setBackground('#34a853').setFontColor('white');

    // Crear gráfico mejorado
    const chart = hoja.newChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(hoja.getRange(3, 1, 5, 3)) // Incluir encabezados y datos
      .setPosition(14, 1, 0, 0) // Posición del gráfico
      .setOption('title', 'Comparativa de Asistencia')
      .setOption('width', 600)
      .setOption('height', 400)
      .setOption('legend', { position: 'bottom' })
      .setOption('hAxis', { title: 'Métrica' })
      .setOption('vAxis', { title: 'Valor' })
      .setOption('colors', ['#4285f4', '#ea4335'])
      .build();

    hoja.insertChart(chart);

    hoja.autoResizeColumns(1, 4);

    const duration = Log.timeEnd('compararEstudiantes');
    Log.perf('Generated student comparison', duration);

    ui.showSidebar(
      HtmlService.createHtmlOutput(`
        <div style="padding: 20px; font-family: Arial;">
          <h3 style="color: #34a853;">✅ Comparativa generada</h3>
          <p><strong>${data1.nombre}</strong><br>${data1.pctStr} asistencia</p>
          <p><strong>${data2.nombre}</strong><br>${data2.pctStr} asistencia</p>
          <p>Diferencia: ${Math.abs(data1.pct - data2.pct).toFixed(1)} puntos</p>
          <p><small>Tiempo: ${duration}ms</small></p>
        </div>
      `).setWidth(300)
    );

  } catch (error) {
    Log.error('Error comparing students:', error.message, error.stack);
    ui.alert('Error al generar la comparativa: ' + error.message);
  }
}

/**
 * Comparar dos cursos (OPTIMIZADO)
 */
function compararCursosOptimizado() {
  Log.time('compararCursos');

  const ui = SpreadsheetApp.getUi();

  const r1 = ui.prompt('Comparar cursos', 'Introduce el primer CursoID:', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() != ui.Button.OK) return;
  const cur1 = r1.getResponseText().trim();

  const r2 = ui.prompt('Comparar cursos', 'Introduce el segundo CursoID:', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() != ui.Button.OK) return;
  const cur2 = r2.getResponseText().trim();

  Log.info(`Comparing courses: ${cur1} vs ${cur2}`);

  try {
    // Cargar datos
    const data = loadAttendanceReportData();

    // Calcular estadísticas por curso
    const calcCurso = (id) => {
      const registros = data.asistenciaPorCurso.get(id) || [];
      const tot = registros.length;
      const att = registros.filter(r => r.Presente === true).length;
      const abs = tot - att;
      const pct = tot ? ((att / tot) * 100).toFixed(1) : '0.0';

      // Contar estudiantes únicos
      const estudiantes = new Set(registros.map(r => r.IDEstudiante)).size;

      return {
        id,
        total: tot,
        asist: att,
        faltas: abs,
        pct: parseFloat(pct),
        pctStr: pct + '%',
        estudiantes
      };
    };

    const d1 = calcCurso(cur1);
    const d2 = calcCurso(cur2);

    if (d1.total === 0 && d2.total === 0) {
      ui.alert('No hay datos de asistencia para ninguno de los cursos');
      return;
    }

    // Preparar hoja
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const hoja = getOrCreateSheet(ss, 'Comparativa_Cursos', true);

    const dataRows = [
      ['Comparativa de Cursos'],
      [],
      ['Métrica', cur1, cur2, 'Diferencia'],
      ['Estudiantes', d1.estudiantes, d2.estudiantes, Math.abs(d1.estudiantes - d2.estudiantes)],
      ['Total Registros', d1.total, d2.total, Math.abs(d1.total - d2.total)],
      ['Asistencias', d1.asist, d2.asist, Math.abs(d1.asist - d2.asist)],
      ['Faltas', d1.faltas, d2.faltas, Math.abs(d1.faltas - d2.faltas)],
      ['% Asistencia', d1.pctStr, d2.pctStr, Math.abs(d1.pct - d2.pct).toFixed(1) + '%'],
      [],
      ['Análisis'],
      ['Mejor asistencia:', d1.pct >= d2.pct ? cur1 : cur2, '', '']
    ];

    writeDataBatch(hoja, dataRows, 1, 1);

    // Formatear
    hoja.getRange(1, 1, 1, 4).merge().setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center');
    hoja.getRange(3, 1, 1, 4).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
    hoja.getRange(10, 1, 1, 4).setFontWeight('bold').setBackground('#34a853').setFontColor('white');

    // Gráfico
    const chart = hoja.newChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(hoja.getRange(3, 1, 6, 3))
      .setPosition(13, 1, 0, 0)
      .setOption('title', 'Comparativa de Asistencia por Curso')
      .setOption('width', 600)
      .setOption('height', 400)
      .setOption('colors', ['#4285f4', '#ea4335'])
      .build();

    hoja.insertChart(chart);
    hoja.autoResizeColumns(1, 4);

    const duration = Log.timeEnd('compararCursos');
    Log.perf('Generated course comparison', duration);

    ui.showSidebar(
      HtmlService.createHtmlOutput(`
        <div style="padding: 20px; font-family: Arial;">
          <h3 style="color: #34a853;">✅ Comparativa generada</h3>
          <p><strong>${cur1}</strong><br>${d1.estudiantes} estudiantes<br>${d1.pctStr} asistencia</p>
          <p><strong>${cur2}</strong><br>${d2.estudiantes} estudiantes<br>${d2.pctStr} asistencia</p>
          <p><small>Tiempo: ${duration}ms</small></p>
        </div>
      `).setWidth(300)
    );

  } catch (error) {
    Log.error('Error comparing courses:', error.message, error.stack);
    ui.alert('Error al generar la comparativa: ' + error.message);
  }
}

// ===== FUNCIONES PARA COMPATIBILIDAD CON DASHBOARD =====

/**
 * Wrappers para que el dashboard pueda llamar las versiones optimizadas
 */
function reportePorEstudiante() {
  return reportePorEstudianteOptimizado();
}

function reportePorCurso() {
  return reportePorCursoOptimizado();
}

function compararEstudiantes() {
  return compararEstudiantesOptimizado();
}

function compararCursos() {
  return compararCursosOptimizado();
}
