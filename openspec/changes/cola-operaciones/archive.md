## Archive: Cola de Operaciones (Nous Console)

### Summary of Completed Change
Se refactorizó exitosamente la arquitectura de encolado de tareas (`useQueueStore`) y ejecución (`pipelineExecutor`) para permitir visualización en tiempo real de toda la cola de operaciones, en lugar de mostrar únicamente la tarea en ejecución activa. 

Se logró esto implementando un pre-encolado en el `pipelineExecutor` con marcado seguro (`isPipelineMode: true`) que evita colisiones con el `useQueueProcessor.ts`. Además, se agregó una interfaz en `NousConsoleView.tsx` para permitir cancelar tareas encoladas individualmente, y se integró un formulario para sumar nuevos contenidos a la cola aprovechando el sistema desatendido de procesos masivos (`batch_*`).

### Key Decisions
- **Doble Orquestación**: Se decidió mantener el motor `pipelineExecutor` como el responsable de iterar sobre su memoria local (`memoryState`), pero obligándolo a declarar todas sus intenciones en `useQueueStore` antes de comenzar.
- **Filtro Anti-Misil en Processor**: Se decidió que el `useQueueProcessor.ts` ignore activamente cualquier tarea que declare pertenecer al pipeline manual, para evitar ejecuciones duplicadas de `QueueRegistry` vs `pipelineExecutor`.
- **Reutilización de Handlers Batch**: Para la función "Añadir a la cola", se optó por reutilizar los handlers `batch_generate`, `batch_humanize`, etc., que ya están diseñados para operar sin depender del estado UI de la aplicación (`useWriterStore`).

### Artifacts Updated
- `src/lib/client/pipelineExecutor.ts`
- `src/components/dashboard/useQueueProcessor.ts`
- `src/components/contents/NousConsoleView.tsx`

### Status
- **Status**: COMPLETED
- **Date**: 2026-07-08
- **Next Steps**: Ninguno requerido para este feature.
