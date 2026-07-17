# Actualización de Modelos AI y Corrección de Humanización

Se actualizarán las configuraciones de modelos para incluir Gemini 3 Flash (Vertex) y remover Gemini 3.1 Pro (GAS), siguiendo la solicitud del usuario. Además, se investigará y corregirá un error crítico en el proceso de humanización estructural que está causando fallos en la manipulación del DOM con Cheerio.

## Cambios Propuestos

### Componentes de UI (Listas de Modelos)

Se actualizarán los arrays `AI_MODELS` y los selectores en los siguientes archivos para reflejar los cambios solicitados:
- Agregar `gemini-3-flash-vertex`.
- Eliminar `gemini-3.1-pro-preview-gas`.
- Reemplazar versiones `preview` de Gemini 3 Flash por la versión estable si aplica.

#### [MODIFY] [PipelineBlockConfig.tsx](file:///c:/Users/Simon%20Sandrea/Pictures/Desarrollos%20SimonSEO/nous_2.0/src/components/dashboard/pipeline/PipelineBlockConfig.tsx)
#### [MODIFY] [WriterStudio.tsx](file:///c:/Users/Simon%20Sandrea/Pictures/Desarrollos%20SimonSEO/nous_2.0/src/components/contents/writer/WriterStudio.tsx)
#### [MODIFY] [CustomTransformModal.tsx](file:///c:/Users/Simon%20Sandrea/Pictures/Desarrollos%20SimonSEO/nous_2.0/src/components/contents/tools/CustomTransformModal.tsx)
#### [MODIFY] [MiniHumanizerModal.tsx](file:///c:/Users/Simon%20Sandrea/Pictures/Desarrollos%20SimonSEO/nous_2.0/src/components/contents/tools/MiniHumanizerModal.tsx)

### Lógica de Servidor y Acciones AI

#### [MODIFY] [aiActions.ts](file:///c:/Users/Simon%20Sandrea/Pictures/Desarrollos%20SimonSEO/nous_2.0/src/lib/actions/aiActions.ts)
- Actualizar `allowedModels` en `executeHumanizerWithRetry`, `runHumanizerPipeline` y `runMiniHumanizerPipeline`.
- Corregir el error `Cannot create property 'prev' on string` asegurando que las actualizaciones de Cheerio se realicen de forma segura y que las respuestas del modelo se procesen correctamente antes de inyectarlas en el HTML.

## Plan de Verificación

### Pruebas Automatizadas
- No se dispone de tests automáticos específicos para UI, se realizará verificación manual.

### Verificación Manual
- Verificar que el selector de modelos en Pipelines muestre "Gemini 3 Flash (Vertex)" y ya no muestre "Gemini 3.1 Pro (GAS)".
- Verificar lo mismo en el Writer Studio y en los Modales de Transformación/Humanización.
- Ejecutar un proceso de humanización para confirmar que el error de Cheerio ha sido resuelto y que el contenido se actualiza correctamente en la UI.
