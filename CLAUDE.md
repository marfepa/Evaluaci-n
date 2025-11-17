# CLAUDE.md - AI Assistant Guide for Educational Evaluation System

**Last Updated**: November 2025
**Project Type**: Google Apps Script Web Application
**Primary Language**: JavaScript (Apps Script), HTML/CSS

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Code Structure](#architecture--code-structure)
3. [Key Technologies & Dependencies](#key-technologies--dependencies)
4. [Module Breakdown](#module-breakdown)
5. [Data Model & Google Sheets Structure](#data-model--google-sheets-structure)
6. [Development Workflows](#development-workflows)
7. [Code Conventions & Patterns](#code-conventions--patterns)
8. [Security Considerations](#security-considerations)
9. [Performance Optimizations](#performance-optimizations)
10. [Common Tasks & Operations](#common-tasks--operations)
11. [Testing & Debugging](#testing--debugging)
12. [Deployment Guide](#deployment-guide)
13. [Important Notes for AI Assistants](#important-notes-for-ai-assistants)

---

## Project Overview

### What is This System?

This is a comprehensive **educational evaluation and attendance management system** built on Google Apps Script. It provides:

- **Student Management**: Track students across multiple courses
- **Attendance Control**: Record, analyze, and report attendance with automated alerts
- **Grading System**: Manage evaluations through various instrument types
- **Evaluation Instruments**: Rubrics, checklists, direct grading, peer evaluation, and Beep Test
- **Dashboard Interface**: Modern web-based UI for data visualization and management
- **Automated Reports**: Generate PDF reports, comparative analysis, and weighted averages
- **Email Notifications**: Automated attendance alerts based on configurable thresholds

### Target Users

- **Teachers**: Daily management of attendance and grades
- **Coordinators**: Overview of multiple courses and comparative analysis
- **Administrators**: System configuration and automated reporting

---

## Architecture & Code Structure

### File Organization

```
/Evaluación/
│
├── Core Application Files
│   ├── Code.gs                          # Main application logic (140KB+)
│   ├── dashboard.html                   # Main dashboard UI (128KB)
│   ├── dashboard_opener.html            # Dashboard launcher from Sheets
│   └── appsscript.json                  # Project configuration & OAuth scopes
│
├── Optimization Modules
│   ├── CacheOptimizado.gs              # Multi-level caching system (60-80% performance improvement)
│   ├── LoggingOptimizado.gs            # Centralized logging framework
│   ├── BatchReadsOptimizado.gs         # Batch read operations for Sheets API
│   └── ReportesAsistenciaOptimizado.gs # Optimized attendance reports
│
├── Attendance System
│   ├── AsistenciaAuto.gs               # Automated attendance notifications
│   ├── AsistenciaConfig.gs             # Alert configuration management
│   ├── AsistenciaScheduler.gs          # Trigger/scheduler management
│   ├── ReportesAsistencia.gs           # Basic attendance reports
│   └── ReporteAsistenciaAvanzado.gs    # Advanced attendance analysis
│
├── Grading & Reports
│   ├── ReporteCalificaciones.gs        # Grade reports and comparisons
│   └── dialog_rango.gs                 # Range selection dialogs
│
├── Diagnostic Tools
│   ├── DiagnosticoAlertas.gs           # Alert system diagnostics
│   ├── DiagnosticoSimple.gs            # Simple system checks
│   └── TestManualAlerta.gs             # Manual alert testing
│
├── Evaluation Forms (HTML)
│   ├── rubrica_form.html               # Rubric evaluation form
│   ├── rubrica_peer_form.html          # Peer evaluation rubric
│   ├── lista_cotejo_form.html          # Checklist form
│   ├── num_directo_form.html           # Direct numerical grading
│   ├── beep_test_form.html             # Individual Beep Test
│   └── beep_test_batch_form.html       # Batch Beep Test
│
├── Configuration & Scheduling
│   ├── config_dialog.html              # Configuration dialog UI
│   ├── scheduler_dialog.html           # Scheduler configuration
│   ├── scheduler_manager.html          # Trigger manager
│   ├── scheduler_dialog.gs             # Scheduler backend
│   └── trigger_manager.html            # Trigger visualization
│
└── Documentation
    ├── README.md                        # User-facing documentation
    ├── MEJORAS_INSTRUMENTOS.md          # Instrument improvements changelog
    └── CLAUDE.md                        # This file (AI assistant guide)
```

### Architecture Patterns

1. **Google Apps Script Container-Bound Application**
   - Bound to a Google Spreadsheet (SPREADSHEET_ID constant)
   - Uses Sheets as the database layer
   - Deployed as Web App with OAuth scopes

2. **Multi-Modal Interface**
   - **Modal Mode**: Dialogs within Google Sheets (HtmlService.createHtmlOutputFromFile)
   - **Web App Mode**: Standalone web application (doGet/doPost handlers)
   - **Both modes supported**: Code detects and adapts to execution context

3. **Modular Design**
   - Separate .gs files for logical domains (attendance, grading, caching, etc.)
   - HTML forms are standalone files included via HtmlService
   - Shared utilities in Code.gs

4. **Event-Driven Architecture**
   - Time-based triggers for scheduled reports
   - Menu-driven UI in Google Sheets
   - AJAX calls from dashboard to backend functions

---

## Key Technologies & Dependencies

### Platform

- **Google Apps Script**: Runtime V8
- **Execution Environment**: Server-side JavaScript
- **Time Zone**: Europe/Madrid (configurable in appsscript.json)

### OAuth Scopes Required

```json
"oauthScopes": [
  "https://www.googleapis.com/auth/spreadsheets",          // Read/write Sheets
  "https://www.googleapis.com/auth/script.container.ui",   // UI dialogs
  "https://www.googleapis.com/auth/documents",             // Document access
  "https://www.googleapis.com/auth/drive",                 // Drive access (read)
  "https://www.googleapis.com/auth/drive.file",            // Drive file creation
  "https://mail.google.com/",                              // Gmail full access
  "https://www.googleapis.com/auth/gmail.send",            // Send emails
  "https://www.googleapis.com/auth/gmail.compose",         // Compose emails
  "https://www.googleapis.com/auth/gmail.modify",          // Modify emails
  "https://www.googleapis.com/auth/script.scriptapp"       // Trigger management
]
```

### Frontend Technologies

- **HTML5**: Form structure and dashboard
- **CSS3**: Modern styling with CSS variables, animations, grid/flexbox
- **Vanilla JavaScript**: No external frameworks (pure JS for compatibility)
- **Google Apps Script Client API**: `google.script.run` for AJAX calls

### Key APIs Used

- **SpreadsheetApp**: Primary data access layer
- **DriveApp**: File creation (PDFs, exports)
- **GmailApp**: Email notifications
- **CacheService**: Short-term caching (up to 6 hours)
- **PropertiesService**: Persistent configuration storage
- **ScriptApp**: Trigger management
- **Utilities**: JSON, date formatting, blob conversion
- **Charts**: Embedded chart creation for comparisons

---

## Module Breakdown

### 1. Code.gs (Main Application Core)

**Size**: ~3,500 lines, 140KB
**Purpose**: Central hub for all application logic

**Key Sections**:

- **Lines 1-100**: Configuration, helpers, doGet/doPost handlers
- **Helper Functions**:
  - `normalizeCursoId(v)`: Normalizes course ID formats (removes "Curso" prefix, accents, spaces)
  - `doGet(e)`: Web app entry point, handles dashboard and instrument routing
  - `doPost(e)`: API endpoint for dashboard function calls (security: explicit function whitelist)

- **Dashboard Functions**:
  - `getStatistics()`: Returns summary stats (students, courses, instruments, evaluations)
  - `getEstudiantesData()`: Fetches student list with filtering
  - `getInstrumentosData()`: Returns instruments with course/situation enrichment
  - `getAsistenciaData()`, `getCalificacionesData()`: Data providers

- **Evaluation Form Handlers**:
  - `showEvaluationForm(instrumentId, cursoIdParam)`: Dynamic form router
  - `submitRubrica()`, `submitListaCotejo()`, `submitNumDirecto()`: Form processors

- **Report Generation**:
  - `generarReporteNotasPorSituacion()`: Generates grade reports by learning situation
  - `calcularMediasPonderadas()`: Calculates weighted averages
  - `exportarReportePDF()`: PDF export functionality

- **Menu Creation**:
  - `onOpen()`: Creates custom menu in Google Sheets
  - Menu structure: Dashboard, Attendance, Grades, Instruments, Reports, Automation

**Security Note**: Lines 96-150 contain the **explicit function whitelist** for doPost() - a recent security improvement replacing eval().

### 2. CacheOptimizado.gs (Performance Critical)

**Purpose**: Multi-level caching system for dramatic performance improvement (60-80% faster)

**Cache Levels**:

1. **Memory Cache**: Ultra-fast, execution-scoped (Map-based)
2. **CacheService**: Fast, up to 6 hours TTL
3. **PropertiesService**: Persistent configuration storage

**Key Configuration**:

```javascript
CACHE_CONFIG = {
  TTL: {
    ESTUDIANTES: 3600,      // 1 hour
    INSTRUMENTOS: 7200,     // 2 hours
    CURSOS: 7200,           // 2 hours
    SITUACIONES: 7200,      // 2 hours
    ASISTENCIA: 300,        // 5 minutes (frequently changing)
    CALIFICACIONES: 600,    // 10 minutes
    DEFINICIONES: 21600,    // 6 hours (static data)
    ESTADISTICAS: 300       // 5 minutes
  },
  MAX_MEMORY_ENTRIES: 50,
  DEBUG_CACHE: false
}
```

**Key Functions**:

- `getEstudiantesCached()`: Cached student data retrieval
- `getInstrumentosCached()`: Cached instrument data
- `invalidateCache(key)`: Manual cache invalidation
- `clearAllCaches()`: Full cache reset

**Usage Pattern**:

```javascript
// Always prefer cached versions
const students = getEstudiantesCached(); // NOT: getSheetData('Estudiantes')
```

### 3. LoggingOptimizado.gs

**Purpose**: Centralized logging framework with severity levels

**Log Levels**:

- `Log.debug()`: Development debugging (verbose)
- `Log.info()`: General information
- `Log.warn()`: Warning conditions
- `Log.error()`: Error conditions
- `Log.critical()`: Critical failures

**Features**:

- Configurable log level filtering
- Automatic timestamp and context inclusion
- Structured log output for parsing
- Performance tracking capabilities

**Usage**:

```javascript
Log.info('Processing attendance report', { courseId: '1BAS', students: 25 });
Log.error('Failed to load instrument', { instrumentId: 'R001', error: e.message });
```

### 4. BatchReadsOptimizado.gs

**Purpose**: Batch Google Sheets API operations to reduce quota consumption

**Key Functions**:

- `batchGetSheetData(sheetNames)`: Read multiple sheets in one API call
- `batchUpdateCells(updates)`: Write to multiple ranges efficiently

**Performance Impact**: Reduces API calls from N to 1 for multi-sheet operations

### 5. Attendance System (AsistenciaAuto.gs, AsistenciaConfig.gs, AsistenciaScheduler.gs)

**AsistenciaAuto.gs** (17KB):

- `dailyAttendanceNotifier()`: Main scheduled function for daily reports
- Analyzes last 30 days of attendance (configurable via DIAS_ANALISIS)
- Generates:
  - Per-course reports (Reporte_Asistencia_Av)
  - Consolidated report (Reporte_Asistencia_Av_Diario)
  - PDF exports per course
  - HTML email with attachments
- Reads configuration from ConfiguracionAlertas sheet
- Applies thresholds: Red (critical), Orange (warning), Yellow (attention)

**AsistenciaConfig.gs**:

- `readConfig()`: Reads alert configuration from sheet
- `writeConfig(cfg)`: Saves alert settings
- `showConfigDialog()`: UI for configuration management

**AsistenciaScheduler.gs**:

- `setupAsistenciaDailyTrigger()`: Creates time-based trigger
- Supports HH or HH:MM time format (24-hour)
- Manages trigger lifecycle (deletes old, creates new)

**Configuration Sheet Structure** (ConfiguracionAlertas):

| Column | Description | Example |
|--------|-------------|---------|
| SesionesPrevistas | Expected sessions in analysis period | 30 |
| UmbralRojo | Red alert threshold (%) | 80 |
| UmbralNaranja | Orange alert threshold (%) | 70 |
| UmbralAmarillo | Yellow alert threshold (%) | 50 |
| Destinatarios | Email recipients (comma-separated) | teacher@school.com |

### 6. Report Generation Modules

**ReportesAsistencia.gs**:

- `generarReporteAsistenciaEstudiante(idEstudiante)`: Individual student report
- `generarReporteAsistenciaCurso(cursoId)`: Course-wide report
- `compararAsistenciaEstudiantes(id1, id2)`: Student comparison with charts
- `compararAsistenciaCursos(curso1, curso2)`: Course comparison with charts

**ReporteCalificaciones.gs**:

- `generarReporteCalificacionesEstudiante(idEstudiante)`: Student grade report
- `generarReporteCalificacionesCurso(cursoId)`: Course grade summary
- `compararCalificacionesEstudiantes(id1, id2)`: Grade comparison
- `compararCalificacionesCursos(curso1, curso2)`: Course grade comparison

**ReportesAsistenciaOptimizado.gs**:

- Optimized versions using batch reads and caching
- Generates formatted sheets with conditional formatting
- Creates embedded charts for visual analysis

**ReporteAsistenciaAvanzado.gs**:

- Advanced filtering capabilities
- Date range selection
- Multiple criteria filtering
- Export to PDF functionality

### 7. Dashboard (dashboard.html)

**Size**: 128KB (comprehensive UI)

**Structure**:

- **Header**: Gradient background with floating animation
- **Tabs**: 6 main sections (Resumen, Estudiantes, Asistencia, Calificaciones, Instrumentos, Reportes)
- **Modals**: Dynamic modal system for reports and data visualization

**Tab Breakdown**:

1. **Resumen** (Summary):
   - Statistics cards: Students, Courses, Instruments, Evaluations
   - Quick action buttons
   - Real-time counters

2. **Estudiantes** (Students):
   - Searchable/filterable table
   - Course filter dropdown
   - Displays: ID, Name, Course, Email

3. **Asistencia** (Attendance):
   - Report by student (input: student ID)
   - Report by course (input: course ID)
   - Compare students (2 IDs → generates chart)
   - Compare courses (2 course IDs → generates chart)
   - Configure alerts (opens config dialog)
   - Advanced reports (multi-filter)

4. **Calificaciones** (Grades):
   - By student query
   - By course query
   - Compare students (with charts)
   - Compare courses (with charts)

5. **Instrumentos** (Instruments):
   - **NEW FEATURES** (see MEJORAS_INSTRUMENTOS.md):
     - Filter by course
     - Filter by learning situation
     - Filter by instrument type (Rubric, Checklist, Direct)
     - Active filters indicator
     - Results counter
   - Table columns: ID, Name, Type, Course (NEW), Situation, Actions
   - "Abrir" button: Opens evaluation form in new window

6. **Reportes** (Reports):
   - Grade reports by learning situation
   - Advanced attendance reports
   - Calculate weighted averages
   - Export data (future feature)
   - List existing reports with preview/PDF export

**Design System**:

```css
:root {
  --primary: #2563eb;        /* Blue */
  --secondary: #10b981;      /* Green */
  --danger: #ef4444;         /* Red */
  --warning: #f59e0b;        /* Orange */
  --bg: #f8fafc;             /* Light gray background */
  --card-bg: #ffffff;        /* White cards */
  --text: #1e293b;           /* Dark text */
  --text-light: #64748b;     /* Light text */
  --border: #e2e8f0;         /* Border color */
}
```

**Animations**:

- `fadeIn`: Smooth element appearance
- `slideIn`: Lateral slide
- `scaleIn`: Modal growth
- `float`: Floating header effect
- `pulse`: Loading indicator

**Responsive Breakpoints**:

- Desktop: >768px (grid: 3 columns)
- Tablet: 481-768px (grid: 2 columns)
- Mobile: <480px (grid: 1 column, stacked)

**Communication Pattern**:

```javascript
// Dashboard → Backend
google.script.run
  .withSuccessHandler(handleSuccess)
  .withFailureHandler(handleError)
  .backendFunction(param1, param2);

// In Web App mode, uses fetch to doPost endpoint
```

### 8. Evaluation Forms

All forms follow a consistent pattern:

**Common Features**:

- Student selector (dropdown from Estudiantes sheet)
- Date picker (defaults to today)
- Instrument-specific fields (dynamically loaded)
- Submit button with loading state
- Success/error feedback modals

**Form Types**:

1. **rubrica_form.html**: Rubric evaluation
   - Loads criteria from Maestro_CriteriosRubrica
   - Loads levels from Maestro_NivelesRubrica
   - Matrix layout: Criteria (rows) × Levels (columns)
   - Radio button selection
   - Observation notes field

2. **rubrica_peer_form.html**: Peer evaluation
   - Similar to rubrica_form
   - Adds "Evaluador" (evaluator) selector
   - Supports self-evaluation and peer assessment

3. **lista_cotejo_form.html**: Checklist
   - Binary indicators (Yes/No or checkboxes)
   - Loaded from Definicion_ListasCotejo
   - Quick evaluation for skill verification

4. **num_directo_form.html**: Direct numerical grading
   - Simple numeric input (0-10 scale, configurable)
   - Fastest evaluation method
   - Optional comments field

5. **beep_test_form.html**: Individual Beep Test
   - PE-specific: Cardiovascular fitness test
   - Records: Level, Shuttle, VO2max calculation
   - Automatic VO2max estimation

6. **beep_test_batch_form.html**: Batch Beep Test
   - Multiple students in one form
   - Grid layout for class recording
   - Bulk submission

**Submission Flow**:

```
User fills form → Submit button clicked →
JavaScript validates → google.script.run.submitX() →
Backend processes → Writes to CalificacionesDetalladas →
Invalidates relevant caches → Returns success/error →
Frontend shows modal
```

---

## Data Model & Google Sheets Structure

### Required Sheets

The Google Spreadsheet (ID in SPREADSHEET_ID constant) must contain:

#### 1. Estudiantes (Students)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| IDEstudiante | String | Unique student identifier | "E001" |
| NombreEstudiante | String | Full name | "Juan Pérez García" |
| CursoID | String | Course identifier (normalized) | "1BAS", "2BAS" |
| Email | String | Student email | "juan.perez@school.com" |

**Notes**:

- CursoID is normalized via `normalizeCursoId()` (removes "Curso" prefix, accents, spaces)
- Additional columns allowed but not required

#### 2. InstrumentosEvaluacion (Evaluation Instruments)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| IDInstrumento | String | Unique instrument ID | "R001", "LC002" |
| NombreInstrumento | String | Instrument name | "Rúbrica Fútbol - Pase" |
| TipoInstrumento | String | Type | "Rúbrica", "Lista de Cotejo", "Calificación Directa", "Beep Test" |
| IDSituacion | String | Linked learning situation | "SA001" |
| Activo | Boolean | Active status | TRUE/FALSE |

#### 3. SituacionesAprendizaje (Learning Situations)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| IDSituacion | String | Unique situation ID | "SA001" |
| NombreSituacion | String | Situation name | "Deportes de equipo - Fútbol" |
| CursoID | String | Associated course | "1BAS" |
| Trimestre | Number | Quarter/term | 1, 2, 3 |

**Important**: Instruments get their course association through this sheet (Instrumento → Situacion → Course)

#### 4. RegistroAsistencia (Attendance Records)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| Fecha | Date | Attendance date | 2025-11-17 |
| IDEstudiante | String | Student ID | "E001" |
| CursoID | String | Course ID | "1BAS" |
| Estado | String | Attendance status | "Presente", "Ausente", "Justificado", "Retraso" |
| Observaciones | String | Notes | Optional text |

#### 5. CalificacionesDetalladas (Detailed Grades)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| Fecha | Date | Evaluation date | 2025-11-17 |
| IDEstudiante | String | Student ID | "E001" |
| IDInstrumento | String | Instrument used | "R001" |
| Calificacion | Number | Numeric grade | 7.5 |
| Observaciones | String | Notes | Optional detailed feedback |
| IDSituacion | String | Learning situation | "SA001" |

**Note**: Calificacion is typically 0-10 scale but can vary by instrument type

#### 6. Definicion_Rubricas (Rubric Definitions)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| IDInstrumento | String | Rubric ID | "R001" |
| ConfiguracionJSON | String | JSON configuration | Serialized rubric structure |

#### 7. Definicion_ListasCotejo (Checklist Definitions)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| IDInstrumento | String | Checklist ID | "LC001" |
| Indicadores | String | JSON array of indicators | `["Indicator 1", "Indicator 2"]` |

#### 8. Maestro_CriteriosRubrica (Rubric Criteria Master)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| IDCriterio | String | Criterion ID | "C001" |
| NombreCriterio | String | Criterion name | "Técnica de pase" |
| Descripcion | String | Description | "Evalúa la técnica..." |
| Peso | Number | Weight (%) | 25 |

#### 9. Maestro_NivelesRubrica (Rubric Levels Master)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| IDNivel | String | Level ID | "N1", "N2", "N3", "N4" |
| NombreNivel | String | Level name | "Insuficiente", "Suficiente", "Notable", "Sobresaliente" |
| Puntuacion | Number | Points | 0-10 scale |
| ColorHex | String | Display color | "#ef4444" |

#### 10. ConfiguracionAlertas (Alert Configuration)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| SesionesPrevistas | Number | Expected sessions in period | 30 |
| UmbralRojo | Number | Red threshold (%) | 80 |
| UmbralNaranja | Number | Orange threshold (%) | 70 |
| UmbralAmarillo | Number | Yellow threshold (%) | 50 |
| Destinatarios | String | Email list (comma-separated) | "teacher1@s.com,teacher2@s.com" |

### Generated Report Sheets (Auto-Created)

The system creates these sheets dynamically:

- **Reporte_Asistencia_Av**: Advanced attendance report per course
- **Reporte_Asistencia_Av_Diario**: Daily consolidated attendance
- **RepNotas [Course]-[Situation]**: Grade reports by course and situation (e.g., "RepNotas 1BAS-Fútbol")
- **Comparativa_[Type]_[Timestamp]**: Comparison reports with embedded charts

---

## Development Workflows

### Git Workflow

**Branch Naming Convention**:

```
claude/[description]-[session-id]
```

Example: `claude/fix-dopost-function-resolution-011CV4AgfqfnVVoGQcjkqDBz`

**Typical Flow**:

1. Create feature branch from main:
   ```bash
   git checkout -b claude/feature-description-sessionid
   ```

2. Make changes and commit:
   ```bash
   git add .
   git commit -m "feat: Add instrument filtering by course"
   ```

3. Push to remote:
   ```bash
   git push -u origin claude/feature-description-sessionid
   ```

4. Create pull request (merge to main after review)

**Commit Message Conventions**:

- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring (no functional change)
- `perf:` - Performance improvement
- `docs:` - Documentation changes
- `style:` - Code style/formatting
- `test:` - Test additions or changes

**Recent Important Commits** (patterns to follow):

- `bf7c664`: "Fix: Reemplazar eval() con mapa explícito de funciones en doPost()" - Security fix
- `e569e97`: "Fix: Mejorar reconocimiento de patrones de reportes en listado" - Bug fix
- `db7df03`: "Fix: Mejorar manejo de respuesta en listado de reportes" - Error handling

### Deployment Process

**Important**: This is a Google Apps Script project. Deployment differs from traditional web apps.

**Method 1: Via Google Apps Script Editor** (Recommended for development)

1. Open project in Apps Script editor
2. Make changes in the web IDE
3. Save (Ctrl+S or File > Save)
4. Test via Run > Run function or Test as web app

**Method 2: Via clasp CLI** (Recommended for version control)

```bash
# Install clasp globally
npm install -g @google/clasp

# Login to Google
clasp login

# Clone existing project
clasp clone <scriptId>

# Pull latest from Apps Script
clasp pull

# Make local changes, then push
clasp push

# Deploy as web app
clasp deploy --description "Version X.X"
```

**Web App Deployment**:

1. In Apps Script editor: Deploy > New deployment
2. Type: Web app
3. Configuration:
   - Execute as: User accessing the web app (or your account for service mode)
   - Who has access: Anyone / Anyone with link / Organization domain
4. Deploy → Copy Web App URL
5. Update SPREADSHEET_ID if needed

**Important**: After deployment, users must authorize OAuth scopes on first access.

### Testing Strategy

**Manual Testing Checklist**:

1. **Dashboard Loading**:
   - [ ] Dashboard opens without errors
   - [ ] All tabs are clickable and load content
   - [ ] Statistics display correctly

2. **Data Operations**:
   - [ ] Students list loads and filters work
   - [ ] Instruments list loads with course/situation data
   - [ ] Attendance reports generate successfully
   - [ ] Grade reports generate successfully

3. **Forms**:
   - [ ] Each form type opens correctly
   - [ ] Student dropdowns populate
   - [ ] Form submission works
   - [ ] Data appears in CalificacionesDetalladas sheet

4. **Automation**:
   - [ ] Triggers are created successfully
   - [ ] Manual trigger test sends email
   - [ ] Configuration dialog saves settings

5. **Performance**:
   - [ ] Dashboard loads in <3 seconds
   - [ ] Reports generate in <10 seconds
   - [ ] No quota exceeded errors

**Testing Functions**:

```javascript
// In Apps Script editor, create test functions:

function testEstudiantesCached() {
  const data = getEstudiantesCached();
  Logger.log(`Loaded ${data.length} students`);
  Logger.log(JSON.stringify(data[0])); // First student
}

function testDashboardStats() {
  const stats = getStatistics();
  Logger.log(JSON.stringify(stats));
}

function testManualAlert() {
  // Use TestManualAlerta.gs
  testEnviarAlertaManual();
}
```

**Debugging Tools**:

1. **Logger**: Use `Logger.log()` for quick debugging
   - View logs: View > Logs (in Apps Script editor)

2. **Log Framework**: Use `Log.debug()`, `Log.info()`, etc.
   - More structured than Logger
   - Can filter by severity

3. **Execution Transcripts**: View > Executions
   - See all function executions
   - View execution time and errors
   - Check quota usage

4. **Browser DevTools**:
   - For dashboard: F12 in browser
   - Check Console for JavaScript errors
   - Network tab for google.script.run calls

---

## Code Conventions & Patterns

### Naming Conventions

**Functions**:

- **camelCase** for function names: `getEstudiantesData()`, `normalizeCursoId()`
- **Descriptive names**: `generarReporteAsistenciaCurso()` not `genRepAst()`
- **Verb prefixes**: `get`, `set`, `load`, `save`, `generate`, `create`, `delete`, `update`

**Variables**:

- **camelCase** for local variables: `const cursoId = ...`
- **UPPER_SNAKE_CASE** for constants: `const SPREADSHEET_ID = ...`
- **Descriptive names**: Avoid single-letter vars except loop counters

**Sheets/HTML Files**:

- **snake_case** for HTML files: `rubrica_form.html`, `config_dialog.html`
- **PascalCase** for .gs modules: `CacheOptimizado.gs`, `AsistenciaAuto.gs`
- **Exact sheet names** in code: Use string literals for sheet names to avoid typos

**Spanish vs. English**:

- **UI/User-facing**: Spanish (NombreEstudiante, Calificación, etc.)
- **Code/Functions**: Mix of Spanish and English (historical, maintain consistency)
- **New code**: Prefer English for functions, Spanish for UI strings

### Code Structure Patterns

**Function Organization**:

```javascript
/**
 * Function description
 * @param {string} param1 - Description
 * @param {number} param2 - Description
 * @return {Array<Object>} Description
 */
function exampleFunction(param1, param2) {
  // 1. Validate inputs
  if (!param1) throw new Error('param1 is required');

  // 2. Try to get from cache
  const cacheKey = `example_${param1}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  // 3. Fetch from Sheets
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('SheetName');
  const data = sheet.getDataRange().getValues();

  // 4. Process data
  const processed = data.map(row => ({
    field1: row[0],
    field2: row[1]
  }));

  // 5. Cache result
  setCachedData(cacheKey, processed, 3600);

  // 6. Return
  return processed;
}
```

**Error Handling Pattern**:

```javascript
function safeOperation() {
  try {
    // Primary operation
    const result = riskyOperation();
    return { success: true, data: result };
  } catch (error) {
    // Log error
    Log.error('Operation failed', { error: error.message, stack: error.stack });

    // Return structured error
    return {
      success: false,
      error: error.message,
      userMessage: 'Ocurrió un error. Por favor, inténtalo de nuevo.'
    };
  }
}
```

**Caching Pattern** (ALWAYS use this):

```javascript
function getDataWithCache() {
  // 1. Check if caching utility exists
  if (typeof getEstudiantesCached !== 'undefined') {
    return getEstudiantesCached(); // Prefer cached version
  }

  // 2. Fallback to direct read
  return getSheetData('Estudiantes');
}
```

**Batch Operations Pattern**:

```javascript
function processManyStudents(studentIds) {
  // BAD: Multiple individual reads (N queries)
  // studentIds.forEach(id => {
  //   const data = getSheetData('Estudiantes').find(s => s.id === id);
  // });

  // GOOD: Single read + filter in memory
  const allStudents = getEstudiantesCached(); // 1 query
  const targetStudents = studentIds.map(id =>
    allStudents.find(s => s.IDEstudiante === id)
  );

  return targetStudents;
}
```

**Data Normalization Pattern**:

```javascript
function processSheetData(sheetName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  const [headers, ...rows] = sheet.getDataRange().getValues();

  // Convert to array of objects
  const data = rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });

  // Normalize curso IDs
  return data.map(item => ({
    ...item,
    CursoID: normalizeCursoId(item.CursoID)
  }));
}
```

### UI Patterns (Dashboard)

**Tab Switching**:

```javascript
function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Remove active from all buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected tab
  document.getElementById(tabName + '-tab').classList.add('active');

  // Highlight button
  event.target.classList.add('active');

  // Load data if needed
  if (tabName === 'instrumentos' && !instrumentsLoaded) {
    loadInstruments();
  }
}
```

**Modal Display Pattern**:

```javascript
function showModal(title, content) {
  const modal = document.getElementById('dynamic-modal');
  modal.querySelector('.modal-title').textContent = title;
  modal.querySelector('.modal-body').innerHTML = content;
  modal.classList.add('active'); // Show modal

  // Close button handler
  modal.querySelector('.close-modal').onclick = () => {
    modal.classList.remove('active');
  };
}
```

**Data Loading Pattern**:

```javascript
function loadStudents() {
  showLoading('students-container');

  google.script.run
    .withSuccessHandler(data => {
      hideLoading('students-container');
      renderStudentsTable(data);
    })
    .withFailureHandler(error => {
      hideLoading('students-container');
      showError('Error al cargar estudiantes: ' + error.message);
    })
    .getEstudiantesData();
}
```

---

## Security Considerations

### Recent Security Improvements

**1. Elimination of eval() (Commit bf7c664)**

**Problem**: doPost() used `eval(functionName)` to dynamically call functions - major security risk!

**Solution**: Explicit function whitelist in doPost()

```javascript
// OLD (INSECURE - DO NOT USE):
// const result = eval(functionName).apply(null, args);

// NEW (SECURE):
const availableFunctions = {
  'getStatistics': getStatistics,
  'getEstudiantesData': getEstudiantesData,
  'getInstrumentosData': getInstrumentosData,
  // ... explicit mapping
};

if (!availableFunctions[functionName]) {
  throw new Error('Function not available');
}

const result = availableFunctions[functionName].apply(null, args);
```

**Rule**: NEVER add new eval() calls. Always use explicit mapping.

### Security Best Practices

**1. Input Validation**:

```javascript
function submitGrade(studentId, grade) {
  // Validate student ID format
  if (!/^E\d{3}$/.test(studentId)) {
    throw new Error('Invalid student ID format');
  }

  // Validate grade range
  if (typeof grade !== 'number' || grade < 0 || grade > 10) {
    throw new Error('Grade must be between 0 and 10');
  }

  // Proceed with submission
  // ...
}
```

**2. OAuth Scope Minimization**:

- Only request necessary scopes
- Current scopes are comprehensive but justified:
  - Spreadsheets: Primary data storage
  - Gmail: Required for attendance alerts
  - Drive: PDF generation
  - Script: Trigger management

**3. Data Access Control**:

- Web app access level configured in appsscript.json:
  - `executeAs: "USER_DEPLOYING"`: Runs as deployer (service account mode)
  - Alternative: `USER_ACCESSING`: Runs as viewer (user's permissions)

**4. Sensitive Data Handling**:

- SPREADSHEET_ID: Not public, but not secret either (included in URLs)
- Email addresses: Handle according to GDPR/privacy regulations
- Student data: Ensure school has appropriate consent
- ConfiguracionAlertas: Destinatarios email list - validate format

**5. XSS Prevention**:

```javascript
// BAD: Direct HTML injection
// modal.innerHTML = userInput;

// GOOD: Text content or sanitized HTML
modal.textContent = userInput;
// OR
modal.innerHTML = sanitizeHTML(userInput);

function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
```

**6. CSRF Protection**:

- Web app mode: Consider adding CSRF tokens for state-changing operations
- Currently relying on OAuth for authentication
- POST requests should validate origin if opening access broadly

---

## Performance Optimizations

### Caching Strategy (60-80% Performance Improvement)

**Implementation**: CacheOptimizado.gs

**Three-Tier Cache**:

1. **Memory** (Fastest - 0ms overhead):
   - Scope: Single execution
   - Use: Repeated reads within one function call
   - Implementation: JavaScript Map

2. **CacheService** (Fast - ~50ms overhead):
   - Scope: Up to 6 hours
   - Use: Cross-execution caching
   - Implementation: `CacheService.getScriptCache()`

3. **PropertiesService** (Persistent):
   - Scope: Permanent
   - Use: Configuration data
   - Implementation: `PropertiesService.getScriptProperties()`

**Usage Pattern**:

```javascript
// Always prefer cached versions:
const students = getEstudiantesCached();        // NOT: getSheetData('Estudiantes')
const instruments = getInstrumentosCached();    // NOT: getSheetData('InstrumentosEvaluacion')
const situations = getSituacionesCached();      // NOT: getSheetData('SituacionesAprendizaje')
```

**Cache Invalidation**:

```javascript
// Manual invalidation after data changes
function submitRubrica(data) {
  // 1. Write data
  writeToSheet('CalificacionesDetalladas', data);

  // 2. Invalidate relevant caches
  invalidateCache('calificaciones');
  invalidateCache('estadisticas');

  return { success: true };
}
```

### Batch Operations (BatchReadsOptimizado.gs)

**Problem**: Reading multiple sheets individually = N API calls

**Solution**: Batch read in single call

```javascript
// BAD: Multiple calls
const estudiantes = getSheetData('Estudiantes');          // Call 1
const instrumentos = getSheetData('InstrumentosEvaluacion'); // Call 2
const situaciones = getSheetData('SituacionesAprendizaje');  // Call 3

// GOOD: Batch read
const [estudiantes, instrumentos, situaciones] = batchGetSheetData([
  'Estudiantes',
  'InstrumentosEvaluacion',
  'SituacionesAprendizaje'
]); // Single call
```

**Benefits**:

- Reduced API quota consumption
- Faster execution (parallel fetch)
- Lower latency

### Frontend Optimization

**1. Lazy Loading**:

```javascript
let instrumentsLoaded = false;

function switchTab(tabName) {
  if (tabName === 'instrumentos' && !instrumentsLoaded) {
    loadInstruments(); // Only load when tab is first opened
    instrumentsLoaded = true;
  }
}
```

**2. Debouncing**:

```javascript
let filterTimeout;

function filterInstruments() {
  clearTimeout(filterTimeout);
  filterTimeout = setTimeout(() => {
    applyInstrumentFilters(); // Only execute after 300ms of no typing
  }, 300);
}
```

**3. Minimal DOM Manipulation**:

```javascript
// BAD: Multiple DOM updates
rows.forEach(row => {
  table.innerHTML += `<tr>...</tr>`; // Reflow on each iteration!
});

// GOOD: Build string, single update
let html = '';
rows.forEach(row => {
  html += `<tr>...</tr>`;
});
table.innerHTML = html; // Single reflow
```

### Quota Management

**Google Apps Script Quotas** (Free tier):

- **SpreadsheetApp calls**: 2,000 per day
- **UrlFetch calls**: 20,000 per day
- **Email quota**: 100 emails per day
- **Script runtime**: 6 minutes per execution
- **Triggers**: 20 time-based triggers

**Strategies to Stay Under Limits**:

1. **Use Caching**: Reduces SpreadsheetApp calls dramatically
2. **Batch Operations**: Combine multiple reads/writes
3. **Limit Email Recipients**: Be selective with attendance alerts
4. **Optimize Trigger Frequency**: Daily triggers vs. hourly
5. **Pagination**: For large datasets, implement pagination

**Monitoring**:

```javascript
// Check quota usage
function logQuotaUsage() {
  const quotas = {
    email: MailApp.getRemainingDailyQuota(),
    // Add other quota checks as needed
  };
  Log.info('Quota usage', quotas);
}
```

---

## Common Tasks & Operations

### Adding a New Evaluation Instrument Type

**Example**: Adding "Oral Presentation" instrument

**Steps**:

1. **Create HTML Form** (`presentacion_oral_form.html`):

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <title>Evaluación - Presentación Oral</title>
  <style>
    /* Reuse styles from existing forms */
  </style>
</head>
<body>
  <h1>Presentación Oral</h1>

  <form id="presentacion-form">
    <label>Estudiante:</label>
    <select id="estudiante" required></select>

    <label>Claridad (0-10):</label>
    <input type="number" id="claridad" min="0" max="10" step="0.1" required>

    <label>Contenido (0-10):</label>
    <input type="number" id="contenido" min="0" max="10" step="0.1" required>

    <button type="submit">Enviar Evaluación</button>
  </form>

  <script>
    // Load students
    google.script.run
      .withSuccessHandler(populateStudents)
      .getEstudiantesData();

    // Submit handler
    document.getElementById('presentacion-form').onsubmit = function(e) {
      e.preventDefault();
      const data = {
        estudiante: document.getElementById('estudiante').value,
        claridad: parseFloat(document.getElementById('claridad').value),
        contenido: parseFloat(document.getElementById('contenido').value)
      };

      google.script.run
        .withSuccessHandler(() => alert('Evaluación guardada'))
        .submitPresentacionOral(data);
    };
  </script>
</body>
</html>
```

2. **Add Backend Function** (in Code.gs):

```javascript
/**
 * Procesa evaluación de presentación oral
 */
function submitPresentacionOral(data) {
  try {
    // Calculate final grade (average)
    const grade = (data.claridad + data.contenido) / 2;

    // Prepare row for CalificacionesDetalladas
    const row = [
      new Date(),                    // Fecha
      data.estudiante,               // IDEstudiante
      data.instrumentId,             // IDInstrumento
      grade,                         // Calificacion
      `Claridad: ${data.claridad}, Contenido: ${data.contenido}`, // Observaciones
      data.situacion                 // IDSituacion
    ];

    // Write to sheet
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID)
      .getSheetByName('CalificacionesDetalladas');
    sheet.appendRow(row);

    // Invalidate caches
    invalidateCache('calificaciones');
    invalidateCache('estadisticas');

    return { success: true };
  } catch (error) {
    Log.error('Error submitting presentacion oral', { error: error.message });
    return { success: false, error: error.message };
  }
}
```

3. **Update Form Router** (in Code.gs, `showEvaluationForm()`):

```javascript
function showEvaluationForm(instrumentId, cursoIdParam) {
  // ... existing code ...

  // Determine form type
  let formTemplate;
  switch (tipoInstrumento) {
    case 'Rúbrica':
      formTemplate = 'rubrica_form';
      break;
    case 'Lista de Cotejo':
      formTemplate = 'lista_cotejo_form';
      break;
    case 'Presentación Oral': // NEW
      formTemplate = 'presentacion_oral_form';
      break;
    // ... other cases ...
  }

  // ... existing code ...
}
```

4. **Add to doPost Whitelist** (if used from dashboard):

```javascript
const availableFunctions = {
  // ... existing ...
  'submitPresentacionOral': submitPresentacionOral, // NEW
};
```

5. **Create Instrument in Sheet**:

Add row to InstrumentosEvaluacion:

| IDInstrumento | NombreInstrumento | TipoInstrumento | IDSituacion | Activo |
|---------------|-------------------|-----------------|-------------|--------|
| PO001 | Presentación Oral - Historia | Presentación Oral | SA001 | TRUE |

### Adding a New Dashboard Report

**Example**: Adding "Students at Risk" report

**Steps**:

1. **Add Backend Function** (Code.gs):

```javascript
/**
 * Genera reporte de estudiantes en riesgo
 * (Combina asistencia <70% y calificaciones <5)
 */
function getStudentsAtRisk() {
  try {
    // Get all students
    const students = getEstudiantesCached();

    // Get attendance data
    const attendance = getSheetData('RegistroAsistencia');

    // Get grades
    const grades = getSheetData('CalificacionesDetalladas');

    // Calculate metrics per student
    const riskStudents = students.map(student => {
      const studentId = student.IDEstudiante;

      // Calculate attendance %
      const attendanceRecords = attendance.filter(a => a.IDEstudiante === studentId);
      const presentCount = attendanceRecords.filter(a => a.Estado === 'Presente').length;
      const attendancePercent = attendanceRecords.length > 0
        ? (presentCount / attendanceRecords.length) * 100
        : 100;

      // Calculate average grade
      const studentGrades = grades.filter(g => g.IDEstudiante === studentId);
      const avgGrade = studentGrades.length > 0
        ? studentGrades.reduce((sum, g) => sum + g.Calificacion, 0) / studentGrades.length
        : null;

      return {
        ...student,
        attendancePercent,
        avgGrade,
        isAtRisk: attendancePercent < 70 || (avgGrade !== null && avgGrade < 5)
      };
    }).filter(s => s.isAtRisk);

    return riskStudents;
  } catch (error) {
    Log.error('Error getting students at risk', { error: error.message });
    throw error;
  }
}
```

2. **Add to doPost Whitelist**:

```javascript
const availableFunctions = {
  // ... existing ...
  'getStudentsAtRisk': getStudentsAtRisk, // NEW
};
```

3. **Add UI in Dashboard** (dashboard.html, in Reportes tab):

```html
<!-- In Reportes tab -->
<div class="card">
  <h3>Estudiantes en Riesgo</h3>
  <p>Muestra estudiantes con asistencia <70% o calificaciones <5</p>
  <button onclick="showStudentsAtRisk()" class="btn-primary">
    Ver Estudiantes en Riesgo
  </button>
</div>
```

4. **Add JavaScript Handler** (dashboard.html):

```javascript
function showStudentsAtRisk() {
  showLoading();

  google.script.run
    .withSuccessHandler(data => {
      hideLoading();

      if (data.length === 0) {
        showModal('Estudiantes en Riesgo', '<p>No hay estudiantes en riesgo actualmente.</p>');
        return;
      }

      // Build table
      let html = `
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Curso</th>
              <th>Asistencia</th>
              <th>Calificación Media</th>
            </tr>
          </thead>
          <tbody>
      `;

      data.forEach(student => {
        html += `
          <tr>
            <td>${student.IDEstudiante}</td>
            <td>${student.NombreEstudiante}</td>
            <td><span class="badge badge-primary">${student.CursoID}</span></td>
            <td><span class="badge ${student.attendancePercent < 70 ? 'badge-danger' : ''}">${student.attendancePercent.toFixed(1)}%</span></td>
            <td><span class="badge ${student.avgGrade < 5 ? 'badge-danger' : ''}">${student.avgGrade ? student.avgGrade.toFixed(2) : 'N/A'}</span></td>
          </tr>
        `;
      });

      html += '</tbody></table>';

      showModal('Estudiantes en Riesgo', html);
    })
    .withFailureHandler(error => {
      hideLoading();
      showError('Error: ' + error.message);
    })
    .getStudentsAtRisk();
}
```

### Modifying the Data Model

**Example**: Adding "Gender" field to students

**Steps**:

1. **Update Sheet**: Add "Genero" column to Estudiantes sheet

2. **Update Cached Function** (if exists):

```javascript
function getEstudiantesCached() {
  // The function auto-adapts to new columns since it reads all data
  // No code change needed if using dynamic column mapping
}
```

3. **Update UI** (if displaying):

```javascript
// In dashboard.html, renderStudentsTable()
function renderStudentsTable(students) {
  let html = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Curso</th>
          <th>Género</th> <!-- NEW -->
          <th>Email</th>
        </tr>
      </thead>
      <tbody>
  `;

  students.forEach(student => {
    html += `
      <tr>
        <td>${student.IDEstudiante}</td>
        <td>${student.NombreEstudiante}</td>
        <td><span class="badge badge-primary">${student.CursoID}</span></td>
        <td>${student.Genero || 'N/A'}</td> <!-- NEW -->
        <td>${student.Email}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  document.getElementById('students-container').innerHTML = html;
}
```

4. **Invalidate Cache** (after bulk update):

```javascript
invalidateCache('estudiantes');
```

### Debugging Common Issues

**Issue 1: "Function not available" error in doPost**

**Cause**: Function not in doPost whitelist

**Solution**: Add function to availableFunctions map in Code.gs:

```javascript
const availableFunctions = {
  // ... existing ...
  'yourNewFunction': yourNewFunction,
};
```

**Issue 2: Dashboard loads but data doesn't appear**

**Diagnosis**:

```javascript
// In browser console:
google.script.run
  .withSuccessHandler(data => console.log('Data:', data))
  .withFailureHandler(error => console.error('Error:', error))
  .getEstudiantesData();
```

**Common causes**:

- Sheet name mismatch (check exact spelling, case-sensitive)
- SPREADSHEET_ID incorrect
- OAuth authorization needed (re-authorize)
- Cache issue (try `clearAllCaches()`)

**Issue 3: Attendance alerts not sending**

**Diagnosis**:

1. Check trigger exists:
   ```javascript
   function listTriggers() {
     const triggers = ScriptApp.getProjectTriggers();
     triggers.forEach(t => {
       Logger.log(`Function: ${t.getHandlerFunction()}, Type: ${t.getEventType()}`);
     });
   }
   ```

2. Check email quota:
   ```javascript
   Logger.log(MailApp.getRemainingDailyQuota());
   ```

3. Check configuration:
   ```javascript
   function checkAlertConfig() {
     const config = readConfig();
     Logger.log(JSON.stringify(config));
   }
   ```

4. Manual test:
   ```javascript
   // Use TestManualAlerta.gs
   testEnviarAlertaManual();
   ```

**Issue 4: Performance is slow**

**Diagnosis**:

```javascript
function profileFunction() {
  const start = new Date().getTime();

  // Your function here
  getEstudiantesData();

  const end = new Date().getTime();
  Logger.log(`Execution time: ${end - start}ms`);
}
```

**Solutions**:

- Ensure caching is enabled (check CacheOptimizado.gs is included)
- Use batch operations (BatchReadsOptimizado.gs)
- Reduce data volume (filter earlier in processing)
- Check quota limits (may be throttled)

---

## Testing & Debugging

### Manual Testing Procedures

**Before Each Commit**:

1. **Syntax Check**: Apps Script editor shows no errors
2. **Dashboard Load**: Dashboard opens without console errors
3. **Data Load**: At least one data fetch (students, instruments) works
4. **Form Submit**: Test one evaluation form submission
5. **Report Generation**: Generate at least one report

**Before Deployment**:

1. All manual tests above
2. Test in both Modal and Web App modes
3. Test on mobile device (responsive design)
4. Check email notifications (if modified)
5. Verify triggers are preserved

### Automated Testing (Future Enhancement)

Currently, this project relies on manual testing. Future enhancement:

```javascript
// Example test suite structure
function runAllTests() {
  const tests = [
    testNormalizeCursoId,
    testGetEstudiantesCached,
    testGenerateReporte,
    // ... more tests
  ];

  tests.forEach(test => {
    try {
      test();
      Logger.log(`✓ ${test.name} passed`);
    } catch (error) {
      Logger.log(`✗ ${test.name} failed: ${error.message}`);
    }
  });
}

function testNormalizeCursoId() {
  assertEqual(normalizeCursoId('Curso1BAS'), '1BAS');
  assertEqual(normalizeCursoId('  2bas  '), '2BAS');
  assertEqual(normalizeCursoId('CursoÁBC'), 'ABC'); // Remove accents
}

function assertEqual(actual, expected) {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
}
```

### Logging Best Practices

**Log Levels**:

```javascript
Log.debug('Detailed debug info');    // Development only
Log.info('Normal operations');       // General info
Log.warn('Potential issues');        // Warnings
Log.error('Errors occurred');        // Errors
Log.critical('System failures');     // Critical issues
```

**Structured Logging**:

```javascript
// GOOD: Structured, parseable
Log.info('Report generated', {
  reportType: 'attendance',
  courseId: '1BAS',
  studentCount: 25,
  executionTime: 1234
});

// BAD: Unstructured string
Log.info('Generated attendance report for 1BAS with 25 students in 1234ms');
```

**Error Logging**:

```javascript
try {
  riskyOperation();
} catch (error) {
  Log.error('Operation failed', {
    function: 'riskyOperation',
    error: error.message,
    stack: error.stack,
    input: JSON.stringify(inputData)
  });
  throw error; // Re-throw if critical
}
```

---

## Deployment Guide

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] No console errors in dashboard
- [ ] SPREADSHEET_ID is correct
- [ ] OAuth scopes in appsscript.json are complete
- [ ] Commit changes to git
- [ ] Create pull request (if team workflow)
- [ ] Merge to main branch

### Deployment Methods

**Method 1: Direct in Apps Script Editor** (Quick)

1. Open project in Apps Script
2. Test: Run > Test as web app
3. Deploy: Deploy > New deployment
4. Select type: Web app
5. Configure access level
6. Deploy and copy URL

**Method 2: Via clasp** (Recommended for CI/CD)

```bash
# Push latest code
clasp push

# Create new version
clasp version "Description of changes"

# Deploy
clasp deploy -V <versionNumber> -d "Deployment description"

# Get deployment URL
clasp deployments
```

### Post-Deployment Verification

1. **Access Web App**: Open deployment URL
2. **Test Dashboard**: Verify all tabs load
3. **Test Data Fetch**: Check students and instruments load
4. **Test Form**: Submit one evaluation
5. **Check Sheets**: Verify data appears in CalificacionesDetalladas
6. **Test Reports**: Generate one report
7. **Check Email**: Test manual alert (if applicable)
8. **Mobile Test**: Open on phone, check responsive design

### Rollback Procedure

If deployment fails:

1. **Via Apps Script Editor**:
   - Deploy > Manage deployments
   - Find previous deployment
   - Click "..." > "Restore this deployment"

2. **Via clasp**:
   ```bash
   clasp undeploy <deploymentId>
   clasp deploy -V <previousVersion>
   ```

3. **Via Git**:
   ```bash
   git revert <commit-hash>
   git push
   clasp push
   ```

### Environment-Specific Configuration

**Development**:

```javascript
const SPREADSHEET_ID = 'DEV_SPREADSHEET_ID';
const DEBUG_MODE = true;
CACHE_CONFIG.DEBUG_CACHE = true;
```

**Production**:

```javascript
const SPREADSHEET_ID = 'PROD_SPREADSHEET_ID';
const DEBUG_MODE = false;
CACHE_CONFIG.DEBUG_CACHE = false;
```

**Note**: Apps Script doesn't have native environment variables. Consider using PropertiesService for configuration:

```javascript
const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  || '1WKVottJP88lQ-XxB2SLaLJc06aB5yQYw5peI-8WLaO0'; // Fallback
```

---

## Important Notes for AI Assistants

### Critical Rules

1. **NEVER use eval()**: Use explicit function mapping instead (security)
2. **ALWAYS use cached functions**: `getEstudiantesCached()` not `getSheetData('Estudiantes')`
3. **ALWAYS invalidate cache after writes**: After inserting data, invalidate relevant caches
4. **Normalize CursoID**: Always use `normalizeCursoId()` when comparing course IDs
5. **Add new functions to doPost whitelist**: If callable from dashboard, must be in availableFunctions map
6. **Test in both modes**: Modal (in Sheets) and Web App (standalone)
7. **Use Log framework**: Prefer `Log.info()` over `Logger.log()`
8. **Batch operations**: Use BatchReadsOptimizado.gs for multiple sheet reads
9. **Error handling**: Always wrap risky operations in try-catch
10. **Spanish UI strings**: Keep user-facing text in Spanish

### Code Modification Guidelines

**When adding features**:

1. Check if similar functionality exists (avoid duplication)
2. Follow existing naming conventions
3. Add comprehensive error handling
4. Update relevant caches
5. Test in both Modal and Web App modes
6. Document with JSDoc comments

**When fixing bugs**:

1. Identify root cause before changing code
2. Add logging to track issue
3. Test fix thoroughly
4. Consider if cache invalidation is needed
5. Check if other similar code has same bug

**When refactoring**:

1. Maintain backward compatibility (existing functions)
2. Update all call sites if changing function signatures
3. Preserve existing behavior unless explicitly changing it
4. Test extensively (refactors break things!)
5. Update documentation

### Common Pitfalls to Avoid

1. **Case sensitivity**: Sheet names are case-sensitive ("Estudiantes" ≠ "estudiantes")
2. **Course ID normalization**: Always normalize before comparing
3. **Cache staleness**: Remember to invalidate after data changes
4. **Modal vs. Web App**: Code must work in both contexts
5. **Quota limits**: Be mindful of API call quotas
6. **Trigger limits**: Max 20 time-based triggers per script
7. **Email limits**: 100 emails per day on free tier
8. **Execution time**: Functions timeout after 6 minutes
9. **OAuth scope changes**: Require re-authorization by users
10. **Date/Time zones**: Always use consistent timezone (Europe/Madrid)

### Questions to Ask Before Implementing

1. **Does this require a new OAuth scope?** (Check appsscript.json)
2. **Will this work in both Modal and Web App modes?**
3. **Do I need to invalidate any caches?**
4. **Should this be added to the doPost whitelist?**
5. **Is there existing functionality I can reuse?**
6. **Have I tested with realistic data volumes?**
7. **Will this exceed any quotas?**
8. **Does this need error handling for missing data?**
9. **Should this be cached for performance?**
10. **Is the UX clear and consistent with existing patterns?**

### Useful Code Snippets

**Check if running in Modal vs. Web App mode**:

```javascript
function getExecutionContext() {
  try {
    SpreadsheetApp.getActiveSpreadsheet();
    return 'MODAL'; // Running in Sheets
  } catch (e) {
    return 'WEBAPP'; // Running as standalone web app
  }
}
```

**Safely get sheet data with fallback**:

```javascript
function safeGetSheetData(sheetName) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
    if (!sheet) {
      Log.warn(`Sheet not found: ${sheetName}`);
      return [];
    }
    const data = sheet.getDataRange().getValues();
    return data.length > 1 ? data : []; // Return empty if only headers
  } catch (error) {
    Log.error(`Error reading sheet: ${sheetName}`, { error: error.message });
    return [];
  }
}
```

**Create sheet if doesn't exist**:

```javascript
function getOrCreateSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    Log.info(`Created new sheet: ${sheetName}`);
  }

  return sheet;
}
```

**Format date consistently**:

```javascript
function formatDate(date) {
  return Utilities.formatDate(date, TZ, 'yyyy-MM-dd');
}

function formatDateTime(date) {
  return Utilities.formatDate(date, TZ, 'yyyy-MM-dd HH:mm:ss');
}
```

---

## Recent Changes & History

### Major Updates (Last 6 Months)

**Security Improvements**:

- **2025-11-17**: Replaced eval() with explicit function whitelist in doPost() (Commit bf7c664)
  - Security vulnerability remediation
  - All dashboard callable functions now explicitly mapped
  - Breaking change: Dynamic function calling no longer possible

**Feature Enhancements**:

- **2025-11-15**: Improved instrument filtering in dashboard
  - Added course filter
  - Added learning situation filter
  - Added instrument type filter
  - Added active filter indicator
  - See MEJORAS_INSTRUMENTOS.md for details

- **2025-11-12**: Enhanced report listing and PDF export
  - Fixed report pattern recognition (Commit e569e97)
  - Improved response handling in report listing (Commit db7df03)
  - List all sheet tabs in report view (Commit f4d81f2)

- **2025-11-10**: Report visualization improvements
  - Display reports directly in dashboard (Commit 45817af)
  - Fixed modal display order (Commit 142fd39, 4c0ecea)
  - Consistent modal visualization strategy

**Performance Optimizations**:

- **2025-10-20**: Implemented CacheOptimizado.gs
  - 60-80% performance improvement
  - Multi-level caching strategy
  - Reduced API quota consumption

- **2025-10-18**: Implemented BatchReadsOptimizado.gs
  - Batch operations for multiple sheet reads
  - Significant quota savings

**Bug Fixes**:

- **2025-11-08**: Fixed getLastUpdated error using DriveApp (Commit e32cd79)
- **2025-11-07**: Robust error handling for PDF export and report listing (Commit 6079bc6)

### Deprecated Features

- **eval() in doPost()**: Removed for security. Use explicit function mapping.
- **Old cache system**: Replaced by CacheOptimizado.gs. Old sheetCache variable removed.
- **Direct Logger.log()**: Prefer Log framework (LoggingOptimizado.gs) for new code.

### Planned Features (Roadmap)

- [ ] Search by text in instruments table
- [ ] Column sorting in data tables
- [ ] Card view for instruments (mobile-optimized)
- [ ] Export filtered results to CSV/Excel
- [ ] Automated testing framework
- [ ] CI/CD pipeline with clasp
- [ ] Multi-language support (English/Spanish toggle)
- [ ] Dark mode theme
- [ ] Offline mode with service workers
- [ ] Real-time collaboration indicators

---

## Resources & References

### Official Documentation

- **Google Apps Script**: https://developers.google.com/apps-script
- **SpreadsheetApp**: https://developers.google.com/apps-script/reference/spreadsheet
- **HtmlService**: https://developers.google.com/apps-script/reference/html
- **CacheService**: https://developers.google.com/apps-script/reference/cache
- **Quotas**: https://developers.google.com/apps-script/guides/services/quotas

### Tools

- **clasp CLI**: https://github.com/google/clasp
- **Apps Script Dashboard**: https://script.google.com

### Project Documentation

- **README.md**: User-facing documentation
- **MEJORAS_INSTRUMENTOS.md**: Changelog for instrument filtering feature
- **CLAUDE.md**: This file (AI assistant guide)

### Support

For issues or questions:

1. Check this documentation first
2. Review Apps Script execution logs (View > Executions)
3. Check browser console for frontend errors
4. Review recent git commits for related changes
5. Test with diagnostic functions (DiagnosticoAlertas.gs, DiagnosticoSimple.gs)

---

**End of CLAUDE.md**

*This document is maintained for AI assistants working on this codebase. Keep it updated with significant architectural changes, new patterns, or important conventions.*
