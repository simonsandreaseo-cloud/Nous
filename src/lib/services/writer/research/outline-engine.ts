import { executeWithKeyRotation } from "../ai-core";
import { safeJsonExtract } from "@/utils/json";
import { ScraperService } from "./scrapers";
import { aiRouter } from "@/lib/ai/router";

/**
 * Outline Engine Service
 * Handles the generation of complex content structures with fallback rotation.
 */
export const OutlineEngine = {
    /**
     * Generates a detailed content outline (H2s, H3s, notes, word counts).
     */
    async generate(params: {
        keyword: string,
        seoMetadata: any,
        cleanedLSI: any[],
        suggestedLinks: any[],
        validCompetitors: any[],
        wordCountGoal?: number
    }): Promise<any[]> {
        const { keyword, seoMetadata, cleanedLSI, suggestedLinks, validCompetitors } = params;
        
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
        
        const highLsi = cleanedLSI.slice(0, 25).map(l => l.keyword).join(", ");

        const outlinePrompt = `ESTRATEGIA PROFUNDA DE CONTENIDOS PARA: "${keyword}"
OBJETIVO: Crear el mejor artículo del nicho superando a la competencia.

METADATOS PROPUESTOS:
H1: "${seoMetadata.h1}"
SEO TITLE: "${seoMetadata.seo_title}"
SLUG: "${seoMetadata.slug}"
DESC: "${seoMetadata.meta_description}"
EXTRACTO: "${seoMetadata.extracto || seoMetadata.excerpt}"

KEYWORDS LSI PRIORITARIAS:
${highLsi}

ENLACES INTERNOS A INTEGRAR (POOL):
${JSON.stringify(suggestedLinks.slice(0, 10))}

ESTRUCTURA DE COMPETIDORES RELEVANTES:
${competitorHeaders.substring(0, 4000)}

REGLAS PARA EL OUTLINE:
1. Diseña una estructura lógica y fluida de H2s y H3s (mínimo 6 secciones).
2. Para cada sección, define:
   - "type" (H2 o H3).
   - "text" (el título del encabezado).
   - "notes" (Instrucciones para el redactor, puntos clave Y sugerencia de qué enlace del POOL colocar aquí si encaja naturalmente).

RESPONDE ÚNICAMENTE CON UN ARRAY JSON (sin markdown):
[{"type": "H2", "text": "Título de Sección", "notes": "Foco en..."}]`;

        try {
            const outlineRes = await aiRouter.generate({
                prompt: outlinePrompt,
                model: "gemma-3-27b-it", // Dense Reasoning
                systemPrompt: "Experto en arquitectura de contenidos y SEO. Solo devuelves JSON válido, sin markdown de bloques de código y sin explicaciones adicionales.",
                label: "Arquitectura Writing",
                temperature: 0.2
            });

            let parsed = safeJsonExtract<any[]>(outlineRes.text, []);
            
            return parsed.map(item => ({
                type: item.type || 'H2',
                text: item.text || 'Sección sin título',
                wordCount: "0",
                notes: item.notes || '',
                currentWordCount: 0
            })).filter(Boolean);

        } catch (error) {
            console.error("[OutlineEngine] Critical Failure:", error);
            // Emergency fallback structure
            return [
                { type: 'H2', text: `Guía sobre ${keyword}`, wordCount: "0", notes: 'Estructura por defecto generada por fallo del motor.', currentWordCount: 0 }
            ];
        }
    }
};
