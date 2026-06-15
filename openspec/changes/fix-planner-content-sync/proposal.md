# Propuesta de Arquitectura: Corrección de Sincronización Planner-Studio

## 1. Intención
Resolver el falso negativo del Planner que clasifica los documentos en progreso como vacíos, y evitar la destrucción accidental del contenido (race condition) al transicionar de la vista liviana (Planner) a la vista pesada (Studio). Todo ello manteniendo la eficiencia actual del payload de red (sin cargar `content_body` masivamente en el planner).

## 2. Enfoque Técnico
### A. Refactorización del indicador visual en `StrategyGrid.tsx`
Actualmente, el botón para acceder al redactor depende de:
`task.content_body?.trim()`
Como `content_body` siempre es omitido por `fetchProjectTasks` (gracias a `LIGHT_TASK_COLUMNS`), siempre da falso.
**Cambio propuesto:** Confiar en la métrica real que **sí** viene en `LIGHT_TASK_COLUMNS`: el `word_count_real`.
Si `task.word_count_real > 0`, significa que hay contenido.

### B. Protección del ciclo de vida en `initializeFromTask` (`persistence-slice.ts`)
Actualmente hace:
`content: task.content_body || ''`
**Cambio propuesto:** En TypeScript, cuando un objeto de base de datos omite explícitamente una propiedad en el `select`, el valor llega como `undefined`. Si un artículo en verdad está vacío, `content_body` podría venir como `null` o `''`.
Haremos un chequeo riguroso:
```javascript
let newContent = state.content;
// Si task.content_body viene explícitamente definido (string o null), lo seteamos.
// Si es undefined, significa que el fetch no lo pidió, entonces no sobreescribimos el store global.
if (task.content_body !== undefined) {
    newContent = task.content_body || '';
} else {
    // Forzar a nulo o mantener estado anterior, para que WriterStudio sepa que DEBE hacer fetch.
    newContent = null; 
}
```

### C. Refuerzo de la carga diferida (Lazy Load) en `WriterStudio.tsx`
Actualmente el `useEffect` confía ciegamente en `draftId` y en `currentStoreContent.length < 10`.
**Cambio propuesto:** Si modificamos `initializeFromTask` para que ponga `content` en `null` cuando provenga de un fetch liviano, el `WriterStudio` sabrá fehacientemente que necesita ir a buscar a Supabase (`task_contents`). Además, para evitar que el `useEffect` no se ejecute si el `draftId` no cambia (cuando se vuelve a abrir la misma tarea), añadiremos un booleano al store llamado `needsContentFetch` o forzaremos el fetch explícitamente dentro de `initializeFromTask` mediante una acción asíncrona.

## 3. Impacto y Riesgos
- **Impacto Positivo:** El Planner reflejará correctamente el estado del documento mediante el conteo de palabras reales, y abrir artículos desde el Planner nunca más pisará la data local guardada en base de datos. No se afecta el rendimiento porque no agregamos bytes extras a la petición original.
- **Riesgos:** La única pequeña posibilidad es que un documento que *genuinamente* tiene cero palabras y fue recién creado sin contenido lance fetch innecesarios cada vez que entras. El costo es mínimo y seguro.

## 4. Próximos pasos
Pasar a la fase de **Specs** (Especificaciones) y **Design** (Diseño Técnico).
