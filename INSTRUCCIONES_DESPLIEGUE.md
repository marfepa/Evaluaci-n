# 🚀 Instrucciones de Despliegue - Dashboard Sistema de Evaluación

## Paso a Paso Completo

### 1️⃣ Preparación del Proyecto

#### A. Verificar Archivos
Asegúrate de que tienes todos estos archivos en tu proyecto de Google Apps Script:

**Archivos Principales:**
- ✅ `Code.gs` - Funciones principales
- ✅ `dashboard.html` - Interfaz del panel
- ✅ `appsscript.json` - Configuración

**Archivos de Reportes:**
- ✅ `ReportesAsistencia.gs`
- ✅ `ReporteCalificaciones.gs`
- ✅ `ReporteAsistenciaAvanzado.gs`

**Archivos de Alertas:**
- ✅ `AsistenciaAuto.gs`
- ✅ `AsistenciaConfig.gs`
- ✅ `AsistenciaScheduler.gs`
- ✅ `DiagnosticoAlertas.gs`

**Formularios HTML:**
- ✅ `rubrica_form.html`
- ✅ `rubrica_peer_form.html`
- ✅ `lista_cotejo_form.html`
- ✅ `num_directo_form.html`
- ✅ `beep_test_form.html`
- ✅ `beep_test_batch_form.html`

**Diálogos:**
- ✅ `config_dialog.html`
- ✅ `scheduler_manager.html`
- ✅ `trigger_manager.html`

### 2️⃣ Configurar el Spreadsheet ID

1. Abre tu Google Sheets con los datos
2. Copia el ID de la URL:
   ```
   https://docs.google.com/spreadsheets/d/[COPIA_ESTE_ID]/edit
   ```

3. En `Code.gs`, línea 6, pega tu ID:
   ```javascript
   const SPREADSHEET_ID = 'TU_ID_AQUI';
   ```

### 3️⃣ Verificar Estructura de Google Sheets

Tu hoja de cálculo debe tener estas hojas (pestañas):

#### Hojas Obligatorias:

**1. Estudiantes**
Columnas necesarias:
- `IDEstudiante` (texto único, ej: "EST001")
- `NombreEstudiante` (texto)
- `CursoID` (texto, ej: "1BAS", "2ESO")
- `Email` (opcional, email válido)

Ejemplo:
| IDEstudiante | NombreEstudiante | CursoID | Email |
|--------------|------------------|---------|--------|
| EST001 | Juan Pérez | 1BAS | juan@ejemplo.com |
| EST002 | María García | 1BAS | maria@ejemplo.com |

**2. InstrumentosEvaluacion**
Columnas necesarias:
- `IDInstrumento` (texto único)
- `NombreInstrumento` (texto)
- `TipoInstrumento` (texto: "Rúbrica", "Lista de Cotejo", "Calificación Directa")
- `IDInstrumentoTipo` (ID de la rúbrica o lista específica)
- `IDSituacionAprendizaje` o `SituacionAprendizaje` (referencia)

**3. SituacionesAprendizaje**
Columnas necesarias:
- `IDSituacionAprendizaje` (texto único)
- `NombreSituacion` (texto)
- `CursoID` (referencia al curso)

**4. RegistroAsistencia**
Columnas necesarias:
- `IDEstudiante` (referencia)
- `Fecha` (fecha)
- `CursoID` (referencia)
- `Presente` (booleano: TRUE/FALSE)

**5. CalificacionesDetalladas**
Se crea automáticamente si no existe. Columnas:
- `IDCalificacionDetalle`
- `IDCalificacionMaestra`
- `NombreInstrumento`
- `AlumnoEvaluador`
- `NombreEstudiante`
- `CursoEvaluado`
- `NombreSituacion`
- `FechaEvaluacion`
- `NombreCriterioEvaluado`
- `NombreNivelAlcanzado`
- `PuntuacionCriterio`
- `DescripcionItemEvaluado`
- `CompletadoItem`
- `CalificacionTotalInstrumento`
- `ComentariosGenerales`
- `ComentariosGlobales`

#### Hojas Opcionales (para instrumentos):

**6. Definicion_Rubricas** (si usas rúbricas)
- `IDRubrica`
- `IDCriterio`
- `IDNivel`
- `Descriptor`

**7. Maestro_CriteriosRubrica**
- `IDCriterio`
- `NombreCriterio`

**8. Maestro_NivelesRubrica**
- `IDNivel`
- `NombreNivel`
- `PuntuacionNivel`

**9. Definicion_ListasCotejo** (si usas listas de cotejo)
- `IDListaCotejo`
- `IDItem`
- `DescripcionItem`

### 4️⃣ Desplegar como WebApp

#### Paso a Paso Visual:

1. **En Google Apps Script**, haz clic en el botón **"Implementar"** (parte superior derecha)

2. Selecciona **"Nueva implementación"**

3. Haz clic en el ícono de engranaje ⚙️ junto a "Seleccionar tipo"

4. Elige **"Aplicación web"**

5. Configura los parámetros:

   **Descripción:** (opcional)
   ```
   Dashboard Sistema de Evaluación v1.0
   ```

   **Ejecutar como:**
   ```
   Yo (tu@email.com)
   ```
   ☝️ Importante: Debe ser tu cuenta

   **Quién tiene acceso:**

   Opciones disponibles:
   - ✅ **Solo yo** - Solo tú puedes acceder (recomendado para pruebas)
   - ✅ **Cualquier usuario de [tu organización]** - Todos en tu dominio (recomendado para uso escolar)
   - ⚠️ **Cualquier persona** - Acceso público (NO recomendado)

6. Haz clic en **"Implementar"**

7. **IMPORTANTE**: Copia la URL que aparece
   ```
   https://script.google.com/macros/s/[ID_LARGO]/exec
   ```

   💡 **Guarda esta URL** - La necesitarás para:
   - Acceder directamente al dashboard
   - Compartir con otros usuarios
   - Crear enlaces en tu sitio web

8. Haz clic en **"Listo"**

### 5️⃣ Autorizar Permisos

La primera vez que ejecutes el dashboard:

1. Haz clic en **"Abrir Dashboard"** desde el menú de Google Sheets

2. Aparecerá un mensaje: **"Autorización necesaria"**

3. Haz clic en **"Revisar permisos"**

4. Selecciona tu cuenta de Google

5. Verás: **"Google no ha verificado esta aplicación"**
   - No te preocupes, es normal para proyectos personales
   - Haz clic en **"Avanzado"**
   - Luego en **"Ir a [nombre del proyecto] (no seguro)"**

6. Revisa los permisos solicitados:
   - ✅ Ver y administrar hojas de cálculo
   - ✅ Ver y administrar documentos
   - ✅ Enviar correos electrónicos
   - ✅ Mostrar y ejecutar contenido web

7. Haz clic en **"Permitir"**

### 6️⃣ Verificar Funcionamiento

#### Test 1: Menú de Google Sheets
1. Abre tu Google Sheets
2. Refresca la página (F5)
3. Deberías ver el menú: **🎯 Panel de Control**
4. Haz clic en **"Abrir Dashboard"**
5. Debe abrirse una ventana nueva con el dashboard

#### Test 2: Acceso Directo
1. Abre la URL de la WebApp en un navegador nuevo
2. El dashboard debe cargar directamente
3. Verifica que aparezcan las estadísticas

#### Test 3: Funcionalidades
1. Ve a la pestaña **"Estudiantes"**
   - Debe mostrar la lista de estudiantes
   - El filtro por curso debe funcionar

2. Ve a **"Instrumentos"**
   - Debe mostrar los instrumentos disponibles
   - Prueba a abrir uno

3. Prueba generar un reporte:
   - **Asistencia** > **Reporte por Estudiante**
   - Ingresa un ID válido
   - Debe generarse la hoja "Reporte_Asistencia"

### 7️⃣ Compartir el Dashboard

#### Para compartir con otros profesores:

**Opción A: URL Directa**
```
Envía la URL de la WebApp
https://script.google.com/macros/s/[TU_ID]/exec
```

**Opción B: Añadir al menú de Sheets**
1. Comparte el Google Sheets con ellos
2. Automáticamente verán el menú **"🎯 Panel de Control"**
3. Pueden abrir el dashboard desde allí

**Opción C: Crear un Marcador/Favorito**
```html
Nombre: Dashboard Evaluación
URL: [tu URL de WebApp]
```

### 8️⃣ Actualizar el Dashboard

Cuando hagas cambios en el código:

1. Guarda los cambios en Google Apps Script
2. Ve a **"Implementar"** > **"Administrar implementaciones"**
3. Haz clic en el ícono de lápiz ✏️
4. En **"Versión"**, selecciona **"Nueva versión"**
5. Añade una descripción: "Actualización [fecha]"
6. Haz clic en **"Implementar"**

⚠️ **Importante**: La URL no cambia, pero los usuarios deben refrescar (F5) para ver cambios.

### 9️⃣ Configuración Avanzada (Opcional)

#### Activar Alertas Automáticas:
1. En el dashboard, ve a **Asistencia**
2. Haz clic en **"⏰ Programar Alertas"**
3. Configura horario y frecuencia
4. El sistema enviará emails automáticamente

#### Personalizar Diseño:
1. Edita `dashboard.html`
2. Busca la sección `:root` (línea 16)
3. Cambia los colores:
   ```css
   --primary: #TU_COLOR_AQUI;
   ```
4. Guarda y actualiza la implementación

### 🔟 Solucionar Problemas Comunes

#### Problema: "No se puede cargar el dashboard"
**Solución:**
1. Verifica que la WebApp esté desplegada
2. Revisa el `SPREADSHEET_ID` en Code.gs
3. Comprueba que tengas permisos en el Spreadsheet

#### Problema: "No aparecen datos"
**Solución:**
1. Verifica nombres de las hojas (deben ser exactos)
2. Revisa que haya datos en las hojas
3. Comprueba los nombres de las columnas

#### Problema: "Error de autorización"
**Solución:**
1. Ve a **Proyecto** > **Configuración del proyecto**
2. Comprueba los **Scopes OAuth**
3. Vuelve a autorizar desde el menú de Sheets

#### Problema: "Los instrumentos no se abren"
**Solución:**
1. Verifica que el `IDInstrumento` sea único
2. Comprueba la columna `IDSituacionAprendizaje`
3. Revisa que la situación tenga un `CursoID`

### 📋 Checklist Final

Antes de dar por terminado el despliegue:

- [ ] ✅ `SPREADSHEET_ID` configurado correctamente
- [ ] ✅ Todas las hojas necesarias creadas
- [ ] ✅ WebApp desplegada con URL guardada
- [ ] ✅ Permisos autorizados
- [ ] ✅ Menú visible en Google Sheets
- [ ] ✅ Dashboard carga correctamente
- [ ] ✅ Estadísticas se muestran
- [ ] ✅ Tabla de estudiantes funciona
- [ ] ✅ Un reporte de prueba generado exitosamente
- [ ] ✅ URL compartida con usuarios autorizados

### 🎉 ¡Listo!

Tu dashboard ya está completamente desplegado y funcional.

**Accesos rápidos:**
- 📊 **Desde Sheets**: Menú "🎯 Panel de Control" > "Abrir Dashboard"
- 🌐 **URL Directa**: [Tu URL de WebApp]
- 📱 **Móvil**: La misma URL funciona en dispositivos móviles

**Próximos pasos:**
1. Familiarízate con todas las funciones
2. Prueba generar reportes
3. Configura alertas automáticas
4. Personaliza colores si lo deseas

### 📞 ¿Necesitas Ayuda?

Si algo no funciona:
1. Revisa el archivo `README.md` completo
2. Comprueba los logs: **Ver** > **Registros** en Apps Script
3. Verifica que todos los archivos estén presentes
4. Asegúrate de tener la última versión guardada

---

**¡Disfruta tu nuevo Dashboard de Evaluación!** 🚀
