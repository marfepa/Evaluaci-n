/****************************************************************
 *  CORRECCIONES PARA EL DASHBOARD - FUNCIONES COMPATIBLES WEB  *
 ****************************************************************/

/**
 * Funciones wrapper para reportes - COMPATIBLES CON WEB APP
 * Retornan objetos { success, message, data } en lugar de usar SpreadsheetApp.getUi()
 */

function reportePorEstudiante(alumno) {
  try {
    if (!alumno) {
      return { success: false, message: 'Por favor proporciona un ID de estudiante' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const { headers, values } = getSheetData(ss, 'RegistroAsistencia');
    const iID = headers.indexOf('IDEstudiante');
    const iF  = headers.indexOf('Fecha');
    const iC  = headers.indexOf('CursoID');
    const iP  = headers.indexOf('Presente');

    const filas = values.filter(row => row[iID] === alumno);
    if (!filas.length) {
      return { success: false, message: 'No hay registros para ' + alumno };
    }

    const total = filas.length;
    const asist = filas.filter(row => row[iP] === true).length;
    const falt  = total - asist;
    const pct   = (asist / total * 100).toFixed(1) + '%';

    let hoja = ss.getSheetByName('Reporte_Asistencia') || ss.insertSheet('Reporte_Asistencia');
    hoja.clear();

    const dataRows = [
      ['Asistencia – Alumno:', alumno],
      ['Total', 'Asist', 'Falt', '%'],
      [total, asist, falt, pct],
      [],
      ['Fecha', 'CursoID', 'Presente']
    ];

    filas.forEach(row => {
      dataRows.push([row[iF], row[iC], row[iP] ? '✅' : '❌']);
    });

    hoja.getRange(1, 1, dataRows.length, 3).setValues(dataRows);
    return { success: true, message: '✅ Reporte generado en la hoja "Reporte_Asistencia"' };
  } catch (error) {
    Logger.log('Error en reportePorEstudiante: ' + error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

function reportePorCurso(curso) {
  try {
    if (!curso) {
      return { success: false, message: 'Por favor proporciona un ID de curso' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const { headers, values } = getSheetData(ss, 'RegistroAsistencia');
    const iID = headers.indexOf('IDEstudiante');
    const iC  = headers.indexOf('CursoID');
    const iP  = headers.indexOf('Presente');

    const filas = values.filter(row => row[iC] === curso);
    if (!filas.length) {
      return { success: false, message: 'No hay registros para ' + curso };
    }

    const resumen = {};
    filas.forEach(row => {
      const est = row[iID];
      resumen[est] = resumen[est] || { tot: 0, asis: 0 };
      resumen[est].tot++;
      if (row[iP] === true) resumen[est].asis++;
    });

    let hoja = ss.getSheetByName('Reporte_Asistencia') || ss.insertSheet('Reporte_Asistencia');
    hoja.clear();

    const dataRows = [
      ['Asistencia – Curso:', curso],
      ['Estudiante', 'Total', 'Asist', '%']
    ];

    Object.keys(resumen).forEach(est => {
      const rec = resumen[est];
      dataRows.push([est, rec.tot, rec.asis, (rec.asis / rec.tot * 100).toFixed(1) + '%']);
    });

    hoja.getRange(1, 1, dataRows.length, 4).setValues(dataRows);
    return { success: true, message: '✅ Reporte generado en la hoja "Reporte_Asistencia"' };
  } catch (error) {
    Logger.log('Error en reportePorCurso: ' + error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

function reporteCalificacionPorEstudiante(alumno) {
  try {
    if (!alumno) {
      return { success: false, message: 'Por favor proporciona un ID de estudiante' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const { headers, values } = getSheetData(ss, 'CalificacionesDetalladas');
    const iNombre = headers.indexOf('NombreEstudiante');
    const iInst = headers.indexOf('NombreInstrumento');
    const iCal = headers.indexOf('CalificacionTotalInstrumento');
    const iFecha = headers.indexOf('FechaEvaluacion');

    const filas = values.filter(row => row[iNombre] === alumno || row[headers.indexOf('IDEstudiante')] === alumno);

    if (!filas.length) {
      return { success: false, message: 'No hay calificaciones para ' + alumno };
    }

    let hoja = ss.getSheetByName('Reporte_Calificaciones') || ss.insertSheet('Reporte_Calificaciones');
    hoja.clear();

    const dataRows = [
      ['Calificaciones – Estudiante:', alumno],
      [],
      ['Instrumento', 'Calificación', 'Fecha']
    ];

    const califs = {};
    filas.forEach(row => {
      const inst = row[iInst];
      const cal = parseFloat(row[iCal]) || 0;
      const fecha = row[iFecha];
      const key = inst + '|' + fecha;
      if (!califs[key]) {
        califs[key] = { inst, cal, fecha, count: 0, sum: 0 };
      }
      califs[key].sum += cal;
      califs[key].count++;
    });

    Object.values(califs).forEach(c => {
      const avg = c.sum / c.count;
      dataRows.push([c.inst, avg.toFixed(2), c.fecha]);
    });

    hoja.getRange(1, 1, dataRows.length, 3).setValues(dataRows);
    return { success: true, message: '✅ Reporte generado en la hoja "Reporte_Calificaciones"' };
  } catch (error) {
    Logger.log('Error en reporteCalificacionPorEstudiante: ' + error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

function reporteCalificacionPorCurso(curso) {
  try {
    if (!curso) {
      return { success: false, message: 'Por favor proporciona un ID de curso' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const { headers, values } = getSheetData(ss, 'CalificacionesDetalladas');
    const iCurso = headers.indexOf('CursoEvaluado');
    const iNombre = headers.indexOf('NombreEstudiante');
    const iInst = headers.indexOf('NombreInstrumento');
    const iCal = headers.indexOf('CalificacionTotalInstrumento');

    const filas = values.filter(row => row[iCurso] === curso);

    if (!filas.length) {
      return { success: false, message: 'No hay calificaciones para el curso ' + curso };
    }

    let hoja = ss.getSheetByName('Reporte_Calificaciones') || ss.insertSheet('Reporte_Calificaciones');
    hoja.clear();

    const dataRows = [
      ['Calificaciones – Curso:', curso],
      [],
      ['Estudiante', 'Instrumento', 'Calificación']
    ];

    const resumen = {};
    filas.forEach(row => {
      const est = row[iNombre];
      const inst = row[iInst];
      const cal = parseFloat(row[iCal]) || 0;
      const key = est + '|' + inst;
      if (!resumen[key]) {
        resumen[key] = { est, inst, sum: 0, count: 0 };
      }
      resumen[key].sum += cal;
      resumen[key].count++;
    });

    Object.values(resumen).forEach(r => {
      const avg = r.sum / r.count;
      dataRows.push([r.est, r.inst, avg.toFixed(2)]);
    });

    hoja.getRange(1, 1, dataRows.length, 3).setValues(dataRows);
    return { success: true, message: '✅ Reporte generado en la hoja "Reporte_Calificaciones"' };
  } catch (error) {
    Logger.log('Error en reporteCalificacionPorCurso: ' + error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

/**
 * Funciones de comparación - RETORNAN DATOS PARA MOSTRAR EN LA WEB
 */
function compararEstudiantes(est1, est2) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const { headers, values } = getSheetData(ss, 'RegistroAsistencia');
    const colID = headers.indexOf('IDEstudiante');
    const colPres = headers.indexOf('Presente');

    const calc = id => {
      const f = values.filter(r => r[colID] == id);
      const tot = f.length;
      const att = f.filter(r => r[colPres] === true).length;
      const abs = tot - att;
      const pct = tot ? (att / tot * 100).toFixed(1) : '0.0';
      return { id, total: tot, asistencias: att, faltas: abs, porcentaje: pct };
    };

    const data1 = calc(est1);
    const data2 = calc(est2);

    // Guardar en hoja también
    let hoja = ss.getSheetByName('Comparativa_Estudiantes') || ss.insertSheet('Comparativa_Estudiantes');
    hoja.clear();

    const dataRows = [
      ['IDEstudiante', 'Total', 'Asistencias', 'Faltas', '% Asistencia'],
      [data1.id, data1.total, data1.asistencias, data1.faltas, data1.porcentaje],
      [data2.id, data2.total, data2.asistencias, data2.faltas, data2.porcentaje]
    ];
    hoja.getRange(1, 1, dataRows.length, 5).setValues(dataRows);

    return { success: true, message: 'Comparativa generada', data: [data1, data2] };
  } catch (error) {
    Logger.log('Error en compararEstudiantes: ' + error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

function compararCursos(cur1, cur2) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const { headers, values } = getSheetData(ss, 'RegistroAsistencia');
    const colCurso = headers.indexOf('CursoID');
    const colPres = headers.indexOf('Presente');

    const calc = id => {
      const f = values.filter(r => r[colCurso] == id);
      const tot = f.length;
      const att = f.filter(r => r[colPres] === true).length;
      const abs = tot - att;
      const pct = tot ? (att / tot * 100).toFixed(1) : '0.0';
      return { id, total: tot, asistencias: att, faltas: abs, porcentaje: pct };
    };

    const data1 = calc(cur1);
    const data2 = calc(cur2);

    let hoja = ss.getSheetByName('Comparativa_Cursos') || ss.insertSheet('Comparativa_Cursos');
    hoja.clear();

    const dataRows = [
      ['CursoID', 'Total', 'Asistencias', 'Faltas', '% Asistencia'],
      [data1.id, data1.total, data1.asistencias, data1.faltas, data1.porcentaje],
      [data2.id, data2.total, data2.asistencias, data2.faltas, data2.porcentaje]
    ];
    hoja.getRange(1, 1, dataRows.length, 5).setValues(dataRows);

    return { success: true, message: 'Comparativa generada', data: [data1, data2] };
  } catch (error) {
    Logger.log('Error en compararCursos: ' + error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

function compararCalificacionesEstudiantes(est1, est2) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const { headers, values } = getSheetData(ss, 'CalificacionesDetalladas');
    const iNombre = headers.indexOf('NombreEstudiante');
    const iInst = headers.indexOf('NombreInstrumento');
    const iCal = headers.indexOf('CalificacionTotalInstrumento');

    const calc = nombre => {
      const filas = values.filter(r => r[iNombre] === nombre);
      if (!filas.length) return { nombre, evaluaciones: 0, promedio: 0 };

      const califs = {};
      filas.forEach(r => {
        const inst = r[iInst];
        const cal = parseFloat(r[iCal]) || 0;
        if (!califs[inst]) califs[inst] = { sum: 0, count: 0 };
        califs[inst].sum += cal;
        califs[inst].count++;
      });

      const promedios = Object.values(califs).map(c => c.sum / c.count);
      const promedio = promedios.reduce((a, b) => a + b, 0) / promedios.length;
      return { nombre, evaluaciones: promedios.length, promedio: promedio.toFixed(2) };
    };

    const data1 = calc(est1);
    const data2 = calc(est2);

    let hoja = ss.getSheetByName('Comparativa_Calificaciones_Estudiantes') ||
               ss.insertSheet('Comparativa_Calificaciones_Estudiantes');
    hoja.clear();

    const dataRows = [
      ['Estudiante', 'Num Evaluaciones', 'Promedio'],
      [data1.nombre, data1.evaluaciones, data1.promedio],
      [data2.nombre, data2.evaluaciones, data2.promedio]
    ];
    hoja.getRange(1, 1, dataRows.length, 3).setValues(dataRows);

    return { success: true, message: 'Comparativa generada', data: [data1, data2] };
  } catch (error) {
    Logger.log('Error en compararCalificacionesEstudiantes: ' + error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

function compararCalificacionesCursos(cur1, cur2) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const { headers, values } = getSheetData(ss, 'CalificacionesDetalladas');
    const iCurso = headers.indexOf('CursoEvaluado');
    const iCal = headers.indexOf('CalificacionTotalInstrumento');

    const calc = curso => {
      const filas = values.filter(r => r[iCurso] === curso);
      if (!filas.length) return { curso, evaluaciones: 0, promedio: 0 };

      const califs = filas.map(r => parseFloat(r[iCal]) || 0);
      const promedio = califs.reduce((a, b) => a + b, 0) / califs.length;
      return { curso, evaluaciones: califs.length, promedio: promedio.toFixed(2) };
    };

    const data1 = calc(cur1);
    const data2 = calc(cur2);

    let hoja = ss.getSheetByName('Comparativa_Calificaciones_Cursos') ||
               ss.insertSheet('Comparativa_Calificaciones_Cursos');
    hoja.clear();

    const dataRows = [
      ['Curso', 'Num Evaluaciones', 'Promedio'],
      [data1.curso, data1.evaluaciones, data1.promedio],
      [data2.curso, data2.evaluaciones, data2.promedio]
    ];
    hoja.getRange(1, 1, dataRows.length, 3).setValues(dataRows);

    return { success: true, message: 'Comparativa generada', data: [data1, data2] };
  } catch (error) {
    Logger.log('Error en compararCalificacionesCursos: ' + error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

/**
 * FUNCIONES FALTANTES PARA EL DASHBOARD
 */

// Función stub para sistema de alertas (si no existe)
function reporteAsistenciaAvanzada_UI() {
  return { success: false, message: 'Función de reporte avanzado no implementada aún' };
}

function openSchedulerDialog() {
  return { success: false, message: 'Función de programación de alertas no implementada aún' };
}

function openConfigDialog() {
  return { success: false, message: 'Función de configuración no implementada aún' };
}

function diagnosticarSistemaAlertas() {
  return { success: false, message: 'Función de diagnóstico no implementada aún' };
}

function checkAttendanceOnOpen() {
  // Función silenciosa que se ejecuta al abrir - no hace nada si no está configurada
  Logger.log('checkAttendanceOnOpen: función stub');
}

/**
 * Función para calcular medias ponderadas - COMPATIBLE WEB
 */
function calculaMediaPonderadaDesdeHoja() {
  try {
    return {
      success: false,
      message: 'Esta función requiere interacción manual desde la hoja de cálculo. Por favor, abre el archivo en Google Sheets y ejecútala desde el menú "Funciones Extra".'
    };
  } catch (error) {
    return { success: false, message: 'Error: ' + error.message };
  }
}

/**
 * Función para generar reporte de notas por situación - COMPATIBLE WEB
 */
function reporteNotasSituacion() {
  try {
    return {
      success: false,
      message: 'Esta función requiere interacción manual desde la hoja de cálculo. Por favor, abre el archivo en Google Sheets y ejecútala desde el menú "Funciones Extra".'
    };
  } catch (error) {
    return { success: false, message: 'Error: ' + error.message };
  }
}
