# 📊 Soporte para Reportes de Notas (RepNotas)

## 🎯 Resumen

A partir de la **Versión 1.3**, el sistema de visualización de reportes soporta completamente la estructura especial de los **Reportes de Notas** (RepNotas), incluyendo las **medias ponderadas** calculadas.

---

## 🔍 Problema Original

Los reportes de notas tienen una estructura única en **dos secciones separadas**:

### Sección 1: Datos Originales (Columnas A-D)
```
| Estudiante | Instrumento               | Fecha      | Calificación |
|------------|--------------------------|------------|--------------|
| Estudiante | Self-Assessment          | 2025-09-23 | 8.75         |
| Estudiante | Self-Assessment          | 2025-09-26 | 10.00        |
| Estudiante | Peer Evaluation          | 2025-09-26 | 9.38         |
```

### Sección 2: Medias Ponderadas (Columnas F+)
```
| Estudiante | Self-Assessment | Peer Evaluation | Emergency Response | Media Ponderada |
|------------|----------------|-----------------|--------------------| ----------------|
| Peso       | 10%            | 10%             | 45%                |                 |
| Juan Pérez | 9.79           | 9.48            | 8.5                | 9.0             |
| Ana García | 9.38           | 10              | 7.5                | 8.2             |
```

**El problema**: La función anterior solo leía las columnas A-D, **ignorando completamente** la tabla de medias ponderadas que es la más útil para el usuario.

---

## ✅ Solución Implementada

### Detección Automática

El sistema ahora detecta automáticamente si un reporte es tipo `RepNotas`:

```javascript
const isRepNotas = nombreNormalizado.startsWith('RepNotas ');
```

### Búsqueda Dinámica de la Tabla de Medias

Busca la columna donde comienza la tabla de medias ponderadas:

```javascript
// Buscar "Estudiante" después de la columna E (índice 4)
let mediasStartCol = -1;
for (let col = 4; col < allValues[0].length; col++) {
  const cellValue = String(allValues[0][col] || '').trim();
  if (cellValue === 'Estudiante') {
    mediasStartCol = col;
    break;
  }
}
```

### Procesamiento Inteligente

Si encuentra la tabla de medias:

1. **Extrae todos los headers** desde la columna encontrada hasta el final
   - Ejemplo: `["Estudiante", "Self-Assessment", "Peer Evaluation", "Emergency Response", "Media Ponderada"]`

2. **Salta la fila 2** que contiene los pesos (10%, 10%, 45%, etc.)

3. **Procesa desde la fila 3** en adelante (datos de estudiantes)

4. **Filtra filas vacías** automáticamente

5. **Convierte a objetos** usando los headers como claves

### Resultado

```json
{
  "success": true,
  "data": [
    {
      "Estudiante": "Juan Pérez",
      "Self-Assessment": "9.79",
      "Peer Evaluation": "9.48",
      "Emergency Response": "8.5",
      "Media Ponderada": "9.0"
    },
    {
      "Estudiante": "Ana García",
      "Self-Assessment": "9.38",
      "Peer Evaluation": "10",
      "Emergency Response": "7.5",
      "Media Ponderada": "8.2"
    }
  ],
  "headers": ["Estudiante", "Self-Assessment", "Peer Evaluation", "Emergency Response", "Media Ponderada"],
  "sheetName": "RepNotas Curso1BAS-3. Saving Lives",
  "rowCount": 26,
  "colCount": 5,
  "tipoReporte": "RepNotas_MediasPonderadas"
}
```

---

## 📋 Características

### ✅ Flexibilidad

- **Cualquier número de instrumentos**: Funciona con 2, 3, 5, 10... instrumentos
- **Nombres dinámicos**: Los nombres de los instrumentos se extraen automáticamente de los headers
- **Posición variable**: No importa en qué columna empiece la tabla de medias (F, G, H...)

### ✅ Compatibilidad

- **Reportes con medias**: Muestra la tabla de medias ponderadas
- **Reportes sin medias**: Fallback automático a la tabla original (columnas A-D)
- **Reportes antiguos**: Compatible con estructuras anteriores

### ✅ Robustez

- **Filtrado automático**: Ignora filas vacías
- **Manejo de errores**: Logging detallado para debugging
- **Validación de estructura**: Verifica que los datos sean válidos antes de procesarlos

---

## 🧪 Cómo Probar

### Opción 1: Desde el Dashboard

1. Abre el dashboard
2. Ve a la pestaña **"Reportes"**
3. Haz clic en **"Exportar Reportes a PDF"**
4. Busca un reporte que empiece con `RepNotas`
5. Haz clic en el botón **"👁️ Visualizar"**
6. Verifica que se muestre la tabla de medias ponderadas

### Opción 2: Desde Apps Script (Backend)

Ejecuta esta función para probar directamente:

```javascript
function TEST_RepNotas() {
  // Reemplaza con el nombre real de un RepNotas en tu spreadsheet
  const nombreReporte = "RepNotas Curso1BAS-3. Saving Lives";

  Logger.log('=== TEST RepNotas ===');
  const resultado = leerReporteExistente(nombreReporte);

  Logger.log('success: ' + resultado.success);
  Logger.log('tipoReporte: ' + resultado.tipoReporte);
  Logger.log('headers: ' + JSON.stringify(resultado.headers));
  Logger.log('rowCount: ' + resultado.rowCount);
  Logger.log('colCount: ' + resultado.colCount);
  Logger.log('Primer registro: ' + JSON.stringify(resultado.data[0]));
}
```

---

## 🔍 Debugging

### Logs Detallados

Cuando procesas un RepNotas, verás logs como estos en la consola:

```
[leerReporteExistente] Detectado: Reporte de Notas - Buscando tabla de medias ponderadas
[leerReporteExistente] Tabla de medias encontrada en columna 6 (F)
[leerReporteExistente] Headers de medias ponderadas: Estudiante, Self-Assessment, Peer Evaluation, Emergency Response, Media Ponderada
[leerReporteExistente] Filas de medias ponderadas (filtradas): 26
[leerReporteExistente] ÉXITO (RepNotas con medias): 26 registros leídos
```

### Verificar en el Frontend

Abre la consola del navegador (F12) y busca logs como:

```javascript
🔧 [visualizarReporte] Iniciando visualización de: "RepNotas Curso1BAS-3. Saving Lives"
📊 [visualizarReporte] Respuesta recibida: {success: true, tipoReporte: "RepNotas_MediasPonderadas", ...}
✅ [visualizarReporte] Datos obtenidos - Filas: 26, Columnas: 5
```

---

## ⚠️ Requisitos

Para que funcione correctamente, los **Reportes de Notas** deben tener esta estructura:

### Fila 1: Headers
- Columnas A-D: Headers originales (`Estudiante`, `Instrumento`, `Fecha`, `Calificación`)
- Columnas F+: Headers de medias (`Estudiante`, nombres de instrumentos, `Media Ponderada`)

### Fila 2: Pesos (solo en tabla de medias)
- Columna F: `"Peso"`
- Columnas G+: Porcentajes (`"10%"`, `"45%"`, etc.)

### Fila 3+: Datos
- Datos de estudiantes con sus notas por instrumento

### Ejemplo Mínimo

```
A           | B               | C          | D            | E | F          | G              | H                 | I
------------|-----------------|------------|--------------|---|------------|----------------|-------------------|----------------
Estudiante  | Instrumento     | Fecha      | Calificación |   | Estudiante | Self-Assess    | Peer Eval         | Media Ponderada
Estudiante  | Self-Assessment | 2025-09-23 | 8.75         |   | Peso       | 10%            | 10%               |
Estudiante  | Peer Evaluation | 2025-09-26 | 9.38         |   | Juan Pérez | 9.79           | 9.48              | 9.2
```

---

## 🐛 Solución de Problemas

### Problema: No se visualiza ningún dato

**Causa**: La tabla de medias no tiene el header "Estudiante" en ninguna columna después de la E.

**Solución**:
1. Verifica que la columna F (o posterior) tenga el header "Estudiante"
2. Ejecuta `TEST_leerReporteExistente()` para ver los logs detallados
3. Revisa que la estructura coincida con el ejemplo arriba

### Problema: Solo muestra las primeras 4 columnas

**Causa**: No se encontró la tabla de medias, se usó el fallback a datos originales.

**Solución**:
1. Verifica que exista una segunda tabla con headers en columnas F+
2. Asegúrate de que el nombre de la hoja empiece con `RepNotas `
3. Revisa los logs para ver qué columna se detectó

### Problema: Falta la columna "Media Ponderada"

**Causa**: El reporte no tiene medias calculadas todavía.

**Solución**:
1. Desde el menú del spreadsheet: **⚡ Funciones Extra > 📝 Calificaciones > 🧮 Calcular medias ponderadas**
2. Selecciona la hoja del reporte
3. Ingresa los pesos para cada instrumento
4. Vuelve a visualizar el reporte

---

## 📚 Documentación Relacionada

- **[CHANGELOG_VISUALIZACION.md](CHANGELOG_VISUALIZACION.md)**: Historial completo de cambios
- **[GUIA_VISUALIZACION_REPORTES.md](GUIA_VISUALIZACION_REPORTES.md)**: Guía de debugging general
- **[README_MEJORAS_VISUALIZACION.md](README_MEJORAS_VISUALIZACION.md)**: Documentación completa del sistema

---

**Última actualización**: 2025-11-12
**Versión**: 1.3
**Autor**: Claude Code
**Estado**: ✅ Probado y funcionando
