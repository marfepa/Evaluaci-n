# 🔧 ACTUALIZAR DASHBOARD - INSTRUCCIONES

El dashboard no funciona porque estás usando una versión **ANTIGUA** del código en Google Apps Script.

## 📋 Pasos para actualizar

### PASO 1: Abre tu proyecto de Google Apps Script

1. Ve a: https://script.google.com
2. Busca y abre el proyecto vinculado a tu hoja de cálculo

### PASO 2: Actualiza Code.gs

1. En el editor, haz clic en el archivo **"Code.gs"**
2. Abre en otra pestaña: [Code.gs actualizado](https://raw.githubusercontent.com/marfepa/Evaluaci-n/claude/funciona-b-011CV1sWiyv9xZ7pEkReBY4L/Code.gs)
3. Selecciona TODO el contenido (`Ctrl+A` o `Cmd+A`)
4. Cópialo (`Ctrl+C` o `Cmd+C`)
5. Vuelve al editor de Apps Script
6. Selecciona TODO en Code.gs (`Ctrl+A` o `Cmd+A`)
7. Pégalo (`Ctrl+V` o `Cmd+V`)
8. **GUARDA** (`Ctrl+S` o `Cmd+S`)

### PASO 3: Actualiza dashboard.html

1. En el editor, haz clic en el archivo **"dashboard.html"**
2. Abre en otra pestaña: [dashboard.html actualizado](https://raw.githubusercontent.com/marfepa/Evaluaci-n/claude/funciona-b-011CV1sWiyv9xZ7pEkReBY4L/dashboard.html)
3. Selecciona TODO el contenido (`Ctrl+A` o `Cmd+A`)
4. Cópialo (`Ctrl+C` o `Cmd+C`)
5. Vuelve al editor de Apps Script
6. Selecciona TODO en dashboard.html (`Ctrl+A` o `Cmd+A`)
7. Pégalo (`Ctrl+V` o `Cmd+V`)
8. **GUARDA** (`Ctrl+S` o `Cmd+S`)

### PASO 4: Despliega la nueva versión

1. En el menú superior: **"Implementar"** → **"Gestionar implementaciones"**
2. Haz clic en el ícono del **lápiz (✏️)** junto a tu implementación activa
3. En "Nueva descripción": `Dashboard corregido - compatibilidad mejorada`
4. Haz clic en **"Implementar"**
5. Espera a que termine
6. Cierra el diálogo

### PASO 5: Prueba el dashboard

1. Vuelve a tu hoja de Google Sheets
2. Recarga la página (`F5` o `Cmd+R`)
3. Menú **"🎯 Panel de Control"** → **"Abrir Dashboard"**
4. Abre la **consola del navegador** (`F12`)
5. Deberías ver estos mensajes nuevos:

```
=== DASHBOARD INITIALIZATION ===
Dashboard Mode: Modal Dialog (o Web App)
Web App URL: https://script.google.com/...
================================
=== INITIALIZING DASHBOARD ===
Mode: Modal Dialog (o Web App)
Loading initial statistics...
[Modal Mode] Calling: getStatistics []
[Modal Mode] Success: getStatistics {...}
✅ Dashboard statistics loaded successfully
```

## 🔍 ¿Qué cambios se hicieron?

### ✅ Code.gs (líneas 96-109):
- Mejor acceso a funciones globales con `eval()`
- Logging detallado con stack traces
- Mejor manejo de errores

### ✅ dashboard.html:
- **Eliminado modo CORS** que causaba problemas con Google Apps Script
- **Logging mejorado** con prefijos `[Modal Mode]` / `[Web App Mode]`
- **Mejor detección** y normalización de URLs
- **Mensajes de error** más informativos con contexto
- **Indicador de modo** siempre visible para debugging

## 🚨 Si todavía no funciona

Si después de actualizar el código el dashboard sigue sin funcionar:

1. Abre la **consola del navegador** (`F12`)
2. Copia **TODOS** los mensajes que aparecen
3. Envíamelos para diagnosticar el problema

Los logs ahora son mucho más detallados y mostrarán **exactamente** dónde está el problema.

## 💡 Para futuras actualizaciones

Considera configurar **clasp** para sincronizar automáticamente:
- Ve el archivo `INSTRUCTIONS_CLASP.md` para instrucciones
- Con clasp puedes hacer `clasp push` para subir cambios automáticamente
- No necesitarás copiar y pegar manualmente

## 📊 Commits relacionados

- `56cde23` - Corregir problemas de compatibilidad en dashboard.html
- `3ce07e9` - Mejorar función doPost para mejor compatibilidad

Branch: `claude/funciona-b-011CV1sWiyv9xZ7pEkReBY4L`
