import { calculateTFIDF } from "@/lib/services/tfidf";
import { executeWithGroq } from "@/lib/services/groq";
import { aiRouter } from "@/lib/ai/router";
import { safeJsonExtract } from "@/utils/json";

/**
 * Keyword Analyzer Service
 * Handles TF-IDF calculation and AI-based LSI keyword curation.
 */
export const KeywordAnalyzer = {
    /**
     * Extracts and curates LSI keywords from a set of texts.
     */
    async extractLSIKeywords(texts: string[], targetKeyword: string, onLog?: (p: string, m: string) => void): Promise<any[]> {
        if (texts.length === 0) return [];
        
        if (onLog) onLog("Fase 4 (LSI)", "Calculando relevancia semántica (TF-IDF)...");
        
        // Strip HTML from all texts for reliable TF-IDF
        const cleanTexts = texts.map(t => t.replace(/<[^>]+>/g, ' '));
        const rawTfidf = calculateTFIDF(cleanTexts);
        
        // Deduplicate and select top 50 candidates for AI curation
        const uniqueRawKws = Array.from(new Set(
            rawTfidf.map((t: any) => t.keyword.trim().toLowerCase())
        )).slice(0, 50);
        
        const lsiPrompt = `Filtra la siguiente lista de términos LSI (extraídos por TF-IDF) para la palabra clave principal: "${targetKeyword}".

LISTA BRUTA:
${uniqueRawKws.join(", ")}

REGLAS DE FILTRADO EXTREMO:
1. Elimina palabras vacías, de navegación ("inicio", "cookies", "ver más", "contacto") y jerga de interfaz web ("suscribirse", "carrito").
2. Elimina nombres de competidores, marcas registradas y dominios ("amazon", "wikipedia", "youtube").
3. Elimina verbos genéricos sin contexto o frases sin sentido semántico.
4. Mantén SÓLO las entidades semánticas, conceptos complementarios y subtemas de altísimo valor que un experto usaría naturalmente al hablar de "${targetKeyword}".

Devuelve ÚNICAMENTE un array de strings en formato JSON con los términos sobrevivientes.
FORMATO OBLIGATORIO:
{"keywords": ["termino 1", "termino 2", "termino 3"]}`;

        const lsiRes = await aiRouter.generate({
            prompt: lsiPrompt,
            model: "gemma-3-27b-it", // Technical Main
            systemPrompt: "Eres un ingeniero Semántico especializado en curación de diccionarios LSI. Solo devuelves JSON válido, sin explicaciones.",
            label: "LSI Technical"
        });
        
        const extractedJson = safeJsonExtract<{keywords: string[]}>(lsiRes.text, {keywords: []});
        const wordList = Array.from(new Set(
            (extractedJson.keywords || [])
                .map((w: string) => w.trim())
                .filter((w: string) => w.length > 2)
        ));

        if (onLog) onLog("Fase 4 (LSI)", `IA filtró ${wordList.length} términos de valor de entre 50 candidatos.`);

        const topScore = Math.max(...rawTfidf.map((t: any) => t.score), 0.0001);
        const finalMap = new Map<string, any>();

        for (const word of wordList) {
            const normalizedWord = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            if (finalMap.has(normalizedWord)) continue;

            const match = rawTfidf.find((t: any) => 
                t.keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === normalizedWord
            );
            
            const rawScore = match ? parseFloat(match.score.toString()) : (topScore * 0.1);
            const normalized = Number((rawScore / topScore).toFixed(2));

            finalMap.set(normalizedWord, {
                keyword: word,
                relevance: Math.min(1, normalized),
                count: normalized > 0.6 ? "Alto" : normalized > 0.3 ? "Medio" : "Bajo"
            });
        }
        
        return Array.from(finalMap.values());
    }
};
