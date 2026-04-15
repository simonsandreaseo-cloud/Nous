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
        
        if (onLog) onLog("Fase 2 (LSI)", "Calculando relevancia semántica (TF-IDF)...");
        
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

        if (onLog) onLog("Fase 2 (LSI)", `IA filtró ${wordList.length} términos de valor de entre 50 candidatos.`);

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
    },

    /**
     * Extracts niche jargon, acronyms, and expert argot from top competitors.
     */
    async extractASKKeywords(texts: string[], targetKeyword: string, onLog?: (p: string, m: string) => void): Promise<any[]> {
        if (texts.length === 0) return [];
        
        if (onLog) onLog("Fase 3 (ASK)", "Extrayendo argot experto y jerga de nicho...");
        
        // Strip HTML and limit length to avoid massive token count
        const cleanTexts = texts.map(t => t.replace(/<[^>]+>/g, ' ').substring(0, 8000));
        const combinedText = cleanTexts.join("\n\n---\n\n");

        const askPrompt = `Analiza el siguiente texto extraído de los mejores competidores para el tema "${targetKeyword}".
Tu objetivo es extraer la "Jerga de Nicho", acrónimos, términos técnicos avanzados y el "argot" que solo un verdadero experto en la materia utilizaría.

TEXTO:
${combinedText}

REGLAS:
1. Extrae términos técnicos, siglas, y vocabulario altamente especializado.
2. Ignora palabras comunes, genéricas o explicaciones básicas.
3. Devuelve ÚNICAMENTE un array de strings en formato JSON con los términos extraídos.
4. FORMATO OBLIGATORIO:
{"keywords": ["termino 1", "termino 2", "termino 3"]}`;

        const askRes = await aiRouter.generate({
            prompt: askPrompt,
            model: "gemma-3-27b-it",
            systemPrompt: "Eres un experto analista de lingüística técnica. Respondes exclusivamente con JSON válido, sin explicaciones.",
            jsonMode: true,
            label: "ASK Extraction"
        });

        const extractedJson = safeJsonExtract<{keywords: string[]}>(askRes.text, {keywords: []});
        const extractedTerms = (extractedJson.keywords || []).map(t => t.trim()).filter(t => t.length > 2);
        
        if (extractedTerms.length === 0) return [];

        // Count frequency in texts
        const termFrequency = extractedTerms.map(term => {
            // Escape special regex chars in term
            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedTerm}\\b`, 'gi');
            let count = 0;
            cleanTexts.forEach(text => {
                const matches = text.match(regex);
                if (matches) count += matches.length;
            });
            return { term, count };
        }).filter(t => t.count > 0);

        // Sort by frequency
        termFrequency.sort((a, b) => b.count - a.count);

        // Rank them (High/Medium/Low)
        const maxCount = termFrequency[0]?.count || 1;
        
        const rankedTerms = termFrequency.map(t => {
            const normalized = t.count / maxCount;
            return {
                keyword: t.term,
                relevance: normalized,
                count: normalized > 0.5 ? "Alto" : normalized > 0.2 ? "Medio" : "Bajo"
            };
        });

        if (onLog) onLog("Fase 3 (ASK)", `IA extrajo ${rankedTerms.length} términos de argot experto.`);

        return rankedTerms.slice(0, 30);
    },

    /**
     * Filters raw DataForSEO keywords to discard branded terms and navigation words,
     * keeping only golden semantic keywords while preserving their search volume.
     */
    async filterRealKeywords(rawKeywords: {keyword: string, search_volume?: number, volume?: number}[], targetKeyword: string, onLog?: (p: string, m: string) => void): Promise<any[]> {
        if (!rawKeywords || rawKeywords.length === 0) return [];

        if (onLog) onLog("Fase 4 (Golden KWs)", `Filtrando ${rawKeywords.length} palabras clave crudas...`);

        // Sort by volume and take top 100 to avoid huge prompts
        const sortedKws = [...rawKeywords].sort((a, b) => {
            const volA = a.search_volume || a.volume || 0;
            const volB = b.search_volume || b.volume || 0;
            return volB - volA;
        }).slice(0, 100);

        const kwListString = sortedKws.map(k => k.keyword).join(", ");

        const filterPrompt = `Filtra la siguiente lista de palabras clave reales que posicionan para el tema "${targetKeyword}".

LISTA BRUTA:
${kwListString}

REGLAS DE FILTRADO EXTREMO:
1. Elimina TODAS las palabras clave de marca (ej. amazon, wikipedia, youtube, mercadolibre, o nombres de competidores directos).
2. Elimina palabras clave de navegación genérica (ej. "iniciar sesion", "contacto", "app", "login").
3. Elimina palabras que no tengan relación semántica directa con la creación de contenido de valor para el tema.
4. Mantén SÓLO las "Golden Keywords" informativas o transaccionales válidas.

Devuelve ÚNICAMENTE un array de strings en formato JSON con las palabras clave sobrevivientes.
FORMATO OBLIGATORIO:
{"keywords": ["termino 1", "termino 2", "termino 3"]}`;

        const filterRes = await aiRouter.generate({
            prompt: filterPrompt,
            model: "gemma-3-27b-it",
            systemPrompt: "Eres un ingeniero Semántico especializado en curación de diccionarios SEO. Solo devuelves JSON válido, sin explicaciones.",
            label: "Golden Keywords Filter"
        });

        const extractedJson = safeJsonExtract<{keywords: string[]}>(filterRes.text, {keywords: []});
        const survivingKeywords = new Set((extractedJson.keywords || []).map((k: string) => k.toLowerCase().trim()));

        const finalKeywords = sortedKws.filter(k => survivingKeywords.has(k.keyword.toLowerCase().trim())).map(k => ({
            keyword: k.keyword,
            volume: k.search_volume || k.volume || 0,
            rank: (k as any).rank,
            url: (k as any).url
        }));

        if (onLog) onLog("Fase 4 (Golden KWs)", `Sobrevivieron ${finalKeywords.length} Golden Keywords reales.`);

        return finalKeywords;
    }
};
