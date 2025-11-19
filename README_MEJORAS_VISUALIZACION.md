# 📊 Mejoras en Visualización de Reportes - README

## 🎯 Resumen

Se han implementado mejoras significativas en el sistema de visualización de reportes del dashboard, incluyendo:

- ✅ Sistema de logging exhaustivo con emojis
- ✅ Manejo robusto de errores en renderización de tablas
- ✅ Compatibilidad mejorada para modos Modal y Web App
- ✅ Funciones de diagnóstico automático
- ✅ Documentación completa

## 📁 Archivos Modificados/Creados

### Modificados:
1. **dashboard.html**
   - Funciones mejoradas: `callBackend()`, `loadReportInDashboard()`, `showReportInModal()`
   - Total de mejoras: ~100 líneas de código adicionales
   - Líneas críticas: 1367-1432, 3144-3282

2. **Code.gs**
   - Nuevas funciones de diagnóstico: `TEST_leerReporteExistente()`, `TEST_listarReportesExistentes()`, `DIAGNOSTICO_SistemaReportes()`
   - Total de líneas agregadas: ~200
   - Líneas: 3923-4119

### Creados:
1. **GUIA_VISUALIZACION_REPORTES.md** - Guía completa de debugging
2. **CHANGELOG_VISUALIZACION.md** - Historial detallado de cambios
3. **README_MEJORAS_VISUALIZACION.md** - Este archivo

## 🚀 Cómo Usar las Mejoras

### Para Usuarios Finales

#### 1. Visualizar Reportes en el Dashboard

**Método actualizado (Versión 1.2)**:
1. Abre el dashboard (desde Google Sheets o como Web App)
2. Ve a la pestaña **"Reportes"**
3. Haz clic en **"Exportar Reportes a PDF"** (ahora sirve para visualizar Y exportar)
4. Aparecerá una lista de reportes agrupados por tipo
5. Cada reporte tiene DOS botones:
   - **Botón izquierdo**: Exportar a PDF (funcionalidad original)
   - **Botón derecho "👁️ Visualizar"**: Ver el reporte en pantalla (NUEVO)
6. Haz clic en **"👁️ Visualizar"** para abrir el reporte en un modal interactivo

**Características del modal**:
- Scroll vertical para reportes largos
- Headers fijos que permanecen visibles al hacer scroll
- Números alineados a la derecha automáticamente
- Valores vacíos mostrados como "-"
- Contador de registros y columnas en la parte inferior

#### 2. Si Encuentras un Error

1. **Abre la consola del navegador** (F12 o Cmd+Option+I en Mac)
2. Ve a la pestaña "Console"
3. Reproduce el error
4. **Busca mensajes con emojis**:
   - 🔧 = Llamadas al backend
   - 📊 = Procesamiento de datos
   - 📋 = Renderización del modal
   - ✅ = Éxito
   - ❌ = Error

5. **Captura de pantalla** de los logs
6. Consulta [GUIA_VISUALIZACION_REPORTES.md](GUIA_VISUALIZACION_REPORTES.md) para soluciones

### Para Desarrolladores/Administradores

#### 1. Probar el Backend Directamente

En el editor de Apps Script:

```javascript
// Prueba 1: Listar todos los reportes
function miPruebaListar() {
  TEST_listarReportesExistentes();
  // Ve a Ver > Registros de ejecución para ver el resultado
}

// Prueba 2: Leer un reporte específico
function miPruebaLeer() {
  TEST_leerReporteExistente();
  // PRIMERO edita la función para cambiar el nombre del reporte
  // Ve a Ver > Registros de ejecución para ver el resultado
}

// Prueba 3: Diagnóstico completo
function miDiagnostico() {
  DIAGNOSTICO_SistemaReportes();
  // Ve a Ver > Registros de ejecución para ver el resultado completo
}
```

#### 2. Ejecutar Diagnóstico Automático

La función `DIAGNOSTICO_SistemaReportes()` realiza una verificación completa:

1. Verifica configuración de SPREADSHEET_ID
2. Comprueba acceso al spreadsheet
3. Lista todas las hojas
4. Identifica hojas de reportes
5. Prueba `leerReporteExistente()` con el primer reporte
6. Prueba `listarReportesExistentes()`
7. Genera un resumen ejecutivo

**Cómo ejecutar**:
1. Abre el editor de Apps Script
2. Busca la función `DIAGNOSTICO_SistemaReportes`
3. Haz clic en "Ejecutar"
4. Ve a **Ver > Registros de ejecución**
5. Analiza el output

**Output esperado**:
```
================================================================================
🔍 DIAGNÓSTICO COMPLETO DEL SISTEMA DE REPORTES
Timestamp: 2025-11-12T10:30:00.000Z
================================================================================

1️⃣ Verificando SPREADSHEET_ID...
✅ SPREADSHEET_ID configurado: 1WKVottJP88lQ-XxB2SLaLJc06aB5yQYw5peI-8WLaO0

2️⃣ Verificando acceso al spreadsheet...
✅ Acceso exitoso al spreadsheet: Sistema de Evaluación

3️⃣ Listando todas las hojas...
Total de hojas: 15

4️⃣ Identificando hojas de reportes...
Hojas de reportes encontradas: 5
  1. RepNotas Curso1BAS-1. Fake News (25 filas, 8 columnas)
  2. RepNotas Curso2ESO-2. Historia (30 filas, 8 columnas)
  ...

5️⃣ Probando leerReporteExistente con el primer reporte...
Probando con: RepNotas Curso1BAS-1. Fake News
✅ leerReporteExistente funciona correctamente
   - Registros: 25
   - Columnas: 8

6️⃣ Probando listarReportesExistentes...
✅ listarReportesExistentes funciona correctamente
   - Reportes listados: 5

7️⃣ RESUMEN:
────────────────────────────────────────
✓ Spreadsheet accesible: SÍ
✓ Total hojas: 15
✓ Hojas de reportes: 5
✓ leerReporteExistente: PROBADO
✓ listarReportesExistentes: PROBADO

================================================================================
🔍 FIN DIAGNÓSTICO
================================================================================
```

#### 3. Debugging Avanzado en el Dashboard

**Logs del Frontend** (en la consola del navegador):

```javascript
// Ejemplo de flujo exitoso:
🔧 [callBackend] Llamando a "leerReporteExistente" con args: ["RepNotas Curso1BAS-1. Fake News"]
🔧 [callBackend] Modo: Modal
📞 [callBackend] Ejecutando google.script.run.leerReporteExistente()
✅ [callBackend] Success: leerReporteExistente
✅ [callBackend] Tipo de resultado: object
✅ [callBackend] Keys: ["success", "data", "headers", "sheetName"]
🔍 [loadReportInDashboard] Respuesta RAW: {success: true, ...}
✅ Modo Modal detectado (response directo)
📊 [loadReportInDashboard] actualData.success: true
📊 [loadReportInDashboard] actualData.data: [Object, Object, ...]
📋 [showReportInModal] data.length: 25
✅ [showReportInModal] Tabla renderizada exitosamente
```

**Filtrar logs por emoji** en la consola:
- Escribe `🔧` en el filtro para ver solo llamadas backend
- Escribe `❌` para ver solo errores
- Escribe `✅` para ver solo éxitos

## 🐛 Solución de Problemas Comunes

### Problema 1: "No se encontró la hoja"
**Síntoma**: Modal muestra error "No se encontró la hoja..."
**Causa**: Nombre del reporte no coincide exactamente

**Solución**:
1. Ejecuta `DIAGNOSTICO_SistemaReportes()` en Apps Script
2. Compara los nombres listados con los que aparecen en el dashboard
3. Verifica mayúsculas/minúsculas y espacios
4. Si hay discrepancias, el problema está en `listarReportesExistentes()`

### Problema 2: Tabla vacía
**Síntoma**: Modal se abre pero la tabla está vacía
**Causa**: Headers no coinciden con claves de objetos

**Solución**:
1. Abre la consola del navegador (F12)
2. Busca este log:
   ```
   📋 [showReportInModal] Primer registro: {Estudiante: "...", ...}
   📋 [showReportInModal] tableHeaders: ["Estudiante", ...]
   ```
3. Verifica que las claves del objeto coincidan con los headers
4. Si no coinciden, ejecuta `TEST_leerReporteExistente()` para verificar backend

### Problema 3: "data.map is not a function"
**Síntoma**: Error en consola: "data.map is not a function"
**Causa**: Unwrapping incorrecto del response

**Solución**:
1. Verifica en la consola:
   ```
   📊 [loadReportInDashboard] actualData.data: [...]
   ```
2. Si no es un array, el problema está en el unwrapping
3. Verifica que el backend retorne estructura correcta:
   ```javascript
   {
     success: true,
     data: [...],  // DEBE ser array
     headers: [...],
     sheetName: "..."
   }
   ```

### Problema 4: Modo no detectado correctamente
**Síntoma**: Logs muestran "Modo desconocido"
**Causa**: Detección de entorno fallida

**Solución**:
1. Verifica en la consola al inicio:
   ```
   Dashboard Mode: Modal Dialog
   // o
   Dashboard Mode: Web App
   ```
2. Si es incorrecto, verifica que `google.script.run` esté disponible (modal) o no (web app)
3. Intenta abrir en otro navegador para descartar problemas de extensiones

## 📈 Mejores Prácticas

### Para Crear Nuevos Reportes

1. **Usa nombres descriptivos**: `RepNotas Curso1BAS-1. Tema`
2. **Primera fila = headers**: Siempre
3. **Headers consistentes**: Usa los mismos nombres en todos los reportes del mismo tipo
4. **Sin filas vacías**: Entre headers y datos
5. **Prueba inmediatamente**: Usa `TEST_leerReporteExistente()` después de crear

### Para Debugging

1. **Siempre abre la consola primero**: Antes de reproducir el error
2. **Limpia la consola**: Ctrl+L (Windows) / Cmd+K (Mac) antes de cada prueba
3. **Reproduce una sola vez**: Para tener logs limpios
4. **Captura TODOS los logs**: Desde el primer mensaje hasta el error
5. **Usa las funciones TEST**: Del backend para verificar datos en origen

### Para Mantenimiento

1. **Ejecuta diagnóstico mensualmente**: `DIAGNOSTICO_SistemaReportes()`
2. **Revisa logs de producción**: En la consola cuando los usuarios reporten errores
3. **Mantén nombres consistentes**: No cambies nombres de hojas sin actualizar referencias
4. **Documenta cambios**: En este archivo o en CHANGELOG_VISUALIZACION.md

## 📚 Documentación Adicional

- **[GUIA_VISUALIZACION_REPORTES.md](GUIA_VISUALIZACION_REPORTES.md)**: Guía completa de debugging paso a paso
- **[CHANGELOG_VISUALIZACION.md](CHANGELOG_VISUALIZACION.md)**: Historial detallado de cambios y mejoras
- **Code.gs** (líneas 3923-4119): Funciones de diagnóstico con comentarios detallados
- **dashboard.html** (líneas 1367-1432, 3144-3282): Implementación frontend con logging

## 🤝 Contribuir

Si encuentras un bug o tienes una mejora:

1. Ejecuta `DIAGNOSTICO_SistemaReportes()` para obtener información del sistema
2. Reproduce el error con la consola abierta
3. Captura logs completos
4. Documenta:
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Logs de consola (frontend)
   - Logs de Apps Script (backend)
   - Navegador y versión

## 📞 Soporte

Para problemas:
1. Consulta primero [GUIA_VISUALIZACION_REPORTES.md](GUIA_VISUALIZACION_REPORTES.md)
2. Ejecuta funciones TEST para verificar backend
3. Revisa logs con emojis en la consola
4. Si persiste, documenta según "Contribuir" arriba

---

**Última actualización**: 2025-11-12
**Versión**: 1.3
**Autor**: Claude Code
**Compatibilidad**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## 🆕 Novedades Versión 1.3

- ✅ **NUEVO**: Soporte completo para Reportes de Notas (RepNotas)
- ✅ **NUEVO**: Visualización de medias ponderadas calculadas
- ✅ **NUEVO**: Detección inteligente de estructura dual (datos originales + medias)
- ✅ **NUEVO**: Fallback automático si no hay medias calculadas
- ✅ Función `visualizarReporte()` completamente implementada
- ✅ Botones "👁️ Visualizar" en modal de exportación
- ✅ Modal de visualización con tabla interactiva y metadata
- ✅ Manejo robusto de errores por celda/fila
- ✅ Logging exhaustivo para debugging

Ver [CHANGELOG_VISUALIZACION.md](CHANGELOG_VISUALIZACION.md) para detalles completos.
