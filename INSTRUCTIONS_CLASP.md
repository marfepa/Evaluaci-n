# Configurar clasp para sincronizar con Google Apps Script

## Instalación

```bash
npm install -g @google/clasp
```

## Configuración

1. **Login a Google**:
```bash
clasp login
```

2. **Crear .clasp.json**:
Crea un archivo `.clasp.json` en la raíz del proyecto con:

```json
{
  "scriptId": "TU_SCRIPT_ID_AQUI",
  "rootDir": "."
}
```

Para encontrar tu Script ID:
- Abre tu proyecto en https://script.google.com
- Ve a **Configuración del proyecto** (icono de engranaje)
- Copia el **ID de secuencia de comandos**

3. **Subir cambios**:
```bash
clasp push
```

4. **Bajar cambios**:
```bash
clasp pull
```

## Ventajas

- Sincronización automática bidireccional
- Trabajo local con tu editor favorito
- Control de versiones integrado con Git
- No necesitas copiar y pegar manualmente
