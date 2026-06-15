# Tareas (Tasks): Sincronización Planner-Studio

- [x] **1. Ajustar `initializeFromTask` en `persistence-slice.ts`**
  - Chequear explícitamente si `task.content_body === undefined`.
  - Si es undefined, establecer `content: null` en lugar de `''`.
  - Importar dinámicamente o acceder al `useProjectStore` para disparar una rehidratación asíncrona mediante `fetchTaskContent(task.id)` si `content_body` es undefined. Cuando esta se resuelva, llamar a `set({ content: fetchedBody || '' })`.

- [x] **2. Modificar UI de `StrategyGrid.tsx`**
  - Cambiar el título del botón "Abrir Redactor" para que valide si `task.word_count_real > 0` como prueba de existencia de contenido.
  - Modificar las clases de estilo / colores / textos en la tabla (aprox líneas 1387 y cercanas) para que el estado de "Redactando" no se vuelva falso negativo si `task.content_body` está vacío pero hay `word_count_real > 0`.

- [x] **3. Ajustar `WriterStudio.tsx`**
  - Modificar el `useEffect` (línea ~281) que hace el lazy loading.
  - Como el `initializeFromTask` ahora dejará `content` en `null` (en vez de `''`), el `currentStoreContent` saltará con éxito (`!currentStoreContent`). 
  - Si implementamos la carga directamente en el store, podríamos simplificar este `useEffect` para evitar dobles peticiones.

- [ ] **4. Pruebas y Verificación**
  - Verificar que el Planner muestre correctamente los contadores y colores.
  - Navegar desde Planner -> Studio con la misma tarea. Verificar que carga completo.
  - Navegar de vuelta al Planner. Volver a abrir la misma tarea. Verificar que no se queda en blanco.
