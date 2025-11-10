# 📊 Sistema de Evaluación - Panel de Control

Sistema integral de gestión educativa con interfaz moderna y profesional para administrar estudiantes, asistencia, calificaciones e instrumentos de evaluación.

## 🚀 Características Principales

### ✨ Dashboard Moderno
- Interfaz minimalista y profesional con diseño responsive
- Animaciones suaves y transiciones elegantes
- Navegación por pestañas intuitiva
- Estadísticas en tiempo real

### 👥 Gestión de Estudiantes
- Visualización completa de estudiantes registrados
- Filtrado por curso
- Información detallada (ID, nombre, curso, email)

### 📋 Control de Asistencia
- **Reportes por estudiante**: Análisis individual detallado
- **Reportes por curso**: Resumen completo de asistencia grupal
- **Comparativas**: Compara asistencia entre 2 estudiantes o 2 cursos con gráficos
- **Alertas automáticas**: Sistema de notificaciones por email
- **Análisis avanzado**: Reportes con múltiples filtros

### 📝 Gestión de Calificaciones
- **Consultas por estudiante**: Todas las calificaciones de un alumno
- **Consultas por curso**: Resumen de calificaciones por grupo
- **Comparativas**: Compara calificaciones entre estudiantes o cursos
- **Análisis visual**: Gráficos comparativos automáticos

### 🎯 Instrumentos de Evaluación
- Listado completo de instrumentos disponibles
- Clasificación por tipo (Rúbrica, Lista de Cotejo, Calificación Directa)
- Acceso directo a cada instrumento
- Soporte para evaluaciones peer y autoevaluación

### 📊 Reportes y Análisis
- **Reportes de notas por situación**: Informes detallados por situación de aprendizaje
- **Medias ponderadas**: Cálculo automático con pesos personalizados
- **Reportes avanzados**: Análisis con múltiples criterios
- **Exportación de datos**: Preparado para futuras exportaciones

## 🛠️ Configuración Inicial

### 1. Desplegar como WebApp

1. Abre el proyecto en Google Apps Script
2. Haz clic en **Implementar** > **Nueva implementación**
3. Selecciona tipo: **Aplicación web**
4. Configura:
   - **Ejecutar como**: Tu cuenta
   - **Quién tiene acceso**: Según tus necesidades (recomendado: Solo yo, o usuarios de tu organización)
5. Haz clic en **Implementar**
6. **Copia la URL** que te proporciona (la necesitarás para acceder)

### 2. Configurar Spreadsheet ID

En el archivo `Code.gs`, línea 6, reemplaza con el ID de tu hoja de cálculo:

```javascript
const SPREADSHEET_ID = 'TU_SPREADSHEET_ID_AQUI';
```

Para obtener el ID: Abre tu Google Sheets y cópialo de la URL:
```
https://docs.google.com/spreadsheets/d/[ESTE_ES_EL_ID]/edit
```

### 3. Configurar Hojas Necesarias

Tu Google Sheets debe tener las siguientes hojas con estos nombres exactos:

#### Hojas Principales:
- **Estudiantes**: Columnas mínimas: `IDEstudiante`, `NombreEstudiante`, `CursoID`, `Email`
- **InstrumentosEvaluacion**: Instrumentos de evaluación disponibles
- **SituacionesAprendizaje**: Situaciones de aprendizaje
- **RegistroAsistencia**: Registro de asistencia diaria
- **CalificacionesDetalladas**: Todas las evaluaciones registradas

#### Hojas de Definición (para instrumentos):
- **Definicion_Rubricas**: Definiciones de rúbricas
- **Definicion_ListasCotejo**: Definiciones de listas de cotejo
- **Maestro_CriteriosRubrica**: Criterios de evaluación
- **Maestro_NivelesRubrica**: Niveles de desempeño

## 📱 Cómo Usar el Dashboard

### Acceso al Dashboard

#### Opción 1: Desde Google Sheets
1. Abre tu Google Sheets con los datos
2. Ve al menú: **🎯 Panel de Control** > **Abrir Dashboard**
3. Se abrirá automáticamente en una nueva ventana

#### Opción 2: Acceso Directo (URL)
1. Usa la URL de la WebApp que copiaste al desplegar
2. Guárdala en tus favoritos para acceso rápido
3. Ejemplo: `https://script.google.com/...../exec`

### Navegación

El dashboard tiene 6 pestañas principales:

#### 📈 Resumen
- Vista general con estadísticas principales
- Tarjetas con accesos rápidos a cada módulo
- Contadores de: Estudiantes, Cursos, Instrumentos, Evaluaciones

#### 👥 Estudiantes
- Tabla con todos los estudiantes
- Filtro por curso en tiempo real
- Visualización clara de información

#### 📋 Asistencia
- **Reporte por Estudiante**: Ingresa el ID del estudiante
- **Reporte por Curso**: Ingresa el ID del curso
- **Comparar Estudiantes**: Compara 2 estudiantes (genera gráfico)
- **Comparar Cursos**: Compara 2 cursos (genera gráfico)
- **Configurar Alertas**: Programa notificaciones automáticas

#### 📝 Calificaciones
- **Por Estudiante**: Consulta todas las calificaciones de un alumno
- **Por Curso**: Resumen de calificaciones del grupo
- **Comparar Estudiantes**: Análisis comparativo con gráficos
- **Comparar Cursos**: Comparativa entre grupos

#### 🎯 Instrumentos
- Lista completa de instrumentos disponibles
- Columnas: ID, Nombre, Tipo, Situación
- Botón **Abrir** para acceder al instrumento

#### 📊 Reportes
- **Reporte de Notas por Situación**: Selecciona curso y situación
- **Reporte Avanzado de Asistencia**: Análisis con filtros múltiples
- **Calcular Medias Ponderadas**: Asigna pesos a cada instrumento
- **Exportar Datos**: (Próximamente)

## 🎨 Características de Diseño

### Paleta de Colores
```css
- Primario: #2563eb (azul)
- Secundario: #10b981 (verde)
- Advertencia: #f59e0b (naranja)
- Peligro: #ef4444 (rojo)
- Fondo: #f8fafc (gris claro)
```

### Animaciones
- **fadeIn**: Aparición suave de elementos
- **slideIn**: Deslizamiento lateral
- **scaleIn**: Crecimiento de modales
- **float**: Movimiento flotante en el header
- **pulse**: Pulsación para elementos de carga

### Responsive
- Se adapta automáticamente a móviles, tablets y escritorio
- Grid flexible que reorganiza las tarjetas según el espacio
- Tablas con scroll horizontal en pantallas pequeñas

## 📚 Funcionalidades Avanzadas

### Comparativas con Gráficos
Todas las comparativas generan automáticamente:
1. Nueva hoja en Google Sheets con los datos
2. Gráfico de barras comparativo
3. Cálculos de porcentajes y promedios

### Medias Ponderadas
1. Ve a **Reportes** > **Calcular Medias Ponderadas**
2. Asegúrate de estar en una hoja "RepNotas [Curso]-[Situación]"
3. El sistema te pedirá el peso (%) de cada instrumento
4. Calcula automáticamente la media ponderada con fórmulas

### Sistema de Alertas
Configura alertas automáticas por email:
- **Programar Alertas**: Define horario de envío
- **Configurar Destinatarios**: Lista de emails
- **Umbrales**: Define porcentajes de alerta
- **Diagnóstico**: Verifica el sistema de alertas

## 🔧 Personalización

### Cambiar Colores
Edita las variables CSS en `dashboard.html` (líneas 16-26):

```css
:root {
  --primary: #2563eb;
  --secondary: #10b981;
  /* ... etc ... */
}
```

### Añadir Nuevas Funciones
1. Crea la función en `Code.gs`
2. Añade el botón en `dashboard.html`
3. Conecta con `google.script.run.tuFuncion()`

## 🐛 Solución de Problemas

### El dashboard no carga
- Verifica que la WebApp esté desplegada correctamente
- Revisa que el `SPREADSHEET_ID` esté configurado
- Comprueba los permisos de la aplicación

### No aparecen datos
- Verifica que las hojas tengan los nombres correctos
- Revisa que haya datos en las hojas
- Comprueba que las columnas tengan los nombres esperados

### Errores de permisos
- Autoriza la aplicación la primera vez que la uses
- Verifica que tengas acceso al Spreadsheet configurado
- Revisa los permisos en la configuración de la WebApp

### Instrumentos no se abren
- Verifica que el instrumento tenga un `IDInstrumento` válido
- Comprueba que esté asociado a una situación de aprendizaje
- Revisa que la situación tenga un `CursoID` configurado

## 📖 Estructura del Proyecto

```
/Evaluación/
├── Code.gs                          # Funciones principales y dashboard
├── dashboard.html                   # Interfaz HTML del panel
├── appsscript.json                  # Configuración del proyecto
├── ReportesAsistencia.gs           # Reportes de asistencia
├── ReporteCalificaciones.gs        # Reportes de calificaciones
├── AsistenciaAuto.gs               # Sistema de alertas automáticas
├── AsistenciaConfig.gs             # Configuración de alertas
├── AsistenciaScheduler.gs          # Programador de alertas
├── ReporteAsistenciaAvanzado.gs    # Reportes avanzados
├── DiagnosticoAlertas.gs           # Diagnóstico del sistema
├── rubrica_form.html               # Formulario de rúbrica
├── rubrica_peer_form.html          # Formulario de rúbrica peer
├── lista_cotejo_form.html          # Formulario de lista de cotejo
├── num_directo_form.html           # Formulario de calificación directa
├── beep_test_form.html             # Formulario de Beep Test
├── beep_test_batch_form.html       # Formulario de Beep Test por lotes
├── config_dialog.html              # Diálogo de configuración
├── scheduler_manager.html          # Gestor de programaciones
└── trigger_manager.html            # Gestor de triggers
```

## 🤝 Contribuciones

Este es un proyecto educativo en constante evolución. Si encuentras bugs o tienes sugerencias:

1. Documenta el problema claramente
2. Incluye capturas de pantalla si es posible
3. Describe los pasos para reproducir el error

## 📝 Notas Importantes

- **Rendimiento**: El dashboard carga datos dinámicamente para mejor rendimiento
- **Seguridad**: Nunca compartas el `SPREADSHEET_ID` públicamente
- **Backups**: Haz copias de seguridad regulares de tu Google Sheets
- **Actualizaciones**: Revisa periódicamente por nuevas versiones

## 🎓 Casos de Uso

### Para Profesores:
- Gestiona múltiples cursos desde un solo lugar
- Genera reportes automáticos de asistencia y calificaciones
- Compara rendimiento entre estudiantes o grupos
- Configura alertas para detectar problemas rápidamente

### Para Coordinadores:
- Visualiza estadísticas generales del centro
- Accede rápidamente a instrumentos de evaluación
- Genera informes por situaciones de aprendizaje
- Compara rendimiento entre diferentes cursos

### Para Evaluaciones:
- Usa instrumentos predefinidos (rúbricas, listas de cotejo)
- Soporta auto-evaluación y co-evaluación
- Calcula automáticamente calificaciones ponderadas
- Genera reportes detallados por estudiante o curso

## 📞 Soporte

Para dudas o problemas:
1. Revisa esta documentación completa
2. Comprueba la sección de solución de problemas
3. Verifica los logs en Google Apps Script (Ver > Registros)

---

**Versión**: 2.0
**Última actualización**: Noviembre 2025
**Compatibilidad**: Google Apps Script (Runtime V8)

¡Disfruta usando el Sistema de Evaluación! 🎉
