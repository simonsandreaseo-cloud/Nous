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
        masterIntent?: string
    }): Promise<any[]> {
        const { keyword, seoMetadata, cleanedLSI, suggestedLinks, validCompetitors, wordCountGoal, faqs = [], askKeywords = [], realKeywords = [], masterIntent = "" } = params;
        
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
        
        // Model Rotation Matrix (Safe-guards for both phases)
        const fallbackModels = [
            "gemini-1.5-flash-lite-001", // Hyper-fast
            "gemini-1.5-flash",          // Fast & Capable
            "gemma-2-27b-it",            // Technical fallback
            "llama-3.3-70b-versatile"    // Robust fallback
        ];

        try {
            // PHASE 1: Structural Synthesis (H2/H3 Skeleton)
            const faqsText = faqs.slice(0, 5).map(f => `- ${f.question || f.title || JSON.stringify(f)}`).join('\n');
            
            const phase1Prompt = `ESTRATEGIA PROFUNDA DE ESTRUCTURA PARA: "${keyword}"
OBJETIVO: Crear el mejor esqueleto de H2/H3 del nicho superando a la competencia.

METADATOS PROPUESTOS:
H1: "${seoMetadata.h1}"
INTENCIÓN MAESTRA: "${masterIntent}"

ESTRUCTURA DE COMPETIDORES RELEVANTES:
${competitorHeaders.substring(0, 3000)}

PREGUNTAS FRECUENTES (FAQs):
${faqsText || "Ninguna FAQ específica detectada."}

REGLAS PARA EL ESQUELETO:
1. Diseña una estructura lógica y fluida de H2s y H3s.
2. Asegúrate de responder las FAQs de manera natural.
3. Devuelve UN ARRAY JSON de objetos con "level" (2 o 3) y "text" (título).

FORMATO:
[{"level": 2, "text": "Título de Sección"}]`;

            let skeleton: any[] = [];
            for (const model of fallbackModels) {
                try {
                    const phase1Res = await aiRouter.generate({
                        prompt: phase1Prompt,
                        model: model,
                        systemPrompt: "Eres un Arquitecto de Contenidos. Devuelves el array JSON con el esqueleto H2/H3. Sin explicaciones.",
                        jsonMode: true,
                        label: `Outline P1 (${model})`,
                        temperature: 0.2
                    });
                    skeleton = safeJsonExtract<any[]>(phase1Res.text, []);
                    if (skeleton.length > 0) break;
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
                        temperature: 0.3
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
                    level: level,
                    text: section.text,
                    instructions: enrichment.instructions || "Desarrolla esta sección basándote en la intención de búsqueda y el contexto de la competencia.",
                    keywords: Array.isArray(enrichment.keywords) ? enrichment.keywords : [],
                    wordCount: String(calculatedWordCount),
                    currentWordCount: 0
                };
            });

            return finalOutline;

        } catch (error) {
            console.error("[OutlineEngine] Critical Failure:", error);
            // Emergency fallback structure
            return [
                { level: 2, text: `Guía Maestra sobre ${keyword}`, wordCount: "1500", instructions: 'Error en el motor de outlines. Generando estructura de emergencia.', keywords: [], currentWordCount: 0 }
            ];
        }
    }
};