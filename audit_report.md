# Informe de Auditoría Nous 2.0

## 1. Problemas de Extracción con Jina AI
**Problema detectado:** El sistema fallaba al obtener el contenido de los competidores mediante Jina AI.
**Análisis:** La función `fetchJinaExtraction` en el archivo `nous_2.0/src/lib/services/jina.ts` intentaba usar un endpoint proxy intermedio (`/api/tools/jina-reader`) resolviendo dinámicamente el `baseUrl` a través de `window.location.origin`. Sin embargo, durante procesos en el servidor (como la ejecución del BatchProcessor o acciones del servidor en Next.js), el objeto `window` no existe y `process.env.NEXT_PUBLIC_APP_URL` podía estar ausente o mal configurado, lo que generaba solicitudes HTTP a un dominio incorrecto (ej. `/api/tools/jina-reader` como URL absoluta).
**Solución:** Se reescribió `fetchJinaExtraction` para omitir el proxy y realizar directamente un `fetch` a `https://r.jina.ai/` mediante POST, pasando directamente los cabezales necesarios (`x-respond-with: markdown`, etc.) y el `apiKey`.

## 2. Código Obsoleto
Se detectaron algunas funciones que no están conectadas activamente a la UI del frontend:
*   **Líneas 227-230 en `nous_2.0/src/lib/services/report/geminiService.ts`**: La función `generateHTMLReport` se encuentra formalmente deprecada e incluso lanza un error al invocarse (`throw new Error("generateHTMLReport is deprecated. Use generateJSONReportState.");`).
*   **Archivos de prueba / scripts globales**: Archivos en la raíz como `audit.js`, `check_schema.mjs`, `audit_data.js`, y `test-rules.js` probablemente fueron usados para revisiones y configuraciones iniciales, pero no forman parte del flujo de datos de la web app en sí.

## 3. Flujo de Datos: Investigación -> Outlines -> Redactor
El flujo principal de datos para la generación masiva de contenido ocurre en `nous_2.0/src/lib/services/writer/batch-actions.ts`:
1.  **Investigación (Deep SEO):** Mediante `runDeepSEOAnalysis` (`seo-analyzer.ts`), se obtienen las 10 URLs principales de Serper y se ejecuta el scraping en paralelo de cada competidor (originalmente mediante Jina). El resultado es un resumen condensado en `baseResult`.
2.  **Outlines:** `BatchProcessor.processOutlines` toma los datos extraídos (ej. `task.research_dossier.brief`) y los envía a `generateOutlineStrategy`. Esta función crea la estructura de encabezados basándose en los competidores y palabras clave. El resultado se guarda en el campo `outline_structure` en Supabase.
3.  **Redacción:** `BatchProcessor.processDrafts` toma ese `outline_structure` (junto con el `research_dossier` original) y genera el prompt completo en `buildPrompt`, el cual es pasado a la IA generativa (`gemma-3-27b-it` por defecto). El texto se transmite y se guarda en la base de datos bajo el campo `content_body`.

## 4. Problemas en el Humanizador (Escasez de Contenido)
**Problema detectado:** El humanizador en ocasiones recorta dramáticamente el contenido o devuelve muy poco texto.
**Análisis:**
El archivo problemático es `nous_2.0/src/components/tools/writer/services.ts`, específicamente dentro de `runHumanizerPipeline` (Líneas 1096 en adelante).
1.  **Instrucción conflictiva en la Fase 1:** El prompt de la Fase 1 le exige a la IA "El texto humanizado DEBE tener la misma longitud que el original. PROHIBIDO ACORTAR." pero más abajo dice: **"SÉ AGRESIVO al reescribir. Abandona la estructura de la oración original."**. Esta segunda instrucción empuja a modelos como Gemma/Gemini a desechar texto "redundante", lo cual entra en conflicto con la orden de no acortar y a menudo el modelo prioriza el abandono de oraciones (acortándolo masivamente).
2.  **Problema de ventana de contexto / Tarea Combinada en la Fase 2:** Tras procesar el texto en bloques pequeños (Phase 1), la Fase 2 toma *todo* el documento y lo envía entero en un solo prompt para realizar tareas de SEO (Líneas 1160-1190: `El siguiente bloque HTML es el documento COMPLETO... Tu trabajo es realizar DOS tareas en UNA SOLA PASADA`).
    *   Exigir a un LLM (especialmente en modelos _flash_ o _lite_) que reciba 1500+ palabras y "revise" y "agregue SEO" sin resumir es riesgoso. Al darle instrucciones como "TAREA REVISIÓN", muchos LLMs tienden a condensar el documento masivo y generar una versión corta a modo de "resumen revisado" en lugar de iterar palabra por palabra y devolver el documento íntegro.
    *   **Sugerencia conceptual:** La inserción de _LSI_ y _enlaces_ sería mucho más confiable si se inyectaran estáticamente mediante Regex / AST del DOM en el cliente/servidor, o si la Fase 2 se dividiera de nuevo en bloques (chunking). Evitar pasarle todo el documento gigante a la IA para "revisión final" solucionaría el acortamiento.
