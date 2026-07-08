## Proposal: Cola de Operaciones (Nous Console)

### Intent
Refactorizar el sistema de ejecución de tareas y la interfaz de la consola para permitir pre-visualizar la cola completa de operaciones (`pipelineExecutor`), cancelar tareas individualmente de forma efectiva, y añadir nuevas tareas a la cola directamente desde la vista de consola.

### Scope
- `src/lib/client/pipelineExecutor.ts`: Refactorización de la lógica del bucle `executePipeline`.
- `src/components/contents/NousConsoleView.tsx`: Mejoras de UI en el panel lateral de la cola, y nuevo formulario/botón "Añadir a la cola".
- `src/components/dashboard/useQueueProcessor.ts`: Ignorar tareas manejadas localmente por el `pipelineExecutor`.

### Approach

#### 1. Pre-Encolado en `pipelineExecutor.ts`
En vez de crear una tarea visual en el store y procesarla sincrónicamente, el `executePipeline` hará lo siguiente:
- Iterar sobre todos los bloques y contenidos, y ejecutar `queueStore.enqueueTask` para todas las operaciones planeadas. Las tareas se encolarán con estado `pending` y un payload especial `{ isPipelineMode: true }`.
- Luego, en la fase de ejecución, iterará sobre estas tareas pre-encoladas en el orden correcto.
- Antes de procesar cada tarea, verificará si la tarea sigue existiendo en el array `queue` del store. Si el usuario la eliminó desde la consola, el executor la ignorará y pasará a la siguiente.

#### 2. Modificación de `useQueueProcessor.ts`
- El procesador global en segundo plano debe ignorar las tareas que pertenecen al ciclo local del `pipelineExecutor`. Se modificará el filtro para saltar las tareas: `t => t.status === 'pending' && !t.payload?.isPipelineMode`.

#### 3. Mejoras Visuales y Funcionales en `NousConsoleView.tsx`
- **Visualización**: El sidebar de la cola mostrará el título del contenido o el nombre de la tarea claramente, e incluirá un botón (ícono de papelera) para "Quitar de la cola" (`dequeueTask`).
- **Añadir a la cola**: Se agregará un botón "Añadir Tarea". Esto abrirá un pequeño panel/popover donde se podrá:
  1. Seleccionar un Documento (contenido del proyecto activo).
  2. Seleccionar la Acción (Ej: Redactar, Humanizar, Investigar).
  - Al enviar, despachará la tarea usando el prefijo `batch_` (ej. `batch_generate`, `batch_humanize`) con la información en el payload para que el `useQueueProcessor` la maneje de forma totalmente en segundo plano sin depender del modal activo.

### Risks
- **Desincronización de Memoria**: Si `pipelineExecutor` corre en `strategy === 'by-type'`, saltarse una tarea de generación puede provocar que la siguiente (ej. humanización del mismo archivo) falle si no tiene contenido. Se espera que los fallos internos se manejen devolviendo un `Error` gracefully.
- **Rendimiento UI**: Si el usuario mete un batch gigantesco (ej. 100 artículos, 4 procesos cada uno = 400 elementos en cola), la actualización de Zustand podría causar re-renders en `NousConsoleView`. Zustand lo maneja bastante bien por defecto.
