/**
 * Script de diagnóstico para verificar las hojas del spreadsheet
 * Ejecuta esta función desde el editor de Apps Script para ver qué hojas existen
 */
function diagnosticarHojasDelSpreadsheet() {
  try {
    const SPREADSHEET_ID = '1WKVottJP88lQ-XxB2SLaLJc06aB5yQYw5peI-8WLaO0';

    Logger.log('=== DIAGNÓSTICO DE HOJAS DEL SPREADSHEET ===');
    Logger.log('SPREADSHEET_ID: ' + SPREADSHEET_ID);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('✓ Spreadsheet abierto: ' + ss.getName());

    const sheets = ss.getSheets();
    Logger.log('✓ Total de hojas: ' + sheets.length);
    Logger.log('');

    Logger.log('=== LISTA DE TODAS LAS HOJAS ===');
    sheets.forEach((sheet, index) => {
      const nombre = sheet.getName();
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();

      Logger.log(`${index + 1}. "${nombre}"`);
      Logger.log(`   - Filas: ${lastRow}, Columnas: ${lastCol}`);

      // Analizar si coincide con algún patrón de reporte
      let esReporte = false;
      let tipoReporte = '';

      if (nombre.startsWith('RepNotas ')) {
        esReporte = true;
        tipoReporte = 'NOTAS (patrón: RepNotas {curso}-{situacion})';
      } else if (nombre.startsWith('Reporte_')) {
        esReporte = true;
        tipoReporte = 'REPORTE (patrón: Reporte_*)';
      } else if (nombre.startsWith('Comparativa_')) {
        esReporte = true;
        tipoReporte = 'COMPARATIVA (patrón: Comparativa_*)';
      } else if (nombre === 'Diagnostico_Sistema') {
        esReporte = true;
        tipoReporte = 'DIAGNÓSTICO';
      }

      if (esReporte) {
        Logger.log(`   ✅ ES UN REPORTE: ${tipoReporte}`);
      } else {
        Logger.log(`   ❌ NO es un reporte (hoja del sistema o datos)`);
      }

      Logger.log('');
    });

    // Contar reportes por tipo
    let reportesNotas = 0;
    let reportesAsistencia = 0;
    let reportesCalificaciones = 0;
    let comparativas = 0;
    let diagnosticos = 0;
    let otros = 0;

    sheets.forEach(sheet => {
      const nombre = sheet.getName();

      if (nombre.startsWith('RepNotas ')) {
        reportesNotas++;
      } else if (nombre.startsWith('Reporte_Asistencia') || nombre === 'Reporte_Asistencia_Av' || nombre === 'Reporte_Asistencia_Av_Diario' || nombre === 'Reporte_Avanzado_Asistencia') {
        reportesAsistencia++;
      } else if (nombre.startsWith('Reporte_Calif') || nombre === 'Reporte_Calificaciones') {
        reportesCalificaciones++;
      } else if (nombre.startsWith('Comparativa_')) {
        comparativas++;
      } else if (nombre === 'Diagnostico_Sistema') {
        diagnosticos++;
      } else if (nombre.startsWith('Reporte_')) {
        otros++;
      }
    });

    Logger.log('=== RESUMEN DE REPORTES ===');
    Logger.log(`Reportes de Notas (RepNotas *): ${reportesNotas}`);
    Logger.log(`Reportes de Asistencia (Reporte_Asistencia*): ${reportesAsistencia}`);
    Logger.log(`Reportes de Calificaciones (Reporte_Calif*): ${reportesCalificaciones}`);
    Logger.log(`Comparativas (Comparativa_*): ${comparativas}`);
    Logger.log(`Diagnósticos (Diagnostico_Sistema): ${diagnosticos}`);
    Logger.log(`Otros reportes: ${otros}`);
    Logger.log(`TOTAL DE REPORTES: ${reportesNotas + reportesAsistencia + reportesCalificaciones + comparativas + diagnosticos + otros}`);

    Logger.log('');
    Logger.log('=== FIN DEL DIAGNÓSTICO ===');

    return {
      success: true,
      totalHojas: sheets.length,
      totalReportes: reportesNotas + reportesAsistencia + reportesCalificaciones + comparativas + diagnosticos + otros,
      desglose: {
        notas: reportesNotas,
        asistencia: reportesAsistencia,
        calificaciones: reportesCalificaciones,
        comparativas: comparativas,
        diagnosticos: diagnosticos,
        otros: otros
      }
    };

  } catch (error) {
    Logger.log('❌ ERROR: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Prueba específica de la función listarReportesExistentes
 * para ver qué está retornando exactamente
 */
function probarListarReportesExistentes() {
  Logger.log('=== PRUEBA DE listarReportesExistentes ===');

  try {
    const resultado = listarReportesExistentes();

    Logger.log('Resultado completo:');
    Logger.log(JSON.stringify(resultado, null, 2));

    Logger.log('');
    Logger.log('Análisis del resultado:');
    Logger.log('- success: ' + resultado.success);
    Logger.log('- tiene data: ' + (resultado.data ? 'SÍ' : 'NO'));

    if (resultado.data) {
      Logger.log('- data es array: ' + Array.isArray(resultado.data));
      Logger.log('- data.length: ' + resultado.data.length);

      if (resultado.data.length > 0) {
        Logger.log('');
        Logger.log('Primer reporte:');
        Logger.log(JSON.stringify(resultado.data[0], null, 2));
      } else {
        Logger.log('⚠️ El array data está VACÍO');
      }
    } else {
      Logger.log('❌ NO hay data en la respuesta');
      if (resultado.message) {
        Logger.log('Mensaje: ' + resultado.message);
      }
    }

  } catch (error) {
    Logger.log('❌ ERROR al ejecutar la función: ' + error.message);
    Logger.log('Stack: ' + error.stack);
  }

  Logger.log('=== FIN DE LA PRUEBA ===');
}
