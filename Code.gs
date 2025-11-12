/****************************************************************
 *  HELPERS BÁSICOS  (solo UNA vez en todo el proyecto)         *
 ****************************************************************/

// —--- REEMPLAZA con el ID real de tu Spreadsheet
const SPREADSHEET_ID = '1WKVottJP88lQ-XxB2SLaLJc06aB5yQYw5peI-8WLaO0';

// ✅ Sistema de caché ahora está en CacheOptimizado.gs
// ✅ Sistema de logging ahora está en LoggingOptimizado.gs
// ⚠️ Las líneas antiguas de sheetCache y DEBUG han sido eliminadas
// Para usar logging: Log.info(), Log.debug(), Log.error(), etc.
// Para usar caché: getEstudiantesCached(), getInstrumentosCached(), etc.

// ★ Normaliza CursoID: "Curso1BAS" -> "1BAS", quita espacios/acentos, uppercase
function normalizeCursoId(v) {
  if (v == null) return '';
  try {
    let s = String(v);
    try { s = decodeURIComponent(s); } catch(e) {}
    s = s.trim()
         .replace(/\u200B/g, '')                      // zero-width
         .normalize('NFD').replace(/[\u0300-\u036f]/g,''); // sin acentos
    s = s.replace(/^curso/i, '');                     // quita prefijo "Curso"
    s = s.replace(/\s+/g, '');
    s = s.toUpperCase();
    return s;
  } catch(e) {
    return String(v).toUpperCase().trim();
  }
}

/**
 * FUNCIÓN PRINCIPAL PARA APLICACIÓN WEB - VERSION MEJORADA
 * Acepta instrumentId o instrumentoId (tolerante)
 * También maneja el dashboard principal
 */
function doGet(e) {
  try {
    const p = e?.parameter || {};

    // ★ NUEVO: Si se solicita el dashboard, mostrarlo
    if (p.view === 'dashboard') {
      Logger.log('Abriendo dashboard principal');
      return HtmlService.createHtmlOutputFromFile('dashboard')
        .setTitle('Panel de Control - Sistema de Evaluación')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    const instrumentId = p.instrumentId || p.instrumentoId; // ← tolerante a ambos nombres
    // ★ Leer cursoId con tolerancia de nombres
    const cursoIdParam = p.cursoId || p.cursoID || p.curso || p.group || p.grupoId || '';

    Log.debug(`doGet(): instrumentId=${instrumentId || '(none)'} · cursoIdParam=${cursoIdParam || '(none)'}`);

    // Si hay instrumentId, ir directo al formulario (ahora pasamos cursoIdParam)
    if (instrumentId) {
      Logger.log(`Abriendo instrumento directamente: ${instrumentId}`);
      return showEvaluationForm(instrumentId, cursoIdParam); // ★
    }

    // Si no hay parámetros, mostrar dashboard por defecto
    Logger.log('Abriendo dashboard por defecto');
    return HtmlService.createHtmlOutputFromFile('dashboard')
      .setTitle('Panel de Control - Sistema de Evaluación')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  } catch (error) {
    Logger.log(`Error en doGet: ${error.toString()}`);
    // Página de error amigable
    return HtmlService.createHtmlOutput(`
      <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
        <h2 style="color: #dc3545;">Error</h2>
        <p>Hubo un problema al cargar la aplicación.</p>
        <p><small>Error: ${error.message}</small></p>
        <button onclick="window.location.reload()">Reintentar</button>
      </div>
    `).setTitle('Error - Instrumentos de Evaluación');
  }
}

/**
 * ★ NUEVO: HANDLER PARA PETICIONES POST (Web App Mode)
 * Permite llamar funciones del backend desde el dashboard en modo web app
 */
function doPost(e) {
  try {
    Logger.log('doPost received: ' + JSON.stringify(e));

    // Parsear el body JSON
    const body = JSON.parse(e.postData.contents);
    const functionName = body.function;
    const args = body.arguments || [];

    Logger.log(`Calling function: ${functionName} with args: ${JSON.stringify(args)}`);

    // ✅ Mejorado: Buscar la función en el contexto global de Apps Script
    // Apps Script no tiene globalThis, pero podemos usar eval para acceder a funciones globales
    let globalFunc;
    try {
      // Intentar acceder a la función directamente por nombre
      globalFunc = eval(functionName);
    } catch (evalError) {
      Logger.log(`Could not eval function: ${evalError.message}`);
      throw new Error(`Function ${functionName} not found or not callable`);
    }

    if (typeof globalFunc !== 'function') {
      throw new Error(`${functionName} is not a function (type: ${typeof globalFunc})`);
    }

    // Llamar a la función con los argumentos
    const result = globalFunc.apply(null, args);

    Logger.log(`Function ${functionName} executed successfully`);

    // Retornar el resultado como JSON
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, result: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(`Error en doPost: ${error.toString()}`);
    Logger.log(`Error stack: ${error.stack}`);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message || error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * MOSTRAR FORMULARIO DE EVALUACIÓN - FILTRADO POR CURSO
 * Ahora acepta cursoIdParam (de URL). Si no viene, usa el curso de la situación.
 */
function showEvaluationForm(instrumentId, cursoIdParam) { // ★
  try {
    if (!instrumentId) {
      Logger.log('No se proporcionó instrumentId');
      return showInstrumentsList();
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const instrumento = getInstrumentoById(ss, instrumentId);
    if (!instrumento) {
      Logger.log(`Instrumento no encontrado: ${instrumentId}`);
      return createErrorPage(
        'Instrumento no encontrado',
        `El instrumento con ID "${instrumentId}" no existe.`
      );
    }

    // — 1) Obtener la situación de aprendizaje asociada al instrumento
    const situacionKey = Object.keys(instrumento).find(k => k.toLowerCase().includes('situac'));
    if (!situacionKey) {
      Logger.log('No se encontró campo “Situación” en instrumento: ' + Object.keys(instrumento));
      return createErrorPage(
        'Campo situación no encontrado',
        'Revisa tu hoja “InstrumentosEvaluacion”: header con “Situacion...”'
      );
    }
    const situacionId = instrumento[situacionKey];
    Logger.log(`Instrumento → ${situacionKey}="${situacionId}"`);

    // — 2) Leer CursoID (y opcionalmente nombre) desde hoja “SituacionesAprendizaje”
    const { headers: saH, values: saV } = getSheetData(ss, 'SituacionesAprendizaje');
    const idxSitu = saH.indexOf('IDSituacionAprendizaje');
    const idxCurso = saH.indexOf('CursoID');
    const idxNombreSitu = saH.indexOf('NombreSituacion'); // opcional
    Logger.log(`Headers SituacionesAprendizaje: ${saH.join(', ')}`);
    if (idxSitu < 0 || idxCurso < 0) {
      return createErrorPage(
        'Hoja SituacionesAprendizaje mal configurada',
        'Asegúrate de tener columnas "IDSituacionAprendizaje" y "CursoID".'
      );
    }
    const filaSA = saV.find(r => r[idxSitu] === situacionId);
    if (!filaSA) {
      Logger.log(`Situación no registrada: ${situacionId}`);
      return createErrorPage(
        'Situación no registrada',
        `La situación "${situacionId}" no existe en la hoja “SituacionesAprendizaje”.`
      );
    }

    const cursoInstrumentoRaw = filaSA[idxCurso];           // p.ej. "Curso1BAS" o "1BAS"
    const nombreSitu = idxNombreSitu >= 0 ? (filaSA[idxNombreSitu] || situacionId) : getNombreSituacion(ss, instrumento);

    // — 2.1) Selección de curso objetivo: prioridad al parámetro de la URL
    const targetFromParamNorm = normalizeCursoId(cursoIdParam);
    const targetFromInstNorm  = normalizeCursoId(cursoInstrumentoRaw);
    const targetNorm          = targetFromParamNorm || targetFromInstNorm; // ★ prioridad a URL
    const targetDisplay       = cursoIdParam || cursoInstrumentoRaw || ''; // para mostrar en UI

    Log.debug(`Curso: URL="${cursoIdParam || ''}" [${targetFromParamNorm}] · SA="${cursoInstrumentoRaw}" [${targetFromInstNorm}] · TARGET=[${targetNorm}]`);

    // — 3) Cargar y filtrar estudiantes por ese CursoID (normalizado)
    const estudiantes = getEstudiantes(ss);
    if (!estudiantes || estudiantes.length === 0) {
      Logger.log('No se encontraron estudiantes en la hoja “Estudiantes”');
      return createErrorPage('Sin estudiantes', 'No hay estudiantes registrados.');
    }
    // Aceptar "CursoID" exacto; si no existe, no seguimos
    const campoCursoEst = Object.keys(estudiantes[0]).find(k => k === 'CursoID');
    Logger.log(`Headers Estudiantes: ${Object.keys(estudiantes[0]).join(', ')}`);
    if (!campoCursoEst) {
      return createErrorPage(
        'Campo CursoID no encontrado',
        'Revisa tu hoja “Estudiantes”: debe existir columna "CursoID".'
      );
    }

    const estudiantesFiltrados = estudiantes.filter(est => {
      const raw = est[campoCursoEst] || est.Curso || est.CursoEvaluado || '';
      return normalizeCursoId(raw) === targetNorm;
    });

    Logger.log(`Estudiantes totales: ${estudiantes.length}, filtrados: ${estudiantesFiltrados.length} (target=${targetDisplay})`);
    if (estudiantesFiltrados.length === 0) {
      return createErrorPage(
        'Sin estudiantes en el curso',
        `No hay estudiantes registrados para el curso "${targetDisplay}".`
      );
    }

    // — 4) Detección especial: Beep Test (formulario por lotes)
    const nombreLower = String(instrumento.NombreInstrumento || '').toLowerCase();
    if (nombreLower.includes('beep test')) {
      Logger.log('Creando formulario especial Beep Test (por lotes)');
      return createBeepTestBatchForm(instrumento, estudiantesFiltrados, nombreSitu);
    }

    // — 5) Detección de peer/autoevaluación y generación de formulario estándar
    const isPeerEvaluation =
      nombreLower.includes('peer') ||
      nombreLower.includes('coevaluación') ||
      nombreLower.includes('co-evaluación') ||
      nombreLower.includes('autoevaluación') ||
      nombreLower.includes('auto-evaluación');
    Logger.log(`¿Es evaluación peer? ${isPeerEvaluation}`);

    switch (instrumento.TipoInstrumento) {
      case 'Calificación Directa':
        // → Pasamos también el contexto para mostrarlo en el template
        return createNumericForm(instrumento, estudiantesFiltrados, {
          cursoAsignado: targetDisplay,            // ★ mostrar el curso efectivo
          situacionAprendizaje: nombreSitu
        });

      case 'Lista de Cotejo':
        return createListaCotejoForm(instrumento, estudiantesFiltrados);

      case 'Rúbrica':
        if (isPeerEvaluation) {
          Logger.log('Creando formulario de rúbrica PEER');
          return createRubricaPeerForm(instrumento, estudiantesFiltrados);
        } else {
          Logger.log('Creando formulario de rúbrica TRADICIONAL');
          return createRubricaForm(instrumento, estudiantesFiltrados);
        }

      default:
        Logger.log(`Tipo de instrumento no soportado: ${instrumento.TipoInstrumento}`);
        return createErrorPage(
          'Tipo no soportado',
          `El tipo de instrumento "${instrumento.TipoInstrumento}" no está implementado.`
        );
    }

  } catch (error) {
    Logger.log(`Error en showEvaluationForm: ${error.toString()}`);
    return createErrorPage('Error', `Error al cargar el formulario: ${error.message}`);
  }
}

// Nueva función para abrir el formulario HTML del Beep Test (por lotes)
function createBeepTestBatchForm(instrumento, estudiantes, nombreSitu) {
  const template = HtmlService.createTemplateFromFile('beep_test_batch_form');
  template.instrumentoNombre = instrumento.NombreInstrumento || '';
  template.instrumentoID     = instrumento.IDInstrumento || '';
  template.nombreSituacion   = nombreSitu || '';
  template.estudiantes       = estudiantes || [];
  return template.evaluate()
    .setTitle('Beep Test - Evaluación por lotes')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

/**
 * CREAR PÁGINA DE ERROR REUTILIZABLE
 */
function createErrorPage(title, message) {
  return HtmlService.createHtmlOutput(`
    <div style="font-family: Arial, sans-serif; padding: 40px; text-align: center; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545; margin-bottom: 20px;">${title}</h2>
      <p style="font-size: 16px; color: #666; margin-bottom: 30px;">${message}</p>
      <button onclick="window.history.back()" 
              style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 16px;">
        ← Volver
      </button>
    </div>
  `).setTitle(`Error - ${title}`);
}

/**
 * CREAR FORMULARIO RÚBRICA PEER/AUTO-EVALUACIÓN
 */
function createRubricaPeerForm(instrumento, estudiantes) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const { headers: defHeaders, values: defValues } = getSheetData(ss, 'Definicion_Rubricas');
  const rubricaId = instrumento.IDInstrumentoTipo;

  const rubricaData = defValues.filter(row => row[defHeaders.indexOf('IDRubrica')] === rubricaId);
  const criteriosMap = new Map();
  const nivelesMap = new Map();
  const iDesc = idx(defHeaders, ['Descriptor', 'Descripcion', 'Descripción']);

  rubricaData.forEach(row => {
    const criterioId = row[defHeaders.indexOf('IDCriterio')];
    const nivelId    = row[defHeaders.indexOf('IDNivel')];

    if (!criteriosMap.has(criterioId)) {
      criteriosMap.set(criterioId, {
        ID: criterioId,
        Nombre: getCriterioNombre(ss, criterioId),
        DescriptoresPorNivel: []
      });
    }
    if (!nivelesMap.has(nivelId)) {
      const nivelInfo = getNivelInfo(ss, nivelId);
      nivelesMap.set(nivelId, { ID: nivelId, Nombre: nivelInfo.NombreNivel, Puntuacion: nivelInfo.PuntuacionNivel });
    }
    criteriosMap.get(criterioId).DescriptoresPorNivel.push({ NivelID: nivelId, Descriptor: row[iDesc] || '' });
  });

  const criterios = Array.from(criteriosMap.values());
  const niveles   = Array.from(nivelesMap.values());
  const maxPuntuacion = niveles.reduce((max, n) => Math.max(max, n.Puntuacion), 0) * criterios.length;

  const template = HtmlService.createTemplateFromFile('rubrica_peer_form');
  template.instrumentoNombre = instrumento.NombreInstrumento;
  template.instrumentoID     = instrumento.IDInstrumento;
  template.estudiantes       = estudiantes;
  template.rubrica           = { criterios, niveles, maxPuntuacionPosible: maxPuntuacion };

  const nombreLower = String(instrumento.NombreInstrumento || '').toLowerCase();
  template.isAutoEvaluacion = nombreLower.includes('auto');
  template.isCoevaluacion   = nombreLower.includes('co') && !nombreLower.includes('auto');

  return template.evaluate().setTitle(`Rúbrica Peer - ${instrumento.NombreInstrumento}`);
}

/**
 * Detecta tipo de evaluación por nombre (utilidad)
 */
function detectEvaluationType(instrumentName) {
  const name = String(instrumentName || '').toLowerCase();
  if (name.includes('autoevaluación') || name.includes('auto-evaluación')) return 'autoevaluacion';
  if (name.includes('coevaluación') || name.includes('co-evaluación') || name.includes('peer')) return 'coevaluacion';
  return 'tradicional';
}

/**
 * MOSTRAR LISTA DE INSTRUMENTOS DE EVALUACIÓN (fallback)
 */
function showInstrumentsList() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const instrumentos = getInstrumentos(ss);

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <base target="_top">
    <title>Instrumentos de Evaluación</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; background-color: #f4f4f4; }
      .container { max-width: 800px; margin: 0 auto; background-color: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      h1 { color: #0056b3; text-align: center; margin-bottom: 25px; }
      .instrument-card { background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 15px; margin-bottom: 15px; cursor: pointer; transition: background-color 0.3s ease; }
      .instrument-card:hover { background-color: #e9ecef; }
      .instrument-name { font-weight: bold; font-size: 1.1em; color: #0056b3; margin-bottom: 5px; }
      .instrument-type { color: #6c757d; font-size: 0.9em; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Selecciona un Instrumento de Evaluación</h1>
      ${instrumentos.map(inst => `
        <div class="instrument-card" onclick="selectInstrument('${inst.IDInstrumento}')">
          <div class="instrument-name">${inst.NombreInstrumento}</div>
          <div class="instrument-type">Tipo: ${inst.TipoInstrumento}</div>
        </div>
      `).join('')}
    </div>
    
    <script>
      function selectInstrument(instrumentId) {
        // ★ Preservar cursoId de la URL actual
        var base = window.location.href.split('?')[0];
        try {
          var current = new URL(window.location.href);
          var next = new URL(base);
          next.searchParams.set('instrumentId', instrumentId);
          // tolerar cursoId/cursoID
          var curCurso = current.searchParams.get('cursoId') || current.searchParams.get('cursoID');
          if (curCurso) next.searchParams.set('cursoId', curCurso);
          window.location.href = next.toString();
        } catch (e) {
          // Fallback simple si URL no está soportado
          var qs = 'instrumentId=' + encodeURIComponent(instrumentId);
          var m = window.location.search.match(/[?&](cursoId|cursoID)=([^&#]+)/);
          if (m) qs += '&cursoId=' + m[2];
          window.location.href = base + '?' + qs;
        }
      }
    </script>
  </body>
  </html>`;
  
  return HtmlService.createHtmlOutput(html).setTitle('Instrumentos de Evaluación');
}

/** OBTENER INSTRUMENTOS DE EVALUACIÓN */
function getInstrumentos(ss) {
  const { headers, values } = getSheetData(ss, 'InstrumentosEvaluacion');
  return values.map(row => {
    const obj = {};
    headers.forEach((header, index) => { obj[header] = row[index]; });
    return obj;
  });
}

/** OBTENER INSTRUMENTO POR ID */
function getInstrumentoById(ss, instrumentId) {
  const instrumentos = getInstrumentos(ss);
  return instrumentos.find(inst => inst.IDInstrumento === instrumentId);
}

/** OBTENER ESTUDIANTES */
function getEstudiantes(ss) {
  const { headers, values } = getSheetData(ss, 'Estudiantes');
  return values.map(row => {
    const obj = {};
    headers.forEach((header, index) => { obj[header] = row[index]; });
    return obj;
  });
}

/**
 * CREAR FORMULARIO NUMÉRICO (Calificación Directa)
 * Ahora acepta un tercer parámetro "context" para pasar curso/situación al template
 */
function createNumericForm(instrumento, estudiantes, context) {
  const template = HtmlService.createTemplateFromFile('num_directo_form');
  template.instrumentoNombre    = instrumento.NombreInstrumento;
  template.instrumentoID        = instrumento.IDInstrumento;
  template.estudiantes          = estudiantes; // ← ya filtrados por CursoID
  // Contexto opcional para mostrar en la UI
  template.cursoAsignado        = context?.cursoAsignado || '';
  template.situacionAprendizaje = context?.situacionAprendizaje || '';
  return template.evaluate().setTitle('Calificación Directa');
}

/** CREAR FORMULARIO LISTA DE COTEJO */
function createListaCotejoForm(instrumento, estudiantes) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const { headers, values } = getSheetData(ss, 'Definicion_ListasCotejo');
  const items = values
    .filter(row => row[headers.indexOf('IDListaCotejo')] === instrumento.IDInstrumentoTipo)
    .map(row => {
      const obj = {}; headers.forEach((h, i) => obj[h] = row[i]); return obj;
    });

  const template = HtmlService.createTemplateFromFile('lista_cotejo_form');
  template.instrumentoNombre = instrumento.NombreInstrumento;
  template.instrumentoID     = instrumento.IDInstrumento;
  template.estudiantes       = estudiantes;
  template.listaCotejo       = { items };
  return template.evaluate().setTitle('Lista de Cotejo');
}

/** CREAR FORMULARIO RÚBRICA (tradicional) */
function createRubricaForm(instrumento, estudiantes) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const { headers: defHeaders, values: defValues } = getSheetData(ss, 'Definicion_Rubricas');
  const rubricaId = instrumento.IDInstrumentoTipo;

  const rubricaData = defValues.filter(row => row[defHeaders.indexOf('IDRubrica')] === rubricaId);
  const criteriosMap = new Map();
  const nivelesMap = new Map();
  const iDesc = idx(defHeaders, ['Descriptor', 'Descripcion', 'Descripción']);

  rubricaData.forEach(row => {
    const criterioId = row[defHeaders.indexOf('IDCriterio')];
    const nivelId    = row[defHeaders.indexOf('IDNivel')];

    if (!criteriosMap.has(criterioId)) {
      criteriosMap.set(criterioId, {
        ID: criterioId,
        Nombre: getCriterioNombre(ss, criterioId),
        DescriptoresPorNivel: []
      });
    }
    if (!nivelesMap.has(nivelId)) {
      const nivelInfo = getNivelInfo(ss, nivelId);
      nivelesMap.set(nivelId, { ID: nivelId, Nombre: nivelInfo.NombreNivel, Puntuacion: nivelInfo.PuntuacionNivel });
    }
    criteriosMap.get(criterioId).DescriptoresPorNivel.push({ NivelID: nivelId, Descriptor: row[iDesc] || '' });
  });

  const criterios = Array.from(criteriosMap.values());
  const niveles   = Array.from(nivelesMap.values());
  const maxPuntuacion = niveles.reduce((max, n) => Math.max(max, n.Puntuacion), 0) * criterios.length;

  const template = HtmlService.createTemplateFromFile('rubrica_form');
  template.instrumentoNombre = instrumento.NombreInstrumento;
  template.instrumentoID     = instrumento.IDInstrumento;
  template.estudiantes       = estudiantes;
  template.isPeer            = false; // por defecto
  template.evaluadorID       = '';
  template.evaluadorNombre   = '';
  template.rubrica           = { criterios, niveles, maxPuntuacionPosible: maxPuntuacion };
  return template.evaluate().setTitle('Rúbrica');
}

/** OBTENER NOMBRE DEL CRITERIO */
function getCriterioNombre(ss, criterioId) {
  const { headers, values } = getSheetData(ss, 'Maestro_CriteriosRubrica');
  const row = values.find(r => r[headers.indexOf('IDCriterio')] === criterioId);
  return row ? row[headers.indexOf('NombreCriterio')] : criterioId;
}

/** OBTENER INFORMACIÓN DEL NIVEL */
function getNivelInfo(ss, nivelId) {
  const { headers, values } = getSheetData(ss, 'Maestro_NivelesRubrica');
  const row = values.find(r => r[headers.indexOf('IDNivel')] === nivelId);
  return row ? {
    NombreNivel: row[headers.indexOf('NombreNivel')],
    PuntuacionNivel: row[headers.indexOf('PuntuacionNivel')]
  } : { NombreNivel: nivelId, PuntuacionNivel: 0 };
}

/**
 * Devuelve el nombre de la situación para el instrumento (si existe), si no el ID
 */
function getNombreSituacion(ss, instrumento) {
  // Detectamos el campo situacion en el objeto instrumento
  const key = Object.keys(instrumento).find(k => k.toLowerCase().includes('situac'));
  if (!key) return '';
  const situId = instrumento[key];
  const { headers, values } = getSheetData(ss, 'SituacionesAprendizaje');
  const iId = headers.indexOf('IDSituacionAprendizaje');
  const iNm = headers.indexOf('NombreSituacion');
  if (iId < 0) return situId || '';
  const row = values.find(r => r[iId] === situId);
  if (!row) return situId || '';
  return iNm >= 0 ? (row[iNm] || situId) : (situId || '');
}

/**
 * Lee datos directamente de una hoja sin caché
 * Esta función es usada internamente por getSheetData y getSheetDataCached
 */
function getSheetDataDirect(ss, sheetName) {
  if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('Hoja ' + sheetName + ' no encontrada.');
    return { headers: [], values: [] };
  }

  const all = sheet.getDataRange().getValues();
  return { headers: all[0] || [], values: all.slice(1) };
}

/**
 * Lee una hoja y devuelve { headers, values }
 * Usa caché si CacheOptimizado.gs está disponible
 */
function getSheetData(ss, sheetName) {
  if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // ✅ Prevenir uso de caché si ya estamos en una operación de carga de caché
  // Esto evita recursión circular cuando getCachedData llama a loadFunction
  if (typeof _cacheCallStack !== 'undefined' && _cacheCallStack.has('sheet_' + sheetName)) {
    return getSheetDataDirect(ss, sheetName);
  }

  // ✅ Usar sistema de caché optimizado si está disponible
  if (typeof getSheetDataCached === 'function') {
    return getSheetDataCached(ss, sheetName);
  }

  // ⚠️ Fallback: Leer directamente si CacheOptimizado.gs no está cargado
  return getSheetDataDirect(ss, sheetName);
}

/* Índice del primero de varios nombres posibles */
function idx(headers, names) {
  for (let n of names) {
    const i = headers.indexOf(n);
    if (i !== -1) return i;
  }
  return -1;
}

/****************************************************************
 *  MENÚS (un único onOpen)                                     *
 ****************************************************************/
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  // ★ Menú principal del Dashboard
  ui.createMenu('🎯 Panel de Control')
    .addItem('Abrir Dashboard', 'openDashboard')
    .addToUi();

  // ★ NUEVO: Menú único con todas las funciones organizadas
  ui.createMenu('⚡ Funciones Extra')
    // --- SECCIÓN ASISTENCIA ---
    .addSubMenu(
      ui.createMenu('📊 Asistencia')
        .addItem('📄 Reporte por alumno', 'reportePorEstudiante')
        .addItem('📚 Reporte por curso', 'reportePorCurso')
        .addSeparator()
        .addItem('🔄 Comparar 2 alumnos', 'compararEstudiantesDialog')
        .addItem('🔄 Comparar 2 cursos', 'compararCursosDialog')
        .addSeparator()
        .addItem('📊 Reporte AVANZADO', 'reporteAsistenciaAvanzada_UI')
    )

    // --- SECCIÓN CALIFICACIONES ---
    .addSubMenu(
      ui.createMenu('📝 Calificaciones')
        .addItem('👤 Por alumno', 'reporteCalificacionPorEstudianteDialog')
        .addItem('📚 Por curso', 'reporteCalificacionPorCursoDialog')
        .addSeparator()
        .addItem('🔄 Comparar 2 alumnos', 'compararCalificacionesEstudiantesDialog')
        .addItem('🔄 Comparar 2 cursos', 'compararCalificacionesCursosDialog')
        .addSeparator()
        .addItem('📄 Generar reporte de notas', 'reporteNotasSituacion')
        .addItem('🧮 Calcular medias ponderadas', 'calculaMediaPonderadaDesdeHoja')
    )

    // --- SECCIÓN AUTOMATIZACIÓN ---
    .addSubMenu(
      ui.createMenu('⚙️ Automatización')
        .addItem('⏰ Programar alertas', 'openSchedulerDialog')
        .addItem('📋 Gestor de programaciones', 'openSchedulerManager')
        .addSeparator()
        .addItem('▶️ Ejecutar reporte AHORA', 'dailyAttendanceNotifier_manual')
        .addItem('⚙️ Configurar alertas', 'openConfigDialog')
        .addSeparator()
        .addItem('🔍 Diagnosticar sistema', 'diagnosticarSistemaAlertas')
    )

    .addToUi();

  // ★ EJECUTAR ANÁLISIS AUTOMÁTICO AL ABRIR (si está activado en configuración)
  // Se ejecuta en segundo plano sin bloquear la interfaz
  checkAttendanceOnOpen();
}

/****************************************************************
 *  BLOQUE DE ASISTENCIA (ejemplo: solo 2 funciones corregidas) *
 ****************************************************************/
function reportePorEstudiante() {
  const ui = SpreadsheetApp.getUi();
  const r  = ui.prompt('Asistencia por alumno', 'ID Estudiante:', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const alumno = r.getResponseText().trim();

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const { headers, values } = getSheetData(ss, 'RegistroAsistencia');
  const iID = headers.indexOf('IDEstudiante');
  const iF  = headers.indexOf('Fecha');
  const iC  = headers.indexOf('CursoID');
  const iP  = headers.indexOf('Presente');

  const filas = values.filter(row => row[iID] === alumno);
  if (!filas.length) { ui.alert('No hay registros para ' + alumno); return; }

  const total = filas.length;
  const asist = filas.filter(row => row[iP] === true).length;
  const falt  = total - asist;
  const pct   = (asist / total * 100).toFixed(1) + '%';

  let hoja = ss.getSheetByName('Reporte_Asistencia') || ss.insertSheet('Reporte_Asistencia');
  hoja.clear();

  // Preparar todos los datos para escritura batch
  const dataRows = [
    ['Asistencia – Alumno:', alumno],
    ['Total', 'Asist', 'Falt', '%'],
    [total, asist, falt, pct],
    [],
    ['Fecha', 'CursoID', 'Presente']
  ];

  // Agregar las filas de detalle
  filas.forEach(row => {
    dataRows.push([row[iF], row[iC], row[iP] ? '✅' : '❌']);
  });

  // Escribir todo de una vez
  hoja.getRange(1, 1, dataRows.length, 3).setValues(dataRows);

  ui.showSidebar(HtmlService.createHtmlOutput('✅ «Reporte_Asistencia» generado').setWidth(200));
}

function reportePorCurso() {
  const ui = SpreadsheetApp.getUi();
  const r  = ui.prompt('Asistencia por curso', 'ID Curso:', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const curso = r.getResponseText().trim();

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const { headers, values } = getSheetData(ss, 'RegistroAsistencia');
  const iID = headers.indexOf('IDEstudiante');
  const iC  = headers.indexOf('CursoID');
  const iP  = headers.indexOf('Presente');

  const filas = values.filter(row => row[iC] === curso);
  if (!filas.length) { ui.alert('No hay registros para ' + curso); return; }

  const resumen = {};
  filas.forEach(row => {
    const est = row[iID];
    resumen[est] = resumen[est] || { tot: 0, asis: 0 };
    resumen[est].tot++;
    if (row[iP] === true) resumen[est].asis++;
  });

  let hoja = ss.getSheetByName('Reporte_Asistencia') || ss.insertSheet('Reporte_Asistencia');
  hoja.clear();

  // Preparar todos los datos para escritura batch
  const dataRows = [
    ['Asistencia – Curso:', curso],
    ['Estudiante', 'Total', 'Asist', '%']
  ];

  // Agregar datos de cada estudiante
  Object.keys(resumen).forEach(est => {
    const rec = resumen[est];
    dataRows.push([est, rec.tot, rec.asis, (rec.asis / rec.tot * 100).toFixed(1) + '%']);
  });

  // Escribir todo de una vez
  hoja.getRange(1, 1, dataRows.length, 4).setValues(dataRows);

  ui.showSidebar(HtmlService.createHtmlOutput('✅ «Reporte_Asistencia» generado').setWidth(200));
}

/****************************************************************
 *  BLOQUE DE GRABACIÓN DE CALIFICACIONES                       *
 ****************************************************************/
function recordNumericGrade(formData) {
  try {
    // ★ VALIDACIÓN DEL SERVIDOR
    // 1. Validar que existan los datos requeridos
    if (!formData || !formData.instrumentoId && !formData.instrumentoID) {
      throw new Error('ID de instrumento es requerido');
    }
    if (!formData.studentId) {
      throw new Error('ID de estudiante es requerido');
    }
    if (formData.grade === undefined || formData.grade === null || formData.grade === '') {
      throw new Error('La calificación es requerida');
    }

    // 2. Validar rango de calificación (0-10)
    const grade = parseFloat(formData.grade);
    if (isNaN(grade) || grade < 0 || grade > 10) {
      throw new Error('La calificación debe estar entre 0 y 10');
    }

    // 3. Validar longitud de comentarios
    if (formData.comments && formData.comments.length > 5000) {
      throw new Error('Los comentarios no pueden exceder 5000 caracteres');
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('CalificacionesDetalladas');
    if (!sheet) {
      sheet = ss.insertSheet('CalificacionesDetalladas');
      sheet.appendRow([
        'IDCalificacionDetalle','IDCalificacionMaestra','NombreInstrumento',
        'AlumnoEvaluador','NombreEstudiante','CursoEvaluado','NombreSituacion',
        'FechaEvaluacion','NombreCriterioEvaluado','NombreNivelAlcanzado',
        'PuntuacionCriterio','DescripcionItemEvaluado','CompletadoItem',
        'CalificacionTotalInstrumento','ComentariosGenerales','ComentariosGlobales'
      ]);
    }

    // 4. Validar que existan el instrumento y el estudiante
    const instrumento = getInstrumentoById(ss, formData.instrumentoId || formData.instrumentoID);
    const estudiante  = getEstudiantes(ss).find(est => est.IDEstudiante === formData.studentId);
    if (!instrumento) throw new Error('Instrumento no encontrado: ' + (formData.instrumentoId || formData.instrumentoID));
    if (!estudiante)  throw new Error('Estudiante no encontrado: ' + formData.studentId);

    const fecha      = new Date();
    const idDet      = Utilities.getUuid();
    const idMae      = Utilities.getUuid();
    const cursoEval  = estudiante.Curso || estudiante.CursoEvaluado || estudiante.CursoID || '';
    const nombreSitu = instrumento.NombreSituacion || getNombreSituacion(ss, instrumento);

    const newRow = [
      idDet, idMae, instrumento.NombreInstrumento,
      '', // AlumnoEvaluador
      estudiante.NombreEstudiante, cursoEval, nombreSitu,
      fecha,
      '', '', '', // NombreCriterio, NombreNivel, Puntuacion
      '',         // DescripcionItemEvaluado
      '',         // CompletadoItem
      formData.grade,
      '',         // ComentariosGenerales
      formData.comments || '' // ComentariosGlobales
    ];
    sheet.appendRow(newRow);

    return { success: true, message: 'Calificación guardada exitosamente' };
  } catch (error) {
    Logger.log('Error en recordNumericGrade: ' + error.toString());
    throw new Error('Error al guardar la calificación: ' + error.message);
  }
}

function recordNumericGradesBatch(payload) {
  try {
    // ★ VALIDACIÓN DEL SERVIDOR
    // 1. Validar estructura del payload
    if (!payload || !payload.instrumentoId || !Array.isArray(payload.records) || !payload.records.length) {
      throw new Error('Datos incompletos: instrumentoId y records son obligatorios.');
    }

    // 2. Validar cada registro individual
    payload.records.forEach((record, index) => {
      if (!record.studentId) {
        throw new Error(`Registro ${index + 1}: ID de estudiante es requerido`);
      }
      if (record.grade === undefined || record.grade === null) {
        throw new Error(`Registro ${index + 1}: calificación es requerida`);
      }
      const grade = parseFloat(record.grade);
      if (isNaN(grade) || grade < 0 || grade > 10) {
        throw new Error(`Registro ${index + 1}: calificación debe estar entre 0 y 10 (recibido: ${record.grade})`);
      }
    });

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('CalificacionesDetalladas');
    if (!sheet) {
      sheet = ss.insertSheet('CalificacionesDetalladas');
      sheet.appendRow([
        'IDCalificacionDetalle','IDCalificacionMaestra','NombreInstrumento',
        'AlumnoEvaluador','NombreEstudiante','CursoEvaluado','NombreSituacion',
        'FechaEvaluacion','NombreCriterioEvaluado','NombreNivelAlcanzado',
        'PuntuacionCriterio','DescripcionItemEvaluado','CompletadoItem',
        'CalificacionTotalInstrumento','ComentariosGenerales','ComentariosGlobales'
      ]);
    }

    const instrumento = getInstrumentoById(ss, payload.instrumentoId);
    if (!instrumento) throw new Error('Instrumento no encontrado: ' + payload.instrumentoId);

    const nombreInstrumento = payload.instrumentoNombre || instrumento.NombreInstrumento || 'Beep Test';
    const nombreSitu = payload.nombreSituacion || getNombreSituacion(ss, instrumento) || '';

    const estudiantes = getEstudiantes(ss);
    const estById = {};
    estudiantes.forEach(e => { estById[e.IDEstudiante] = e; });

    const now = new Date();
    const masterId = Utilities.getUuid();
    const criterioNombre = 'Beep Test - Resistencia';

    const rows = payload.records.map(r => {
      const est = estById[r.studentId];
      if (!est) throw new Error('Estudiante no encontrado: ' + r.studentId);
      const idDet = Utilities.getUuid();
      const nombreEst = est.NombreEstudiante || est.Nombre || est.Alumno || '';
      const cursoEval = (r.curso) || est.CursoID || est.Curso || '';

      return [
        idDet, masterId, nombreInstrumento,
        '', nombreEst, cursoEval, nombreSitu, now,
        criterioNombre, String(r.level ?? ''), Number(r.grade ?? 0),
        '', 'Sí', Number(r.grade ?? 0), '', ''
      ];
    });

    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 16).setValues(rows);

    Logger.log(`Guardado lote Beep Test: ${rows.length} filas · MasterID ${masterId}`);
    return { success: true, inserted: rows.length, masterId };

  } catch (err) {
    throw new Error('Error al guardar calificaciones en lote: ' + err.message);
  }
}

function recordListaCotejoGrade(formData) {
  try {
    // ★ VALIDACIÓN DEL SERVIDOR
    // 1. Validar datos requeridos
    if (!formData || !formData.instrumentoId && !formData.instrumentoID) {
      throw new Error('ID de instrumento es requerido');
    }
    if (!formData.studentId) {
      throw new Error('ID de estudiante es requerido');
    }
    if (!formData.items || !Array.isArray(formData.items) || formData.items.length === 0) {
      throw new Error('Se requiere al menos un ítem evaluado');
    }

    // 2. Validar estructura de los ítems
    formData.items.forEach((item, index) => {
      if (!item.IDItem && !item.id && !item.itemId) {
        throw new Error(`Ítem ${index + 1}: falta ID del ítem`);
      }
      if (typeof item.completado !== 'boolean') {
        throw new Error(`Ítem ${index + 1}: el campo completado debe ser booleano`);
      }
    });

    // 3. Validar longitud de comentarios
    if (formData.comments && formData.comments.length > 5000) {
      throw new Error('Los comentarios no pueden exceder 5000 caracteres');
    }

    const ss       = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet      = ss.getSheetByName('CalificacionesDetalladas');
    if (!sheet) {
      sheet = ss.insertSheet('CalificacionesDetalladas');
      sheet.appendRow([
        'IDCalificacionDetalle','IDCalificacionMaestra','NombreInstrumento',
        'AlumnoEvaluador','NombreEstudiante','CursoEvaluado','NombreSituacion',
        'FechaEvaluacion','NombreCriterioEvaluado','NombreNivelAlcanzado',
        'PuntuacionCriterio','DescripcionItemEvaluado','CompletadoItem',
        'CalificacionTotalInstrumento','ComentariosGenerales','ComentariosGlobales'
      ]);
    }

    const { headers: lcH, values: lcV } = getSheetData(ss, 'Definicion_ListasCotejo');
    const iLista = lcH.indexOf('IDListaCotejo');
    const iItem  = lcH.indexOf('IDItem');
    const iDesc  = lcH.indexOf('DescripcionItem');
    const descMap = {};
    lcV.forEach(row => { if (row[iLista] === formData.instrumentoId) { descMap[row[iItem]] = row[iDesc]; } });

    const idDet       = Utilities.getUuid();
    const idMae       = Utilities.getUuid();
    const instrumento = getInstrumentoById(ss, formData.instrumentoId || formData.instrumentoID);
    const estudiante  = getEstudiantes(ss).find(e => e.IDEstudiante === formData.studentId);
    if (!estudiante) throw new Error('Estudiante no encontrado: ' + formData.studentId);

    const fecha      = new Date();
    const totalItems = formData.items.length;
    const doneItems  = formData.items.filter(i => i.completado).length;
    const calTotal   = (doneItems / totalItems) * 10;
    const cursoEval  = estudiante.Curso || estudiante.CursoEvaluado || estudiante.CursoID || '';
    const nombreSitu = instrumento.NombreSituacion || getNombreSituacion(ss, instrumento);

    formData.items.forEach(item => {
      const itemId = item.IDItem || item.id || item.itemId;
      const descripcion = descMap[itemId] || '';
      const newRow = [
        idDet, idMae, instrumento.NombreInstrumento, '',
        estudiante.NombreEstudiante, cursoEval, nombreSitu, fecha,
        '', '', '', descripcion, (item.completado ? 'Sí' : 'No'),
        calTotal.toFixed(2), formData.comments || '', ''
      ];
      sheet.appendRow(newRow);
    });

    return { success: true, message: 'Lista de cotejo guardada correctamente' };
  } catch (err) {
    Logger.log('✖ recordListaCotejoGrade: ' + err);
    throw new Error('Error al guardar la lista de cotejo: ' + err.message);
  }
}

function recordRubricaGrade(formData) {
  try {
    // ★ VALIDACIÓN DEL SERVIDOR
    // 1. Validar datos requeridos
    if (!formData || !formData.instrumentoId && !formData.instrumentoID) {
      throw new Error('ID de instrumento es requerido');
    }
    if (!formData.studentId) {
      throw new Error('ID de estudiante es requerido');
    }
    if (!formData.criterios || !Array.isArray(formData.criterios) || formData.criterios.length === 0) {
      throw new Error('Se requiere al menos un criterio evaluado');
    }

    // 2. Validar estructura de los criterios
    formData.criterios.forEach((criterio, index) => {
      if (!criterio.criterioID) {
        throw new Error(`Criterio ${index + 1}: falta ID del criterio`);
      }
      if (!criterio.nivelID) {
        throw new Error(`Criterio ${index + 1}: falta ID del nivel`);
      }
    });

    // 3. Validar longitud de comentarios
    if (formData.comments && formData.comments.length > 5000) {
      throw new Error('Los comentarios no pueden exceder 5000 caracteres');
    }

    const ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet     = ss.getSheetByName('CalificacionesDetalladas');
    if (!sheet) {
      sheet = ss.insertSheet('CalificacionesDetalladas');
      sheet.appendRow([
        'IDCalificacionDetalle','IDCalificacionMaestra','NombreInstrumento',
        'AlumnoEvaluador','NombreEstudiante','CursoEvaluado','NombreSituacion',
        'FechaEvaluacion','NombreCriterioEvaluado','NombreNivelAlcanzado',
        'PuntuacionCriterio','DescripcionItemEvaluado','CompletadoItem',
        'CalificacionTotalInstrumento','ComentariosGenerales','ComentariosGlobales'
      ]);
    }

    const idDet        = Utilities.getUuid();
    const idMae        = Utilities.getUuid();
    const instrumento  = getInstrumentoById(ss, formData.instrumentoId || formData.instrumentoID);
    const estudiantes  = getEstudiantes(ss);
    const estudiante   = estudiantes.find(e => e.IDEstudiante === formData.studentId);
    if (!estudiante) throw new Error('Estudiante no encontrado: ' + formData.studentId);

    const fecha = new Date();
    const cursoEval = estudiante.Curso || estudiante.CursoEvaluado || estudiante.CursoID || '';
    const nombreSitu = instrumento.NombreSituacion || getNombreSituacion(ss, instrumento);

    const criteriosConPunt = formData.criterios.map(c => {
      const nivelInfo = getNivelInfo(ss, c.nivelID);
      return { criterioID: c.criterioID, nivelID: c.nivelID, nombreNivel: nivelInfo.NombreNivel, puntuacion: nivelInfo.PuntuacionNivel };
    });
    const puntuado = criteriosConPunt.reduce((sum, c) => sum + c.puntuacion, 0);

    const { headers: defH, values: defV } = getSheetData(ss, 'Definicion_Rubricas');
    const rubricaId = instrumento.IDInstrumentoTipo;
    const todasPunts = defV
      .filter(r => r[defH.indexOf('IDRubrica')] === rubricaId)
      .map(r => getNivelInfo(ss, r[defH.indexOf('IDNivel')]).PuntuacionNivel);
    const maxPorCriterio = Math.max(...todasPunts, 0);
    const numCriterios   = new Set(
      defV.filter(r => r[defH.indexOf('IDRubrica')] === rubricaId)
         .map(r => r[defH.indexOf('IDCriterio')])
    ).size;
    const maxPunt = maxPorCriterio * numCriterios;
    const calTotal = maxPunt > 0 ? (puntuado / maxPunt) * 10 : 0;

    criteriosConPunt.forEach(c => {
      const nombreCrit = getCriterioNombre(ss, c.criterioID);
      const newRow = [
        idDet, idMae, instrumento.NombreInstrumento, '',
        estudiante.NombreEstudiante, cursoEval, nombreSitu, fecha,
        nombreCrit, c.nombreNivel, c.puntuacion, '', '',
        calTotal.toFixed(2), formData.comments || '', ''
      ];
      sheet.appendRow(newRow);
    });

    Logger.log(`Rúbrica guardada: total=${puntuado}/${maxPunt} → nota ${calTotal.toFixed(2)}`);
    return { success: true, message: 'Rúbrica guardada exitosamente' };

  } catch (err) {
    Logger.log('✖ recordRubricaGrade: ' + err);
    throw new Error('Error al guardar la rúbrica: ' + err.message);
  }
}

function recordRubricaPeerGrade(formData) {
  try {
    // ★ VALIDACIÓN DEL SERVIDOR
    // 1. Validar datos requeridos
    if (!formData || !formData.instrumentoId && !formData.instrumentoID) {
      throw new Error('ID de instrumento es requerido');
    }
    if (!formData.evaluadorId) {
      throw new Error('ID del evaluador es requerido');
    }
    if (!formData.evaluadoId) {
      throw new Error('ID del evaluado es requerido');
    }
    if (!formData.criterios || !Array.isArray(formData.criterios) || formData.criterios.length === 0) {
      throw new Error('Se requiere al menos un criterio evaluado');
    }

    // 2. Validar que evaluador y evaluado no sean el mismo (excepto autoevaluación)
    const isAutoeval = formData.evaluadorId === formData.evaluadoId;
    // Se permite si es autoevaluación, validar en contexto si es necesario

    // 3. Validar estructura de los criterios
    formData.criterios.forEach((criterio, index) => {
      if (!criterio.criterioID) {
        throw new Error(`Criterio ${index + 1}: falta ID del criterio`);
      }
      if (!criterio.nivelID) {
        throw new Error(`Criterio ${index + 1}: falta ID del nivel`);
      }
      if (criterio.puntuacion !== undefined) {
        const punt = parseFloat(criterio.puntuacion);
        if (isNaN(punt) || punt < 0) {
          throw new Error(`Criterio ${index + 1}: puntuación inválida`);
        }
      }
    });

    // 4. Validar longitud de comentarios
    if (formData.comments && formData.comments.length > 5000) {
      throw new Error('Los comentarios no pueden exceder 5000 caracteres');
    }

    const ss         = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet        = ss.getSheetByName('CalificacionesDetalladas');
    if (!sheet) {
      sheet = ss.insertSheet('CalificacionesDetalladas');
      sheet.appendRow([
        'IDCalificacionDetalle','IDCalificacionMaestra','NombreInstrumento',
        'AlumnoEvaluador','NombreEstudiante','CursoEvaluado','NombreSituacion',
        'FechaEvaluacion','NombreCriterioEvaluado','NombreNivelAlcanzado',
        'PuntuacionCriterio','DescripcionItemEvaluado','CompletadoItem',
        'CalificacionTotalInstrumento','ComentariosGenerales','ComentariosGlobales'
      ]);
    }

    const idDet       = Utilities.getUuid();
    const idMae       = Utilities.getUuid();
    const instrumento = getInstrumentoById(ss, formData.instrumentoId || formData.instrumentoID);
    const estudiantes = getEstudiantes(ss);
    const evaluador   = estudiantes.find(e => e.IDEstudiante === formData.evaluadorId);
    const evaluado    = estudiantes.find(e => e.IDEstudiante === formData.evaluadoId);
    if (!evaluador) throw new Error('Evaluador no encontrado: ' + formData.evaluadorId);
    if (!evaluado)  throw new Error('Evaluado no encontrado: '  + formData.evaluadoId);

    const fecha      = new Date();
    const puntuado   = formData.criterios.reduce((sum, c) => sum + (c.puntuacion || 0), 0);
    const maxPunt    = formData.rubricaMaxPuntuacionPosible || 100;
    const calTotal   = (puntuado / maxPunt) * 10;

    const cursoEval = evaluado.Curso || evaluado.CursoEvaluado || evaluado.CursoID || '';
    const nombreSitu = instrumento.NombreSituacion || getNombreSituacion(ss, instrumento);

    formData.criterios.forEach(criterio => {
      const nombreCrit = getCriterioNombre(ss, criterio.criterioID);
      const nivelInfo  = getNivelInfo(ss, criterio.nivelID);
      const newRow = [
        idDet, idMae, instrumento.NombreInstrumento,
        evaluador.NombreEstudiante, evaluado.NombreEstudiante,
        cursoEval, nombreSitu, fecha,
        nombreCrit, nivelInfo.NombreNivel, criterio.puntuacion,
        '', '', calTotal.toFixed(2), formData.comments || '', ''
      ];
      sheet.appendRow(newRow);
    });

    Logger.log(`Peer guardada: Curso=${cursoEval} Situacion=${nombreSitu}`);
    return { success: true, message: 'Peer guardada exitosamente' };

  } catch (err) {
    Logger.log('✖ recordRubricaPeerGrade: ' + err);
    throw new Error('Error al guardar la evaluación peer: ' + err.message);
  }
}

/****************************************************************
 *  REPORTES DE NOTAS POR SITUACIÓN                             *
 ****************************************************************/
function reporteNotasSituacion() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Verificar que la hoja existe
  const sheet = ss.getSheetByName('CalificacionesDetalladas');
  if (!sheet) {
    ui.alert('⚠️ Error', 'La hoja "CalificacionesDetalladas" no existe.', ui.ButtonSet.OK);
    return;
  }

  // ✅ Usar lectura directa para evitar problemas con caché y stack overflow
  const { headers, values } = getSheetDataDirect(ss, 'CalificacionesDetalladas');

  // Verificar que hay datos
  if (!values || values.length === 0) {
    ui.alert('⚠️ Sin datos', 'La hoja "CalificacionesDetalladas" está vacía.', ui.ButtonSet.OK);
    return;
  }

  const idxC = headers.indexOf('CursoEvaluado');
  const idxS = headers.indexOf('NombreSituacion');

  // Verificar que las columnas existen
  if (idxC === -1 || idxS === -1) {
    ui.alert('⚠️ Error',
      'No se encontraron las columnas necesarias:\n' +
      (idxC === -1 ? '- CursoEvaluado\n' : '') +
      (idxS === -1 ? '- NombreSituacion\n' : ''),
      ui.ButtonSet.OK);
    return;
  }

  // ✅ Optimización: usar Set para evitar duplicados sin indexOf (más eficiente)
  const mapping = {};
  const tempSets = {}; // Usar Sets temporales para búsqueda O(1)

  // Procesar datos de forma más eficiente
  for (let i = 0; i < values.length; i++) {
    const r = values[i];
    const curso = r[idxC], sit = r[idxS];
    if (curso && sit) {
      if (!tempSets[curso]) {
        tempSets[curso] = new Set();
        mapping[curso] = [];
      }
      if (!tempSets[curso].has(sit)) {
        tempSets[curso].add(sit);
        mapping[curso].push(sit);
      }
    }
  }

  // Ordenar situaciones dentro de cada curso
  Object.keys(mapping).forEach(curso => {
    mapping[curso].sort();
  });

  const cursos = Object.keys(mapping).sort();

  // Verificar que hay cursos disponibles
  if (cursos.length === 0) {
    ui.alert('⚠️ Sin datos', 'No hay cursos con situaciones disponibles en "CalificacionesDetalladas".', ui.ButtonSet.OK);
    return;
  }

  const html = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
    <head><base target="_top">
      <script>
        const mapping = ${JSON.stringify(mapping)};
        document.addEventListener('DOMContentLoaded', () => {
          const cursoSel = document.getElementById('curso');
          const sitSel   = document.getElementById('situacion');
          function updateSituaciones() {
            const opts = mapping[cursoSel.value] || [];
            sitSel.innerHTML = opts.map(s => '<option value="'+s+'">'+s+'</option>').join('');
          }
          cursoSel.addEventListener('change', updateSituaciones);
          updateSituaciones();
          document.getElementById('generar').addEventListener('click', () => {
            const btn = document.getElementById('generar');
            btn.disabled = true;
            btn.textContent = 'Generando...';

            google.script.run
              .withSuccessHandler((result) => {
                if (result && result.success) {
                  alert('✅ ' + result.message);
                  google.script.host.close();
                } else {
                  alert('⚠️ ' + (result ? result.message : 'Error desconocido'));
                  btn.disabled = false;
                  btn.textContent = 'Generar';
                }
              })
              .withFailureHandler(err => {
                alert('❌ ERROR: ' + err.message);
                btn.disabled = false;
                btn.textContent = 'Generar';
              })
              .generateReporteNotasSituacion(cursoSel.value, sitSel.value);
          });
        });
      </script>
    </head>
    <body style="font-family:sans-serif;padding:12px">
      <label>Curso:<br>
        <select id="curso">${cursos.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
      </label><br><br>
      <label>Situación:<br>
        <select id="situacion"></select>
      </label><br><br>
      <button id="generar" type="button">Generar</button>
    </body>
    </html>
  `).setWidth(340).setHeight(260);

  ui.showModalDialog(html, 'Selecciona Reporte de Notas');
}

/**
 * Obtiene el mapeo de cursos y situaciones disponibles para reportes
 * Retorna un objeto con cursos como keys y arrays de situaciones como values
 */
function getCursosSituacionesMapping() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Verificar que la hoja existe
    const sheet = ss.getSheetByName('CalificacionesDetalladas');
    if (!sheet) {
      return { success: false, message: 'La hoja "CalificacionesDetalladas" no existe.' };
    }

    const { headers, values } = getSheetDataDirect(ss, 'CalificacionesDetalladas');

    // Verificar que hay datos
    if (!values || values.length === 0) {
      return { success: false, message: 'La hoja "CalificacionesDetalladas" está vacía.' };
    }

    const idxC = headers.indexOf('CursoEvaluado');
    const idxS = headers.indexOf('NombreSituacion');

    // Verificar que las columnas existen
    if (idxC === -1 || idxS === -1) {
      return {
        success: false,
        message: 'No se encontraron las columnas necesarias (CursoEvaluado, NombreSituacion).'
      };
    }

    // Usar Sets para evitar duplicados
    const mapping = {};
    const tempSets = {};

    // Procesar datos
    for (let i = 0; i < values.length; i++) {
      const r = values[i];
      const curso = r[idxC], sit = r[idxS];
      if (curso && sit) {
        if (!tempSets[curso]) {
          tempSets[curso] = new Set();
          mapping[curso] = [];
        }
        if (!tempSets[curso].has(sit)) {
          tempSets[curso].add(sit);
          mapping[curso].push(sit);
        }
      }
    }

    // Ordenar situaciones dentro de cada curso
    Object.keys(mapping).forEach(curso => {
      mapping[curso].sort();
    });

    // Verificar que hay cursos disponibles
    if (Object.keys(mapping).length === 0) {
      return {
        success: false,
        message: 'No hay cursos con situaciones disponibles en "CalificacionesDetalladas".'
      };
    }

    return {
      success: true,
      data: mapping
    };

  } catch (error) {
    Logger.log('Error en getCursosSituacionesMapping: ' + error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

function generateReporteNotasSituacion(curso, situacion) {
  try {
    // Validar parámetros
    if (!curso || !situacion) {
      return { success: false, message: 'Por favor seleccione curso y situación.' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // ✅ Usar lectura directa para evitar problemas con caché y stack overflow
    const { headers, values } = getSheetDataDirect(ss, 'CalificacionesDetalladas');

    // Verificar columnas necesarias
    const iE = headers.indexOf('NombreEstudiante');
    const iI = headers.indexOf('NombreInstrumento');
    const iF = headers.indexOf('FechaEvaluacion');
    const iT = headers.indexOf('CalificacionTotalInstrumento');
    const iC = headers.indexOf('CursoEvaluado');
    const iS = headers.indexOf('NombreSituacion');

    if (iE === -1 || iI === -1 || iF === -1 || iT === -1 || iC === -1 || iS === -1) {
      return {
        success: false,
        message: 'Faltan columnas requeridas en "CalificacionesDetalladas".'
      };
    }

    // ✅ Filtrar y agrupar datos de forma eficiente usando for loop
    const agrup = {};
    let datosEncontrados = 0;

    for (let i = 0; i < values.length; i++) {
      const r = values[i];
      // Filtrar por curso y situación
      if (r[iC] === curso && r[iS] === situacion) {
        datosEncontrados++;
        const est   = r[iE];
        const inst  = r[iI];
        const fecha = Utilities.formatDate(new Date(r[iF]), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        const key   = `${est}│${inst}│${fecha}`;
        const cal   = parseFloat(r[iT]) || 0;

        if (!agrup[key]) {
          agrup[key] = { est, inst, fecha, sum: 0, cnt: 0 };
        }
        agrup[key].sum += cal;
        agrup[key].cnt++;
      }
    }

    if (datosEncontrados === 0) {
      return {
        success: false,
        message: `No hay datos para "${curso}" / "${situacion}".`
      };
    }

    // Convertir agrupaciones a filas
    const filas = [];
    for (const key in agrup) {
      const o = agrup[key];
      filas.push([o.est, o.inst, o.fecha, (o.sum / o.cnt).toFixed(2)]);
    }

    // Crear o reemplazar hoja
    const nombreHoja = `RepNotas ${curso}-${situacion}`.substring(0, 99);
    const vieja = ss.getSheetByName(nombreHoja);
    if (vieja) ss.deleteSheet(vieja);
    const hoja = ss.insertSheet(nombreHoja, ss.getSheets().length);

    // Preparar todas las filas para escritura batch
    const allRows = [['Estudiante','Instrumento','Fecha','Calificación'], ...filas];

    // Escribir todo de una vez
    hoja.getRange(1, 1, allRows.length, 4).setValues(allRows);
    hoja.autoResizeColumns(1, 4);
    ss.setActiveSheet(hoja);

    // Preparar datos estructurados para la UI
    const reportData = filas.map(fila => ({
      Estudiante: fila[0],
      Instrumento: fila[1],
      Fecha: fila[2],
      Calificación: fila[3]
    }));

    return {
      success: true,
      message: `Reporte generado con ${filas.length} registro(s) en la hoja "${nombreHoja}".`,
      data: reportData,
      sheetName: nombreHoja
    };

  } catch (error) {
    Logger.log('Error en generateReporteNotasSituacion: ' + error.toString());
    return {
      success: false,
      message: 'Error al generar el reporte: ' + error.message
    };
  }
}

function calculaMediaPonderadaDesdeHoja() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();
  const name = sh.getName();

  if (!name.startsWith('RepNotas ')) { ui.alert('📌 Sitúate en una hoja que empiece por “RepNotas …”'); return; }
  const resto = name.substring(9);
  const dash  = resto.indexOf('-');
  if (dash < 0) { ui.alert('📌 El nombre de hoja debe ser “RepNotas <Curso>-<Situación>”'); return; }
  const curso = resto.substring(0, dash).trim();
  const situa = resto.substring(dash + 1).trim();

  const lastRow = sh.getLastRow();
  if (lastRow < 2) { ui.alert('❌ No hay datos en la hoja.'); return; }
  const datos = sh.getRange(2, 1, lastRow - 1, 4).getValues();

  const instrumentos = Array.from(new Set(datos.map(r => r[1])));
  const estudiantes  = Array.from(new Set(datos.map(r => r[0])));
  if (!instrumentos.length || !estudiantes.length) { ui.alert('❌ No se encontraron instrumentos o estudiantes.'); return; }

  const pesos = {};
  for (const inst of instrumentos) {
    const resp = ui.prompt('Peso (%)', `Instrumento «${inst}»:`, ui.ButtonSet.OK_CANCEL);
    if (resp.getSelectedButton() !== ui.Button.OK) { ui.alert('🚫 Cancelado.'); return; }
    const txt = resp.getResponseText().trim().replace(',', '.');
    const pct = parseFloat(txt);
    if (isNaN(pct) || pct < 0) { ui.alert(`❌ Peso inválido para «${inst}»: ${resp.getResponseText()}`); return; }
    pesos[inst] = pct;
  }

  const startCol = 6; // F
  const totalCols = instrumentos.length + 2; // Est + N inst + Media
  sh.getRange(1, startCol, sh.getMaxRows(), totalCols).clearContent();

  const headerRow = ['Estudiante', ...instrumentos, 'Media Ponderada'];
  sh.getRange(1, startCol, 1, headerRow.length).setValues([headerRow]);

  const pesoRow = ['Peso']
    .concat(instrumentos.map(i => {
      const p = pesos[i];
      const s = (p % 1 === 0 ? `${p}` : `${p}`.replace('.', ','));
      return s + '%';
    }))
    .concat(['']);
  sh.getRange(2, startCol, 1, pesoRow.length).setValues([pesoRow]);

  const cuerpo = estudiantes.map(est => {
    const fila = instrumentos.map(inst => {
      const notas = datos.filter(r => r[0] === est && r[1] === inst).map(r => parseFloat(r[3]) || 0);
      if (!notas.length) return '';
      const avg = notas.reduce((a, b) => a + b, 0) / notas.length;
      return avg.toFixed(2).replace('.', ',');
    });
    return [est, ...fila, ''];
  });
  sh.getRange(3, startCol, cuerpo.length, headerRow.length).setValues(cuerpo);

  for (let i = 0; i < estudiantes.length; i++) {
    const row = 3 + i;
    const terms = instrumentos.map((inst, j) => {
      const colNum = startCol + 1 + j; // G, H, ...
      const letra  = colToLetter(colNum);
      return `${letra}$2*${letra}${row}`; // peso * nota
    });
    const formula = `=${terms.join('+')}`;
    sh.getRange(row, startCol + instrumentos.length + 1).setFormula(formula);
  }

  sh.autoResizeColumns(startCol, totalCols);
  ui.alert(`✅ Medias ponderadas añadidas en “${name}”\nCurso: ${curso}\nSituación: ${situa}`);
}

/**
 * Obtiene la lista de hojas de reporte disponibles (RepNotas)
 * Para que la UI pueda mostrar un selector
 */
function getHojasReportes() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();
    const reportSheets = sheets
      .filter(s => s.getName().startsWith('RepNotas '))
      .map(s => s.getName())
      .sort();

    if (reportSheets.length === 0) {
      return {
        success: false,
        message: 'No hay hojas de reporte disponibles. Genera primero un reporte por curso-situación.'
      };
    }

    return {
      success: true,
      data: reportSheets
    };

  } catch (error) {
    Logger.log('Error en getHojasReportes: ' + error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

/**
 * Obtiene la lista de instrumentos de una hoja RepNotas específica
 * Para que la UI pueda solicitar los pesos
 */
function getInstrumentosDeReporte(nombreHoja) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName(nombreHoja);

    if (!sh) {
      return { success: false, message: 'La hoja "' + nombreHoja + '" no existe.' };
    }

    if (!nombreHoja.startsWith('RepNotas ')) {
      return { success: false, message: 'La hoja debe comenzar con "RepNotas "' };
    }

    const lastRow = sh.getLastRow();
    if (lastRow < 2) {
      return { success: false, message: 'No hay datos en la hoja.' };
    }

    const datos = sh.getRange(2, 1, lastRow - 1, 4).getValues();
    const instrumentos = Array.from(new Set(datos.map(r => r[1])));
    const estudiantes = Array.from(new Set(datos.map(r => r[0])));

    if (!instrumentos.length || !estudiantes.length) {
      return { success: false, message: 'No se encontraron instrumentos o estudiantes.' };
    }

    // Extraer curso y situación del nombre de hoja
    const resto = nombreHoja.substring(9);
    const dash = resto.indexOf('-');
    const curso = dash >= 0 ? resto.substring(0, dash).trim() : '';
    const situa = dash >= 0 ? resto.substring(dash + 1).trim() : '';

    return {
      success: true,
      data: {
        instrumentos: instrumentos,
        estudiantes: estudiantes.length,
        curso: curso,
        situacion: situa
      }
    };

  } catch (error) {
    Logger.log('Error en getInstrumentosDeReporte: ' + error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

/**
 * Calcula medias ponderadas en una hoja RepNotas con los pesos especificados
 * Versión compatible con UI que recibe los pesos como parámetro
 */
function calcularMediaPonderada(nombreHoja, pesos) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName(nombreHoja);

    if (!sh) {
      return { success: false, message: 'La hoja "' + nombreHoja + '" no existe.' };
    }

    const name = sh.getName();
    if (!name.startsWith('RepNotas ')) {
      return { success: false, message: 'La hoja debe comenzar con "RepNotas "' };
    }

    const resto = name.substring(9);
    const dash = resto.indexOf('-');
    if (dash < 0) {
      return { success: false, message: 'El nombre de hoja debe ser "RepNotas <Curso>-<Situación>"' };
    }
    const curso = resto.substring(0, dash).trim();
    const situa = resto.substring(dash + 1).trim();

    const lastRow = sh.getLastRow();
    if (lastRow < 2) {
      return { success: false, message: 'No hay datos en la hoja.' };
    }

    const datos = sh.getRange(2, 1, lastRow - 1, 4).getValues();
    const instrumentos = Array.from(new Set(datos.map(r => r[1])));
    const estudiantes = Array.from(new Set(datos.map(r => r[0])));

    if (!instrumentos.length || !estudiantes.length) {
      return { success: false, message: 'No se encontraron instrumentos o estudiantes.' };
    }

    // Validar que todos los instrumentos tienen peso
    for (const inst of instrumentos) {
      if (pesos[inst] === undefined || pesos[inst] === null) {
        return { success: false, message: 'Falta el peso para el instrumento: ' + inst };
      }
      const peso = parseFloat(pesos[inst]);
      if (isNaN(peso) || peso < 0) {
        return { success: false, message: 'Peso inválido para ' + inst + ': ' + pesos[inst] };
      }
    }

    const startCol = 6; // F
    const totalCols = instrumentos.length + 2; // Est + N inst + Media
    sh.getRange(1, startCol, sh.getMaxRows(), totalCols).clearContent();

    const headerRow = ['Estudiante', ...instrumentos, 'Media Ponderada'];
    sh.getRange(1, startCol, 1, headerRow.length).setValues([headerRow]);

    const pesoRow = ['Peso']
      .concat(instrumentos.map(i => {
        const p = parseFloat(pesos[i]);
        const s = (p % 1 === 0 ? `${p}` : `${p}`.replace('.', ','));
        return s + '%';
      }))
      .concat(['']);
    sh.getRange(2, startCol, 1, pesoRow.length).setValues([pesoRow]);

    const cuerpo = estudiantes.map(est => {
      const fila = instrumentos.map(inst => {
        const notas = datos.filter(r => r[0] === est && r[1] === inst).map(r => parseFloat(r[3]) || 0);
        if (!notas.length) return '';
        const avg = notas.reduce((a, b) => a + b, 0) / notas.length;
        return avg.toFixed(2).replace('.', ',');
      });
      return [est, ...fila, ''];
    });
    sh.getRange(3, startCol, cuerpo.length, headerRow.length).setValues(cuerpo);

    for (let i = 0; i < estudiantes.length; i++) {
      const row = 3 + i;
      const terms = instrumentos.map((inst, j) => {
        const colNum = startCol + 1 + j; // G, H, ...
        const letra = colToLetter(colNum);
        return `${letra}$2*${letra}${row}`; // peso * nota
      });
      const formula = `=${terms.join('+')}`;
      sh.getRange(row, startCol + instrumentos.length + 1).setFormula(formula);
    }

    sh.autoResizeColumns(startCol, totalCols);

    return {
      success: true,
      message: `✅ Medias ponderadas añadidas en "${name}"\nCurso: ${curso}\nSituación: ${situa}`
    };

  } catch (error) {
    Logger.log('Error en calcularMediaPonderada: ' + error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

/** Convierte número de columna a letra (1→A, 27→AA, …) */
function colToLetter(num) {
  let s = '';
  while (num > 0) {
    const m = (num - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}

/****************************************************************
 *  DASHBOARD - INTERFAZ HTML PRINCIPAL                         *
 ****************************************************************/

/**
 * Abre el dashboard principal del sistema de evaluación
 * Permite elegir entre ventana modal o ventana nueva del navegador
 */
function openDashboard() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '🎯 Panel de Control de Evaluación',
    '¿Cómo deseas abrir el dashboard?\n\n' +
    '• SÍ = Abrir en VENTANA NUEVA del navegador (recomendado)\n' +
    '• NO = Abrir en MODAL dentro de Google Sheets\n' +
    '• CANCELAR = No abrir',
    ui.ButtonSet.YES_NO_CANCEL
  );

  if (response === ui.Button.YES) {
    openDashboardInNewWindow();
  } else if (response === ui.Button.NO) {
    openDashboardInModal();
  }
  // Si es CANCEL, no hace nada
}

/**
 * Abre el dashboard en una ventana nueva del navegador usando la URL de la Web App
 * Ahora usa un archivo HTML separado en lugar de código HTML embebido
 */
function openDashboardInNewWindow() {
  const html = HtmlService.createHtmlOutputFromFile('dashboard_opener')
    .setWidth(650)
    .setHeight(450)
    .setTitle('Abrir Panel de Control');

  SpreadsheetApp.getUi().showModalDialog(html, 'Abrir Panel de Control');
}

/**
 * Abre el dashboard en un modal dentro de Google Sheets
 * Optimizado para mejor visualización
 */
function openDashboardInModal() {
  const html = HtmlService.createHtmlOutputFromFile('dashboard')
    .setWidth(1200)  // Tamaño más manejable que se adapta a la mayoría de pantallas
    .setHeight(800)  // Altura óptima que permite ver el contenido sin scroll excesivo
    .setTitle('📊 Panel de Control de Evaluación');

  SpreadsheetApp.getUi().showModalDialog(html, '📊 Panel de Control de Evaluación');
}

/**
 * Obtiene la URL de la WebApp
 */
function getWebAppUrl() {
  return ScriptApp.getService().getUrl();
}

// ============================================================================
// ⚠️ FUNCIONES PRINCIPALES DEL DASHBOARD MOVIDAS AL FINAL DEL ARCHIVO
// Las versiones optimizadas con caché están en las líneas 2600+
// ============================================================================
// ⚠️ Funciones registrarAsistenciaBatch, getRecentAttendance, getInstrumentosData
// también están al final del archivo (líneas 2700+) en versiones optimizadas
// ============================================================================

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

/**
 * Wrapper Dialog para reporteCalificacionPorEstudiante
 * Solicita el ID del estudiante al usuario mediante un diálogo
 */
function reporteCalificacionPorEstudianteDialog() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Calificaciones por alumno', 'Ingrese el ID o nombre del estudiante:', ui.ButtonSet.OK_CANCEL);

  if (r.getSelectedButton() !== ui.Button.OK) return;

  const alumno = r.getResponseText().trim();
  if (!alumno) {
    ui.alert('Por favor ingrese un ID o nombre de estudiante válido');
    return;
  }

  const resultado = reporteCalificacionPorEstudiante(alumno);

  if (resultado.success === false) {
    ui.alert(resultado.message);
  } else {
    ui.showSidebar(HtmlService.createHtmlOutput('✅ «Reporte_Calificaciones» generado').setWidth(200));
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

/**
 * Wrapper Dialog para reporteCalificacionPorCurso
 * Solicita el ID del curso al usuario mediante un diálogo
 */
function reporteCalificacionPorCursoDialog() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Calificaciones por curso', 'Ingrese el ID del curso:', ui.ButtonSet.OK_CANCEL);

  if (r.getSelectedButton() !== ui.Button.OK) return;

  const curso = r.getResponseText().trim();
  if (!curso) {
    ui.alert('Por favor ingrese un ID de curso válido');
    return;
  }

  const resultado = reporteCalificacionPorCurso(curso);

  if (resultado.success === false) {
    ui.alert(resultado.message);
  } else {
    ui.showSidebar(HtmlService.createHtmlOutput('✅ «Reporte_Calificaciones» generado').setWidth(200));
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

    let hoja = ss.getSheetByName('Comparativa_Estudiantes') || ss.insertSheet('Comparativa_Estudiantes');
    hoja.clear();

    const dataRows = [
      ['IDEstudiante', 'Total', 'Asistencias', 'Faltas', '% Asistencia'],
      [data1.id, data1.total, data1.asistencias, data1.faltas, data1.porcentaje],
      [data2.id, data2.total, data2.asistencias, data2.faltas, data2.porcentaje]
    ];
    hoja.getRange(1, 1, dataRows.length, 5).setValues(dataRows);

    return { success: true, message: 'Comparativa generada en hoja "Comparativa_Estudiantes"', data: [data1, data2] };
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

    return { success: true, message: 'Comparativa generada en hoja "Comparativa_Cursos"', data: [data1, data2] };
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

    return { success: true, message: 'Comparativa generada en hoja "Comparativa_Calificaciones_Estudiantes"', data: [data1, data2] };
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

    return { success: true, message: 'Comparativa generada en hoja "Comparativa_Calificaciones_Cursos"', data: [data1, data2] };
  } catch (error) {
    Logger.log('Error en compararCalificacionesCursos: ' + error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

/**
 * FUNCIONES FALTANTES PARA EL DASHBOARD (stubs temporales)
 */
/**
 * Genera un reporte avanzado de asistencia con estadísticas globales
 * Incluye resumen por curso y por estudiante
 */
function reporteAsistenciaAvanzada_UI() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const { headers, values } = getSheetData(ss, 'RegistroAsistencia');

    if (!values || values.length === 0) {
      return { success: false, message: 'No hay datos de asistencia disponibles' };
    }

    // Obtener índices de columnas
    const iID = headers.indexOf('IDEstudiante');
    const iCurso = headers.indexOf('CursoID');
    const iPresente = headers.indexOf('Presente');
    const iFecha = headers.indexOf('Fecha');

    // Estadísticas globales
    const totalRegistros = values.length;
    const totalPresentes = values.filter(row => row[iPresente] === true).length;
    const totalAusentes = totalRegistros - totalPresentes;
    const porcentajeGlobal = ((totalPresentes / totalRegistros) * 100).toFixed(1);

    // Estadísticas por estudiante
    const estatudiantesMap = {};
    values.forEach(row => {
      const est = row[iID];
      if (!estatudiantesMap[est]) {
        estatudiantesMap[est] = { total: 0, presentes: 0 };
      }
      estatudiantesMap[est].total++;
      if (row[iPresente] === true) estatudiantesMap[est].presentes++;
    });

    // Estadísticas por curso
    const cursosMap = {};
    values.forEach(row => {
      const curso = row[iCurso];
      if (!cursosMap[curso]) {
        cursosMap[curso] = { total: 0, presentes: 0 };
      }
      cursosMap[curso].total++;
      if (row[iPresente] === true) cursosMap[curso].presentes++;
    });

    // Crear hoja de reporte
    let hoja = ss.getSheetByName('Reporte_Avanzado_Asistencia') || ss.insertSheet('Reporte_Avanzado_Asistencia');
    hoja.clear();

    // Preparar datos para escritura
    const dataRows = [
      ['=== REPORTE AVANZADO DE ASISTENCIA ==='],
      [],
      ['📊 ESTADÍSTICAS GLOBALES'],
      ['Total de registros:', totalRegistros],
      ['Total presentes:', totalPresentes],
      ['Total ausentes:', totalAusentes],
      ['Porcentaje de asistencia:', porcentajeGlobal + '%'],
      [],
      ['📚 ESTADÍSTICAS POR CURSO'],
      ['Curso', 'Total Registros', 'Presentes', 'Ausentes', '% Asistencia']
    ];

    // Agregar datos por curso
    Object.keys(cursosMap).sort().forEach(curso => {
      const stats = cursosMap[curso];
      const ausentes = stats.total - stats.presentes;
      const pct = ((stats.presentes / stats.total) * 100).toFixed(1);
      dataRows.push([curso, stats.total, stats.presentes, ausentes, pct + '%']);
    });

    dataRows.push([]);
    dataRows.push(['👤 ESTADÍSTICAS POR ESTUDIANTE']);
    dataRows.push(['Estudiante', 'Total Registros', 'Presentes', 'Ausentes', '% Asistencia']);

    // Agregar datos por estudiante
    Object.keys(estatudiantesMap).sort().forEach(est => {
      const stats = estatudiantesMap[est];
      const ausentes = stats.total - stats.presentes;
      const pct = ((stats.presentes / stats.total) * 100).toFixed(1);
      dataRows.push([est, stats.total, stats.presentes, ausentes, pct + '%']);
    });

    // Escribir todo de una vez
    hoja.getRange(1, 1, dataRows.length, 5).setValues(dataRows);

    // Formatear encabezados
    hoja.getRange(1, 1).setFontWeight('bold').setFontSize(12);
    hoja.getRange(3, 1).setFontWeight('bold');
    hoja.getRange(9, 1).setFontWeight('bold');
    hoja.getRange(9 + Object.keys(cursosMap).length + 2, 1).setFontWeight('bold');

    // Autoajustar columnas
    hoja.autoResizeColumns(1, 5);

    // Preparar datos para retornar a la UI
    const data = {
      global: {
        totalRegistros,
        totalPresentes,
        totalAusentes,
        porcentajeGlobal
      },
      cursos: Object.keys(cursosMap).sort().map(curso => {
        const stats = cursosMap[curso];
        return {
          curso,
          total: stats.total,
          presentes: stats.presentes,
          ausentes: stats.total - stats.presentes,
          porcentaje: ((stats.presentes / stats.total) * 100).toFixed(1)
        };
      }),
      estudiantes: Object.keys(estatudiantesMap).sort().map(est => {
        const stats = estatudiantesMap[est];
        return {
          estudiante: est,
          total: stats.total,
          presentes: stats.presentes,
          ausentes: stats.total - stats.presentes,
          porcentaje: ((stats.presentes / stats.total) * 100).toFixed(1)
        };
      })
    };

    return {
      success: true,
      message: '✅ Reporte avanzado generado en la hoja "Reporte_Avanzado_Asistencia"',
      data: data
    };

  } catch (error) {
    Logger.log('Error en reporteAsistenciaAvanzada_UI: ' + error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

/**
 * Lista todos los reportes existentes en el spreadsheet
 * Identifica reportes por el patrón de nombre de las pestañas
 */
function listarReportesExistentes() {
  try {
    // Validar que SPREADSHEET_ID esté configurado
    if (!SPREADSHEET_ID || SPREADSHEET_ID === 'TU_SPREADSHEET_ID_AQUI') {
      Logger.log('ERROR: SPREADSHEET_ID no está configurado correctamente');
      return {
        success: false,
        message: 'Error de configuración: SPREADSHEET_ID no está definido. Por favor, configura el ID de tu hoja de cálculo en Code.gs'
      };
    }

    Logger.log('=== INICIO listarReportesExistentes ===');
    Logger.log('SPREADSHEET_ID: ' + SPREADSHEET_ID);

    let ss;
    let metodoAcceso = '';

    try {
      Logger.log('Método 1: Intentando SpreadsheetApp.openById...');
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      metodoAcceso = 'openById';
      Logger.log('✓ Éxito con openById');
    } catch (ssError) {
      Logger.log('✖ Falló openById: ' + ssError.message);
      Logger.log('Stack: ' + (ssError.stack || 'N/A'));

      // Intentar con el spreadsheet activo como fallback
      try {
        Logger.log('Método 2: Intentando SpreadsheetApp.getActiveSpreadsheet...');
        ss = SpreadsheetApp.getActiveSpreadsheet();
        metodoAcceso = 'getActiveSpreadsheet';
        Logger.log('✓ Éxito con getActiveSpreadsheet');
      } catch (activeError) {
        Logger.log('✖ Falló getActiveSpreadsheet: ' + activeError.message);
        Logger.log('Stack: ' + (activeError.stack || 'N/A'));

        return {
          success: false,
          message: 'No se puede acceder al spreadsheet. Error original: ' + ssError.message + '. Error fallback: ' + activeError.message
        };
      }
    }

    Logger.log('Spreadsheet abierto con método: ' + metodoAcceso);
    Logger.log('Spreadsheet ID real: ' + ss.getId());
    Logger.log('Spreadsheet nombre: ' + ss.getName());

    let sheets;
    try {
      sheets = ss.getSheets();
      Logger.log('✓ Total de hojas obtenidas: ' + sheets.length);
    } catch (sheetError) {
      Logger.log('✖ Error al obtener hojas: ' + sheetError.message);
      return {
        success: false,
        message: 'Error al obtener hojas del spreadsheet: ' + sheetError.message
      };
    }

    // Usar fecha actual para evitar problemas de permisos con DriveApp
    const ultimaModificacion = new Date();

    const reportes = [];

    sheets.forEach(sheet => {
      const nombre = sheet.getName();
      let tipo = null;
      let subtipo = null;
      let info = {};

      Logger.log('Analizando hoja: "' + nombre + '"');

      // ========================================
      // 📊 REPORTES DE NOTAS
      // ========================================

      // 1. Reportes de notas por situación (formato: "RepNotas CURSO-SITUACION")
      if (nombre.startsWith('RepNotas ')) {
        Logger.log('  ✓ Coincide con patrón RepNotas');
        tipo = 'notas';
        subtipo = 'situacion';
        const resto = nombre.substring(9); // Quitar "RepNotas "
        const dashIndex = resto.indexOf('-');
        if (dashIndex > 0) {
          info = {
            curso: resto.substring(0, dashIndex).trim(),
            situacion: resto.substring(dashIndex + 1).trim(),
            descripcion: `Notas: ${resto.substring(0, dashIndex).trim()} - ${resto.substring(dashIndex + 1).trim()}`
          };
        } else {
          info = {
            descripcion: resto.trim() || 'Reporte de notas'
          };
        }
      }

      // 2. Reportes de calificaciones por estudiante
      else if (nombre === 'Reporte_Calif_Estudiante') {
        tipo = 'notas';
        subtipo = 'estudiante';
        info = { descripcion: 'Calificaciones por estudiante' };
      }

      // 3. Reportes de calificaciones por curso
      else if (nombre === 'Reporte_Calif_Curso') {
        tipo = 'notas';
        subtipo = 'curso';
        info = { descripcion: 'Calificaciones por curso' };
      }

      // 4. Reportes generales de calificaciones
      else if (nombre === 'Reporte_Calificaciones') {
        tipo = 'notas';
        subtipo = 'general';
        info = { descripcion: 'Reporte general de calificaciones' };
      }

      // ========================================
      // 📋 REPORTES DE ASISTENCIA
      // ========================================

      // 1. Reportes avanzados de asistencia
      else if (nombre === 'Reporte_Asistencia_Av') {
        tipo = 'asistencia';
        subtipo = 'avanzado';
        info = { descripcion: 'Reporte avanzado de asistencia por curso' };
      }
      else if (nombre === 'Reporte_Asistencia_Av_Diario') {
        tipo = 'asistencia';
        subtipo = 'avanzado_diario';
        info = { descripcion: 'Reporte consolidado diario de asistencia' };
      }
      else if (nombre === 'Reporte_Avanzado_Asistencia') {
        tipo = 'asistencia';
        subtipo = 'avanzado_completo';
        info = { descripcion: 'Reporte completo de asistencia con estadísticas' };
      }

      // 2. Reportes de asistencia con fecha o sufijo
      else if (nombre.startsWith('Reporte_Asistencia_') && nombre !== 'Reporte_Asistencia_Av' && nombre !== 'Reporte_Asistencia_Av_Diario') {
        tipo = 'asistencia';
        subtipo = 'fecha';
        const sufijo = nombre.substring(19); // Quitar "Reporte_Asistencia_"
        info = {
          fecha: sufijo,
          descripcion: `Asistencia - ${sufijo}`
        };
      }

      // 3. Reporte de asistencia simple
      else if (nombre === 'Reporte_Asistencia') {
        tipo = 'asistencia';
        subtipo = 'simple';
        info = { descripcion: 'Reporte de asistencia' };
      }

      // ========================================
      // 🔄 COMPARATIVAS
      // ========================================

      // 1. Comparativas de estudiantes
      else if (nombre === 'Comparativa_Estudiantes') {
        tipo = 'comparativa';
        subtipo = 'estudiantes';
        info = { descripcion: 'Comparativa entre estudiantes' };
      }

      // 2. Comparativas de cursos
      else if (nombre === 'Comparativa_Cursos') {
        tipo = 'comparativa';
        subtipo = 'cursos';
        info = { descripcion: 'Comparativa entre cursos' };
      }

      // 3. Comparativas de calificaciones por estudiantes
      else if (nombre === 'Comparativa_Calificaciones_Estudiantes' || nombre === 'Comparativa_Calif_Est') {
        tipo = 'comparativa';
        subtipo = 'calificaciones_estudiantes';
        info = { descripcion: 'Comparativa de calificaciones entre estudiantes' };
      }

      // 4. Comparativas de calificaciones por cursos
      else if (nombre === 'Comparativa_Calificaciones_Cursos' || nombre === 'Comparativa_Calif_Cursos') {
        tipo = 'comparativa';
        subtipo = 'calificaciones_cursos';
        info = { descripcion: 'Comparativa de calificaciones entre cursos' };
      }

      // ========================================
      // 🔧 DIAGNÓSTICO
      // ========================================

      else if (nombre === 'Diagnostico_Sistema') {
        tipo = 'diagnostico';
        subtipo = 'sistema';
        info = { descripcion: 'Diagnóstico del sistema' };
      }

      // Agregar TODAS las pestañas a la lista (sin filtro)
      // Si no se identificó un tipo específico, usar 'general'
      reportes.push({
        nombre: nombre,
        tipo: tipo || 'general',
        subtipo: subtipo || 'general',
        info: info.descripcion ? info : { descripcion: nombre },
        ultimaModificacion: ultimaModificacion
      });
    });

    Logger.log('Total de reportes identificados: ' + reportes.length);

    // Ordenar por nombre (alfabéticamente) ya que todos tienen la misma fecha
    try {
      reportes.sort((a, b) => {
        const nombreA = a.nombre || '';
        const nombreB = b.nombre || '';
        return nombreA.localeCompare(nombreB);
      });
      Logger.log('✓ Reportes ordenados correctamente');
    } catch (sortError) {
      Logger.log('⚠️ Error al ordenar reportes: ' + sortError.message);
    }

    // Intentar loggear los nombres de reportes de forma segura
    try {
      const nombres = reportes.map(r => r.nombre || '(sin nombre)').join(', ');
      Logger.log('Reportes encontrados: ' + nombres);
    } catch (logError) {
      Logger.log('⚠️ No se pudo loggear nombres de reportes: ' + logError.message);
    }

    Logger.log('=== FIN listarReportesExistentes - Retornando éxito con ' + reportes.length + ' reportes ===');

    return {
      success: true,
      data: reportes
    };

  } catch (error) {
    const errorMsg = 'Error en listarReportesExistentes: ' + error.toString() +
                     ' | Stack: ' + (error.stack || 'No disponible');
    Logger.log(errorMsg);
    return {
      success: false,
      message: 'Error al obtener reportes: ' + error.message + '. Revisa la consola de Apps Script para más detalles.'
    };
  }
}

/**
 * Lee los datos de un reporte existente por nombre de hoja
 */
function leerReporteExistente(nombreHoja) {
  try {
    if (!nombreHoja) {
      return { success: false, message: 'Debe especificar el nombre de la hoja' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(nombreHoja);

    if (!sheet) {
      return { success: false, message: 'No se encontró la hoja "' + nombreHoja + '"' };
    }

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow < 2) {
      return { success: false, message: 'La hoja no contiene datos' };
    }

    // Leer encabezados y datos
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    // Convertir a objetos
    const data = values.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    return {
      success: true,
      data: data,
      headers: headers,
      sheetName: nombreHoja
    };

  } catch (error) {
    Logger.log('Error en leerReporteExistente: ' + error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

/**
 * Exporta un reporte específico a PDF
 * @param {string} nombreHoja - Nombre de la hoja a exportar
 * @return {Object} URL de descarga del PDF o error
 */
function exportarReportePDF(nombreHoja) {
  try {
    if (!nombreHoja) {
      return { success: false, message: 'Debe especificar el nombre de la hoja' };
    }

    Logger.log('Exportando a PDF la hoja: ' + nombreHoja);

    // Validar que SPREADSHEET_ID esté configurado
    if (!SPREADSHEET_ID || SPREADSHEET_ID === 'TU_SPREADSHEET_ID_AQUI') {
      Logger.log('ERROR: SPREADSHEET_ID no está configurado');
      return {
        success: false,
        message: 'Error de configuración: SPREADSHEET_ID no está definido'
      };
    }

    let ss;
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (ssError) {
      Logger.log('ERROR al abrir spreadsheet: ' + ssError);
      // Intentar con el spreadsheet activo como fallback
      try {
        ss = SpreadsheetApp.getActiveSpreadsheet();
        Logger.log('Usando spreadsheet activo');
      } catch (activeError) {
        Logger.log('ERROR al obtener spreadsheet activo: ' + activeError);
        return {
          success: false,
          message: 'No se puede acceder al spreadsheet'
        };
      }
    }

    const sheet = ss.getSheetByName(nombreHoja);

    if (!sheet) {
      Logger.log('ERROR: No se encontró la hoja "' + nombreHoja + '"');
      return { success: false, message: 'No se encontró la hoja "' + nombreHoja + '"' };
    }

    // Construir URL de exportación a PDF
    const sheetId = sheet.getSheetId();
    const url = ss.getUrl().replace(/edit$/, 'export?format=pdf&gid=' + sheetId);

    Logger.log('PDF URL generada correctamente: ' + url);

    return {
      success: true,
      url: url,
      nombreArchivo: nombreHoja + '.pdf',
      message: 'URL de descarga generada correctamente'
    };

  } catch (error) {
    const errorMsg = 'Error en exportarReportePDF: ' + error.toString() +
                     ' | Stack: ' + (error.stack || 'No disponible');
    Logger.log(errorMsg);
    return {
      success: false,
      message: 'Error al exportar a PDF: ' + error.message
    };
  }
}

/**
 * Función de diagnóstico para verificar configuración y hojas disponibles
 * Ejecuta esta función manualmente desde el editor de Apps Script para ver
 * información detallada sobre el spreadsheet y las hojas
 */
function diagnosticoReportes() {
  Logger.log('=== INICIO DIAGNÓSTICO DE REPORTES ===');

  try {
    // Verificar SPREADSHEET_ID
    Logger.log('1. Verificando SPREADSHEET_ID...');
    Logger.log('   SPREADSHEET_ID = ' + SPREADSHEET_ID);

    if (!SPREADSHEET_ID || SPREADSHEET_ID === 'TU_SPREADSHEET_ID_AQUI') {
      Logger.log('   ⚠️ ERROR: SPREADSHEET_ID no está configurado correctamente');
      Logger.log('   Por favor, configura el SPREADSHEET_ID en la línea 6 de Code.gs');
      return;
    }
    Logger.log('   ✓ SPREADSHEET_ID está configurado');

    // Abrir spreadsheet
    Logger.log('2. Intentando abrir spreadsheet...');
    let ss;
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      Logger.log('   ✓ Spreadsheet abierto correctamente usando ID');
    } catch (error) {
      Logger.log('   ⚠️ Error al abrir por ID: ' + error);
      Logger.log('   Intentando usar spreadsheet activo...');
      ss = SpreadsheetApp.getActiveSpreadsheet();
      Logger.log('   ✓ Usando spreadsheet activo');
    }

    // Obtener información del spreadsheet
    Logger.log('3. Información del spreadsheet:');
    Logger.log('   Nombre: ' + ss.getName());
    Logger.log('   URL: ' + ss.getUrl());
    Logger.log('   ID: ' + ss.getId());

    // Listar todas las hojas
    Logger.log('4. Listando todas las hojas...');
    const sheets = ss.getSheets();
    Logger.log('   Total de hojas: ' + sheets.length);

    Logger.log('5. Detalle de cada hoja:');
    sheets.forEach((sheet, index) => {
      const nombre = sheet.getName();
      Logger.log('   [' + (index + 1) + '] ' + nombre);

      // Identificar tipo de reporte
      if (nombre.startsWith('RepNotas ')) {
        Logger.log('       → Tipo: Reporte de Notas ✓');
      } else if (nombre.startsWith('Reporte_Asistencia')) {
        Logger.log('       → Tipo: Reporte de Asistencia ✓');
      } else if (nombre.startsWith('Reporte_Calif')) {
        Logger.log('       → Tipo: Reporte de Calificaciones ✓');
      } else if (nombre === 'Comparativa_Calificaciones_Cursos') {
        Logger.log('       → Tipo: Comparativa ✓');
      } else {
        Logger.log('       → No es un reporte (será ignorado)');
      }
    });

    // Probar función listarReportesExistentes
    Logger.log('6. Probando función listarReportesExistentes()...');
    const resultado = listarReportesExistentes();

    if (resultado.success) {
      Logger.log('   ✓ Función ejecutada correctamente');
      Logger.log('   Reportes encontrados: ' + resultado.data.length);
      resultado.data.forEach((reporte, index) => {
        Logger.log('   [' + (index + 1) + '] ' + reporte.nombre + ' (Tipo: ' + reporte.tipo + ')');
      });
    } else {
      Logger.log('   ⚠️ ERROR en la función:');
      Logger.log('   Mensaje: ' + resultado.message);
    }

    Logger.log('=== FIN DIAGNÓSTICO ===');
    Logger.log('Revisa los logs arriba para identificar posibles problemas.');

  } catch (error) {
    Logger.log('⚠️ ERROR CRÍTICO en diagnóstico:');
    Logger.log('Mensaje: ' + error.message);
    Logger.log('Stack: ' + error.stack);
  }
}

/**
 * Descarga un reporte como PDF (genera el blob)
 * @param {string} nombreHoja - Nombre de la hoja a exportar
 * @return {Object} Resultado con el blob del PDF
 */
function descargarReportePDF(nombreHoja) {
  try {
    if (!nombreHoja) {
      return { success: false, message: 'Debe especificar el nombre de la hoja' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(nombreHoja);

    if (!sheet) {
      return { success: false, message: 'No se encontró la hoja "' + nombreHoja + '"' };
    }

    // Construir URL de exportación a PDF
    const sheetId = sheet.getSheetId();
    const url = ss.getUrl().replace(/edit$/, 'export?format=pdf&gid=' + sheetId);

    // Obtener el PDF
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      return {
        success: false,
        message: 'Error al generar el PDF: código ' + response.getResponseCode()
      };
    }

    const blob = response.getBlob().setName(nombreHoja + '.pdf');

    return {
      success: true,
      blob: blob,
      nombreArchivo: nombreHoja + '.pdf',
      message: 'PDF generado correctamente'
    };

  } catch (error) {
    Logger.log('Error en descargarReportePDF: ' + error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

/**
 * Diagnostica el estado del sistema de alertas de asistencia
 * Muestra configuración, programaciones y triggers activos
 */
function diagnosticarSistemaAlertas() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    let diagnostico = [];
    let data = {
      configuracion: {},
      programaciones: [],
      triggers: [],
      asistencia: {}
    };

    // 1. Verificar configuración
    diagnostico.push('=== CONFIGURACIÓN ===');
    const configSheet = ss.getSheetByName('ConfiguracionAlertas');
    if (configSheet && configSheet.getLastRow() > 1) {
      const config = configSheet.getRange(2, 1, 1, configSheet.getLastColumn()).getValues()[0];
      diagnostico.push('✅ Configuración: ENCONTRADA');
      diagnostico.push('  - Ventana de análisis: ' + (config[0] || 'No definida'));
      diagnostico.push('  - Destinatarios: ' + (config[1] || 'No definidos'));
      diagnostico.push('  - Análisis automático: ' + (config[2] ? 'ACTIVO' : 'INACTIVO'));
      data.configuracion = {
        encontrada: true,
        ventanaAnalisis: config[0] || 'No definida',
        destinatarios: config[1] || 'No definidos',
        analisisAutomatico: config[2] || false
      };
    } else {
      diagnostico.push('❌ Configuración: NO ENCONTRADA');
      diagnostico.push('  → Configura el sistema desde: ⚙️ Automatización > ⚙️ Configurar alertas');
      data.configuracion = { encontrada: false };
    }

    diagnostico.push('');

    // 2. Verificar programaciones
    diagnostico.push('=== PROGRAMACIONES ===');
    const schedSheet = ss.getSheetByName('Scheduler');
    if (schedSheet && schedSheet.getLastRow() > 1) {
      const scheds = schedSheet.getRange(2, 1, schedSheet.getLastRow() - 1, 6).getValues();
      const activos = scheds.filter(s => s[5] === 'Sí');
      diagnostico.push('✅ Programaciones: ' + scheds.length + ' total(es)');
      diagnostico.push('  - Activas: ' + activos.length);
      if (activos.length > 0) {
        activos.forEach(s => {
          diagnostico.push('    • ' + s[1] + ' a las ' +
                          ('0' + s[2]).slice(-2) + ':' + ('0' + s[3]).slice(-2));
          data.programaciones.push({
            dia: s[1],
            hora: ('0' + s[2]).slice(-2) + ':' + ('0' + s[3]).slice(-2),
            activo: true
          });
        });
      }
    } else {
      diagnostico.push('❌ Programaciones: NINGUNA');
      diagnostico.push('  → Programa alertas desde: ⚙️ Automatización > ⏰ Programar alertas');
    }

    diagnostico.push('');

    // 3. Verificar triggers
    diagnostico.push('=== TRIGGERS (disparadores) ===');
    const triggers = ScriptApp.getProjectTriggers();
    if (triggers.length > 0) {
      diagnostico.push('✅ Triggers: ' + triggers.length + ' activo(s)');
      triggers.forEach(t => {
        const tipo = t.getEventType().toString();
        const func = t.getHandlerFunction();
        diagnostico.push('  - ' + func + ' (' + tipo + ')');
        data.triggers.push({
          funcion: func,
          tipo: tipo
        });
      });
    } else {
      diagnostico.push('⚠️ Triggers: NINGUNO');
      diagnostico.push('  → Los triggers se crean automáticamente al programar alertas');
    }

    diagnostico.push('');

    // 4. Verificar datos de asistencia
    diagnostico.push('=== DATOS DE ASISTENCIA ===');
    const asistSheet = ss.getSheetByName('RegistroAsistencia');
    if (asistSheet && asistSheet.getLastRow() > 1) {
      const totalRegistros = asistSheet.getLastRow() - 1;
      diagnostico.push('✅ Registros: ' + totalRegistros + ' total(es)');
      data.asistencia = {
        tieneRegistros: true,
        total: totalRegistros
      };
    } else {
      diagnostico.push('❌ Registros: NINGUNO');
      diagnostico.push('  → Registra asistencia para poder generar alertas');
      data.asistencia = {
        tieneRegistros: false,
        total: 0
      };
    }

    diagnostico.push('');
    diagnostico.push('=== ACCIONES DISPONIBLES ===');
    diagnostico.push('• Configurar: ⚙️ Automatización > ⚙️ Configurar alertas');
    diagnostico.push('• Programar: ⚙️ Automatización > ⏰ Programar alertas');
    diagnostico.push('• Ejecutar manual: ⚙️ Automatización > ▶️ Ejecutar reporte AHORA');

    // Crear hoja de diagnóstico
    let hojaD = ss.getSheetByName('Diagnostico_Sistema') || ss.insertSheet('Diagnostico_Sistema');
    hojaD.clear();

    // Escribir diagnóstico
    const dataRows = diagnostico.map(line => [line]);
    hojaD.getRange(1, 1, dataRows.length, 1).setValues(dataRows);

    // Formatear
    hojaD.setColumnWidth(1, 600);
    hojaD.getRange(1, 1, dataRows.length, 1).setWrap(true);

    return {
      success: true,
      message: '✅ Diagnóstico completado. Revisa la hoja "Diagnostico_Sistema" para ver los resultados.',
      data: data
    };

  } catch (error) {
    Logger.log('Error en diagnosticarSistemaAlertas: ' + error);
    return { success: false, message: 'Error: ' + error.message };
  }
}

function checkAttendanceOnOpen() {
  // Función silenciosa que se ejecuta al abrir - no hace nada si no está configurada
  Logger.log('checkAttendanceOnOpen: función stub');
}

// ============================================================================
// FUNCIONES DIALOG PARA COMPATIBILIDAD CON MENÚS DE GOOGLE SHEETS
// ============================================================================

function compararEstudiantesDialog() {
  const html = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 2rem;
            max-width: 500px;
            margin: 0 auto;
          }
          .form-group {
            margin-bottom: 1.5rem;
          }
          label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #1e293b;
          }
          input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 1rem;
          }
          input:focus {
            outline: none;
            border-color: #2563eb;
          }
          .btn {
            width: 100%;
            padding: 1rem;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 0.5rem;
          }
          .btn:hover {
            background: #1e40af;
          }
          .btn-secondary {
            background: #64748b;
          }
          .btn-secondary:hover {
            background: #475569;
          }
        </style>
      </head>
      <body>
        <h2 style="margin-bottom: 1.5rem;">Comparar Estudiantes</h2>
        <div class="form-group">
          <label>ID del primer estudiante:</label>
          <input type="text" id="student1" placeholder="Ej: EST001">
        </div>
        <div class="form-group">
          <label>ID del segundo estudiante:</label>
          <input type="text" id="student2" placeholder="Ej: EST002">
        </div>
        <button class="btn" onclick="compareStudents()">Comparar</button>
        <button class="btn btn-secondary" onclick="google.script.host.close()">Cancelar</button>

        <script>
          function compareStudents() {
            const st1 = document.getElementById('student1').value.trim();
            const st2 = document.getElementById('student2').value.trim();
            if (!st1 || !st2) {
              alert('Por favor ingresa ambos IDs de estudiantes');
              return;
            }
            google.script.run
              .withSuccessHandler(() => {
                alert('✅ Comparativa generada en la hoja "Comparativa_Estudiantes"');
                google.script.host.close();
              })
              .withFailureHandler(err => alert('Error: ' + err.message))
              .executeCompareStudents(st1, st2);
          }
        </script>
      </body>
    </html>
  `).setWidth(500).setHeight(400);

  SpreadsheetApp.getUi().showModalDialog(html, 'Comparar Estudiantes');
}

function executeCompareStudents(est1, est2) {
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
    return [id, tot, att, abs, pct];
  };

  const data1 = calc(est1);
  const data2 = calc(est2);

  let hoja = ss.getSheetByName('Comparativa_Estudiantes') || ss.insertSheet('Comparativa_Estudiantes');
  hoja.clear();

  const dataRows = [
    ['IDEstudiante', 'Total', 'Asistencias', 'Faltas', '% Asistencia'],
    data1,
    data2
  ];
  hoja.getRange(1, 1, dataRows.length, 5).setValues(dataRows);

  // Gráfico de barras
  const chart = hoja.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(hoja.getRange('A1:E3'))
    .setOption('title', 'Comparativa de % Asistencia')
    .setOption('series', { 4: { targetAxisIndex: 0 } })
    .setPosition(1, 7, 0, 0)
    .build();
  hoja.insertChart(chart);
}

function compararCursosDialog() {
  const html = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 2rem;
            max-width: 500px;
            margin: 0 auto;
          }
          .form-group {
            margin-bottom: 1.5rem;
          }
          label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #1e293b;
          }
          input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 1rem;
          }
          input:focus {
            outline: none;
            border-color: #2563eb;
          }
          .btn {
            width: 100%;
            padding: 1rem;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 0.5rem;
          }
          .btn:hover {
            background: #1e40af;
          }
          .btn-secondary {
            background: #64748b;
          }
          .btn-secondary:hover {
            background: #475569;
          }
        </style>
      </head>
      <body>
        <h2 style="margin-bottom: 1.5rem;">Comparar Cursos</h2>
        <div class="form-group">
          <label>ID del primer curso:</label>
          <input type="text" id="course1" placeholder="Ej: 1BAS">
        </div>
        <div class="form-group">
          <label>ID del segundo curso:</label>
          <input type="text" id="course2" placeholder="Ej: 2BAS">
        </div>
        <button class="btn" onclick="compareCourses()">Comparar</button>
        <button class="btn btn-secondary" onclick="google.script.host.close()">Cancelar</button>

        <script>
          function compareCourses() {
            const c1 = document.getElementById('course1').value.trim();
            const c2 = document.getElementById('course2').value.trim();
            if (!c1 || !c2) {
              alert('Por favor ingresa ambos IDs de cursos');
              return;
            }
            google.script.run
              .withSuccessHandler(() => {
                alert('✅ Comparativa generada en la hoja "Comparativa_Cursos"');
                google.script.host.close();
              })
              .withFailureHandler(err => alert('Error: ' + err.message))
              .executeCompareCourses(c1, c2);
          }
        </script>
      </body>
    </html>
  `).setWidth(500).setHeight(400);

  SpreadsheetApp.getUi().showModalDialog(html, 'Comparar Cursos');
}

function executeCompareCourses(cur1, cur2) {
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
    return [id, tot, att, abs, pct];
  };

  const data1 = calc(cur1);
  const data2 = calc(cur2);

  let hoja = ss.getSheetByName('Comparativa_Cursos') || ss.insertSheet('Comparativa_Cursos');
  hoja.clear();

  const dataRows = [
    ['CursoID', 'Total', 'Asistencias', 'Faltas', '% Asistencia'],
    data1,
    data2
  ];
  hoja.getRange(1, 1, dataRows.length, 5).setValues(dataRows);

  // Gráfico de barras
  const chart = hoja.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(hoja.getRange('A1:E3'))
    .setOption('title', 'Comparativa de % Asistencia')
    .setOption('series', { 4: { targetAxisIndex: 0 } })
    .setPosition(1, 7, 0, 0)
    .build();
  hoja.insertChart(chart);
}

function compararCalificacionesEstudiantesDialog() {
  const html = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 2rem;
            max-width: 500px;
            margin: 0 auto;
          }
          .form-group {
            margin-bottom: 1.5rem;
          }
          label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #1e293b;
          }
          input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 1rem;
          }
          input:focus {
            outline: none;
            border-color: #2563eb;
          }
          .btn {
            width: 100%;
            padding: 1rem;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 0.5rem;
          }
          .btn:hover {
            background: #1e40af;
          }
          .btn-secondary {
            background: #64748b;
          }
          .btn-secondary:hover {
            background: #475569;
          }
        </style>
      </head>
      <body>
        <h2 style="margin-bottom: 1.5rem;">Comparar Calificaciones - Estudiantes</h2>
        <div class="form-group">
          <label>ID del primer estudiante:</label>
          <input type="text" id="student1" placeholder="Ej: EST001">
        </div>
        <div class="form-group">
          <label>ID del segundo estudiante:</label>
          <input type="text" id="student2" placeholder="Ej: EST002">
        </div>
        <button class="btn" onclick="compareGrades()">Comparar</button>
        <button class="btn btn-secondary" onclick="google.script.host.close()">Cancelar</button>

        <script>
          function compareGrades() {
            const st1 = document.getElementById('student1').value.trim();
            const st2 = document.getElementById('student2').value.trim();
            if (!st1 || !st2) {
              alert('Por favor ingresa ambos IDs de estudiantes');
              return;
            }
            google.script.run
              .withSuccessHandler(() => {
                alert('✅ Comparativa generada en la hoja "Comparativa_Calificaciones_Estudiantes"');
                google.script.host.close();
              })
              .withFailureHandler(err => alert('Error: ' + err.message))
              .executeCompareGradesStudents(st1, st2);
          }
        </script>
      </body>
    </html>
  `).setWidth(500).setHeight(400);

  SpreadsheetApp.getUi().showModalDialog(html, 'Comparar Calificaciones');
}

function executeCompareGradesStudents(est1, est2) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const { headers, values } = getSheetData(ss, 'CalificacionesDetalladas');
  const iNombre = headers.indexOf('NombreEstudiante');
  const iInst = headers.indexOf('NombreInstrumento');
  const iCal = headers.indexOf('CalificacionTotalInstrumento');

  const calc = nombre => {
    const filas = values.filter(r => r[iNombre] === nombre);
    if (!filas.length) return [nombre, 0, 0];

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
    return [nombre, promedios.length, promedio.toFixed(2)];
  };

  const data1 = calc(est1);
  const data2 = calc(est2);

  let hoja = ss.getSheetByName('Comparativa_Calificaciones_Estudiantes') ||
             ss.insertSheet('Comparativa_Calificaciones_Estudiantes');
  hoja.clear();

  const dataRows = [
    ['Estudiante', 'Num Evaluaciones', 'Promedio'],
    data1,
    data2
  ];
  hoja.getRange(1, 1, dataRows.length, 3).setValues(dataRows);

  // Gráfico
  const chart = hoja.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(hoja.getRange('A1:C3'))
    .setOption('title', 'Comparativa de Promedios')
    .setPosition(1, 5, 0, 0)
    .build();
  hoja.insertChart(chart);
}

function compararCalificacionesCursosDialog() {
  const html = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 2rem;
            max-width: 500px;
            margin: 0 auto;
          }
          .form-group {
            margin-bottom: 1.5rem;
          }
          label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #1e293b;
          }
          input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 1rem;
          }
          input:focus {
            outline: none;
            border-color: #2563eb;
          }
          .btn {
            width: 100%;
            padding: 1rem;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 0.5rem;
          }
          .btn:hover {
            background: #1e40af;
          }
          .btn-secondary {
            background: #64748b;
          }
          .btn-secondary:hover {
            background: #475569;
          }
        </style>
      </head>
      <body>
        <h2 style="margin-bottom: 1.5rem;">Comparar Calificaciones - Cursos</h2>
        <div class="form-group">
          <label>ID del primer curso:</label>
          <input type="text" id="course1" placeholder="Ej: 1BAS">
        </div>
        <div class="form-group">
          <label>ID del segundo curso:</label>
          <input type="text" id="course2" placeholder="Ej: 2BAS">
        </div>
        <button class="btn" onclick="compareGrades()">Comparar</button>
        <button class="btn btn-secondary" onclick="google.script.host.close()">Cancelar</button>

        <script>
          function compareGrades() {
            const c1 = document.getElementById('course1').value.trim();
            const c2 = document.getElementById('course2').value.trim();
            if (!c1 || !c2) {
              alert('Por favor ingresa ambos IDs de cursos');
              return;
            }
            google.script.run
              .withSuccessHandler(() => {
                alert('✅ Comparativa generada en la hoja "Comparativa_Calificaciones_Cursos"');
                google.script.host.close();
              })
              .withFailureHandler(err => alert('Error: ' + err.message))
              .executeCompareGradesCourses(c1, c2);
          }
        </script>
      </body>
    </html>
  `).setWidth(500).setHeight(400);

  SpreadsheetApp.getUi().showModalDialog(html, 'Comparar Calificaciones');
}

function executeCompareGradesCourses(cur1, cur2) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const { headers, values } = getSheetData(ss, 'CalificacionesDetalladas');
  const iCurso = headers.indexOf('CursoEvaluado');
  const iCal = headers.indexOf('CalificacionTotalInstrumento');

  const calc = curso => {
    const filas = values.filter(r => r[iCurso] === curso);
    if (!filas.length) return [curso, 0, 0];

    const califs = filas.map(r => parseFloat(r[iCal]) || 0);
    const promedio = califs.reduce((a, b) => a + b, 0) / califs.length;
    return [curso, califs.length, promedio.toFixed(2)];
  };

  const data1 = calc(cur1);
  const data2 = calc(cur2);

  let hoja = ss.getSheetByName('Comparativa_Calificaciones_Cursos') ||
             ss.insertSheet('Comparativa_Calificaciones_Cursos');
  hoja.clear();

  const dataRows = [
    ['Curso', 'Num Evaluaciones', 'Promedio'],
    data1,
    data2
  ];
  hoja.getRange(1, 1, dataRows.length, 3).setValues(dataRows);

  // Gráfico
  const chart = hoja.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(hoja.getRange('A1:C3'))
    .setOption('title', 'Comparativa de Promedios por Curso')
    .setPosition(1, 5, 0, 0)
    .build();
  hoja.insertChart(chart);
}

// ============================================================================
// ⚠️ FUNCIONES OPTIMIZADAS CON CACHÉ MOVIDAS AL FINAL DEL ARCHIVO
// Las versiones finales optimizadas están en las líneas 2661+
// ============================================================================
// Este bloque fue eliminado porque contenía funciones duplicadas que usaban
// Log.error() y causaban conflictos. Las versiones correctas usan Logger.log()
// ============================================================================

/****************************************************************
 *  FUNCIONES OPTIMIZADAS CON CACHÉ - VERSIONES FINALES         *
 ****************************************************************/

/**
 * FUNCIONES MEJORADAS CON CACHÉ (usar estas en lugar de las originales)
 * El dashboard las llamará automáticamente para aprovechar el caché
 */

// Wrapper para getEstudiantes con caché
function getEstudiantesData() {
  try {
    return getEstudiantesCached();
  } catch (error) {
    Logger.log('Error in getEstudiantesData:', error.message);
    // Fallback a método sin caché
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    return getEstudiantes(ss);
  }
}

// Wrapper para getInstrumentos con caché
function getInstrumentosData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const instrumentos = getInstrumentosCached(ss);

    // Obtener datos de situaciones de aprendizaje UNA SOLA VEZ
    let situacionesData = null;
    try {
      situacionesData = getSheetData(ss, 'SituacionesAprendizaje');
    } catch (e) {
      Logger.log('Error al obtener situaciones: ' + e.message);
    }

    // Añadir el nombre de la situación y el curso a cada instrumento
    return instrumentos.map(inst => {
      const situacionKey = Object.keys(inst).find(k => k.toLowerCase().includes('situac'));
      const situacionId = situacionKey ? inst[situacionKey] : '';

      // Inicializar valores por defecto
      let nombreSituacion = situacionId;
      let cursoId = '';

      // Intentar obtener el nombre de la situación Y el curso asociado
      if (situacionesData && situacionId) {
        try {
          const { headers, values } = situacionesData;
          const idxId = headers.indexOf('IDSituacionAprendizaje');
          const idxNombre = headers.indexOf('NombreSituacion');
          const idxCurso = headers.indexOf('CursoID');

          const fila = values.find(r => r[idxId] === situacionId);

          if (fila) {
            // Obtener nombre de situación
            if (idxNombre >= 0) {
              nombreSituacion = fila[idxNombre] || situacionId;
            }

            // Obtener curso asociado
            if (idxCurso >= 0) {
              cursoId = fila[idxCurso] || '';
            }
          }
        } catch (e) {
          Logger.log('Error al procesar situación ' + situacionId + ': ' + e.message);
        }
      }

      return {
        ...inst,
        Situacion: nombreSituacion,
        Curso: cursoId
      };
    });
  } catch (error) {
    Logger.log('Error in getInstrumentosData:', error.message);
    // Fallback a método sin caché
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    return getInstrumentos(ss);
  }
}

// Wrapper para getCourses con caché
function getCourses() {
  try {
    return getCursosCached();
  } catch (error) {
    Logger.log('Error in getCourses:', error.message);
    // Fallback: calcular desde estudiantes
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const estudiantes = getEstudiantes(ss);
    const cursosSet = new Set();
    estudiantes.forEach(est => {
      const curso = est.CursoID || est.Curso || est.CursoEvaluado;
      if (curso) cursosSet.add(String(curso));
    });
    return Array.from(cursosSet).sort();
  }
}

// Wrapper para getStatistics con caché
/**
 * Calcula estadísticas directamente sin usar caché
 * Esta función es usada internamente por getStatistics y getStatisticsCached
 */
function getStatisticsDirect() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const estudiantes = getEstudiantes(ss);
  const instrumentos = getInstrumentos(ss);

  // Contar cursos únicos
  const cursosSet = new Set();
  estudiantes.forEach(est => {
    const curso = est.CursoID || est.Curso || est.CursoEvaluado;
    if (curso) cursosSet.add(String(curso));
  });

  // Contar calificaciones
  let totalGrades = 0;
  try {
    const { values } = getSheetDataDirect(ss, 'CalificacionesDetalladas');
    totalGrades = values.length;
  } catch (e) {
    Logger.log('Could not count grades:', e.message);
  }

  return {
    students: estudiantes.length,
    courses: cursosSet.size,
    instruments: instrumentos.length,
    grades: totalGrades
  };
}

/**
 * Obtiene estadísticas del sistema
 * Usa caché si está disponible
 */
function getStatistics() {
  try {
    // ✅ Usar caché si está disponible
    if (typeof getStatisticsCached === 'function') {
      return getStatisticsCached();
    }
  } catch (error) {
    Logger.log('Error in getStatistics (caché):', error.message);
  }

  // ⚠️ Fallback: calcular sin caché
  return getStatisticsDirect();
}

// Función para obtener lista de colegios (necesaria para asistencia)
function getSchools() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const estudiantes = getEstudiantesCached(ss);
    const schools = new Set();

    estudiantes.forEach(est => {
      const colegio = est.ColegioID || est.Colegio || est.Centro;
      if (colegio) schools.add(String(colegio));
    });

    return Array.from(schools).sort();
  } catch (error) {
    Logger.log('Error in getSchools:', error.message);
    return ['Default School']; // Fallback
  }
}

// Función para obtener registros recientes de asistencia
function getRecentAttendance(limit = 10) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const { headers, values } = getSheetData(ss, 'RegistroAsistencia');

    // Obtener los últimos N registros
    const recent = values.slice(-limit).reverse();

    // Convertir a objetos
    return recent.map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    });
  } catch (error) {
    Logger.log('Error in getRecentAttendance:', error.message);
    return [];
  }
}

/**
 * HOOKS DE INVALIDACIÓN DE CACHÉ
 * Llamar estas funciones después de modificar datos
 */

// Función auxiliar para registrar asistencia por lotes (necesaria para dashboard)
function registrarAsistenciaBatch(records) {
  try {
    Logger.log(`Registering batch attendance: ${records.length} records`);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('RegistroAsistencia');

    if (!sheet) {
      throw new Error('Sheet "RegistroAsistencia" not found');
    }

    // Preparar datos para escritura, incluyendo AsistenciaID único para cada registro
    const dataRows = records.map(rec => [
      Utilities.getUuid(),  // AsistenciaID - ID único para cada registro de asistencia
      rec.IDEstudiante,
      rec.NombreEstudiante,
      rec.CursoID,
      rec.ColegioID,
      rec.Fecha,
      rec.Presente,
      rec.Retraso || false,
      rec.SinUniforme || false,
      rec.SinAseo || false
    ]);

    // Escribir todos los registros de una vez
    if (dataRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, dataRows.length, dataRows[0].length)
        .setValues(dataRows);
    }

    // Invalidar caché
    onAsistenciaModified();

    Logger.log('Batch attendance registered successfully');

    return {
      success: true,
      message: `Asistencia guardada exitosamente para ${records.length} estudiantes`
    };

  } catch (error) {
    Logger.log('Error in registrarAsistenciaBatch:', error.message, error.stack);
    return {
      success: false,
      message: 'Error al guardar asistencia: ' + error.message
    };
  }
}

/****************************************************************
 * FIN DE INTEGRACIONES Y OPTIMIZACIONES                        *
 ****************************************************************/