## Tasks: Cola de Operaciones (Nous Console)

- `[x]` **1. Core - Pre-Encolado en Pipeline Executor (`src/lib/client/pipelineExecutor.ts`)**
  - `[x]` 1.1. Modificar `executePipeline` para crear una fase previa de "Encolado Planificado".
  - `[x]` 1.2. Iterar sobre los targets y bloques y despachar `queueStore.enqueueTask` con un payload que incluya `{ isPipelineMode: true }`.
  - `[x]` 1.3. Modificar la firma de `executeTaskInBlock` para que reciba el `queueTaskId` ya creado en vez de crearlo internamente.
  - `[x]` 1.4. En la fase de "Ejecución", antes de llamar a `executeTaskInBlock`, comprobar que el `queueTaskId` sigue existiendo en `queueStore.getState().queue`. Si no existe, ignorar el target (fue cancelado).

- `[x]` **2. Core - Aislamiento del Queue Processor (`src/components/dashboard/useQueueProcessor.ts`)**
  - `[x]` 2.1. Modificar el filtro `nextTask` para excluir tareas que tienen `t.payload?.isPipelineMode === true`.

- `[x]` **3. Interfaz - Sidebar de Consola (`src/components/contents/NousConsoleView.tsx`)**
  - `[x]` 3.1. Agregar botón/ícono de 🗑️ (papelera) a los items de la cola que estén `pending`, llamando a `dequeueTask(task.id)`.
  - `[x]` 3.2. Asegurar que el título de la tarea en la cola sea descriptivo (ej. "GENERATE: Mi Artículo").
  - `[x]` 3.3. **Nueva funcionalidad: Añadir a la cola**
    - `[x]` 3.3.1. Añadir botón "+ Nueva Tarea" en el encabezado del Sidebar.
    - `[x]` 3.3.2. Al clickear, mostrar un sub-panel o modal rápido.
    - `[x]` 3.3.3. Incluir un Select para elegir un documento de `useProjectStore.getState().tasks`.
    - `[x]` 3.3.4. Incluir un Select para elegir una Acción (`batch_research`, `batch_outline`, `batch_generate`, `batch_humanize`, `batch_translate`).
    - `[x]` 3.3.5. Al hacer submit, despachar la tarea usando `useQueueStore.enqueueTask`. El motor `useQueueProcessor` la tomará automáticamente.

### Notes for Execution
- La UI de "Añadir Tarea" en la consola puede ser minimalista, similar a un pequeño formulario inline o dialog de Radix, respetando la estética del "Sidebar Queue" de la consola.
- Se debe asegurar de manejar correctamente los estados visuales (ej. si una tarea del pre-encolado es cancelada, el total de `batchTotalTasks` de la barra de progreso general puede verse afectado, se recomienda actualizar `batchTotalTasks` disminuyéndolo o dejarlo igual y marcar el progreso).
