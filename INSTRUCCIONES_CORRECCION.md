# Instrucciones para Corregir el Dashboard

## Problema Identificado

El dashboard tiene errores porque muchas funciones intentan usar `SpreadsheetApp.getUi()` que **NO funciona en aplicaciones web** (solo funciona cuando se ejecuta desde el editor de Google Sheets).

## Archivos Modificados

1. ✅ `dashboard.html` - Ya actualizado con manejadores de respuesta correctos
2. ✅ `Code.gs` - **YA CORREGIDO** con funciones compatibles con Web App
3. ✅ **NUEVO**: Sistema de apertura dual (Modal o Ventana Nueva)

## Solución Aplicada

### 1. Dashboard.html (YA CORREGIDO)

El archivo `dashboard.html` ya ha sido actualizado para:
- Manejar respuestas con `.withSuccessHandler()` y `.withFailureHandler()`
- Mostrar alertas con los mensajes de éxito/error
- Usar `prompt()` en lugar de modales complejos para comparaciones

### 2. Code.gs (PENDIENTE DE CORRECCIÓN)

**OPCIÓN A: Reemplazo Manual**

Abre `Code.gs` y busca la sección que comienza con:
```javascript
/**
 * Funciones wrapper para reportes (llamadas desde el dashboard)
 */
```

Esta sección está aproximadamente en la **línea 1472** y termina alrededor de la **línea 2050**.

**Reemplaza toda esa sección** con el contenido del archivo `Code_Fixed.gs` que contiene las versiones corregidas.

**OPCIÓN B: Reemplazo Automático**

Copia todo el contenido de `Code_Fixed.gs` y pégalo **AL FINAL** de tu archivo `Code.gs` actual.

Luego, elimina las funciones duplicadas antiguas (las que usan `SpreadsheetApp.getUi()`):
- `reportePorEstudiante(alumno)` - línea 1475
- `reportePorCurso(curso)` - línea 1518
- `reporteCalificacionPorEstudiante(alumno)` - línea 1561
- `reporteCalificacionPorCurso(curso)` - línea 1612
- `compararEstudiantesDialog()` - línea 1666
- `executeCompareStudents(est1, est2)` - línea 1759
- `compararCursosDialog()` - línea 1798
- `executeCompareCourses(cur1, cur2)` - línea 1897
- `compararCalificacionesEstudiantesDialog()` - línea 1946
- `executeCompareGradesStudents(est1, est2)` - línea 2016
- `compararCalificacionesCursosDialog()` - línea 2071
- `executeCompareGradesCourses(cur1, cur2)` - línea 2141

## Cambios Principales en las Funciones

### Antes (❌ No funciona en Web App):
```javascript
function reportePorEstudiante(alumno) {
  if (!alumno) {
    SpreadsheetApp.getUi().alert('Error'); // ❌ No funciona en web
    return;
  }
  // ... código ...
  SpreadsheetApp.getUi().alert('Éxito'); // ❌ No funciona en web
}
```

### Después (✅ Funciona en Web App):
```javascript
function reportePorEstudiante(alumno) {
  try {
    if (!alumno) {
      return { success: false, message: 'Error' }; // ✅ Retorna objeto
    }
    // ... código ...
    return { success: true, message: 'Éxito' }; // ✅ Retorna objeto
  } catch (error) {
    return { success: false, message: 'Error: ' + error.message };
  }
}
```

## Funciones Agregadas (Stubs)

Se agregaron funciones "stub" (temporales) para las que no estaban implementadas:

```javascript
function reporteAsistenciaAvanzada_UI() {
  return { success: false, message: 'Función no implementada aún' };
}

function openSchedulerDialog() {
  return { success: false, message: 'Función no implementada aún' };
}

function openConfigDialog() {
  return { success: false, message: 'Función no implementada aún' };
}

function diagnosticarSistemaAlertas() {
  return { success: false, message: 'Función no implementada aún' };
}

function checkAttendanceOnOpen() {
  Logger.log('checkAttendanceOnOpen: función stub');
}
```

## Funciones de Comparación

Las funciones que antes mostraban diálogos HTML ahora:
1. Reciben directamente los parámetros (est1, est2 o cur1, cur2)
2. Realizan el cálculo
3. Guardan en la hoja correspondiente
4. Retornan un objeto { success, message, data }

Ejemplo:
```javascript
function compararEstudiantes(est1, est2) {
  try {
    // ... realizar cálculos ...
    return { success: true, message: 'Comparativa generada', data: [data1, data2] };
  } catch (error) {
    return { success: false, message: 'Error: ' + error.message };
  }
}
```

## Sistema de Apertura Dual (NUEVO)

El dashboard ahora puede abrirse de **DOS FORMAS DIFERENTES**:

### Opción 1: Ventana Nueva del Navegador (Recomendado)
- Usa la URL de la Web App desplegada (`ScriptApp.getService().getUrl()`)
- Abre el dashboard en una pestaña independiente del navegador
- Incluye botón para copiar la URL al portapapeles
- Permite guardar la URL como marcador para acceso directo
- **Ventaja**: No depende de tener Google Sheets abierto

### Opción 2: Modal Dentro de Google Sheets
- Abre el dashboard como ventana modal dentro de Google Sheets
- Tamaño: 1400x900 píxeles
- **Ventaja**: Acceso rápido sin cambiar de ventana

### Cómo Usar:
1. Desde Google Sheets, ve al menú: **Evaluación > 📊 Panel de Control**
2. Aparecerá un cuadro de diálogo con 3 opciones:
   - **SÍ** = Abrir en ventana nueva del navegador
   - **NO** = Abrir en modal dentro de Sheets
   - **CANCELAR** = No abrir

## Pruebas Recomendadas

Después de aplicar los cambios:

1. **Implementar la Web App:**
   - En el editor de Apps Script: `Desplegar > Nueva implementación`
   - Tipo: Aplicación web
   - Ejecutar como: Yo
   - Acceso: Cualquier persona (o "Solo yo" si prefieres restringir)
   - **IMPORTANTE**: Copia la URL que te proporciona al desplegar

2. **Probar Apertura del Dashboard:**
   - Desde Google Sheets: Menú `Evaluación > 📊 Panel de Control`
   - Prueba ambas opciones:
     - ✅ Ventana nueva (debe abrir automáticamente + mostrar URL)
     - ✅ Modal (debe abrir dentro de Sheets)

3. **Probar Funciones del Dashboard:**
   - Abrir la URL de la aplicación web
   - Probar las siguientes funciones:
     - ✅ Estadísticas (debe cargar números)
     - ✅ Lista de estudiantes
     - ✅ Lista de instrumentos
     - ✅ Reporte por estudiante
     - ✅ Reporte por curso
     - ✅ Comparar estudiantes
     - ✅ Comparar cursos
     - ✅ Calificaciones por estudiante
     - ✅ Calificaciones por curso

4. **Verificar en Google Sheets:**
   - Después de ejecutar un reporte, abrir la hoja de Google Sheets
   - Verificar que se crearon las hojas: "Reporte_Asistencia", "Reporte_Calificaciones", "Comparativa_Estudiantes", etc.

## Errores Comunes

### Error: "Cannot call SpreadsheetApp.getActiveSpreadsheet() from this context"
**Causa:** Estás intentando usar funciones de UI desde la web app
**Solución:** Asegúrate de haber reemplazado todas las funciones con las versiones corregidas

### Error: "google.script.run.funcionNoExiste is not a function"
**Causa:** Falta la función en Code.gs
**Solución:** Verifica que hayas copiado todas las funciones del archivo Code_Fixed.gs

### El dashboard no carga
**Causa:** Error en doGet() o en dashboard.html
**Solución:** Revisa la consola del navegador (F12) y los logs de Apps Script

## Soporte

Si encuentras problemas:
1. Revisa los logs en Apps Script: `Ver > Registros de ejecución`
2. Revisa la consola del navegador (F12 > Console)
3. Verifica que el SPREADSHEET_ID sea correcto en Code.gs

## Funciones Clave Agregadas/Modificadas

### `openDashboard()` - Línea 1286
Función principal que muestra el diálogo de selección (Modal vs Ventana Nueva)

### `openDashboardInNewWindow()` - Línea 1308
Abre el dashboard usando la URL de la Web App desplegada con:
- Ventana emergente automática
- URL visible para copiar
- Botón de copiar al portapapeles
- Instrucciones para guardar como marcador

### `openDashboardInModal()` - Línea 1420
Abre el dashboard como modal dentro de Google Sheets (1400x900px)

## Resumen de Archivos

- ✅ `dashboard.html` - Actualizado con manejadores de respuesta correctos
- ✅ `Code_Fixed.gs` - Backup con funciones corregidas
- ✅ `Code.gs` - **COMPLETAMENTE ACTUALIZADO** con todas las correcciones aplicadas
- 📄 `INSTRUCCIONES_CORRECCION.md` - Este archivo (documentación completa)

## Cambios de Versión

### Versión 2.0 (2025-11-10)
- ✅ Sistema de apertura dual (Modal o Ventana Nueva)
- ✅ Funciones `openDashboardInNewWindow()` y `openDashboardInModal()`
- ✅ Botón de copiar URL al portapapeles
- ✅ Auto-apertura de ventana nueva del navegador

### Versión 1.0 (2025-11-10)
- ✅ Corrección de funciones para compatibilidad con Web App
- ✅ Eliminación de `SpreadsheetApp.getUi()` en funciones del dashboard
- ✅ Implementación de patrón de respuesta `{ success, message, data }`
- ✅ Manejo de errores con try-catch
- ✅ Funciones stub para características no implementadas

---

**Fecha de última actualización:** 2025-11-10
**Versión actual:** 2.0
