import { aiRouter } from '../ai/router';
import { DataForSeoService } from './dataforseo';

export interface RankedKeyword {
    keyword: string;
    rank: number;
    search_volume: number;
    cpc: number;
    competition: string;
    url: string;
}

export interface OptimizedKeyword extends RankedKeyword {
    relevance_score: number;
    intent: string;
    actionable_header?: string;
}

export class IntelligenceService {
    /**
     * Cleans and categorizes keywords from DataForSEO using AI.
     */
    static async cleanKeywords(rawKeywords: any[], topic: string): Promise<OptimizedKeyword[]> {
        if (rawKeywords.length === 0) return [];

        const prompt = `Analiza este listado de keywords extraídas para el tema: "${topic}".
        Tu objetivo es filtrar solo las que sean SEMÁNTICAMENTE RELEVANTES para la creación de un contenido informativo de alta calidad.
        
        REGLAS:
        1. Elimina marcas de terceros (ej: Amazon, El Corte Inglés, etc.) a menos que el tema sea sobre marcas.
        2. Elimina términos irrelevantes o basura.
        3. Identifica la intención de búsqueda (informativa, transaccional, comercial).
        4. Asigna un score de relevancia del 0 al 100.
        5. Propón un encabezado (H2/H3) sugerido para cada keyword si es muy relevante.

        LISTADO:
        ${JSON.stringify(rawKeywords.slice(0, 50))}

        Responde ÚNICAMENTE en formato JSON con esta estructura:
        {
          "keywords": [
            { "keyword": "...", "relevance_score": 95, "intent": "...", "actionable_header": "..." }
          ]
        }`;

        try {
            const response = await aiRouter.generate({
                model: 'gemini-1.5-flash',
                prompt,
                systemPrompt: "Eres un experto en SEO Estratégico y Arquitectura de Información.",
                jsonMode: true
            });

            const decoded = JSON.parse(response.text);
            const aiKeywords = decoded.keywords;

            // Merge AI data with original metrics
            return aiKeywords.map((aiK: any) => {
                const original = rawKeywords.find(r => r.keyword === aiK.keyword) || {};
                return {
                    ...original,
                    ...aiK
                };
            });
        } catch (error) {
            console.error("Error cleaning keywords with AI:", error);
            return rawKeywords.map(k => ({ ...k, relevance_score: 50, intent: 'unknown' }));
        }
    }

    /**
     * Selects the top 3 most semantically related URLs from a SERP list.
     */
    static async selectSemanticReferences(serpResults: any[], targetContentDescription: string): Promise<any[]> {
        if (serpResults.length === 0) return [];

        const prompt = `De los siguientes resultados de búsqueda (SERP), selecciona los 3 que sean MÁS RELEVANTES SEMÁNTICAMENTE como referencia para: "${targetContentDescription}".
        
        CRITERIO DE SELECCIÓN:
        - Prioriza blogs informativos, guías profundas y artículos de expertos.
        - Ignora páginas de inicio de marcas, e-commerce puros, directorios, o PDFs gubernamentales, a menos que sean la fuente directa.
        - No elijas los top 3 ciegamente; elige los que provean mejor estructura editorial.

        SERP:
        ${JSON.stringify(serpResults.map(r => ({ title: r.title, url: r.url, snippet: r.description })))}

        Responde ÚNICAMENTE en JSON:
        { "selected_urls": ["url1", "url2", "url3"], "reason": "..." }`;

        try {
            const response = await aiRouter.generate({
                model: 'gemini-1.5-flash',
                prompt,
                systemPrompt: "Eres un estratega de contenidos senior.",
                jsonMode: true
            });

            const decoded = JSON.parse(response.text);
            return serpResults.filter(r => decoded.selected_urls.includes(r.url));
        } catch (error) {
            console.error("Error selecting references:", error);
            return serpResults.slice(0, 3);
        }
    }

    /**
     * Calculates a strategic priority score (0-100) based on GSC metrics.
     */
    static calculateStrategicScore(metrics: {
        clicks: number;
        impressions: number;
        position: number;
        ctr: number;
    }): number {
        let score = 0;

        // Striking Distance (Posiciones 4-20)
        if (metrics.position > 3 && metrics.position <= 10) score += 40;
        else if (metrics.position > 10 && metrics.position <= 20) score += 25;

        // High Impressions (Potencial de tráfico)
        if (metrics.impressions > 5000) score += 30;
        else if (metrics.impressions > 1000) score += 15;

        // Low CTR for High Position (Problema en Snippet/Título)
        if (metrics.position <= 5 && metrics.ctr < 2) score += 20;

        // Cap at 100
        return Math.min(score, 100);
    }

    /**
     * Generates a "Master Outline" based on competitors' structures and top keywords.
     */
    static async generateNeuralOutline(
        competitorStructures: { url: string, headers: any[] }[],
        targetKeywords: OptimizedKeyword[],
        topic: string
    ): Promise<any> {
        const prompt = `Actúa como un arquitecto de contenidos SEO. Tu misión es diseñar el MEJOR OUTLINE del mercado para el tema: "${topic}".
        
        CONTEXTO DE COMPETENCIA (Lo que ellos ya hicieron):
        ${JSON.stringify(competitorStructures.map(c => ({ url: c.url, structure: c.headers })))}

        KEYWORDS ESTRATÉGICAS (Lo que debemos cubrir):
        ${JSON.stringify(targetKeywords.filter(k => k.relevance_score > 70).map(k => k.keyword))}

        INSTRUCCIONES:
        1. Crea una estructura de H1, H2 y H3 jerárquica y lógica.
        2. Supera a la competencia: detecta qué temas no están tocando o cómo podemos profundizar más.
        3. Para cada sección, añade una breve "Intención de Escritura" (qué debe explicar el redactor).
        4. Asegúrate de incluir las keywords estratégicas de forma natural en los encabezados.

        Responde ÚNICAMENTE en JSON con esta estructura:
        {
          "title_h1": "...",
          "sections": [
            {
              "tag": "H2",
              "text": "...",
              "writing_intent": "...",
              "subsections": [
                { "tag": "H3", "text": "...", "writing_intent": "..." }
              ]
            }
          ],
          "quality_check": ["...", "..."]
        }`;

        try {
            const response = await aiRouter.generate({
                model: 'gemini-1.5-flash',
                prompt,
                systemPrompt: "Eres un estratega de contenido especializado en Search Engine Relevance.",
                jsonMode: true
            });

            return JSON.parse(response.text);
        } catch (error) {
            console.error("Error generating Neural Outline:", error);
            throw error;
        }
    }
}
