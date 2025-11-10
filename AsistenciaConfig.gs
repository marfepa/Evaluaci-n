/****************************************************************
 *  CONFIGURACIÓN DE UMBRALES Y SESIONES PREVISTAS               *
 *  Gestiona configuración de alertas almacenada en hoja        *
 ****************************************************************/

const CONFIG_SHEET = 'ConfiguracionAlertas';

/**
 * Abre el diálogo de configuración de alertas
 */
function openConfigDialog() {
  const config = readConfig();
  const template = HtmlService.createTemplateFromFile('config_dialog');
  template.config = config;

  const html = template.evaluate()
    .setWidth(500)
    .setHeight(600);

  SpreadsheetApp.getUi().showModalDialog(html, '⚙️ Configuración de Alertas');
}

/**
 * Guarda la configuración desde el diálogo
 * @param {Object} formData - Datos del formulario
 */
function saveConfigFromDialog(formData) {
  try {
    // Validar campos obligatorios
    if (!formData.Destinatarios || formData.Destinatarios.trim() === '') {
      throw new Error('El campo Destinatarios es obligatorio');
    }

    // Validar que los porcentajes sean números válidos
    const items = ['Aus', 'Ret', 'Uni', 'Ase'];
    items.forEach(item => {
      const p1 = parseFloat(formData[`${item}_%1`]);
      const p2 = parseFloat(formData[`${item}_%2`]);
      if (isNaN(p1) || isNaN(p2) || p1 < 0 || p2 < 0 || p1 > 100 || p2 > 100) {
        throw new Error(`Porcentajes inválidos para ${item}: %1=${p1}, %2=${p2}`);
      }
      if (p1 > p2) {
        throw new Error(`El umbral de aviso (${p1}%) debe ser menor que el grave (${p2}%) para ${item}`);
      }
    });

    // Guardar usando la función existente
    saveConfig(formData);

    Logger.log('✅ Configuración guardada correctamente');
    return { success: true, message: 'Configuración guardada correctamente' };

  } catch (error) {
    Logger.log('❌ Error en saveConfigFromDialog: ' + error.toString());
    return { success: false, message: error.message };
  }
}

/**
 * Guarda la configuración en la hoja de cálculo
 * @param {Object} form - Objeto con los datos de configuración
 */
function saveConfig(form) {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet  = ss.getSheetByName(CONFIG_SHEET)
              || ss.insertSheet(CONFIG_SHEET);
  sheet.clear();

  // Preparar datos para escritura batch (optimizado)
  const rows = [['Clave', 'Valor']];
  Object.entries(form).forEach(([k, v]) => {
    rows.push([k, v]);
  });

  // Escribir todo de una vez (más eficiente que appendRow)
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);

  // Formatear encabezado
  sheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#cfe2ff');
  sheet.autoResizeColumns(1, 2);
}

/**
 * Lee la configuración desde la hoja de cálculo
 * @returns {Object} Configuración con valores por defecto si no existe
 */
function readConfig() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(CONFIG_SHEET);

  if (!sh || sh.getLastRow() < 2) {
    // Devolver configuración por defecto
    return getDefaultConfig();
  }

  const vals = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
  const obj = {};

  vals.forEach(r => {
    const key = r[0];
    const val = r[1];

    // Si es Destinatarios, mantener como string
    if (key === 'Destinatarios') {
      obj[key] = val;
    }
    // Si es AnalisisAutomaticoActivo, convertir a booleano
    else if (key === 'AnalisisAutomaticoActivo') {
      obj[key] = val === true || val === 'true' || val === 'Sí';
    }
    else {
      // Para números, convertir
      obj[key] = Number(val) || 0;
    }
  });

  // Asegurar que tenga todos los campos por defecto
  return Object.assign(getDefaultConfig(), obj);
}

/**
 * Devuelve la configuración por defecto
 * @returns {Object} Configuración por defecto
 */
function getDefaultConfig() {
  return {
    SesionesPrevistas: 30,
    Destinatarios: '',  // Debe configurarse
    AnalisisAutomaticoActivo: false,  // Análisis al abrir la hoja (desactivado por defecto)
    'Aus_%1': 20,       // Ausencias - aviso al 20%
    'Aus_%2': 30,       // Ausencias - grave al 30%
    'Ret_%1': 15,       // Retrasos - aviso al 15%
    'Ret_%2': 25,       // Retrasos - grave al 25%
    'Uni_%1': 10,       // Sin uniforme - aviso al 10%
    'Uni_%2': 20,       // Sin uniforme - grave al 20%
    'Ase_%1': 10,       // Sin aseo - aviso al 10%
    'Ase_%2': 20        // Sin aseo - grave al 20%
  };
}

/**
 * Resetea la configuración a valores por defecto
 */
function resetConfig() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName(CONFIG_SHEET);

    if (sh) {
      ss.deleteSheet(sh);
    }

    Logger.log('✅ Configuración reseteada a valores por defecto');
    return true;
  } catch (error) {
    Logger.log('❌ Error al resetear configuración: ' + error.toString());
    throw error;
  }
}
