commit 46beda663c979a3c469ed3b0d88008078c020453
Author: SimonSan <simonsandrea.seo@gmail.com>
Date:   Sat Jul 4 12:38:32 2026 -0400

    refactor(aiActions): migrate runHumanizerPipeline from JSON dictionary to plain HTML text parsing to improve LLM generation quality and prevent JSON parse errors

diff --git a/src/lib/actions/aiActions.ts b/src/lib/actions/aiActions.ts
index e799bd0..9d4d0f2 100644
--- a/src/lib/actions/aiActions.ts
+++ b/src/lib/actions/aiActions.ts
@@ -553,90 +553,48 @@ export const runHumanizerPipeline = async (
     safeStatus(`Iniciando humanización estructural con Cheerio y modelo ${modelName}...`);
     const start = Date.now();
     
-    const $ = cheerio.load(html, { decodeEntities: false }, false);
-    const textBlocks: Record<string, string> = {};
-    let counter = 0;
-
-    const blockSelectors = 'p, li, td, th';
-    $(blockSelectors).each((_, el) => {
-        if ($(el).children(blockSelectors).length === 0) {
-            const innerHtml = $(el).html()?.trim();
-            if (innerHtml && innerHtml.replace(/<[^>]*>/g, '').trim().length > 5) {
-                const id = `block_${counter++}`;
-                textBlocks[id] = innerHtml;
-                $(el).attr('data-humanize-id', id);
-            }
-        }
-    });
-
-    const numBlocks = Object.keys(textBlocks).length;
-    if (numBlocks === 0) {
-        safeStatus(`No se encontraron bloques de texto válidos. Devolviendo original.`);
-        if (onChunk) onChunk(html);
-        return { html: cleanAndFormatHtml(html) };
-    }
-
-    safeStatus(`Se extrajeron ${numBlocks} bloques. Enviando al modelo...`);
-
     try {
-        const processedBlocks = await executeHumanizerWithRetry(async (ai) => {
-            const systemInstructionStr = `${ANTI_LEAKAGE_SYSTEM_BASE}\n--- PERSONA: REDACTOR MEDIOCRE ---\nActúa como un redactor humano promedio. Tu estilo es simple, directo, a veces un poco torpe, pero nunca robótico. Priorizas la simplicidad sobre la elegancia.\n\n--- CONTEXTO ---\nNicho/Tópico: ${config.niche || 'N/A'}\nPúblico Objetivo: ${config.audience || 'N/A'}\nNotas Adicionales: ${config.notes || 'N/A'}\n\n--- REGLAS DE HUMANIZACIÓN (APLICAR AGRESIVAMENTE) ---\n1.  ESTILO "REDACTOR MEDIOCRE": Sé simple, directo y no condescendiente. Usa vocabulario común. Evita la elegancia literaria.\n2.  COHERENCIA ROTA: Rompe la coherencia lineal perfecta. Permite 2-3 ideas o saltos conceptuales pequeños dentro de un mismo párrafo.\n3.  CONECTORES PROHIBIDOS: Prohíbe el uso de conectores formales y clichés de IA: "Sin embargo," "Por lo tanto," "Por otro lado," "A pesar de esto," "En resumen," "En conclusión," etc.\n4.  MORFOSINTAXIS (EXPLOSIVIDAD):\n    * Usa oraciones predominantemente cortas (Sujeto-Verbo-Predicado).\n    * CRÍTICO: Mezcla estas frases cortas con algunas oraciones largas (simples o complejas) con baja frecuencia. La longitud de las frases debe ser variable e impredecible.\n5.  IDIOMA: Usa español neutro panhispánico.\n6.  PROHIBICIÓN DE VOZ PASIVA: Reescribe cualquier frase en voz pasiva a voz activa.\n7.  PUNTUACIÓN (IMPORTANTE): Prefiere el uso de comas (,) para enlazar ideas cortas y relacionadas dentro de una misma oración, en lugar de separarlas con un punto y seguido. El objetivo es evitar un estilo excesivamente 'entrecortado' o telegráfico. Modera la 'explosividad' para que sea más fluida.\n8.  PROHIBICIÓN ESTRICTA: NO generes razonamientos, cálculos, conteos, ni pasos previos. Genera DIRECTAMENTE y ÚNICAMENTE el objeto JSON final sin usar markdown de bloques de código.\n\nREGLA CRÍTICA DE ESTRUCTURA (JSON DICTIONARY):\nTe entregaré un objeto JSON donde cada clave es un ID (ej. "block_1") y cada valor es un fragmento HTML.\nMANTÉN INTACTAS las etiquetas HTML que estén dentro de los fragmentos (ej. <strong>, <a>, <span>).\nDEBES devolver UNICAMENTE un objeto JSON con la misma estructura exacta, donde las claves son los mismos IDs y los valores son los fragmentos humanizados.`;
+        const processedHtml = await executeHumanizerWithRetry(async (ai) => {
+            const systemInstructionStr = `${ANTI_LEAKAGE_SYSTEM_BASE}\n--- PERSONA: REDACTOR MEDIOCRE ---\nActúa como un redactor humano promedio, no como una IA. Tu estilo es simple, directo, a veces un poco torpe, pero nunca robótico. Priorizas la simplicidad sobre la elegancia.\n\n--- CONTEXTO ---\nNicho/Tópico: ${config.niche || 'N/A'}\nPúblico Objetivo: ${config.audience || 'N/A'}\nNotas Adicionales: ${config.notes || 'N/A'}\n\n--- REGLAS DE HUMANIZACIÓN (APLICAR AGRESIVAMENTE) ---\n1.  ESTILO "REDACTOR MEDIOCRE": Sé simple, directo y no condescendiente. Usa vocabulario común. Evita la elegancia literaria.\n2.  COHERENCIA ROTA: Rompe la coherencia lineal perfecta que usa la IA. Permite 2-3 ideas o saltos conceptuales pequeños dentro de un mismo párrafo.\n3.  CONECTORES PROHIBIDOS: Prohíbe el uso de conectores formales y clichés de IA: "Sin embargo," "Por lo tanto," "Por otro lado," "A pesar de esto," "En resumen," "En conclusión," etc.\n4.  MORFOSINTAXIS (EXPLOSIVIDAD):\n    * Usa oraciones predominantemente cortas (Sujeto-Verbo-Predicado).\n    * CRÍTICO: Mezcla estas frases cortas con algunas oraciones largas (simples o complejas) con baja frecuencia. La longitud de las frases debe ser variable e impredecible.\n5.  IDIOMA: Usa español neutro panhispánico.\n6.  PROHIBICIÓN DE VOZ PASIVA: Reescribe cualquier frase en voz pasiva a voz activa.\n7.  PUNTUACIÓN (IMPORTANTE): Prefiere el uso de comas (,) para enlazar ideas cortas y relacionadas dentro de una misma oración, en lugar de separarlas con un punto y seguido. El objetivo es evitar un estilo excesivamente 'entrecortado' o telegráfico. Modera la 'explosividad' para que sea más fluida.\n\nREGLA CRÍTICA DE ESTRUCTURA: NO MODIFIQUES, elimines o alteres las etiquetas HTML principales. Tu trabajo es reescribir ÚNICAMENTE el texto que está DENTRO de las etiquetas. No devuelvas explicaciones ni markdown de código, SOLO el HTML humanizado.`;
 
             const model = ai.getGenerativeModel({ 
                 model: modelName, 
                 systemInstruction: systemInstructionStr,
-                generationConfig: {
-                    responseMimeType: 'application/json'
-                }
+                // Eliminamos responseMimeType: 'application/json' para que devuelva texto puro
             });
             
             const languageInstruction = config.language ? `\nIdioma OBLIGATORIO: ${config.language === 'en' ? 'Inglés' : config.language === 'es' ? 'Español (Neutro)' : config.language}.` : '';
             
-            const prompt = `JSON DE ENTRADA CON BLOQUES:\n${JSON.stringify(textBlocks)}\n\n${languageInstruction}\nDEVUELVE SOLO EL JSON DE SALIDA. RESPETA ESTRICTAMENTE LA ESTRUCTURA.`;
+            const prompt = `BLOQUE HTML A HUMANIZAR:\n${html}\n\n${languageInstruction}\nAPLICA LAS REGLAS DENTRO DE LAS ETIQUETAS Y DEVUELVE SOLO EL HTML.`;
             
             const response = await model.generateContent(prompt);
-            const raw = response.response.text();
-            
-            let cleaned = raw;
-            cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
+            let raw = response.response.text();
             
-            const jsonStart = cleaned.indexOf('{');
-            const jsonEnd = cleaned.lastIndexOf('}');
+            // Limpieza de markdown por si el modelo envuelve la respuesta
+            raw = raw.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
             
-            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
-                cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
+            if (!raw) {
+                throw new Error("El modelo devolvió una respuesta vacía.");
             }
             
-            try {
-                return JSON.parse(cleaned);
-            } catch (e) {
-                console.error("[Humanizer-Parser] Fallo catastrófico al parsear JSON. Raw preview:", cleaned.substring(0, 100) + "...");
-                throw e;
-            }
-        }, safeStatus, `Humanización de ${numBlocks} bloques`, modelName);
+            return raw;
+        }, safeStatus, `Humanización de chunk de texto`, modelName);
         
-        safeStatus(`Reconstruyendo el HTML...`);
-        for (const [id, humanizedText] of Object.entries(processedBlocks as Record<string, string>)) {
-            const el = $(`[data-humanize-id="${id}"]`);
-            if (el.length > 0 && typeof humanizedText === 'string') {
-                el.html(humanizedText);
-            }
-        }
+        safeStatus(`Chunk humanizado correctamente.`);
+        
+        const finalHtml = processedHtml as string;
+        
+        if (onChunk) onChunk(finalHtml);
+        
+        const duration = (Date.now() - start) / 1000;
+        console.log(`[Humanizer-Perf] Completado en ${duration}s`);
+        
+        return { html: cleanAndFormatHtml(finalHtml) };
 
     } catch (e: any) {
         safeStatus(`Error durante la humanización: ${e.message}. Subiendo el error al frontend...`);
         throw e;
     }
-
-    $('[data-humanize-id]').removeAttr('data-humanize-id');
-    const finalHtml = $.html();
-    
-    if (onChunk) onChunk(finalHtml);
-
-    const duration = (Date.now() - start) / 1000;
-    console.log(`[Humanizer-Perf] Completado en ${duration}s`);
-    
-    return { html: cleanAndFormatHtml(finalHtml) };
 };
 
 export const runSurgicalEditorPipeline = async (
