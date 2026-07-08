## Specs: Cola de Operaciones (Nous Console)

### 1. Requirements

#### 1.1 Core Requirements
- `REQ-001`: La interfaz de la consola debe mostrar la lista completa de operaciones (tareas) pendientes en la cola.
- `REQ-002`: Cada tarea en la cola debe mostrar a qué contenido pertenece (target).
- `REQ-003`: El usuario debe poder eliminar una tarea de la cola (cancelar su ejecución) antes de que empiece a procesarse.
- `REQ-004`: El usuario debe poder encolar una nueva operación de forma manual seleccionando un documento y una acción desde la vista de la consola.

#### 1.2 Constraint Requirements
- `CON-001`: La ejecución local actual del `pipelineExecutor.ts` debe mantenerse para no romper el flujo del *Doble Blindaje* ni la memoria en tiempo de ejecución.
- `CON-002`: Las operaciones inyectadas manualmente desde la consola deben ser procesadas en segundo plano por `useQueueProcessor.ts` sin necesidad de tener abierta la ventana de `NousPipelineModal`.

### 2. Architecture & Design

#### 2.1 Pre-Encolado en `pipelineExecutor.ts`
El flujo secuencial se divide en dos fases lógicas:
1. **Fase de Planificación (Encolado)**: 
   - Se crea un array `plannedQueue` local. 
   - Se itera sobre todos los bloques y todas las tareas (`memoryState`).
   - Por cada operación aplicable, se llama a `queueStore.enqueueTask(actionType, title, { isPipelineMode: true }, { taskId, projectId })`.
   - El ID retornado se guarda en el array local `plannedQueue`.
2. **Fase de Ejecución**:
   - Se itera secuencialmente (según la estrategia `by-content` o en olas).
   - Antes de procesar una tarea pre-planeada `id_x`:
     - Se verifica: `const stillExists = queueStore.getState().queue.some(t => t.id === id_x)`.
     - Si `!stillExists`, se omite (ejecución cancelada por el usuario).
     - Si existe, se actualiza a `processing` y se lanza el executor correspondiente de la lógica actual.

#### 2.2 Ignorar en `useQueueProcessor.ts`
- Se modificará el filtro actual en el `useEffect` para descartar tareas de pipeline:
```typescript
const nextTask = queue.find(t => t.status === 'pending' && !t.payload?.isPipelineMode);
```

#### 2.3 Componente Sidebar en `NousConsoleView.tsx`
- **Renderizado de la Cola**: Modificar la iteración sobre `queue` para mostrar el título real del contenido (`task.title` o leyendo desde el store del proyecto si aplica).
- **Botón Eliminar**: Agregar un ícono de papelera en cada tarea que tenga `status === 'pending'`. El `onClick` debe invocar `queueStore.dequeueTask(task.id)`.
- **Formulario Añadir a la Cola**:
  - Incorporar un UI (dropdown o modal pequeño) accesible desde el header del sidebar de la cola.
  - Campos requeridos:
    - `Target Task` (Seleccionable desde los documentos del proyecto activo).
    - `Acción` (Research, Outline, Generate, Humanize).
  - Al enviar:
    - Llama a `useQueueStore.enqueueTask('batch_' + action, 'Manual: ' + action, { targetTask: selectedTask, activeProject: currentProject, projectId: currentProject.id }, { taskId: selectedTask.id, projectId: currentProject.id })`.

### 3. Verification Scenarios
- `ESC-001`: Iniciar un pipeline batch con 3 documentos y 2 acciones. La consola debe mostrar inmediatamente 6 tareas en "Cola".
- `ESC-002`: Mientras las 6 tareas están encoladas, el usuario elimina la tarea 5. Al finalizar las primeras 4, el motor debe saltar a la tarea 6 sin arrojar error.
- `ESC-003`: El usuario agrega "Humanizar" para el documento A desde la consola manualmente. La tarea entra a la cola, el `useQueueProcessor.ts` la detecta, usa `QueueRegistry` para `batch_humanize` y completa el trabajo en segundo plano exitosamente.
