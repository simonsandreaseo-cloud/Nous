import { calculateTFIDF } from "@/lib/services/tfidf";
import { fetchSerperSearch } from "@/lib/services/serper";
import { fetchJinaExtraction } from "@/lib/services/jina";
import { executeWithKeyRotation } from "./ai-core";
import { useWriterStore } from "@/store/useWriterStore";
import { safeJsonExtract } from "@/utils/json";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";
import { 
    SEOAnalysisResult, 
    CompetitorDetail, 
    DeepSEOAnalysisResult 
} from "./types";
import { aiRouter } from "../../../lib/ai/router";

export interface SEOMetadata {
    h1: string;
    seo_title: string;
    slug: string;
    meta_description: string;
    extracto?: string;
    schemas?: any[];
}

export interface ArticleConfig {
    target_keyword: string;
    word_count?: number;
}

export interface DeepSEOConfig {
    keyword: string;
    serperKey?: string;
    jinaKey?: string;
    projectId?: string;
    csvData?: any[];
    taskId?: string;
    onProgress?: (p: string) => void;
    onLog?: (phase: string, message: string, response?: string) => void;
    modelName?: string;
    isFastMode?: boolean; 
}

import { executeWithGroq } from "@/lib/services/groq";

const stopwords = new Set(['para', 'como', 'con', 'desde', 'hasta', 'sobre', 'bajo', 'entre', 'ante', 'cabe', 'tras', 'mediante', 'durante', 'según', 'hacia', 'vía', 'plus', 'minus', 'per', 'pro', 're', 'sans', 'sub', 'super', 'trans', 'ultra', 'vice']);

/**
 * Extracts and cleans markdown headers from competitor content.
 * Helps the AI understand the typical structure for a keyword.
 */
const extractHeaders = (content: string, maxLines: number = 50): string => {
    if (!content) return "";
    return content.split('\n')
        .filter(line => line.trim().startsWith('#'))
        .slice(0, maxLines)
        .map(line => line.trim())
        .join('\n');
};

export const fetchDataForSEOKeywords = async (url: string): Promise<any> => {
    try {
        const response = await fetch('/api/seo/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'keywords_for_site', target: url })
        });
        const result = await response.json();
        if (!response.ok || result.error) return [];
        return result.result || [];
    } catch (e) {
        return [];
    }
};

export const fetchGlobalMetrics = async (keyword: string): Promise<{ volume: string; difficulty: string }> => {
    try {
        const response = await fetch('/api/seo/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'search_volume', keyword })
        });
        const data = await response.json();
        const metrics = data.result?.[0];
        return {
            volume: metrics?.search_volume?.toString() || "0",
            difficulty: metrics?.keyword_difficulty?.toString() || "N/A"
        };
    } catch (e: any) {
        return { volume: "0", difficulty: "N/A" };
    }
};

export const fetchRealSERP = async (query: string): Promise<any> => {
    try {
        const apiKey = process.env.NEXT_PUBLIC_VALUESERP_API_KEY || '';
        const url = `https://api.valueserp.com/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&num=15&location=Spain&gl=es&hl=es&output=json`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("ValueSERP API Error");
        return await res.json();
    } catch (e) {
        return null;
    }
};

export const filterQualityResults = async (preFiltered: any[], keyword: string, onLog?: (p: string, pr: string, res?: string) => void): Promise<any[]> => {
    const list = preFiltered.slice(0, 15).map((r, i) => `[${i}] ${r.title} - ${r.url}`).join('\n');
    const prompt = `Filtra los resultados más RELEVANTES e INFORMATIVOS para "${keyword}". Evita Amazon o puras tiendas. Retorna array JSON de indices [0, 2, 5...]:\n${list}`;
    
    const rawIds = await executeWithGroq(
        prompt,
        "Eres un experto en filtrado de información. Identifica los resultados más útiles y relevantes. Retorna ÚNICAMENTE un array JSON de índices numéricos.",
        "llama-3.3-70b-versatile",
        true
    );
    try {
        const ids = safeJsonExtract<any[]>(rawIds, []).map(id => Number(id)).filter(id => !isNaN(id));
        if (onLog) onLog("Filtro Calidad (Respuesta)", JSON.stringify(ids), rawIds);
        const filtered = preFiltered.filter((_, i) => ids.includes(i)).slice(0, 8);
        if (filtered.length === 0) {
            if (onLog) onLog("Sistema", "Filtro de calidad vacío. Usando top 8 resultados orgánicos como fallback.");
            return preFiltered.slice(0, 8);
        }
        return filtered;
    } catch (e: any) {
        if (onLog) onLog("Error Filtro", `No se pudieron filtrar resultados: ${e.message}. Usando fallback.`);
        return preFiltered.slice(0, 8);
    }
};

export const runSEOAnalysis = async (keyword: string, onLog?: (p: string, pr: string, res?: string) => void): Promise<SEOAnalysisResult> => {
    // Sanitización de Keyword: Si es muy larga (un título), extraemos la semilla para buscar mejor.
    let searchSeed = keyword;
    if (keyword.split(/\s+/).length > 7) {
        try {
            const seedPrompt = `Extrae la "Core Keyword" (máximo 4 palabras) de este título para buscar competidores en Google:\n\n"${keyword}"\n\nResponde solo con la keyword limpia.`;
            const seedRes = await aiRouter.generate({
                prompt: seedPrompt,
                model: "qwen/qwen3-32b",
                systemPrompt: "Experto SEO.",
                jsonMode: false
            });
            if (seedRes.text && seedRes.text.length > 3 && seedRes.text.length < 50) {
                searchSeed = seedRes.text.trim().replace(/"/g, '');
                console.log(`[SEO-Analyzer] Keyword sanitizada: "${keyword}" -> "${searchSeed}"`);
                if (onLog) onLog("Sanitización", `Core Keyword extraída: "${searchSeed}"`, "OK");
            }
        } catch (e) {}
    }

    // --- REFUERZO DE BUSQUEDA: Simplificar queries largos ---
    if (searchSeed.length > 80) {
        // Si el query es muy largo (ej. el titulo completo), extraemos lo esencial
        searchSeed = searchSeed.split(':').pop()?.trim() || searchSeed;
        searchSeed = searchSeed.split(' ').slice(0, 8).join(' ');
        console.log(`[SEO-Analyzer] Query simplificado para búsqueda: ${searchSeed}`);
    }

    const intentPrompt = `Eres un estratega SEO. Genera un array JSON de 5 variaciones de búsqueda para investigar profundamente sobre: "${searchSeed}".
    Áreas: Informativo, Comparativo, FAQs, Tendencias y Guía de Uso.
    Retorna ÚNICAMENTE el array JSON: ["query 1", "query 2", ...]`;
    
    let queriesArray = [searchSeed];
    try {
        const multiplexRes = await aiRouter.generate({
            prompt: intentPrompt,
            model: "llama-3.3-70b-versatile",
            systemPrompt: "SEO Multiplexer.",
            jsonMode: true
        });
        let extracted = safeJsonExtract<string[]>(multiplexRes.text, []);
        if (Array.isArray(extracted) && extracted.length > 0) {
            queriesArray = [...new Set([searchSeed, ...extracted.slice(0, 5)])];
            console.log(`[SEO-Multiplexer] Queries generadas:`, queriesArray);
            if (onLog) onLog("Queries Generados", JSON.stringify(queriesArray), "Multiplexing exitoso");
        } else {
            throw new Error("No queries generated");
        }
    } catch (e) {
        // Fallback estático de multiplexing
        queriesArray = [
            searchSeed,
            `${searchSeed} opiniones`,
            `${searchSeed} guia`,
            `${searchSeed} mejores modelos y estilos`,
            `como elegir ${searchSeed}`
        ];
        if (onLog) onLog("Modo Garantía (Fase 1)", "Usando variaciones de búsqueda por defecto.", JSON.stringify(queriesArray));
    }

    let rawResults: any[] = [];
    const uniqueUrls = new Set<string>();
    for (const q of queriesArray.slice(0, 6)) {
        if (onLog) onLog("Buscando Serper", `Query: ${q}`, "N/A");
        
        // Pequeño retardo entre queries para resiliencia del proxy
        if (rawResults.length > 0) await new Promise(r => setTimeout(r, 600));
        
        try {
            const res = await fetchSerperSearch(q);
            const count = res?.length || 0;
            console.log(`[Serper] Query: "${q}" -> Encontrados ${count} resultados.`);
            
            if (res && Array.isArray(res)) {
                res.forEach((r: any) => {
                    const url = r.link || r.url;
                    if (!url) return;
                    const isBlocked = /pdf$|\.pdf\?|download|resource|youtube\.com|vimeo\.com|instagram\.com|tiktok\.com|facebook\.com|twitter\.com|x\.com|pinterest\.com|linkedin\.com/i.test(url);
                    if (!uniqueUrls.has(url) && !isBlocked) {
                        uniqueUrls.add(url);
                        rawResults.push({ title: r.title, url, snippet: r.snippet });
                    }
                });
            }
        } catch (serperErr) {
            console.error(`[Serper-Analyzer] Error en query "${q}":`, serperErr);
        }
    }
    console.log(`[Serper] Pool total de candidatos únicos: ${rawResults.length}`);

    if (rawResults.length === 0) {
        // ULTIMO RECURSO: Búsqueda muy básica si todo falló
        const basicQuery = keyword.split(' ').slice(0, 3).join(' ');
        const basicRes = await fetchSerperSearch(basicQuery);
        if (basicRes && basicRes.length > 0) {
            basicRes.forEach((r: any) => rawResults.push({ title: r.title, url: r.link || r.url, snippet: r.snippet }));
        }
    }

    if (rawResults.length === 0) throw new Error("No organic search results found.");

    // --- FILTRO DE CALIDAD INTELIGENTE CON CONTEXTO COMPLETO ---
    let filteredResults = rawResults.slice(0, 15);
    if (onLog) onLog("Filtro Inteligente", `Validando relevancia contra los ${queriesArray.length} ángulos de búsqueda...`, "N/A");
    
    const qualityPrompt = `ERES UN EXPERTO EN RELEVANCIA SEO.
Tu objetivo es seleccionar los mejores resultados para investigar: "${keyword}".

REGLAS:
1. Selecciona artículos, guías o landing pages útiles.
2. No seas excesivamente estricto: es preferible tener datos de más que omitir un buen competidor.
3. Intenta seleccionar entre 5 y 10 fuentes. 

Resultados:
${rawResults.slice(0, 50).map((r, i) => `[${i}] ${r.title}`).join('\n')}

Retorna ÚNICAMENTE un array JSON: [0, 1, 2, ...]`;

    try {
        const qualityRes = await aiRouter.generate({
            prompt: qualityPrompt,
            model: "llama-3.3-70b-versatile",
            systemPrompt: "Curador de contenido.",
            jsonMode: true
        });
        let validIndices = safeJsonExtract<number[]>(qualityRes.text, []);
        console.log(`[Filtro-IA] IA seleccionó los índices:`, validIndices);
        
        // --- REFUERZO DE GARANTÍA (Pool de 8 fuentes) ---
        if (!Array.isArray(validIndices) || validIndices.length < 5) {
            const fallbackIndices = Array.from({ length: Math.min(8, rawResults.length) }, (_, i) => i);
            validIndices = Array.from(new Set([...(validIndices || []), ...fallbackIndices]));
            console.log(`[Filtro-IA] Refuerzo aplicado. Total fuentes final: ${validIndices.length}`);
        }

        filteredResults = rawResults.filter((_, i) => validIndices.includes(i)).slice(0, 15);
        if (onLog) onLog("Filtro IA", `Curación finalizada: ${filteredResults.length} fuentes para investigar.`, JSON.stringify(validIndices));
        
    } catch (e) {
        // FALLBACK TOTAL: Si la IA explota en el filtro, tomamos los 10 mejores resultados orgánicos
        filteredResults = rawResults.slice(0, 10);
        if (onLog) onLog("Aviso Crítico", "Fallo total en Filtro IA. Usando Top 10 orgánico para no detener la investigación.", "Modo Fallback");
    }

    const analysisPrompt = `Analiza el nicho para "${keyword}" usando EXCLUSIVAMENTE estos resultados de búsqueda: ${JSON.stringify(filteredResults.slice(0, 10))}. 
    
    Tu tarea es:
    1. Identificar el nicho específico.
    2. Sugerir ideas de palabras clave con su volumen y dificultad hipotéticos.
    3. EXTRAER una lista de "Preguntas Frecuentes (FAQs)" que aparezcan en los títulos, snippets o estructuras de estos resultados.
    4. Recomendar un conteo de palabras ideal.

    Retorna JSON: {
      "nicheDetected": "...", 
      "keywordIdeas": [{"keyword": "...", "volume": "Hipatético: 1200", "difficulty": "Media"}], 
      "frequentQuestions": ["¿Pregunta 1?", "¿Pregunta 2?"], 
      "recommendedWordCount": 800
    }`;
    
    const aiAnalysisJson = await aiRouter.generate({
        prompt: analysisPrompt,
        model: "llama-3.3-70b-versatile",
        systemPrompt: "Experto SEO.",
        jsonMode: true
    });
    const aiAnalysis = safeJsonExtract<any>(aiAnalysisJson.text, {});
    
    return { ...aiAnalysis, top10Urls: filteredResults, top20Urls: filteredResults };
};

export const runDeepSEOAnalysis = async (config: DeepSEOConfig) => {
    const { keyword, jinaKey, projectId, taskId, onProgress, onLog, isFastMode = false } = config;
    const globalStartTime = Date.now();
    
    const updateTask = async (data: any) => {
        if (taskId) await supabase.from('tasks').update(data).eq('id', taskId);
    };

    if (onLog) onLog("Investigación", `Iniciando Deep SEO para: "${keyword}"`, "PROCESO ACTIVADO");
    
    if (onProgress) onProgress("serp");
    const baseResult = await runSEOAnalysis(keyword, onLog);
    const competitors = baseResult.top10Urls || [];

    // --- CHECKPOINT 1: Guardamos fuentes curadas ---
    await updateTask({
        target_keyword: keyword,
        research_dossier: { ...baseResult, status: "fuentes_curadas" }
    });
    if (onLog) onLog("Checkpoint", "Fuentes de autoridad guardadas en base de datos.", "OK");

    const scrapedSEO: any[] = [];
    const stageScrapeStart = Date.now();
    if (onProgress) onProgress("scraping");
    
    if (isFastMode) {
        competitors.forEach(c => scrapedSEO.push({ url: c.url, title: c.title, content: c.snippet || "", summary: c.snippet || "" }));
    } else if (competitors.length > 0) {
        const CHUNK_SIZE = 5;
        for (let i = 0; i < competitors.length; i += CHUNK_SIZE) {
            const chunk = competitors.slice(i, i + CHUNK_SIZE);
            const batchNum = Math.floor(i/CHUNK_SIZE) + 1;
            const totalBatches = Math.ceil(competitors.length/CHUNK_SIZE);
            if (onLog) onLog(`Fase 3 (Batch ${batchNum}/${totalBatches})`, `Procesando ${chunk.length} fuentes con Jina Reader...`, "N/A");
            
            const results = await Promise.allSettled(chunk.map(async (comp) => {
                try {
                    const res = await fetch("/api/tools/jina-reader", { method: "POST", body: JSON.stringify({ url: comp.url }) });
                    const data = await res.json();
                    if (!data.ok) throw new Error("Extraction failed");
                    
                    const wordCount = (data.content || "").split(/\s+/).length;
                    
                    if (onLog) {
                        onLog("Jina Request", `Target: ${comp.url}`, `Endpoint: https://r.jina.ai/${comp.url}`);
                        onLog("Jina Raw Trace", `${comp.title.substring(0, 30)}...`, `RECIBIDO (${data.content?.length || 0} bytes):\n\n${(data.content || "").substring(0, 1000)}...`);
                    }

                    if (wordCount < 100) {
                        if (onLog) onLog("Aviso", `${comp.title.substring(0, 20)}...`, `Contenido muy corto (${wordCount} pal.). Ignorado.`);
                        throw new Error(`Too short: ${wordCount}`);
                    }
                    if (onLog) onLog(`IA`, `${comp.title.substring(0, 20)}...`, `Analizando y estructurando con Helios (Gemini 3.1 Flash)...`);
                    
                    const rawContent = (data.content || "").substring(0, 100000); // Safety limit
                    const rawWords = rawContent.split(/\s+/).length;
                    console.log(`[Jina] Extraído: ${comp.title.substring(0, 30)}... (${rawContent.length} bytes, ${rawWords} palabras)`);

                    const cleanRes = await aiRouter.generate({
                        model: "llama-3.3-70b-versatile", 
                        prompt: `Eres "Helios", el motor de extracción inteligente de Nous. 
Has recibido una masa de TEXTO PLANO (formato sucio) extraída de un competidor: "${comp.title}".

TU OBJETIVO: 
1. Limpiar y Estructurar: Convierte el texto útil en un Markdown impecable (H1, H2, H3, listas, tablas si existen).
2. Curación de Contenido: Extrae datos técnicos, especificaciones, descripciones y beneficios. Elimina menús, pies de página, cookies y basura publicitaria.
3. Visión de Nous: Genera un resumen estratégico de 2-3 frases que sintetice el valor de este competidor.
4. Mapa de Navegación: Identifica los encabezados principales encontrados.

RETORNA ÚNICAMENTE UN OBJETO JSON:
{
  "content": "Contenido ÚTIL en Markdown estructurado",
  "summary": "Resumen estratégico (Visión de Nous)",
  "headers": [
     {"tag": "h1", "text": "Título"},
     {"tag": "h2", "text": "Sección..."}
  ]
}

TEXTO EN BRUTO RECIBIDO:
${rawContent}`,
                        systemPrompt: "Eres un experto en extracción de datos SEO y arquitectura de información.",
                        jsonMode: true
                    });

                    const extracted = safeJsonExtract<any>(cleanRes.text, { 
                        content: rawContent, 
                        summary: rawContent.substring(0, 200),
                        headers: []
                    });
                    
                    const finalContent = extracted.content || rawContent;
                    const finalWords = finalContent.split(/\s+/).length;

                    if (onLog) onLog(`Éxito`, `${comp.title.substring(0, 30)}...`, `Estructurado: ${finalWords} pal.`);
                    
                    return { 
                        url: comp.url, 
                        title: comp.title, 
                        content: finalContent, 
                        summary: extracted.summary,
                        headers: extracted.headers,
                        wordCount: finalWords
                    };
                } catch (e: any) {
                    if (onLog && !e.message?.includes("Too short")) {
                        onLog("Aviso", `Error en extracción: ${comp.title.substring(0,20)}`, e.message);
                    }
                    return { error: e.message, isInvalid: true } as any;
                }
            }));
            results.forEach(r => { if (r.status === 'fulfilled' && !(r.value as any).isInvalid) scrapedSEO.push(r.value); });
        }
    }
    const validSEO = scrapedSEO.filter(s => !!s.content);

    // --- CHECKPOINT 2: Guardamos contenidos extraídos ---
    if (validSEO.length > 0) {
        await updateTask({
            research_dossier: { 
                ...baseResult, 
                competitors: validSEO.map(v => ({ url: v.url, title: v.title.substring(0, 60), summary: v.summary, content: v.content })),
                status: "contenido_extraido" 
            }
        });
        if (onLog) onLog("Checkpoint", "Contenidos de referencia guardados.", "OK");
    }

    if (onLog) onLog("Fase 3 (Extracción)", `Extracción completada en ${((Date.now() - stageScrapeStart) / 1000).toFixed(1)}s`, `Éxito en ${validSEO.length} fuentes.`);

    // 3. LSI Refinado (Agnóstico pero limpio)
    if (onProgress) onProgress("keywords");
    const stageLSIStart = Date.now();
    let cleanedLSI: any[] = [];
    const allValidTexts = validSEO.map(v => v.content);
    
    if (allValidTexts.length > 0) {
        if (onLog) onLog("Fase 4 (LSI)", "Calculando relevancia semántica (TF-IDF)...", "N/A");
        const rawTfidf = calculateTFIDF(allValidTexts);
        console.log(`[TF-IDF] Analizadas ${allValidTexts.length} fuentes. Top 10 crudo:`, rawTfidf.slice(0, 10).map(t => t.keyword));

        // 1. Deduplicate raw TF-IDF before sending (AI usually gets 50)
        const uniqueRawKws = Array.from(new Set(rawTfidf.map((t: any) => t.keyword.trim().toLowerCase()))).slice(0, 50);
        
        const lsiPrompt = `Limpia estos términos LSI para "${keyword}": ${uniqueRawKws.join(", ")}
Reglas: 1. Solo conceptos de valor real. 2. Sin navegación/cookies. 3. Sin marcas.
Responde ÚNICAMENTE con la lista de palabras separadas por comas, sin explicaciones ni JSON.`;

        const lsiRes = await executeWithGroq(lsiPrompt, "Filtrador SEO experto.", "qwen/qwen3-32b", false);
        
        // Normalizar y limpiar la lista de palabras
        // 2. Clear AI response with strict Deduplication
        const wordList = Array.from(new Set(
            lsiRes.split(',')
                .map((w: string) => w.trim())
                .filter((w: string) => w.length > 2)
        ));
        console.log(`[IA-LSI] Palabras clave curadas por IA (Unicas):`, wordList);

        const topScore = Math.max(...rawTfidf.map((t: any) => t.score), 0.0001);
        
        const finalMap = new Map<string, any>();
        for (const word of (wordList as string[])) {
            const normalizedWord = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            if (finalMap.has(normalizedWord)) continue;

            const match = rawTfidf.find((t: any) => t.keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === normalizedWord);
            
            const rawScore = match ? parseFloat(match.score.toString()) : (topScore * 0.1);
            const normalized = Number((rawScore / topScore).toFixed(2));

            finalMap.set(normalizedWord, {
                keyword: word,
                relevance: Math.min(1, normalized),
                count: Math.min(1, normalized)
            });
        }
        
        cleanedLSI = Array.from(finalMap.values());
        
        if (onLog) onLog("Fase 4 (LSI)", `Priorización matemática completada (${cleanedLSI.length} únicas).`, JSON.stringify(cleanedLSI.slice(0, 10)));
    }

    // 4. Síntesis de Metadatos y Dossier
    if (onProgress) onProgress("metadata");
    const stageMetaStart = Date.now();
    if (onLog) onLog("Fase 5-6 (Metadatos)", "Generando síntesis estratégica...", "N/A");
    
    const metadataPrompt = `Crea la estrategia SEO final para "${keyword}". 
LSI (Palabras clave sugeridas): ${cleanedLSI.slice(0, 40).map(l => (l as any).keyword).join(", ")}
Fuentes analizadas: ${validSEO.length}
Resumen de competidores: ${validSEO.slice(0, 10).map(v => v.title.substring(0, 100)).join(", ")}

REGLAS ESTRATÉGICAS:
1. El H1 debe ser atractivo, contener la keyword principal y generar curiosidad.
2. La meta_description debe ser persuasiva (CTR) y resumir el valor del artículo.
3. recommendedWordCount: Sugiere un número realista basado en la competencia analizada.
4. detailed_structure: Crea un esquema lógico de H2s y puntos clave bajo cada uno (mínimo 4 secciones H2).

Retorna ÚNICAMENTE un objeto JSON con este formato: {
  "h1": "Título H1", 
  "seo_title": "Título para Google", 
  "slug": "url-amigable", 
  "meta_description": "Descripción persuasiva", 
  "extracto": "Resumen breve para el lector", 
  "recommendedWordCount": 1500,
  "detailed_structure": [{"h2": "Título del H2", "points": ["Punto 1", "Punto 2"]}]
}`;

    const metaRes = await aiRouter.generate({
        prompt: metadataPrompt,
        model: "llama-3.3-70b-versatile",
        systemPrompt: "Director de Estrategia SEO.",
        jsonMode: true
    });
    const seoMetadata = safeJsonExtract<any>(metaRes.text, {});
    console.log(`[IA-Metadata] Estrategia generada. H1: "${seoMetadata.h1}", Slug: "${seoMetadata.slug}"`);
    
    // --- CHECKPOINT 3: Guardamos Metadatos Estratégicos ---
    await updateTask({
        h1: seoMetadata.h1,
        seo_title: seoMetadata.seo_title,
        meta_description: seoMetadata.meta_description,
        excerpt: seoMetadata.extracto,
        target_url_slug: seoMetadata.slug,
        target_word_count: parseInt(String(seoMetadata.recommendedWordCount)) || parseInt(String(baseResult.recommendedWordCount)) || 1500,
        outline_structure: seoMetadata.detailed_structure || []
    });
    if (onLog) onLog("Checkpoint", "Estrategia SEO guardada en la tarea.", "OK");

    if (onLog) onLog("Fase 5-6 (Metadatos)", `Dossier finalizado en ${((Date.now() - stageMetaStart) / 1000).toFixed(1)}s`, JSON.stringify(seoMetadata));

    const wordCountGoal = parseInt(String(seoMetadata.recommendedWordCount)) || parseInt(String(baseResult.recommendedWordCount)) || 1500;

    // 5. Interlinking Semántico (Fase 7)
    const stage7Start = Date.now();
    let suggestedLinks: any[] = [];
    if (projectId) {
        if (onLog) onLog("Fase 7 (Internado)", "Analizando catálogo dinámico por arquitectura...", "Cargando reglas de proyecto");
        try {
            // 1. Cargamos las reglas de arquitectura del proyecto para no tener nada harcodeado
            const { data: project } = await supabase
                .from('projects')
                .select('architecture_rules')
                .eq('id', projectId)
                .single();
            
            const rules = (project?.architecture_rules as any[]) || [];
            
            // Si no hay reglas, usamos un fallback genérico que no bloquee
            // 2. Preparamos los términos de búsqueda (Regex)
            const rawTerms = [
                ...keyword.split(/\s+/),
                ...cleanedLSI.map(l => (l as any).keyword?.split(/\s+/)).flat()
            ].filter(w => w && w.length > 3).map(w => (w as string).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            const allTerms = Array.from(new Set(rawTerms)).slice(0, 15);
            const searchRegex = allTerms.join('|');

            // 3. Consulta vía RPC optimizado de base de datos
            const { data: units, error: rpcError } = await supabase.rpc('get_semantic_inventory_matches', { 
                p_project_id: projectId,
                p_regex: searchRegex,
                p_limit: 50
            });
            
            if (rpcError) throw rpcError;
            
            if (units && units.length > 0) {
                const highLsi = cleanedLSI.filter(l => (l as any).count === "Alto").map(l => (l as any).keyword).join(", ");
                const linkPrompt = `ESTRATEGIA DE INTERLINKING PARA: "${keyword}"
H1 PROPUESTO: "${seoMetadata.h1}"
RESUMEN: "${seoMetadata.extracto}"
KEYWORDS LSI CLAVE: ${highLsi}

CATÁLOGO DISTRIBUIDO POR CATEGORÍAS (Blog, Productos, Colecciones...):
${JSON.stringify(units.map((u: any) => ({ 
    title: u.title.substring(0, 60), 
    url: u.url, 
    category: u.category 
})))}

REGLAS:
1. Elige los 5 artículos del catálogo que mejor conecten semánticamente.
2. Intenta variar entre categorías (ej: un link a un producto, un link a un blog relacionado).
4. Si no encuentras nada relevante, retorna un array vacío.

Retorna ÚNICAMENTE un objeto JSON: {"links": [{"url", "title", "anchor_text"}]}`;

                const linkRes = await aiRouter.generate({
                    prompt: linkPrompt,
                    model: "llama-3.3-70b-versatile",
                    systemPrompt: "Arquitecto de Interlinking SEO.",
                    jsonMode: true
                });
                const linkData = safeJsonExtract<any>(linkRes.text, { links: [] });
                suggestedLinks = Array.isArray(linkData.links) ? linkData.links : [];
                console.log(`[IA-Interlinking] Seleccionados ${suggestedLinks.length} enlaces internos:`, suggestedLinks.map(l => l.url));
            }
        } catch (e: any) {
            if (onLog) onLog("Error Internado", `Fallo en interlinking: ${e.message}`, "N/A");
        }
    }
    if (onLog) onLog("Fase 7 (Internado)", `Completada en ${((Date.now() - stage7Start) / 1000).toFixed(1)}s`, `Seleccionados ${suggestedLinks.length} enlaces estratégicos.`);

    // --- FASE 8: ARQUITECTURA FINAL (OUTLINE ESTRATÉGICO) ---
    if (onLog) onLog("Fase 8 (Outline)", "Diseñando arquitectura de contenidos con Gemini 3.1 Flash Lite...", "N/A");
    
    const finalOutline = await generateContentOutline({
        keyword,
        seoMetadata,
        cleanedLSI,
        suggestedLinks,
        validSEO,
        wordCountGoal
    });

    if (onLog) onLog("Fase 8 (Outline)", "Arquitectura finalizada.", `Generado outline de ${finalOutline.length} secciones.`);
    if (onLog) onLog("✅ Investigación Finalizada", `Total: ${((Date.now() - globalStartTime) / 1000).toFixed(1)}s`, "Dossier Listo");

    const finalResult = { 
        ...baseResult, 
        ...seoMetadata, 
        lsiKeywords: cleanedLSI, 
        suggestedInternalLinks: suggestedLinks, 
        suggested_links: suggestedLinks,
        strategyOutline: finalOutline, // New consolidated field
        competitors: validSEO.map(v => ({ url: v.url, title: v.title.substring(0, 60), summary: v.summary })),
        research_dossier: { 
            ...baseResult, 
            lsiKeywords: cleanedLSI, 
            keywordIdeas: baseResult.keywordIdeas || [], // Explicitly include keyword ideas
            suggestedInternalLinks: suggestedLinks,
            suggested_links: suggestedLinks,
            seoMetadata,
            strategyOutline: finalOutline,
            fullCompetitorAnalysis: validSEO.map(v => ({ url: v.url, title: v.title.substring(0, 60), summary: v.summary }))
        }, 
        status: "por_redactar",
        h1: seoMetadata.h1,
        seo_title: seoMetadata.seo_title,
        meta_description: seoMetadata.meta_description,
        excerpt: seoMetadata.extracto,
        target_url_slug: seoMetadata.slug,
        target_word_count: wordCountGoal,
        outline_structure: finalOutline
    };

    await updateTask({
        h1: seoMetadata.h1,
        seo_title: seoMetadata.seo_title,
        meta_description: seoMetadata.meta_description,
        excerpt: seoMetadata.extracto,
        target_url_slug: seoMetadata.slug,
        target_word_count: wordCountGoal,
        outline_structure: finalOutline, // Updated to the new full outline
        research_dossier: finalResult.research_dossier,
        status: "por_redactar"
    });
    
    return finalResult;
};

/**
 * Standalone generator for the strategy outline.
 * Can be called during full research or independently for regeneration.
 */
export const generateContentOutline = async (params: {
    keyword: string,
    seoMetadata: any,
    cleanedLSI: any[],
    suggestedLinks: any[],
    validSEO: any[],
    wordCountGoal: number
}): Promise<any[]> => {
    const { keyword, seoMetadata, cleanedLSI, suggestedLinks, validSEO, wordCountGoal } = params;
    
    try {
        const competitorHeaders = validSEO.slice(0, 8).map(v => `### FUENTE: ${v.title}\n${extractHeaders(v.content)}`).join('\n\n');
        const highLsi = cleanedLSI.slice(0, 30).map(l => (l as any).keyword).join(", ");

        const outlinePrompt = `ESTRATEGIA PROFUNDA DE CONTENIDOS PARA: "${keyword}"
OBJETIVO: Crear el mejor artículo del nicho superando a la competencia.

METADATOS PROPUESTOS:
H1: "${seoMetadata.h1}"
SEO TITLE: "${seoMetadata.seo_title}"
SLUG: "${seoMetadata.slug}"
DESC: "${seoMetadata.meta_description}"
EXTRACTO: "${seoMetadata.extracto}"
WORD COUNT OBJETIVO: ${wordCountGoal} palabras.

KEYWORDS LSI PRIORITARIAS:
${highLsi}

ENLACES INTERNOS A INTEGRAR (POOL):
${JSON.stringify(suggestedLinks.slice(0, 15))}

ESTRUCTURA DE COMPETIDORES RELEVANTES:
${competitorHeaders}

REGLAS PARA EL OUTLINE:
1. Diseña una estructura lógica y fluida de H2s y H3s (mínimo 6 secciones).
2. Para cada sección, define:
   - "type" (H2 o H3).
   - "text" (el título del encabezado).
   - "wordCount" (objetivo de palabras para esa sección específica).
   - "notes" (Instrucciones para el redactor, puntos clave Y sugerencia de qué enlace del POOL colocar aquí si encaja naturalmente).
3. Asegúrate de que el total de wordCount de las secciones sume aproximadamente ${wordCountGoal}.

RESPONDE ÚNICAMENTE CON UN ARRAY JSON (sin markdown):
[{"type": "H2", "text": "Título de Sección", "wordCount": "300", "notes": "Foco en..."}]`;

        let outlineRes = "";
        
        // MASTER FALLBACK CASCADE: The orchestrator handles Gemini + Groq rotation.
        // We label it as 'research' so it follows the Research Hierarchy.
        try {
            outlineRes = await executeWithKeyRotation(
                async (client, model) => {
                    const modelObj = client.getGenerativeModel({
                        model,
                        systemInstruction: "Experto en arquitectura de contenidos y SEO.",
                        generationConfig: {
                            responseMimeType: "application/json",
                            temperature: 0.2
                        }
                    });
                    const res = await modelObj.generateContent(outlinePrompt);
                    return res.response.text();
                },
                "llama-3.3-70b-versatile", // Start with this, but allow rotation
                undefined,
                undefined,
                false,
                "Investigación Outline SEO" // This label triggers the research hierarchy (Gemini -> Groq)
            );
        } catch (e1: any) {
            console.warn("[OUTLINE-FALLBACK] Orchestrator exhausted. Final attempt with fast Groq...", e1?.message);
            // Absolute last resort: Force a fast model
            outlineRes = await executeWithKeyRotation(
                async (client, model) => {
                    const modelObj = client.getGenerativeModel({ model });
                    const res = await modelObj.generateContent(outlinePrompt);
                    return res.response.text();
                },
                "llama-3.1-8b-instant",
                undefined,
                undefined,
                true, // Strict model for the very last attempt
                "Fallback Final Outline"
            );
        }

        let parsed = safeJsonExtract<any[]>(outlineRes, []);
        
        const finalParsed = parsed.map(item => ({
            type: item.type || 'H2',
            text: item.text || 'Sección sin título',
            wordCount: String(item.wordCount || '200'),
            notes: item.notes || '',
            currentWordCount: 0
        })).filter(Boolean);

        // FINAL SAFETY: If absolutely everything failed, provide a generic structure
        if (finalParsed.length === 0) {
            console.warn("[OUTLINE-CRITICAL] Returning emergency structure.");
            return [
                { type: 'H2', text: `Introducción a ${keyword}`, wordCount: '250', notes: 'Visión general.', currentWordCount: 0 },
                { type: 'H2', text: 'Análisis y Desarrollo', wordCount: '600', notes: 'Puntos clave.', currentWordCount: 0 },
                { type: 'H2', text: 'Conclusión', wordCount: '200', notes: 'Resumen final.', currentWordCount: 0 }
            ];
        }

        return finalParsed as any[];

    } catch (e: any) {
        console.error("Error generating outline:", e);
        // Fallback al detailed_structure de la fase 6 si esta falla
        const fallback = (seoMetadata.detailed_structure || []).slice(0, 8).map((s: any) => ({
            type: 'H2',
            text: s.h2 || 'Sección',
            wordCount: '250',
            notes: (s.points || []).join('. '),
            currentWordCount: 0
        }));

        if (fallback.length === 0) {
            return [
                { type: 'H2', text: `Guía sobre ${keyword}`, wordCount: '500', notes: 'Estructura por defecto.', currentWordCount: 0 },
                { type: 'H2', text: 'Preguntas Frecuentes', wordCount: '300', notes: 'FAQs.', currentWordCount: 0 }
            ];
        }
        return fallback;
    }
};

/**
 * Generador bajo demanda de Schemas para el maquetador profundo.
 * Analiza el contenido final y detecta FAQs para generar JSON-LD.
 */
export const generateArticleSchemas = async (title: string, body: string) => {
    const prompt = `Analiza este artículo y genera los Schemas SEO (JSON-LD) correspondientes.
DETECCIÓN: Si encuentras preguntas y respuestas claras, genera un FAQPage Schema además del Article Schema.
TÍTULO: ${title}
CONTENIDO: ${body.substring(0, 6000)}

Retorna ÚNICAMENTE un objeto JSON: {"schemas": [...aquí los objetos de schema.org...]}`;

    try {
        const response = await executeWithGroq(
            prompt, 
            "Experto en Datos Estructurados y Schema.org.", 
            "llama-3.3-70b-versatile", 
            true
        );
        const data = safeJsonExtract<{ schemas: any[] }>(response, { schemas: [] });
        return data.schemas;
    } catch (e) {
        console.error("Error generating schemas:", e);
        return [];
    }
};

export const selectTopCompetitorsViaAI = async (keyword: string, competitors: CompetitorDetail[]): Promise<string[]> => {
    const list = competitors.map((c, i) => ({ index: i, url: c.url, title: c.title }));
    const prompt = `Selecciona los TOP 10 competidores para "${keyword}": ${JSON.stringify(list)}. 

Retorna ÚNICAMENTE un objeto JSON: {"urls": ["url1", "url2", ...]}`;
    const rawRes = await executeWithGroq(
        prompt,
        "Eres un analista SEO. Selecciona los mejores competidores. Retorna ÚNICAMENTE un objeto JSON.",
        "llama-3.3-70b-versatile",
        true
    );
    const data = safeJsonExtract<any>(rawRes, { urls: [] });
    return Array.isArray(data.urls) ? data.urls : [];
};

export const selectSemanticInternalLinks = async (keyword: string, pool: any[], maxLinks: number = 10, onLog?: (p: string, pr: string) => void, context?: string, modelName: string = 'gemini-3.1-flash-lite-preview'): Promise<any[]> => {
    const list = pool.map((p, i) => `[ID:${i}] ${p.url} - ${p.title}`).join('\n');
    const prompt = `Selecciona páginas RELEVANTES para "${keyword}".\nContexto: ${context}\nCandidatos:\n${list}\nRetorna ÚNICAMENTE un objeto JSON: {"links": [{"url", "title", "anchor_text"}]}`;
    const rawRes = await executeWithGroq(
        prompt,
        "Eres un experto en arquitectura web e interlinking. Selecciona las páginas más relevantes. Retorna ÚNICAMENTE un objeto JSON.",
        "llama-3.3-70b-versatile",
        true
    );
    const data = safeJsonExtract<any>(rawRes, { links: [] });
    return Array.isArray(data.links) ? data.links : [];
};
