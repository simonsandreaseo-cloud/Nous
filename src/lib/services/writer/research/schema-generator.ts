import { executeWithGroq } from "@/lib/services/groq";
import { safeJsonExtract } from "@/utils/json";
import { aiRouter } from "@/lib/ai/router";

/**
 * On-demand schema generator for deep maquetador.
 * Analyzes final content and detects FAQs to generate JSON-LD.
 */
export const SchemaGenerator = {
    async generateArticleSchemas(title: string, body: string): Promise<any[]> {
        const prompt = `Analiza este artículo y genera los Schemas SEO (JSON-LD) correspondientes.
DETECCIÓN: Si encuentras preguntas y respuestas claras, genera un FAQPage Schema además del Article Schema.
TÍTULO: ${title}
CONTENIDO: ${body.substring(0, 6000)}

Retorna ÚNICAMENTE un objeto JSON: {"schemas": [...aquí los objetos de schema.org...]}`;

        try {
            const aiRes = await aiRouter.generate({
                prompt,
                model: "gemma-3-27b-it", // Technical Main
                systemPrompt: "Experto en Datos Estructurados y Schema.org. Devuelve SOLO JSON válido sin formato markdown.",
                label: "Schema Technical"
            });
            const data = safeJsonExtract<{ schemas: any[] }>(aiRes.text, { schemas: [] });
            return data.schemas;
        } catch (e) {
            console.error("[SchemaGenerator] Error generating schemas:", e);
            return [];
        }
    }
};
