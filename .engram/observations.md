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

## [2026-05-26] Configuración de Variables de Entorno en Vercel para la Migración de Supabase y Google Cloud

### Problema
Se realizó una migración de la base de datos Supabase y de la cuenta de Google Cloud, por lo que las credenciales locales de `.env.local` cambiaron, y se necesitaba sincronizar y configurar Vercel (`nous_2.0`) de forma inmediata.

### Solución
1. Verificación local de las nuevas credenciales de Supabase (`wswylghsczgusgagucbd`) y Google Cloud en `.env.local`.
2. Lanzamiento del sub-agente de automatización de navegador (`browser`) para realizar el login automático y la carga de secretos en Vercel de forma headless.
3. Actualización exitosa en el panel de variables de entorno de Vercel de:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
4. Disparo de un **Redeploy** en Vercel para aplicar los cambios de inmediato.

### Descubrimiento
El puerto de control de DevTools `9222` de Chrome en Windows bloquea llamadas locales directas por políticas de seguridad (404), pero delegar al sub-agente de navegador asíncrono `/browser` resolvió de manera robusta el bypass del login e interacción.

## [2026-05-26] Configuración de Google Cloud OAuth y Proveedor en Supabase para `nous-produccion`

### Problema
La nueva cuenta de Google Cloud para el proyecto `nous-produccion` estaba vacía (recién creada) y no tenía habilitadas las APIs correspondientes ni configurada la pantalla de consentimiento de OAuth, lo que impedía que el login de Google funcionara y rompía las integraciones de Search Console en Supabase y la app.

### Solución
1. Delegación al sub-agente de navegador asíncrono `/browser` para automatizar la configuración en consola de Google Cloud.
2. Habilitación de las APIs críticas:
   - Google Search Console API (Webmasters API)
   - Google Sheets, Drive, Docs, y Slides APIs
   - Google Analytics & Analytics Data APIs
3. Configuración de la **OAuth Consent Screen** (Externo, app `Nous 2.0`, soporte a `simonsarseo@gmail.com`).
4. Inclusión de scopes requeridos y adición de `simonsarseo@gmail.com` como Test User.
5. Creación de credenciales **OAuth 2.0 Web Client** (`Nous 2.0 Client`) con Orígenes de JS autorizados y Redirect URIs:
   - `http://localhost:3000/api/auth/gsc/callback`
   - `https://wswylghsczgusgagucbd.supabase.co/auth/v1/callback` (Redirección para el Auth de Supabase)
   - `https://nous-production.vercel.app/api/auth/gsc/callback`
6. Obtención de credenciales de producción:
   - ID de Cliente: `[REDACTED]`
   - Secreto de Cliente: `[REDACTED]`
7. Sincronización automática de estas credenciales en:
   - Panel de variables de entorno del proyecto `nous-production` en Vercel.
   - Proveedor de autenticación Google en el Dashboard de Supabase (`wswylghsczgusgagucbd`).
   - Archivo local `.env.local` de desarrollo.
8. Lanzamiento de un **Redeploy** global en Vercel para asegurar la propagación.

## [2026-05-26] Resolución de Redirección Incorrecta a Localhost en Producción

### Problema
Al intentar iniciar sesión en el sitio online en Vercel (`https://nous-production.vercel.app`), el flujo de autenticación de Supabase redirigía incorrectamente al usuario a `http://localhost:3000`, interrumpiendo el acceso en producción.

### Causa Raíz
En el panel de configuración de autenticación de Supabase (`Auth > URL Configuration`), el parámetro **Site URL** (URL del sitio principal) seguía configurado con el valor por defecto de desarrollo (`http://localhost:3000`), y no se encontraban declaradas las URLs adicionales autorizadas de redirección para el dominio de producción ni el callback de desarrollo.

### Solución
1. Delegación al sub-agente de navegador asíncrono `/browser` para acceder a la configuración de autenticación en Supabase (`wswylghsczgusgagucbd`).
2. Actualización en Supabase de:
   - **Site URL**: Cambiado de `http://localhost:3000` a `https://nous-production.vercel.app` (URL de producción).
   - **Redirect URLs adicionales**: Se agregaron `http://localhost:3000/**` y `http://localhost:3000/api/auth/gsc/callback` para habilitar el testing local sin interferir con producción.
3. Verificación de `NEXT_PUBLIC_URL` en Vercel (ya configurada a `https://nous-production.vercel.app`).
4. Verificación de las URIs de redirección en Google Cloud Console para asegurar concordancia total.
5. El flujo de autenticación ahora funciona perfectamente y redirige de manera dinámica tanto en producción como en local.

## [2026-06-05] Fixed UI hang in Tiptap editor during LLM stream
**Type**: bugfix
**Topic Key**: project/streaming-performance

### What
Throttled `store.setContent` to update at most every 300ms during streaming in `useWriterActions.ts`.

### Why
Receiving small chunks every few milliseconds and updating Tiptap via `editor.commands.setContent` triggered complete DOM reparses of the full text each time, creating a 100% CPU lock that crashed the browser tab.

### Where
`src/components/contents/writer/useWriterActions.ts` (handleGenerate and handleHumanize)

### Learned
Never feed raw streaming chunks synchronously to heavy rich-text editors (like Tiptap/ProseMirror) at high frequency. Always debounce or throttle the state update to ~300ms so the DOM only reconstructs a few times per second.

## [2026-06-11] Solución a Errores Silenciosos en Acciones Masivas y Progreso Incorrecto en StrategyGrid

### Problema
Las acciones masivas (ej: redacción masiva, humanización masiva) se completaban de manera casi instantánea y mostraban un progreso de "100%" en el panel del planificador, pero el contenido de las tareas permanecía vacío en la base de datos.

### Causa Raíz
1. **Error en base de datos:** El pipeline intentaba hacer upsert en la tabla `task_contents` incluyendo la columna `updated_at`, la cual no existe en el esquema físico actual de la tabla, provocando una excepción de Supabase (PGRST204).
2. **Defecto de Estado Estructural:** En `EditorialCalendar.tsx`, el bucle de las acciones masivas y los handlers de acciones individuales capturaban cualquier error de las tareas, pero la actualización del estado de progreso de cada tarea (`batchResearchStatus[task.id] = 100`) se ejecutaba incondicionalmente en bloques `finally` o después del bloque `catch`. Esto provocaba que cualquier fallo se pintase visualmente en la interfaz como un éxito al 100% (ocultando el error y la falta de contenido real).

### Solución
1. **Limpieza del Upsert:** Removido el campo `updated_at` en el upsert de `task_contents` dentro de `src/lib/services/writer/pipeline.ts`.
2. **Control de Errores de Estado:** Refactorizado `EditorialCalendar.tsx` para que asigne un valor de `-1` (Error) en `batchResearchStatus` si ocurre un fallo en los pipelines de redacción o humanización, y se eliminaron las asignaciones incondicionales a `100` en los flujos excepcionales.
3. **Indicador Visual de Error:** Modificado `StrategyGrid.tsx` para interceptar el progreso `-1` (Error), renderizar un indicador de advertencia ("Acción fallida") con color rojo, y resaltar la fila de la tabla afectada.
## Fixed Duplicate Detection in Tasks (Planner)

- **Date:** 2026-06-13
- **What:** Added duplicate detection during task creation (manual and CSV). Exact matches are blocked, and 70-99% matches are warned.
- **Why:** To prevent overlapping topics and content cannibalization.
- **How:** Used a local S�rensen-Dice coefficient algorithm (src/utils/similarity.ts) instead of semantic embeddings to keep it fast and token-free.
- **Files changed:** SmartUploaderModal.tsx, task-slice.ts, similarity.ts
