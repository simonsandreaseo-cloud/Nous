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
Update: Fixed AI fallback routing to include 'técnica' to correctly trigger fallback models in case Google APIs return 500 or 403. Fixed Gemma CoT bleeding during keyword extraction by enforcing JSON mode. Updated deprecated models in outline-engine.ts.
Update 2: Set maxDuration=300 to scrapeMassiveAction to prevent Vercel Hobby 10s timeouts. Forced Gemini 3.1 Flash for technical JSON extractions as Gemma 4 sometimes hallucinates plain text instead of strict JSON.

## [2026-05-23] Solución a Errores de Compilación en Next.js (Turbopack) y Fuga de Node-only Libraries al Cliente

### Problema
El build de Next.js fallaba con errores debido a:
1. Errores de parseo de sintaxis de tipos genéricos en arrow functions (`aiActions.ts`) por conflicto con la sintaxis de JSX.
2. Error de sintaxis en `services.ts` por el escape innecesario de backticks en la función `generateBriefingText`.
3. Error de duplicidad en la declaración de `HTML_RULE_INTERNAL` en `aiActions.ts`.
4. Módulos Node-only (`child_process`, `fs`, `net`, `http2`, etc.) de `googleapis` y `google-auth-library` siendo empaquetados para el cliente porque `report-actions.ts` no tenía `"use server"` y porque `TranslatorView.tsx` (un componente de cliente) importaba `aiRouter` directamente.
5. Error de exportación ausente de `selectTopRelevantLinks` en `services.ts` necesario para `useWriterActions.ts`.

### Causa Raíz
- Turbopack interpretó los genéricos de las arrow functions `<T>` o incluso `<T extends unknown>` en archivos `.ts` como etiquetas JSX sin cerrar, requiriendo desambiguar declarándolas como `async function` regulares.
- Se removió `"use server"` de `report-actions.ts` por una supuesta compatibilidad con exportaciones estáticas, provocando que se importara en el bundle del browser junto con todas sus dependencias del lado del servidor.
- La vista de cliente `TranslatorView.tsx` usaba `aiRouter` directamente en lugar de delegar a una Server Action.
- Un refactor anterior borró la función `selectTopRelevantLinks` de `services.ts` por error.

### Solución
1. **Desambiguación de Genéricos:** Cambiado `<T>` a declaraciones de `async function` estándar en `executeWithKeyRotation` y `executeHumanizerWithRetry` en `aiActions.ts` para evitar la confusión de JSX.
2. **Corrección de Backticks:** Limpiado y removido escapes innecesarios de backticks en `generateBriefingText` (`services.ts`).
3. **Remoción de Duplicado:** Eliminada la segunda declaración de `HTML_RULE_INTERNAL` en `aiActions.ts`.
4. **Recuperación de use server:** Restaurada la directiva `"use server";` en `report-actions.ts`.
5. **Acción de Traducción:** Creada la Server Action `runTranslationAction` en `aiActions.ts` y refactorizada `TranslatorView.tsx` para consumirla, eliminando por completo la importación directa de `aiRouter` en el cliente.
6. **Restauración de selectTopRelevantLinks:** Re-agregada la función `selectTopRelevantLinks` a `services.ts` para que `useWriterActions.ts` compile.