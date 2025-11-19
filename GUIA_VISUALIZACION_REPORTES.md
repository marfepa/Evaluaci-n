# 📊 Guía: Visualización de Reportes en el Dashboard

## ✅ Mejoras Implementadas

Se han agregado mejoras importantes al sistema de visualización de reportes:

### 1. **Debugging Mejorado**
- Todos los logs ahora tienen emojis para identificarlos fácilmente
- Logging detallado en cada paso del proceso
- Mensajes de error más descriptivos

### 2. **Manejo Robusto de Errores**
- La renderización de tablas ahora maneja errores por celda
- Si una celda falla, muestra "Error" en lugar de romper toda la tabla
- Validaciones exhaustivas de datos antes de renderizar

### 3. **Compatibilidad Dual (Modal y Web App)**
- El sistema detecta automáticamente si está en modo Modal o Web App
- "Unwrapping" inteligente de respuestas según el modo
- Logs específicos para cada modo

## 🔍 Cómo Depurar Problemas

### Paso 1: Abrir la Consola del Navegador
1. En Chrome/Edge: Presiona `F12` o `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
2. Ve a la pestaña "Console"
3. Filtra por emojis para encontrar logs específicos:
   - 🔧 = llamadas backend
   - 📊 = procesamiento de datos
   - 📋 = renderización de modal
   - ✅ = éxito
   - ❌ = error

### Paso 2: Reproducir el Error
1. Ve a la pestaña "Reportes" en el dashboard
2. Haz clic en "Consultar Reportes Existentes"
3. Selecciona un reporte para visualizar
4. Observa los logs en la consola

### Paso 3: Analizar los Logs
Busca estos mensajes clave:

```javascript
// ✅ Flujo Correcto:
🔧 [callBackend] Llamando a "leerReporteExistente"
📞 [callBackend] Ejecutando google.script.run.leerReporteExistente()
✅ [callBackend] Success: leerReporteExistente
📊 [loadReportInDashboard] actualData.success: true
📋 [showReportInModal] data.length: X
✅ [showReportInModal] Tabla renderizada exitosamente

// ❌ Flujo con Error - Hoja No Encontrada:
❌ [callBackend] Error calling leerReporteExistente
❌ Error: No se encontró la hoja "NombreHoja"

// ❌ Flujo con Error - Sin Datos:
⚠️ [showReportInModal] No hay datos para mostrar
```

## 🐛 Problemas Comunes y Soluciones

### Problema 1: "No se encontró la hoja"
**Causa**: El nombre del reporte no coincide exactamente con el nombre de la pestaña en Google Sheets.

**Solución**:
1. Abre tu Google Spreadsheet
2. Verifica el nombre EXACTO de la pestaña (respeta mayúsculas/minúsculas)
3. Compara con el nombre mostrado en el dashboard
4. Si hay diferencias, el problema está en `listarReportesExistentes()`

### Problema 2: "La hoja no contiene datos"
**Causa**: La pestaña está vacía o solo tiene headers.

**Solución**:
1. Abre la pestaña en Google Sheets
2. Verifica que tenga al menos 2 filas (headers + datos)
3. Si solo tiene headers, genera datos primero

### Problema 3: "Error al cargar reporte" (genérico)
**Causa**: Múltiples causas posibles.

**Solución**:
1. Revisa los logs de la consola (ver Paso 2 arriba)
2. Busca el mensaje de error específico
3. Si el error menciona "undefined" o "null":
   - Verifica la estructura de datos en los logs
   - Comprueba que `actualData.data` sea un array
   - Verifica que `actualData.headers` sea un array

### Problema 4: Tabla se renderiza pero está vacía
**Causa**: Los headers no coinciden con las claves de los objetos en `data`.

**Solución**:
1. En la consola, busca:
   ```javascript
   📋 [showReportInModal] Primer registro: {Estudiante: "...", ...}
   📋 [showReportInModal] tableHeaders: ["Estudiante", ...]
   ```
2. Verifica que las claves del objeto coincidan EXACTAMENTE con los headers
3. Si no coinciden, el problema está en `leerReporteExistente()` del backend

### Problema 5: Error "data.map is not a function"
**Causa**: `data` no es un array.

**Solución**:
1. En la consola, busca:
   ```javascript
   📊 [loadReportInDashboard] actualData.data: [Object, Object, ...]
   ```
2. Si ves algo diferente a un array, el problema está en el "unwrapping"
3. Verifica que el backend retorna:
   ```javascript
   {
     success: true,
     data: [...],  // DEBE ser array
     headers: [...],
     sheetName: "..."
   }
   ```

## 🔧 Cómo Probar Manualmente el Backend

Si sospechas que el problema está en el backend, pueba directamente en Apps Script:

1. Abre el editor de Apps Script
2. Crea una función de prueba:

```javascript
function testLeerReporte() {
  const nombreReporte = "RepNotas Curso1BAS-1. Fake News";
  const resultado = leerReporteExistente(nombreReporte);

  Logger.log('=== RESULTADO ===');
  Logger.log('success: ' + resultado.success);
  Logger.log('message: ' + resultado.message);
  Logger.log('data length: ' + (resultado.data ? resultado.data.length : 'null'));
  Logger.log('headers: ' + JSON.stringify(resultado.headers));
  Logger.log('Primer registro: ' + JSON.stringify(resultado.data[0]));
}
```

3. Ejecuta la función
4. Revisa los logs (Ver > Registros)

## 📋 Checklist de Verificación

Antes de reportar un bug, verifica:

- [ ] El nombre del reporte es EXACTO (case-sensitive)
- [ ] La hoja tiene al menos 2 filas (headers + datos)
- [ ] La consola del navegador está abierta
- [ ] Has reproducido el error al menos 2 veces
- [ ] Has copiado los logs completos de la consola
- [ ] Has verificado que SPREADSHEET_ID está configurado correctamente en Code.gs
- [ ] Has probado en modo Modal Y en modo Web App (si aplica)

## 🎯 Próximos Pasos si el Error Persiste

Si después de seguir esta guía el error persiste:

1. **Captura de pantalla de la consola** con todos los logs visibles
2. **Nombre exacto** del reporte que intentas visualizar
3. **Contexto**: ¿En qué modo estás? (Modal o Web App)
4. **Datos de prueba**: Primera fila de datos del reporte (si es posible)

Con esta información, se podrá diagnosticar y resolver el problema específico.

---

## 📝 Logs Completos de Ejemplo (Exitoso)

```javascript
🔧 [callBackend] Llamando a "leerReporteExistente" con args: ["RepNotas Curso1BAS-1. Fake News"]
🔧 [callBackend] Modo: Modal
📞 [callBackend] Ejecutando google.script.run.leerReporteExistente()
✅ [callBackend] Success: leerReporteExistente {success: true, data: Array(25), headers: Array(8), sheetName: "RepNotas Curso1BAS-1. Fake News"}
✅ [callBackend] Tipo de resultado: object
✅ [callBackend] Keys: ["success", "data", "headers", "sheetName"]
🔍 [loadReportInDashboard] Respuesta RAW: {success: true, data: Array(25), headers: Array(8), sheetName: "RepNotas Curso1BAS-1. Fake News"}
🔍 [loadReportInDashboard] Tipo: object
🔍 [loadReportInDashboard] Keys: ["success", "data", "headers", "sheetName"]
✅ Modo Modal detectado (response directo)
📊 [loadReportInDashboard] Datos después de unwrap: {success: true, data: Array(25), headers: Array(8), sheetName: "RepNotas Curso1BAS-1. Fake News"}
📊 [loadReportInDashboard] actualData.success: true
📊 [loadReportInDashboard] actualData.data: [Object, Object, Object, ...]
📊 [loadReportInDashboard] actualData.headers: ["Estudiante", "Curso", "Situación", ...]
✅ Llamando a showReportInModal
📋 [showReportInModal] nombreHoja: RepNotas Curso1BAS-1. Fake News
📋 [showReportInModal] reportData: {success: true, data: Array(25), headers: Array(8), sheetName: "RepNotas Curso1BAS-1. Fake News"}
📋 [showReportInModal] data: [Object, Object, Object, ...]
📋 [showReportInModal] headers: ["Estudiante", "Curso", "Situación", ...]
📋 [showReportInModal] sheetName: RepNotas Curso1BAS-1. Fake News
📋 [showReportInModal] data.length: 25
📋 [showReportInModal] Primer registro: {Estudiante: "Juan Pérez", Curso: "1BAS", ...}
📋 [showReportInModal] tableHeaders: ["Estudiante", "Curso", "Situación", ...]
✅ [showReportInModal] Tabla renderizada exitosamente
```

---

**Última actualización**: 2025-11-12
**Versión**: 1.0
