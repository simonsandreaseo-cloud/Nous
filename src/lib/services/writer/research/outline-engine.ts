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
            "gemini-3.1-flash-lite-preview", // Priority 1: Editorial 3.1
            "gemini-3-flash-preview",      // Fallback 1: Stability 3.0
            "gemini-2.5-flash",            // Fallback 2: Versatility 2.5
            "gemini-2.5-flash-lite",       // Fallback 3: Speed 2.5
            "gemma-4-31b-it",              // Fallback 4: Reasoning
            "gemma-4-26b-a4b-it"           // Fallback 5: Deep Logic
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

                // Match H2/H3 markers: "H2: Title", "## Title", "2. Title", "### Title"
                const hMatch = clean.match(/^(?:#+\s*|H([23])[:.\s]+|([23])[:.\s]+)(.*)/i);
                if (hMatch) {
                    const levelStr = hMatch[1] || hMatch[2] || (clean.startsWith('###') ? '3' : '2');
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
OBJETIVO: Crear el mejor esqueleto de H2/H3 del nicho superando a la competencia.

METADATOS PROPUESTOS:
H1: "${seoMetadata.h1}"
INTENCIÓN INFERIDA: "${masterIntent}"
TIPO DE CONTENIDO: "${contentType}"

ESTRATEGIA RECOMENDADA: ${strategyRec}${userBrief}

PRODUCTOS/ENLACES INTERNOS SUGERIDOS (CATÁLOGO):
${linksContext}

ESTRUCTURA DE COMPETIDORES RELEVANTES:
${competitorHeaders.substring(0, 3000)}

PREGUNTAS FRECUENTES (FAQs):
${faqsText || "Ninguna FAQ específica detectada."}

REGLAS PARA EL ESQUELETO:
1. Diseña una estructura lógica y fluida de H2s y H3s.
2. REGLA E-COMMERCE ESTRICTA: Si hay PRODUCTOS/ENLACES INTERNOS en la lista anterior, DEBES crear un H2 por cada producto (o agruparlos en H3 dentro de un H2 categorizador). Usa el nombre o modelo exacto del producto en el encabezado.
3. Si el SERP es informativo, prioritiza el valor educativo. Si es transaccional, prioritiza los beneficios y la comparativa.
4. Asegúrate de responder las FAQs de manera natural.
5. Devuelve un Array de objetos con "level" (2 o 3) y "text" (título).

FORMATO PREFERIDO:
[{"level": 2, "text": "Título"}]`;

            let skeleton: any[] = [];
            for (const model of fallbackModels) {
                try {
                    const phase1Res = await aiRouter.generate({
                        prompt: phase1Prompt,
                        model: model,
                        systemPrompt: "Eres un Arquitecto de Contenidos. Devuelves el esqueleto H2/H3 de forma estructurada. Prefiere JSON, pero puedes usar Markdown si es necesario.",
                        jsonMode: true,
                        label: `Outline P1 (${model})`,
                        temperature: 0.2,
                        timeoutMs
                    });
                    
                    skeleton = robustParseOutline(phase1Res.text);
                    if (skeleton.length > 0) {
                        console.log(`🚀 [OutlineEngine] P1 Exitosa con ${model}. Esqueleto: ${skeleton.length} secciones.`);
                        break;
                    }
                } catch (e) {
                    console.warn(`[OutlineEngine] P1 Fallback: ${model} failed`, e);
                }
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

RECURSOS SEMÁNTICOS:
- LSI: ${highLsi}
- Golden KWs: ${realKwsText}
- Jerga (ASK): ${askKwsText}
- Enlaces sugeridos: ${linksText}

CONTENIDO DE COMPETIDORES:
${competitorContent.substring(0, 4000)}

INSTRUCCIONES:
Para cada una de las ${skeleton.length} secciones, genera las pautas para el redactor.
RESULTADO OBLIGATORIO: Un objeto JSON donde las llaves sean el índice de la sección (ej: "1", "2") y el valor sea un objeto con:
- instructions: (Pautas detalladas y referencias)
- keywords: (Array de strings con LSI/ASK/Golden KWs ideales para ese H2)

FORMATO:
{
 "1": { "instructions": "...", "keywords": ["kw1", "kw2"] },
 "2": { ... }
}`;

            let enrichmentData: Record<string, any> = {};
            for (const model of fallbackModels) {
                try {
                    const enrichRes = await aiRouter.generate({
                        prompt: phase2Prompt,
                        model: model,
                        systemPrompt: "Eres un Editor Senior E-E-A-T. Devuelves el JSON exacto con las pautas por sección.",
                        jsonMode: true,
                        label: `Outline P2 (${model})`,
                        temperature: 0.3,
                        timeoutMs
                    });
                    enrichmentData = safeJsonExtract<Record<string, any>>(enrichRes.text, {});
                    if (Object.keys(enrichmentData).length > 0) break;
                } catch (e) {
                    console.warn(`[OutlineEngine] P2 Fallback: ${model} failed`, e);
                }
            }

            // FINAL MAPPING (UI Adapter)
            const totalWeight = skeleton.reduce((sum, s) => sum + ((s.level || s.type) === 3 ? 1.0 : 1.5), 0);
            const goal = wordCountGoal || 1500;

            const finalOutline = skeleton.map((section, index) => {
                const sectionNum = String(index + 1);
                const enrichment = enrichmentData[sectionNum] || enrichmentData[index] || {};
                
                const level = section.level || (section.type === "H3" ? 3 : 2);
                const weight = level === 3 ? 1.0 : 1.5;
                const calculatedWordCount = Math.floor((weight / totalWeight) * goal);

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