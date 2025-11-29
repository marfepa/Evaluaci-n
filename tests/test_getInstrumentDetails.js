
// This test file mocks the Google Apps Script environment to verify the fix for getInstrumentDetails.
// It simulates the spreadsheet data structure and verifies that 'Lista de Cotejo' items are correctly retrieved
// from 'Definicion_ListasCotejo' using the correct column headers.

const SPREADSHEET_ID = 'mock_id';

const Logger = {
  log: (msg) => console.log(msg)
};

const SpreadsheetApp = {
  openById: (id) => ({
    getSheetByName: (name) => {
      // Mock returning null for ItemsListaCotejo to simulate the bug condition if code was reverting
      if (name === 'ItemsListaCotejo') return null;
      return {};
    }
  })
};

// Mock Data representing the correct sheet structure
const db = {
  InstrumentosEvaluacion: {
    headers: ['IDInstrumento', 'NombreInstrumento', 'TipoInstrumento', 'IDInstrumentoTipo'],
    values: [
      ['INST001', 'Mi Lista de Cotejo', 'Lista de Cotejo', 'LISTA001']
    ]
  },
  Definicion_ListasCotejo: {
    headers: ['IDListaCotejo', 'IDItem', 'DescripcionItem'],
    values: [
      ['LISTA001', 'ITEM001', 'Item 1 Description'],
      ['LISTA001', 'ITEM002', 'Item 2 Description']
    ]
  }
};

// Mock Helpers
function getSheetData(ss, sheetName) {
  if (db[sheetName]) {
    return db[sheetName];
  }
  return { headers: [], values: [] };
}

function getInstrumentoById(ss, instrumentId) {
    const { headers, values } = db.InstrumentosEvaluacion;
    const row = values.find(r => r[0] === instrumentId);
    if (!row) return null;
    return {
        IDInstrumento: row[0],
        NombreInstrumento: row[1],
        TipoInstrumento: row[2],
        IDInstrumentoTipo: row[3]
    };
}

// --- FUNCTION UNDER TEST (Copy from Code.gs) ---
function getInstrumentDetails(instrumentId) {
  try {
    Logger.log(`[getInstrumentDetails] Obteniendo detalles del instrumento: ${instrumentId}`);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const instrumento = getInstrumentoById(ss, instrumentId);

    if (!instrumento) {
      Logger.log(`[getInstrumentDetails] Instrumento no encontrado: ${instrumentId}`);
      return null;
    }

    Logger.log(`[getInstrumentDetails] Instrumento encontrado: ${instrumento.NombreInstrumento}, Tipo: ${instrumento.TipoInstrumento}`);

    const result = {
      id: instrumento.IDInstrumento,
      nombre: instrumento.NombreInstrumento,
      tipo: instrumento.TipoInstrumento
    };

    // Según el tipo de instrumento, cargar los detalles específicos
    if (instrumento.TipoInstrumento === 'Rúbrica') {
      // (Simplified for test)
    } else if (instrumento.TipoInstrumento === 'Lista de Cotejo') {
      // Cargar items de la lista de cotejo
      const listaCotejoId = instrumento.IDInstrumentoTipo;
      const { headers: itemHeaders, values: itemValues } = getSheetData(ss, 'Definicion_ListasCotejo');

      const items = itemValues
        .filter(row => row[itemHeaders.indexOf('IDListaCotejo')] === listaCotejoId)
        .map(row => ({
          id: row[itemHeaders.indexOf('IDItem')],
          descripcion: row[itemHeaders.indexOf('DescripcionItem')]
        }));

      result.items = items;
      Logger.log(`[getInstrumentDetails] Lista de Cotejo con ${result.items.length} items cargada`);

    } else if (instrumento.TipoInstrumento === 'Calificación Directa') {
      result.minGrade = 0;
      result.maxGrade = 10;
    }

    return result;

  } catch (error) {
    Logger.log(`[getInstrumentDetails] Error: ${error.message}`);
    Logger.log(`[getInstrumentDetails] Stack: ${error.stack}`);
    throw error;
  }
}

// --- TEST EXECUTION ---
try {
    console.log("Running Test: Verify getInstrumentDetails for Lista de Cotejo...");
    const details = getInstrumentDetails('INST001');
    console.log('Result:', JSON.stringify(details, null, 2));

    if (details.items && details.items.length === 2) {
        if (details.items[0].descripcion === 'Item 1 Description') {
            console.log("PASS: Successfully retrieved items with correct descriptions.");
            process.exit(0);
        } else {
            console.log("FAIL: Data mapping incorrect. Description field mismatch.");
            process.exit(1);
        }
    } else {
        console.log("FAIL: Incorrect number of items found: " + (details.items ? details.items.length : 0));
        process.exit(1);
    }

} catch (e) {
    console.error(e);
    process.exit(1);
}
