import { safeJsonExtract } from "@/utils/json";
import { aiRouter } from "@/lib/ai/router";

/**
 * Outline Engine Service
 * Handles the generation of complex content structures with fallback rotation.
 */
export const OutlineEngine = {
    /**
     * Generates a detailed content outline (H2s, H3s, instructions, keywords, word counts).
     */
    async generate(params: {
        keyword: string,
        seoMetadata: any,
        cleanedLSI: any[],
        suggestedLinks: any[],
        validCompetitors: any[],
        wordCountGoal?: number,
        faqs?: any[],
        askKeywords?: any[],
        realKeywords?: any[],
        masterIntent?: string,
        serpReport?: any,
        taskContext?: any,
        timeoutMs?: number
    }): Promise<any[]> {
        const { keyword, seoMetadata, cleanedLSI, suggestedLinks, validCompetitors, wordCountGoal, faqs = [], askKeywords = [], realKeywords = [], masterIntent = "", serpReport = {}, taskContext = {}, timeoutMs = 120000 } = params;
        
        // Build competitor headers string safely to avoid token explosion
        const competitorHeaders = validCompetitors.slice(0, 6).map(v => {
            let headersText = '';
            if (v.headers && Array.isArray(v.headers) && v.headers.length > 0) {
                headersText = v.headers.map((h: any) => `- ${h.tag}: ${h.text}`).join('\n');
            } else {
                headersText = v.summary?.substring(0, 200) + '...' || 'Sin encabezados';
            }
            return `### FUENTE: ${v.title}\n${headersText}`;
        }).join('\n\n');
        
        const fallbackModels = [
            "gemini-3.1-flash-lite-preview",
            "gemini-3-flash-preview",
            "gemini-2.5-flash-lite"
        ];

        const robustParseOutline = (text: string): any[] => {
            // 1. Try clean JSON first
            const json = safeJsonExtract<any[]>(text, []);
            if (json && json.length > 0) return json;

            // 2. Fallback to Regex-based Markdown/List Parsing
            const lines = text.split('\n');
            const structure: any[] = [];
            
            for (const line of lines) {
                const clean = line.trim();
                if (!clean) continue;

                // Match H2/H3/H4 markers: "H2: Title", "## Title", "2. Title", "### Title", "#### Title"
                const hMatch = clean.match(/^(?:#+\s*|H([234])[:.\s]+|([234])[:.\s]+)(.*)/i);
                if (hMatch) {
                    const levelStr = hMatch[1] || hMatch[2] || (clean.startsWith('####') ? '4' : clean.startsWith('###') ? '3' : '2');
                    const level = parseInt(levelStr);
                    const titleText = hMatch[3].trim();
                    if (titleText) structure.push({ level, text: titleText });
                    continue;
                }

                // Match numbered list items if they don't have level markers (default to H2)
                const listMatch = clean.match(/^\d+[\s.)]+(.*)/);
                if (listMatch) {
                    const titleText = listMatch[1].trim();
                    if (titleText && titleText.length > 3) structure.push({ level: 2, text: titleText });
                }
            }
            return structure;
        };

        try {
            // PHASE 1: Structural Synthesis (H2/H3 Skeleton)
            const faqsText = faqs.slice(0, 5).map(f => `- ${f.question || f.title || JSON.stringify(f)}`).join('\n');
            const linksContext = suggestedLinks && suggestedLinks.length > 0 
                ? suggestedLinks.map(l => `- ${l.title || l.url}`).join('\n') 
                : "Ninguno.";
            
            // User injected rules
            const userBrief = taskContext?.brief ? `\n\n[INSTRUCCIÓN MAESTRA DEL USUARIO]:\n${taskContext.brief}\nDEBES ADAPTAR TODA LA ESTRUCTURA A ESTA REGLA.` : '';
            const userObs = taskContext?.metadata?.observaciones || taskContext?.observaciones ? `\n\n[OBSERVACIONES ESPECÍFICAS]:\n${taskContext?.metadata?.observaciones || taskContext?.observaciones}\n` : '';
            
            const contentType = taskContext?.content_type || 'Blog Post';
            let strategyRec = serpReport.type === 'transactional' ? 'Enfoque directo a solución/producto.' : 'Guía informativa profunda y autoritativa.';
            
            if (contentType === 'Landing Transaccional') {
                strategyRec = 'ESTO ES UNA LANDING PAGE PURA. Usa estructura de copy de ventas (Problema, Solución, Beneficios, Testimonios, CTA). No la hagas como un blog largo.';
            } else if (contentType === 'Review / Reseña') {
                strategyRec = 'ESTO ES UNA RESEÑA. Enfócate en Pros, Contras, Comparativas y Veredicto Final.';
            } else if (contentType === 'Pilar Page') {
                strategyRec = 'ESTO ES UNA PILLAR PAGE. Estructura inmensa y categorizada para enlazar a clusters.';
            }

            const phase1Prompt = `ESTRATEGIA PROFUNDA DE ESTRUCTURA PARA: "${keyword}"
OBJETIVO: Crear el mejor esqueleto de H2/H3/H4 del nicho superando a la competencia.

METADATOS PROPUESTOS:
H1: "${seoMetadata.h1}"
INTENCIÓN INFERIDA: "${masterIntent}"
TIPO DE CONTENIDO: "${contentType}"
META DE PALABRAS (WORD COUNT GOAL): ${wordCountGoal ? `${wordCountGoal} palabras. (Ajusta la cantidad de secciones H2/H3 para que sea realista alcanzar esta meta).` : "No especificada. Usa tu mejor criterio."}

ESTRATEGIA RECOMENDADA: ${strategyRec}${userBrief}${userObs}

PRODUCTOS/ENLACES INTERNOS SUGERIDOS (CATÁLOGO):
${linksContext}

ESTRUCTURA DE COMPETIDORES RELEVANTES:
${competitorHeaders.substring(0, 3000)}

PREGUNTAS FRECUENTES (FAQs):
${faqsText || "Ninguna FAQ específica detectada."}

REGLAS PARA EL ESQUELETO:
1. Diseña una estructura lógica y fluida de H2s, y anida los H3s y H4s directamente bajo sus respectivos H2s. ¡Las secciones pueden y deben tener sub-secciones (H3/H4) para mayor profundidad!
2. REGLA E-COMMERCE ESTRICTA: Si hay PRODUCTOS/ENLACES INTERNOS en la lista anterior, DEBES crear un H2 por cada producto (o agruparlos en H3 dentro de un H2 categorizador). Usa el nombre o modelo exacto del producto en el encabezado.
3. Si el SERP es informativo, prioritiza el valor educativo. Si es transaccional, prioritiza los beneficios y la comparativa.
4. Asegúrate de responder las FAQs de manera natural integrándolas en H2s o H3s.
5. Sugiere explícitamente en el texto si una sección debería contener una TABLA COMPARATIVA, una LISTA DE BULLET POINTS, o algún formato rico.
6. Devuelve un Array de objetos con "level" (2, 3 o 4) y "text" (título). Si sugieres un formato, añádelo sutilmente al título (ej. "Características (Tabla)").

FORMATO PREFERIDO:
[{"level": 2, "text": "Título"}]`;

            let skeleton: any[] = [];
            
            try {
                // Paso 1: Generación de contenido con Gemma 4
                const phase1ResGemma = await aiRouter.generate({
                    prompt: phase1Prompt,
                    model: "gemma-4-31b-it",
                    systemPrompt: "Eres un Arquitecto de Contenidos. Diseña el esqueleto H2/H3/H4 detalladamente.",
                    jsonMode: false,
                    label: `Outline P1 (Gemma 4)`,
                    temperature: 0.2,
                    timeoutMs
                });

                // Paso 2: Formateo JSON con Gemini 3.1 Flash Lite
                const formatterPrompt = `Convierte el siguiente outline generado en un array JSON estricto.
OUTLINE ORIGINAL:
${phase1ResGemma.text}

REGLAS PARA EL JSON:
1. Devuelve un Array de objetos con "level" (2, 3 o 4) y "text" (título).
2. NO incluyas ninguna explicación, solo el array JSON válido.

FORMATO PREFERIDO:
[{"level": 2, "text": "Título"}]`;

                const phase1Res = await aiRouter.generate({
                    prompt: formatterPrompt,
                    model: "gemini-3.1-flash-lite-preview",
                    systemPrompt: "Eres un formateador JSON estricto. Devuelves el esqueleto H2/H3/H4 en formato JSON sin errores.",
                    jsonMode: true,
                    label: `Outline P1 Formatter (3.1 flash lite)`,
                    temperature: 0.1,
                    timeoutMs
                });
                
                skeleton = robustParseOutline(phase1Res.text);
                if (skeleton.length > 0) {
                    console.log(`🚀 [OutlineEngine] P1 Exitosa con Gemma 4 + Gemini 3.1. Esqueleto: ${skeleton.length} secciones.`);
                }
            } catch (e) {
                console.warn(`[OutlineEngine] P1 Fallback failed`, e);
            }

            if (!skeleton || skeleton.length === 0) {
                throw new Error("Critical: Phase 1 failed to generate any structure.");
            }

            // PHASE 2: E-E-A-T Enrichment (Structured JSON)
            const highLsi = cleanedLSI.slice(0, 30).map(l => l.keyword).join(", ");
            const realKwsText = realKeywords.slice(0, 20).map(k => k.keyword).join(", ");
            const askKwsText = askKeywords.slice(0, 20).map(k => k.keyword).join(", ");
            const linksText = JSON.stringify(suggestedLinks.slice(0, 10));
            const competitorContent = validCompetitors.slice(0, 3).map(v => `### ${v.title}\n${(v.content || v.summary || "").substring(0, 1000)}`).join('\n\n');
            const skeletonText = skeleton.map((s, i) => `${i + 1}. H${s.level || 2}: ${s.text}`).join('\n');

            const phase2Prompt = `ENRIQUECIMIENTO E-E-A-T DEL ESQUELETO: "${keyword}"

ESQUELETO ACTUAL:
${skeletonText}

RECURSOS SEMÁNTICOS (DEBEN USARSE):
- LSI: ${highLsi}
- Golden KWs: ${realKwsText}
- Jerga (ASK): ${askKwsText}
- Enlaces sugeridos (Interlinking): ${linksText}

CONTENIDO DE COMPETIDORES (PARA CITAS Y REFERENCIAS):
${competitorContent.substring(0, 4000)}

INSTRUCCIONES EXTREMAS PARA EL MODELO:
Para cada una de las ${skeleton.length} secciones del esqueleto, DEBES generar un análisis profundo y directrices de redacción. 
Es OBLIGATORIO que para CADA sección (H2/H3/H4) especifiques explícitamente en el texto:
1. Qué palabras clave LSI, ASK o Golden KWs de la lista provista se deben usar en esa sección.
2. Qué enlaces internos de los sugeridos encajan perfectamente en esa sección. No digas "añadir enlace interno", di exactamente cuál enlace usar.
3. Analiza el contenido de los competidores provistos e indica explícitamente a qué competidor citar o referenciar para respaldar la información (ej. "Citar a [Nombre Competidor] sobre el dato X").
4. Formato de Contenido: Indica de forma explícita si el redactor debe usar una TABLA, una LISTA (Bullet points), una caja de advertencia, o un formato rico específico en esta sección para romper el muro de texto.
5. El enfoque E-E-A-T necesario para dar máxima autoridad al texto.
6. Extensión Sugerida: Para promover la variedad, asigna a cada sección una longitud diferente según su importancia. Indica explícitamente si la sección debe ser "Corta", "Media", o "Larga". Evita que todas las secciones tengan la misma extensión.

Redacta este análisis sección por sección con lujo de detalles (no te preocupes por el JSON, otro modelo lo parseará luego).`;

            let enrichmentData: Record<string, any> = {};
            
            try {
                // Paso 1: Generación de instrucciones con Gemma 4
                const enrichResGemma = await aiRouter.generate({
                    prompt: phase2Prompt,
                    model: "gemma-4-31b-it",
                    systemPrompt: "Eres un Editor Senior E-E-A-T. Genera pautas detalladas para cada sección basándote en la información provista.",
                    jsonMode: false,
                    label: `Outline P2 (Gemma 4)`,
                    temperature: 0.3,
                    timeoutMs
                });

                // Paso 2: Formateo JSON con Gemini 3.1 Flash Lite
                const enrichFormatterPrompt = `Convierte las pautas de enriquecimiento generadas en el JSON solicitado.
TEXTO ORIGINAL:
${enrichResGemma.text}

RESULTADO OBLIGATORIO: Un objeto JSON donde las llaves sean el índice numérico de la sección del esqueleto (ej: "1", "2") y el valor sea un objeto con:
- instructions: (String largo con las pautas detalladas generadas, ASEGÚRATE de incluir aquí toda la información explícita sobre qué competidor citar, qué enlaces internos exactos poner y la intención de redacción).
- keywords: (Array de strings con todas las LSI/ASK/Golden KWs asignadas a esa sección en el texto original).
- length: (String indicando "Corta", "Media" o "Larga" según lo que haya sugerido el texto original).

FORMATO DE SALIDA ESTRICTO:
{
 "1": { "instructions": "En esta sección debes hablar de X y citar al competidor Y respecto a Z. Incluye el enlace sugerido hacia /url...", "keywords": ["kw1", "kw2"], "length": "Larga" },
 "2": { ... }
}`;

                const enrichRes = await aiRouter.generate({
                    prompt: enrichFormatterPrompt,
                    model: "gemini-3.1-flash-lite-preview",
                    systemPrompt: "Eres un formateador JSON estricto. Devuelves el JSON exacto con las pautas por sección sin explicaciones.",
                    jsonMode: true,
                    label: `Outline P2 Formatter (3.1 flash lite)`,
                    temperature: 0.1,
                    timeoutMs
                });

                enrichmentData = safeJsonExtract<Record<string, any>>(enrichRes.text, {});
            } catch (e) {
                console.warn(`[OutlineEngine] P2 Gemma+Gemini flow failed`, e);
            }

            // FINAL MAPPING (UI Adapter)
            const goal = wordCountGoal || 1500;
            
            // First pass to calculate total weight with the new dynamic lengths
            let totalWeight = 0;
            const outlineWithWeights = skeleton.map((section, index) => {
                const sectionNum = String(index + 1);
                const enrichment = enrichmentData[sectionNum] || enrichmentData[index] || {};
                
                const level = section.level || (section.type === "H3" ? 3 : (section.type === "H4" ? 4 : 2));
                let baseWeight = level === 3 ? 1.0 : (level === 4 ? 0.7 : 1.5);
                
                // Adjust weight based on Gemma's length suggestion
                const lengthStr = (enrichment.length || "").toLowerCase();
                let lengthMultiplier = 1.0;
                if (lengthStr.includes("corta")) lengthMultiplier = 0.6;
                else if (lengthStr.includes("larga")) lengthMultiplier = 1.5;
                
                const finalWeight = baseWeight * lengthMultiplier;
                totalWeight += finalWeight;
                
                return { section, enrichment, level, finalWeight };
            });

            const finalOutline = outlineWithWeights.map(({ section, enrichment, level, finalWeight }) => {
                const calculatedWordCount = Math.floor((finalWeight / totalWeight) * goal);

                return {
                    type: `H${level}`,
                    text: section.text,
                    notes: enrichment.instructions || "Desarrolla esta sección basándote en la intención de búsqueda y el contexto de la competencia.",
                    keywords: Array.isArray(enrichment.keywords) ? enrichment.keywords : [],
                    wordCount: String(calculatedWordCount),
                    currentWordCount: 0
                };
            });

            // Return in the format the Studio expects: an object with headers
            return {
                headers: finalOutline,
                totalWordCount: goal
            };

        } catch (error) {
            console.error("[OutlineEngine] Critical Failure:", error);
            // Emergency fallback structure
            return [
                { level: 2, text: `Guía Maestra sobre ${keyword}`, wordCount: "1500", instructions: 'Error en el motor de outlines. Generando estructura de emergencia.', keywords: [], currentWordCount: 0 }
            ];
        }
    }
};