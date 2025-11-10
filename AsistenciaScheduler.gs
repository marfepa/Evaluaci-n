
const SCHED_SHEET = 'Scheduler';

/* ---------- herramienta ---------- */
function ensureSchedSheet(){
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(SCHED_SHEET) || ss.insertSheet(SCHED_SHEET)
           .setName(SCHED_SHEET);
}

/* ---------- diálogo de alta ---------- */
function openSchedulerDialog(){
  SpreadsheetApp.getUi()
    .showModalDialog(
      HtmlService.createHtmlOutputFromFile('scheduler_dialog')
                 .setWidth(420).setHeight(350),
      'Programar reporte');
}

/* ---------- guardar programación ---------- */
function saveSchedule(data){
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ensureSchedSheet();

  if (sh.getLastRow() < 1){
    sh.appendRow(['ID','Frecuencia','Hora','Min','Dias','Activo']);
  }

  const id = 'SCHED_'+Utilities.getUuid().slice(0,8);
  sh.appendRow([
    id, data.freq,
    Number(data.hora), Number(data.min),
    data.dias.join(','), 'Sí'
  ]);

  /* Desactiva las anteriores */
  const rng = sh.getRange(2,6, sh.getLastRow()-1,1).getValues();
  rng.forEach((r,i)=> r[0] = (i === rng.length-1) ? 'Sí' : 'No');
  sh.getRange(2,6, rng.length,1).setValues(rng);

  rebuildShellTrigger();
}

/* ---------- leer todas ---------- */
function listSchedules(){
  const sh = ensureSchedSheet();
  if (sh.getLastRow() < 2) return [];
  const v  = sh.getRange(2,1, sh.getLastRow()-1,6).getValues();
  return v.map(r=>({
    id:r[0], freq:r[1], hora:r[2], min:r[3], dias:r[4], activo:r[5]==='Sí'
  }));
}

/* ---------- activar / eliminar ---------- */
function activateSchedule(id){
  const sh = ensureSchedSheet();
  const v  = sh.getRange(2,1, sh.getLastRow()-1,6).getValues();
  v.forEach(r=> r[5] = (r[0]===id ? 'Sí' : 'No'));
  sh.getRange(2,1, v.length,6).setValues(v);
  rebuildShellTrigger();
}
function deleteSchedule(id){
  const sh  = ensureSchedSheet();
  const ids = sh.getRange(2,1, sh.getLastRow()-1,1).getValues().flat();
  const pos = ids.indexOf(id);
  if (pos>-1) sh.deleteRow(pos+2);
  rebuildShellTrigger();
}

/* ---------- la activa ---------- */
function loadActiveSchedule(){
  const a = listSchedules().find(s=>s.activo);
  if (!a) return null;
  a.dias = a.dias ? a.dias.split(',').map(Number): [];
  return a;
}

/* ---------- (re)crear trigger shell ---------- */
function rebuildShellTrigger(){
  ScriptApp.getProjectTriggers()
    .filter(t=>t.getHandlerFunction()==='dailyAttendanceNotifierShell')
    .forEach(t=> ScriptApp.deleteTrigger(t));

  const cfg = loadActiveSchedule();
  if (!cfg) return;

  let trig = ScriptApp.newTrigger('dailyAttendanceNotifierShell')
              .timeBased()
              .atHour(Number(cfg.hora))
              .nearMinute(Number(cfg.min)||0);

  switch(cfg.freq){
    case 'Semanal':   trig = trig.everyWeeks(1); break;
    case 'Quincenal': trig = trig.everyDays(14); break;
    case 'Mensual':   trig = trig.everyDays(30); break;
    default:          trig = trig.everyDays(1);  // Diario
  }
  trig.create();
}

/* ---------- shell ---------- */
function dailyAttendanceNotifierShell(){
  const cfg = loadActiveSchedule();
  if (!cfg) return;                                         // nada activo

  // Días de la semana 0-6 (D-S). Si lista vacía ⇒ todos los días.
  const today = new Date().getDay();
  if (cfg.dias.length && cfg.dias.indexOf(today) === -1) return;

  dailyAttendanceNotifier();                                // función real
}

/* ---------- gestor visual ---------- */
function openSchedulerManager(){
  const tmpl = HtmlService.createTemplateFromFile('scheduler_manager');
  tmpl.data  = listSchedules();
  SpreadsheetApp.getUi()
    .showModalDialog(tmpl.evaluate().setWidth(450).setHeight(300),
                     'Programaciones guardadas');
}