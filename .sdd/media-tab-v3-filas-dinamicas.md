# SDD: MediaTab V3 - Filas Dinámicas

## Objetivo
Reemplazar la galería actual de MediaTab (fila horizontal de Portada + Cuerpo) por un sistema de filas verticales dinámicas donde cada imagen tiene su propia configuración (modelo, dimensiones, mini-prompt).

## Estado Actual
- Portada fija 128x128 + fila horizontal scrollable de Cuerpo
- Configuraciones globales (estilo, dimensiones) en panel inferior

## Estado Deseado
- Lista vertical de filas (1 Portada + N Cuerpo)
- Cada fila: preview, selector modelo, selector ratio, dimensiones, mini-prompt, acciones
- Carga automática desde `body_presets` del proyecto
- Botón "Agregar Fila" sin límite

## Tipo de Cambio
**Refactorización UI + Integración de Datos**

---

## Especificación de Diseño

### Layout General
- Scroll vertical continuo
- No hay "galería superior" + "panel de settings" separado
- Cada fila renderiza su propia miniatura directamente

### Comportamiento por Defecto
| Escenario | Filas mostradas |
|----------|----------------|
| Proyecto sin body_presets | 1 Portada + 1 Cuerpo (default) |
| Proyecto con N body_presets | 1 Portada + N Cuerpo |
| Proyecto con 0 body_presets | Solo Portada |

### Estructura de Fila

```tsx
<ImageRow>
  < tipo: 'portada' | 'cuerpo' >
  < preview: imagen | placeholder >
  < selectorModelo: dropdown >
  < selectorRatio: dropdown >
  < inputWidth: number >
  < inputHeight: number >
  < inputMiniPrompt: text >
  < acciones: generar | subir | eliminar >
</ImageRow>
```

### Herencia vs Override
- **Al cargar**: Hereda valores del `portada_preset` o `body_presets[i]` del proyecto
- **runtime**: Cada fila es independiente - cambios locales no persisten en proyecto
- Usuario puede cambiar modelo/dims/prompt por imagen sin afectar presets

---

## Detalle de Campos por Fila

### Selector de Modelo
- Opciones: `grok-imagine-pro`, `flux`, `imagen-4.0-generate-001`, `imagen-3.0-fast-generate`, `wan-image-pro`
- Valor por defecto: hereda del preset del proyecto

### Selector Ratio
- Opciones: `16:9`, `1:1`, `4:3`, `9:16`, `auto`, `custom`
- Valor por defecto: hereda del preset del proyecto

### Dimensiones (Width x Height)
- Inputs numéricos
- Valor por defecto: hereda del preset del proyecto
- Se auto-calculan si ratio no es `custom`

### Mini-Prompt
- Input de texto libre
- Valor por defecto: hereda del preset (`.mini_prompt`)
- Placeholder: "Describe elementos específicos para esta imagen..."

### Acciones
- **Generar**: Ejecuta ImageWorkflow para esta fila específica
- **Subir**: Drag & drop o file picker
- **Eliminar**: Solo filas de cuerpo (no Portada)

---

## Integración con Project Store

### Obtención de Presets
```tsx
const activeProject = projects.find(p => p.id === projectId);
const imgSettings = activeProject?.settings?.images;
const portadaPreset = imgSettings?.portada_preset;
const bodyPresets = imgSettings?.body_presets || [];
```

### Fallbacks
- Si no hay proyecto: usar defaults hardcodeados
- Si no hay body_presets: mostrar 1 fila de cuerpo por defecto

---

## Tareas de Implementación

### Fase 1: Estructura de Datos
- [x] Definir tipo `ImageRowConfig` en `/types/images.ts`
- [ ] Crear estado local `imageRows: ImageRowConfig[]` en MediaTab

### Fase 2: UI de Fila
- [ ] Crear componente `ImageRow` (memoizado)
- [ ] Renderizar filas basadas en `imageRows` state
- [ ] Implementar herencia desde presets del proyecto

### Fase 3: Acciones por Fila
- [ ] `handleGenerateRow(rowIndex)`: genera imagen para esa fila específica
- [ ] `handleUploadRow(rowIndex, file)`: sube imagen a esa fila
- [ ] `handleDeleteRow(rowIndex)`: elimina fila (solo cuerpo)
- [ ] `handleAddRow()`: agrega nueva fila al final

### Fase 4: Selectores por Fila
- [ ] Selector de modelo por fila
- [ ] Selector de ratio por fila
- [ ] Inputs de dimensiones por fila
- [ ] Input mini-prompt por fila

### Fase 5: Renderizado
- [ ] Renderizar lista vertical de filas
- [ ] Portada siempre primera (no eliminable)
- [ ] Cuerpo renderiza desde `body_presets` + filas agregadas
- [ ] Botón "Agregar Fila" al final

---

## Dependencias
- `useProjectStore`: para obtener presets
- `ImageWorkflowService`: para generación por fila
- `uploadManualImage`: para subir imágenes
- `deleteImageAction`: para eliminar imágenes existentes

---

## Notas Técnicas
1. La generación por fila usa el `mini_prompt` de esa fila + el global del proyecto
2. Las imágenes generadas se persistens igual que ahora (a Supabase)
3. El selector de modelo debe mostrar label legible + provider
4. Las filas nuevas heredan del último `body_preset` o usan defaults