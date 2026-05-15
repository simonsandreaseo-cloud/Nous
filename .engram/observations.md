# Engram Observations - Nous 2.0

## [2026-05-14] Solución a Verbosidad en Humanizador (Gemma-4)

### Problema
El modelo `gemma-4-31b-it` (vía Google AI Studio) presentaba *prompt leakage* y prefacios analíticos (ej: `* Input: ... * Task: ...`) al procesar bloques de HTML en el humanizador. Además, el uso de `systemInstruction` causaba errores 500 en la API de Google.

### Causa Raíz
Los modelos de la familia Gemma tienden a realizar un Chain of Thought (CoT) conversacional si el mensaje del usuario es solo texto plano. La falta de delimitadores y disparadores de salida permitía que el modelo "divagara" antes de entregar el resultado.

### Solución (Plan A - Blindaje Estructural)
Se aplicaron tres capas de defensa en `src/components/tools/writer/services.ts`:
1. **Unificación de Instrucciones:** Se movieron las reglas del sistema al cuerpo del mensaje del usuario para máxima compatibilidad.
2. **Delimitadores Fuertes:** El input HTML se envuelve en `<<<HTML_INPUT>>>`.
3. **Disparador de Salida (Output Forcing):** Se añadió la frase `SALIDA HTML DIRECTA (iniciando exactamente con la primera etiqueta...):` al final del prompt.
4. **Defensa de Poda:** Se añadió un post-procesamiento por código para extraer estrictamente el contenido entre el primer `<` y el último `>`.

### Resultado
Eliminación total de prefacios y verbosidad. El modelo ahora responde directamente con el código HTML procesado.

## [2026-05-15] Refactor de Modelos AI y Arquitectura de Tareas

### Problema
- El sistema lanzaba errores 404 de Google API por intentar acceder a `gemma-3-4b-it` (obsoleto).
- El frontend fallaba al notificar el error debido a un `TypeError: NotificationService.warn is not a function`.
- Las llamadas a Supabase lanzaban error 400 por no encontrar la columna `research_dossier` en la tabla `tasks`.

### Descubrimiento (Root Cause)
1. **Modelos:** La API de Google requiere ahora `gemma-4-31b-it`. La serie 3 fue discontinuada o no publicada con esos IDs en v1beta.
2. **Arquitectura:** El sistema migró a una arquitectura 1:1 distribuida para aligerar la tabla `tasks`. La data pesada ahora reside en `task_research`. Sin embargo, `ResearchOrchestrator` (`src/lib/services/writer/research/index.ts`) no se actualizó y seguía intentando escribir/leer `research_dossier` directamente en `tasks`.

### Solución
1. **AI Config:** Se reemplazaron todas las referencias de `gemma-3-*` por `gemma-4-31b-it` en `src/lib/ai/config.ts`.
2. **Notification Alias:** Se agregó `warn()` como un alias directo de `warning()` en `NotificationService` para prevenir crashes silenciosos o errores visuales tontos.
3. **Database Fix:** Se re-escribieron las queries en `ResearchOrchestrator` para apuntar de `tasks` a `task_research` utilizando `upsert` y proveyendo el ID correspondiente, alineando por fin el backend de IA con el frontend.
