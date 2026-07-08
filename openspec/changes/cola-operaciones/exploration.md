## Exploration: Cola de Operaciones (Nous Console)

### Current State
Actualmente, el motor de ejecución (`pipelineExecutor.ts`) procesa los contenidos de forma síncrona dentro de un ciclo `for`. Por cada paso, añade *una sola tarea* a la cola (`useQueueStore.enqueueTask`), la ejecuta, y luego la elimina. 
Esto causa que `batchTotalTasks` muestre el total (ej: 15), pero el array `queue` visible en la UI de `NousConsoleView.tsx` solo contenga 1 elemento (la tarea actual). Por lo tanto, el usuario no puede previsualizar la cola completa.
Además, la consola solo sirve como monitor de lectura; no hay interfaz para "añadir contenidos" directamente desde la vista de la consola, y "quitar de la cola" solo quita la tarea visualmente, pero no detiene el ciclo `for` de `pipelineExecutor`.

### Affected Areas
- `src/lib/client/pipelineExecutor.ts` — Generación de tareas individuales vs pre-llenado de la cola.
- `src/components/contents/NousConsoleView.tsx` — Interfaz de la cola (necesita mejor visibilidad del contenido objetivo y UI para añadir tareas).
- `src/store/useQueueStore.ts` — Gestión del estado de las tareas pre-encoladas.

### Approaches
1. **Pre-encolado en el Executor (Recomendado)** — Modificar `pipelineExecutor.ts` para que, antes de iniciar el procesamiento, genere y encole *todas* las tareas del pipeline como `pending`. Luego, el motor iterará sobre estas tareas pre-encoladas.
   - Pros: El usuario verá inmediatamente toda la cola de operaciones. Permite implementar "quitar de la cola" verificando si la tarea sigue en el store antes de ejecutarla.
   - Cons: La ejecución sigue atada al ciclo local del executor.
   - Effort: Low

2. **Desacoplamiento Total (Background Workers)** — Refactorizar toda la ejecución para depender puramente de `useQueueProcessor.ts` y `QueueRegistry`, eliminando el ciclo del `pipelineExecutor`.
   - Pros: Ejecución real en segundo plano sin depender de la UI o del modal.
   - Cons: Requiere refactorizar profundamente las acciones de IA (`executeDraftPipeline`, etc.) para que no dependan del estado local en memoria (`memoryState`) y se comuniquen solo vía base de datos y eventos.
   - Effort: High

### Recommendation
Implementar el **Pre-encolado en el Executor (Approach 1)** para resolver la visualización inmediata y la cancelación individual (quitar de la cola). 
Para el requisito de "sumar contenidos a la cola" desde la consola, se añadirá un panel/botón en `NousConsoleView.tsx` que permita seleccionar un contenido y una acción, despachando la tarea al `useQueueStore` (la cual será procesada por `useQueueProcessor` o el mecanismo actual de batch).

### Risks
- Cancelar una tarea pre-encolada en medio de una secuencia de pipeline (ej. "Generar -> Humanizar") podría romper el flujo del contenido si se cancela "Generar" pero no "Humanizar". Se debe manejar gracefully.
- Añadir tareas arbitrarias desde la consola requiere que los handlers de `useQueueProcessor.ts` (en `QueueRegistry`) estén preparados para procesar sin depender del estado activo de la vista de Writer.

### Ready for Proposal
Yes — The technical approach is clear and we can move to the proposal phase.
