# Diseño (Design): Sincronización Planner-Studio

## 1. Archivos a modificar
- `src/store/writer/persistence-slice.ts`
- `src/components/dashboard/StrategyGrid.tsx`
- `src/components/contents/writer/WriterStudio.tsx`

## 2. Decisiones Técnicas por Archivo

### A. `persistence-slice.ts` (Estado Global de Inicialización)
- **Modificación:** En `initializeFromTask`, donde se hace `content: task.content_body || ''`, vamos a hacer un chequeo de tipo estricto.
- **Implementación:**
  ```typescript
  // Si content_body viene explícito (string, null o vacío) pero NO undefined.
  // Undefined indica que el payload del fetch lo ignoró por eficiencia (Planner).
  const hasContentBody = task.content_body !== undefined;
  
  return {
      // ... metadata
      // Si vino undefined, mantenemos el estado local en nulo para forzar carga, o lo respetamos.
      content: hasContentBody ? (task.content_body || '') : null,
  }
  ```
  Esto permite diferenciar un "texto vacío real" (`''`) de "texto no cargado en memoria" (`null`).

### B. `StrategyGrid.tsx` (Lógica UI del Planner)
- **Modificación:** Reemplazar las dependencias visuales que miran a `content_body` para mirar a `word_count_real`.
- **Implementación:**
  En las líneas donde se renderiza el estado "Redactando" (aprox línea 1387):
  Cambiar `(!task.content_body || task.content_body.trim() === '')`
  por `(!task.content_body && (task.word_count_real === undefined || task.word_count_real === null || task.word_count_real === 0))`
  
  En el botón de "Abrir Redactor" (línea ~1057):
  ```typescript
  const hasContent = task.content_body?.trim() || (task.word_count_real && task.word_count_real > 0);
  title={hasContent ? "Abrir Redactor (Con Contenido)" : "Abrir Redactor (Vacío)"}
  ```

### C. `WriterStudio.tsx` (Orquestación de Carga)
- **Modificación:** Reforzar el `useEffect` de carga de datos pesados (aprox línea 280) para que no dependa solo de que cambie el `draftId`.
- **Implementación:**
  El `useEffect` actual verifica `!currentStoreContent || currentStoreContent.length < 10`.
  Al poner el estado en `null` (en `initializeFromTask`), la evaluación `!currentStoreContent` saltará con éxito.
  Para que React dispare el fetch incluso si el `draftId` no cambia (transición Planner -> Studio -> Planner -> Studio sobre la misma tarea), añadiremos el valor `currentStoreContent` a un check referencial rápido (aunque sea sacado de zustand), o alternativamente forzaremos el trigger mediante un flag de `needsContentFetch`.
  Para simplicidad extrema: Si `initializeFromTask` pone `content` a `null`, el `useEffect` en `WriterStudio` debe suscribirse a los cambios de `content` si es `null`.
  Mejor aún: En el `initializeFromTask`, podemos simplemente llamar a `fetchTaskContent(task.id)` asíncronamente y setear el resultado, de forma que el store gestiona su propia rehidratación sin depender del ciclo de vida del componente visual de Studio.

## 3. Rediseño del flujo (Data Flow)
1. Planner clickea `Abrir Documento`.
2. `StrategyGrid` llama a `initializeFromTask`.
3. `initializeFromTask` actualiza el store. Al notar que `task.content_body === undefined`, dispara internamente la llamada asíncrona a `fetchTaskContent(task.id)` a través del `projectStore` y, cuando responde, setea el `content`.
4. El UI navega a `/contents/writer`.
5. El Studio carga y el contenido aparece casi de inmediato o muestra `Generando/Cargando` si demora la red. TipTap nunca recibe `''` falso.
