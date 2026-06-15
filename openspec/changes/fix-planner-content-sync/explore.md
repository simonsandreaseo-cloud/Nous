# Exploración: Falla de sincronización de contenido en Planner vs Studio

## Problema detectado
El Planner (`EditorialCalendar` + `StrategyGrid`) indica que ciertos artículos están vacíos (o "Redactando") y no cuenta sus palabras reales, a pesar de que abriéndolos directamente desde el Studio se puede ver el contenido. Además, si se accede al Studio mediante el acceso directo del Planner, el documento carga vacío.

## Causa Raíz
1. **Fetching Parcial (LIGHT_TASK_COLUMNS):** El Planner obtiene las tareas mediante `fetchProjectTasks`, el cual usa una constante `LIGHT_TASK_COLUMNS`. Esta constante excluye `content_body` intencionalmente para ahorrar payload (ya que el contenido vive primariamente en la tabla `task_contents`). Por lo tanto, `task.content_body` siempre es `undefined` en el Planner.
2. **Evaluación de Vacío:** El frontend del Planner (en `StrategyGrid.tsx`) evalúa `!task.content_body` o `task.content_body.trim() === ''` para mostrar los estados "Abrir Redactor (Vacío)" o "Redactando".
3. **Pérdida de Estado en Transición (Race Condition):** Al hacer clic en el botón del Planner para ir al Studio, se llama a `initializeFromTask(task)`. Esta función sobreescribe el estado global `content` con `task.content_body || ''`, dejándolo vacío. Al montar `WriterStudio`, se dispara el fetch asíncrono `fetchTaskContent`, pero el componente `WriterEditor` (TipTap) reacciona al montado inicial vacío escupiendo `<p></p>` y disparando `onUpdate`, lo que machaca de nuevo el store global con vacío justo cuando o después de que el fetch intenta restaurarlo. Además, si el `draftId` no cambia (misma tarea), el fetch ni siquiera se dispara.
4. **Conteo de palabras (Word Count):** El guardado del `word_count_real` funciona bien a nivel base de datos (`updateTask` lo guarda en `tasks`), pero el Planner oculta la columna y/o delega la comprobación al `content_body` que asume que todo está vacío.

## Soluciones Posibles
1. **Añadir un flag `has_content` a la tabla `tasks` o confiar en `word_count_real`:**
   En vez de depender de `content_body`, el Planner podría verificar si `word_count_real > 0` o tener un flag de base de datos.
2. **Evitar sobreescritura ciega en `initializeFromTask`:**
   Si la tarea pasada a `initializeFromTask` no incluye la propiedad `content_body` de manera explícita (viene del fetch liviano), no debería sobreescribir `state.content` con `''`. En su lugar, debería mantenerlo en un estado `null` o hacer un fetch directo.
3. **Proteger el montaje de `WriterStudio`:**
   No permitir que TipTap envíe `onUpdate` hasta que el contenido inicial pesado haya terminado de cargar, o re-estructurar la carga para que el router no dispare el renderizado del editor hasta tener el texto real.

## Conclusión de la Exploración
La vía más sólida es:
1. Modificar el chequeo visual en `StrategyGrid.tsx` para depender de `word_count_real` en lugar de `content_body` para determinar si el artículo está en progreso o vacío.
2. Modificar `initializeFromTask` en `persistence-slice.ts` para NO sobreescribir `content` con `''` si `task.content_body` es estrictamente `undefined` (que significa que no se pidió), evitando la destrucción del estado local.
3. Reforzar `WriterStudio.tsx` para forzar la carga de `content_body` si venimos de un estado de "solo metadatos".
