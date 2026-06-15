# Archivo de Cambio: fix-planner-content-sync

**Estado:** Completado
**Fecha:** 2026-06-15

## Resumen del Cambio
Se corrigió un bug grave en la sincronización entre el Editorial Planner (`StrategyGrid.tsx`) y el Redactor (`WriterStudio.tsx` + `WriterEditor.tsx`). Anteriormente, debido a la carga ligera de tareas en el Planner (donde `content_body` es excluido para ahorrar ancho de banda), el `initializeFromTask` inicializaba el contenido en local con un string vacío `''`. Esto provocaba que TipTap purgara cualquier contenido existente si se abría el artículo desde el Planner antes de que finalizara la recarga. Adicionalmente, el Planner reportaba equivocadamente que el contenido estaba vacío o "Por Redactar" al no recibir el HTML.

## Solución Implementada
1. **Zustand (`persistence-slice.ts`)**: Se refactorizó `initializeFromTask` para que al detectar la ausencia de la llave `content_body` asigne explícitamente el estado `content: null`. Luego, automáticamente despacha un `setTimeout` con `fetchTaskContent(task.id)` para rehidratar bajo demanda el editor.
2. **React UI (`WriterStudio.tsx`)**: Se modificó `renderContent()` para interceptar el estado `content === null`. En lugar de inicializar `WriterEditor` y TipTap, se muestra un Loader asíncrono ("Sincronizando..."). Esto garantiza que TipTap solo nazca cuando se tiene certeza del contenido.
3. **Planner Grid (`StrategyGrid.tsx`)**: Se incluyeron validaciones alternativas basadas en `task.word_count_real > 0` para todas las evaluaciones visuales relacionadas al botón de edición o de estatus ("Redactando"). Esto previene falsos negativos.

## Impacto
- Prevención de pérdida de texto por race condition.
- Mejor experiencia de usuario al viajar entre pantallas sin tiempos de bloqueo masivos.
- Se preserva el performance sin inflar los payloads de Supabase del Planner.
