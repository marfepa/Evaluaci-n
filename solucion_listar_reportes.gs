/**
 * SOLUCIÓN MEJORADA PARA listarReportesExistentes()
 *
 * Esta es una versión mejorada que soluciona el problema de "respuesta vacía del servidor"
 *
 * INSTRUCCIONES PARA IMPLEMENTAR:
 * 1. Copia esta función COMPLETA
 * 2. En Code.gs, busca la función listarReportesExistentes() existente (línea 2416)
 * 3. REEMPLAZA toda la función existente por esta nueva versión
 * 4. Guarda el proyecto en Apps Script
 * 5. Vuelve a desplegar el Web App (Desplegar > Nueva implementación o Gestionar implementaciones)
 * 6. Actualiza el dashboard y verifica que ahora muestre los reportes
 */

function listarReportesExistentes() {
  try {
    Logger.log('=== INICIO listarReportesExistentes (Versión Mejorada) ===');
    Logger.log('Timestamp: ' + new Date().toISOString());

    // ========================================
    // 1. VALIDACIÓN DE SPREADSHEET_ID
    // ========================================
    if (!SPREADSHEET_ID || SPREADSHEET_ID === 'TU_SPREADSHEET_ID_AQUI') {
      Logger.log('❌ ERROR: SPREADSHEET_ID no está configurado correctamente');
      return {
        success: false,
        message: 'Error de configuración: SPREADSHEET_ID no está definido',
        data: []
      };
    }

    Logger.log('✓ SPREADSHEET_ID configurado: ' + SPREADSHEET_ID);

    // ========================================
    // 2. ACCESO AL SPREADSHEET
    // ========================================
    let ss;
    let metodoAcceso = '';

    try {
      Logger.log('Intentando abrir spreadsheet con openById...');
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      metodoAcceso = 'openById';
      Logger.log('✓ Spreadsheet abierto con openById');
    } catch (ssError) {
      Logger.log('❌ Error con openById: ' + ssError.message);

      // Fallback: intentar con getActiveSpreadsheet
      try {
        Logger.log('Intentando con getActiveSpreadsheet...');
        ss = SpreadsheetApp.getActiveSpreadsheet();
        metodoAcceso = 'getActiveSpreadsheet';
        Logger.log('✓ Spreadsheet abierto con getActiveSpreadsheet');
      } catch (activeError) {
        Logger.log('❌ Error con getActiveSpreadsheet: ' + activeError.message);
        return {
          success: false,
          message: 'No se puede acceder al spreadsheet. Verifica permisos.',
          data: []
        };
      }
    }

    Logger.log('Método de acceso: ' + metodoAcceso);
    Logger.log('Spreadsheet ID real: ' + ss.getId());
    Logger.log('Spreadsheet nombre: ' + ss.getName());

    // ========================================
    // 3. OBTENER TODAS LAS HOJAS
    // ========================================
    let sheets;
    try {
      sheets = ss.getSheets();
      Logger.log('✓ Total de hojas obtenidas: ' + sheets.length);
    } catch (sheetError) {
      Logger.log('❌ Error al obtener hojas: ' + sheetError.message);
      return {
        success: false,
        message: 'Error al obtener hojas del spreadsheet: ' + sheetError.message,
        data: []
      };
    }

    // Si no hay hojas, retornar array vacío pero con éxito
    if (!sheets || sheets.length === 0) {
      Logger.log('⚠️ No se encontraron hojas en el spreadsheet');
      return {
        success: true,
        message: 'El spreadsheet no contiene hojas',
        data: []
      };
    }

    // ========================================
    // 4. FILTRAR Y PROCESAR REPORTES
    // ========================================
    const reportes = [];
    const ultimaModificacion = new Date();

    // Hojas del sistema a ignorar
    const hojasPrincipales = [
      'Estudiantes',
      'InstrumentosEvaluacion',
      'SituacionesAprendizaje',
      'CalificacionesDetalladas',
      'RegistroAsistencia',
      'Maestro_CriteriosRubrica',
      'Maestro_NivelesRubrica',
      'Definicion_Rubricas',
      'Definicion_ListasCotejo',
      'ConfiguracionAlertas',
      'Scheduler'
    ];

    Logger.log('Procesando hojas...');

    sheets.forEach((sheet, index) => {
      try {
        const nombre = sheet.getName();

        // Ignorar hojas del sistema
        if (hojasPrincipales.includes(nombre)) {
          Logger.log(`  [${index + 1}/${sheets.length}] ⏭️ Ignorando hoja del sistema: "${nombre}"`);
          return;
        }

        Logger.log(`  [${index + 1}/${sheets.length}] Analizando: "${nombre}"`);

        let tipo = null;
        let subtipo = null;
        let info = {};

        // ========================================
        // PATRONES DE REPORTES
        // ========================================

        // 1. RepNotas {curso}-{situacion}
        if (nombre.startsWith('RepNotas ')) {
          tipo = 'notas';
          subtipo = 'situacion';
          const resto = nombre.substring(9); // Quitar "RepNotas "
          const partes = resto.split('-');

          if (partes.length >= 2) {
            info = {
              curso: partes[0].trim(),
              situacion: partes.slice(1).join('-').trim(),
              descripcion: `Notas de ${partes[0].trim()} - ${partes.slice(1).join('-').trim()}`
            };
            Logger.log(`    ✓ Tipo: notas/situacion - Curso: ${info.curso}, Situación: ${info.situacion}`);
          } else {
            info = { descripcion: resto || 'Reporte de notas' };
            Logger.log(`    ✓ Tipo: notas/situacion - Descripción genérica`);
          }
        }

        // 2. Reportes de Calificaciones
        else if (nombre === 'Reporte_Calif_Estudiante') {
          tipo = 'calificaciones';
          subtipo = 'estudiante';
          info = { descripcion: 'Calificaciones por estudiante' };
          Logger.log(`    ✓ Tipo: calificaciones/estudiante`);
        }
        else if (nombre === 'Reporte_Calif_Curso') {
          tipo = 'calificaciones';
          subtipo = 'curso';
          info = { descripcion: 'Calificaciones por curso' };
          Logger.log(`    ✓ Tipo: calificaciones/curso`);
        }
        else if (nombre === 'Reporte_Calificaciones') {
          tipo = 'calificaciones';
          subtipo = 'general';
          info = { descripcion: 'Reporte general de calificaciones' };
          Logger.log(`    ✓ Tipo: calificaciones/general`);
        }

        // 3. Reportes de Asistencia
        else if (nombre === 'Reporte_Asistencia_Av') {
          tipo = 'asistencia';
          subtipo = 'avanzado';
          info = { descripcion: 'Reporte avanzado de asistencia por curso' };
          Logger.log(`    ✓ Tipo: asistencia/avanzado`);
        }
        else if (nombre === 'Reporte_Asistencia_Av_Diario') {
          tipo = 'asistencia';
          subtipo = 'avanzado_diario';
          info = { descripcion: 'Reporte consolidado diario de asistencia' };
          Logger.log(`    ✓ Tipo: asistencia/avanzado_diario`);
        }
        else if (nombre === 'Reporte_Avanzado_Asistencia') {
          tipo = 'asistencia';
          subtipo = 'avanzado';
          info = { descripcion: 'Reporte avanzado con estadísticas' };
          Logger.log(`    ✓ Tipo: asistencia/avanzado`);
        }
        else if (nombre.startsWith('Reporte_Asistencia_') &&
                 nombre !== 'Reporte_Asistencia_Av' &&
                 nombre !== 'Reporte_Asistencia_Av_Diario') {
          tipo = 'asistencia';
          subtipo = 'fecha';
          const sufijo = nombre.substring(19);
          info = {
            fecha: sufijo,
            descripcion: `Asistencia - ${sufijo}`
          };
          Logger.log(`    ✓ Tipo: asistencia/fecha - ${sufijo}`);
        }
        else if (nombre === 'Reporte_Asistencia') {
          tipo = 'asistencia';
          subtipo = 'simple';
          info = { descripcion: 'Reporte general de asistencia' };
          Logger.log(`    ✓ Tipo: asistencia/simple`);
        }

        // 4. Comparativas
        else if (nombre === 'Comparativa_Estudiantes') {
          tipo = 'comparativa';
          subtipo = 'estudiantes_asistencia';
          info = { descripcion: 'Comparativa de asistencia entre estudiantes' };
          Logger.log(`    ✓ Tipo: comparativa/estudiantes_asistencia`);
        }
        else if (nombre === 'Comparativa_Cursos') {
          tipo = 'comparativa';
          subtipo = 'cursos_asistencia';
          info = { descripcion: 'Comparativa de asistencia entre cursos' };
          Logger.log(`    ✓ Tipo: comparativa/cursos_asistencia`);
        }
        else if (nombre === 'Comparativa_Calificaciones_Estudiantes' || nombre === 'Comparativa_Calif_Est') {
          tipo = 'comparativa';
          subtipo = 'estudiantes_calificaciones';
          info = { descripcion: 'Comparativa de calificaciones entre estudiantes' };
          Logger.log(`    ✓ Tipo: comparativa/estudiantes_calificaciones`);
        }
        else if (nombre === 'Comparativa_Calificaciones_Cursos' || nombre === 'Comparativa_Calif_Cursos') {
          tipo = 'comparativa';
          subtipo = 'cursos_calificaciones';
          info = { descripcion: 'Comparativa de calificaciones entre cursos' };
          Logger.log(`    ✓ Tipo: comparativa/cursos_calificaciones`);
        }

        // 5. Diagnóstico
        else if (nombre === 'Diagnostico_Sistema') {
          tipo = 'diagnostico';
          subtipo = 'sistema';
          info = { descripcion: 'Diagnóstico del sistema de alertas' };
          Logger.log(`    ✓ Tipo: diagnostico/sistema`);
        }

        // Si se identificó como reporte, agregarlo
        if (tipo) {
          reportes.push({
            nombre: nombre,
            tipo: tipo,
            subtipo: subtipo,
            info: info,
            ultimaModificacion: ultimaModificacion.toISOString()
          });
          Logger.log(`    ✅ AGREGADO: ${nombre} [${tipo}/${subtipo}]`);
        } else {
          Logger.log(`    ⏭️ No es un reporte conocido: "${nombre}"`);
        }

      } catch (sheetProcessError) {
        Logger.log(`    ❌ Error procesando hoja: ${sheetProcessError.message}`);
      }
    });

    // ========================================
    // 5. ORDENAR Y RETORNAR
    // ========================================
    Logger.log('');
    Logger.log('Total de reportes identificados: ' + reportes.length);

    // Ordenar alfabéticamente por nombre
    try {
      reportes.sort((a, b) => {
        const nombreA = a.nombre || '';
        const nombreB = b.nombre || '';
        return nombreA.localeCompare(nombreB);
      });
      Logger.log('✓ Reportes ordenados alfabéticamente');
    } catch (sortError) {
      Logger.log('⚠️ Error al ordenar reportes: ' + sortError.message);
    }

    // Log de nombres de reportes
    if (reportes.length > 0) {
      Logger.log('Reportes encontrados:');
      reportes.forEach((r, i) => {
        Logger.log(`  ${i + 1}. ${r.nombre} [${r.tipo}/${r.subtipo}]`);
      });
    } else {
      Logger.log('⚠️ No se encontraron reportes que coincidan con los patrones');
    }

    Logger.log('=== FIN listarReportesExistentes - SUCCESS ===');
    Logger.log('');

    // IMPORTANTE: Retornar con estructura correcta
    return {
      success: true,
      data: reportes,
      message: reportes.length === 0 ? 'No se encontraron reportes' : `Se encontraron ${reportes.length} reportes`
    };

  } catch (error) {
    const errorMsg = 'Error en listarReportesExistentes: ' + error.toString();
    const stackMsg = error.stack || 'No disponible';

    Logger.log('=== ERROR en listarReportesExistentes ===');
    Logger.log('Mensaje: ' + errorMsg);
    Logger.log('Stack: ' + stackMsg);
    Logger.log('========================================');

    return {
      success: false,
      message: 'Error al obtener reportes: ' + error.message,
      data: []
    };
  }
}
