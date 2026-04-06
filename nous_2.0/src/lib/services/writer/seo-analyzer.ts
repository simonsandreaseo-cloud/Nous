import { calculateTFIDF } from "@/lib/services/tfidf";
import { fetchSerperSearch } from "@/lib/services/serper";
import { fetchJinaExtraction } from "@/lib/services/jina";
import { executeWithKeyRotation } from "./ai-core";
import { SchemaType as Type } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";
import { useWriterStore } from "@/store/useWriterStore";
import { safeJsonExtract } from "@/utils/json";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
    SEOAnalysisResult, 
    CompetitorDetail, 
    DeepSEOAnalysisResult 
} from "./types";

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

import { executeWithGroq } from "@/lib/services/groq";

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
    isFastMode?: boolean; // New flag for ultra-rapid research
}

const stopwords = new Set(['para', 'como', 'con', 'desde', 'hasta', 'sobre', 'bajo', 'entre', 'ante', 'cabe', 'tras', 'mediante', 'durante', 'según', 'hacia', 'vía', 'plus', 'minus', 'per', 'pro', 're', 'sans', 'sub', 'super', 'trans', 'ultra', 'vice']);

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
    // Normalization has already happened in the caller (runSEOAnalysis), so every result has .url
    const list = preFiltered.slice(0, 15).map((r, i) => `[${i}] ${r.title} - ${r.url}`).join('\n');
    const prompt = `Filtra los resultados más RELEVANTES e INFORMATIVOS para "${keyword}". Evita Amazon o puras tiendas. Retorna array JSON de indices [0, 2, 5...]:\n${list}`;
    
    return executeWithKeyRotation(async (ai) => {
        const model = ai.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview', generationConfig: { responseMimeType: "application/json" } });
        try {
            const res = await model.generateContent(prompt);
            const rawResponse = res.response.text();
            const rawIds = safeJsonExtract<any[]>(rawResponse, []);
            
            // SANITIZATION: Convert indices to numbers (handles ["0", "1"] and [0, 1])
            const ids = rawIds.map(id => Number(id)).filter(id => !isNaN(id));
            
            if (onLog) onLog("Filtro Calidad (Respuesta)", JSON.stringify(ids), rawResponse);
            
            const filtered = preFiltered.filter((_, i) => ids.includes(i)).slice(0, 8);
            
            // FALLBACK: If AI filtering returned nothing, don't break the process, use top organic results
            if (filtered.length === 0) {
                if (onLog) onLog("Sistema", "Filtro de calidad vacío. Usando top 8 resultados orgánicos como fallback.");
                return preFiltered.slice(0, 8);
            }
            
            return filtered;
        } catch (e: any) {
            if (onLog) onLog("Error Filtro", `No se pudieron filtrar resultados: ${e.message}. Usando fallback.`);
            return preFiltered.slice(0, 8);
        }
    }, 'gemini-3.1-flash-lite-preview', undefined, undefined, false, 'Filtro Calidad', 60000);
};

export const runSEOAnalysis = async (keyword: string, onLog?: (p: string, pr: string, res?: string) => void): Promise<SEOAnalysisResult> => {
    const intentPrompt = `Eres un experto en investigación de keywords. Genera un QUERY DE BÚSQUEDA en Google que encuentre los mejores artículos informativos para el keyword: "${keyword}". Retorna ÚNICAMENTE el query.`;
    
    const smartQuery = await executeWithKeyRotation(async (ai) => {
        const model = ai.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
        const res = await model.generateContent(intentPrompt);
        return res.response.text().trim();
    }, 'gemini-3.1-flash-lite-preview', undefined, undefined, false, 'Intento de Búsqueda', 75000);

    if (onLog) onLog("Query Google", smartQuery, "N/A"); // smartQuery is the data here, might map differently in logs

    // PHASE 1: Búsqueda con query inteligente
    let rawResults = (await fetchSerperSearch(smartQuery)).map(r => ({
        ...r,
        url: r.link || r.url // Normalizar propiedad link de Serper a url
    }));
    
    // FALLBACK REFORZADO: Si la IA genera un query demasiado restrictivo (< 5 resultados), usar el keyword original
    if (!rawResults || rawResults.length < 5) {
        if (onLog) onLog("Sistema", `Resultados insuficientes (${rawResults.length}). Reintentando con keyword original...`);
        const fallbackResults = (await fetchSerperSearch(keyword)).map(r => ({
            ...r,
            url: r.link || r.url // Normalizar fallback también
        }));
        if (fallbackResults.length > rawResults.length) {
            rawResults = fallbackResults;
        }
    }
    
    // SAFETY: Si AMBOS fallaron completamente, handle it
    if (!rawResults || rawResults.length === 0) {
        if (onLog) onLog("Error SERP", "No se encontraron resultados en Google ni con query inteligente ni con fallback.");
        throw new Error("No organic search results found.");
    }

    const filtered = await filterQualityResults(rawResults, keyword, onLog);

    const analysisPrompt = `Analiza el panorama SEO para "${keyword}" basándote en estos resultados: ${JSON.stringify(filtered)}. Retorna JSON con: nicheDetected, keywordIdeas, frequentQuestions, recommendedWordCount.`;

    const aiAnalysis = await executeWithKeyRotation(async (ai, currentModel) => {
        const model = ai.getGenerativeModel({ model: currentModel, generationConfig: { responseMimeType: "application/json" } });
        const res = await model.generateContent(analysisPrompt);
        const rawRes = res.response.text();
        const parsed = safeJsonExtract<SEOAnalysisResult>(rawRes, {} as SEOAnalysisResult);
        if (onLog) onLog("Análisis SEO (Resultados)", `Detección completada`, rawRes);
        return parsed;
    }, 'gemini-3.1-flash-lite-preview', undefined, undefined, false, 'Análisis SEO', 90000);

    // FIX: NEVER rely on AI to re-list URLs. Always attach the filtered ones.
    return {
        ...aiAnalysis,
        top10Urls: filtered.slice(0, 8), // Ensure these are the ones we scrape
        top20Urls: filtered
    };
};

export const runDeepSEOAnalysis = async (config: DeepSEOConfig) => {
    const { 
        keyword, 
        serperKey, 
        jinaKey, 
        projectId, 
        csvData = [], 
        taskId, 
        onProgress, 
        onLog, 
        modelName = 'gemini-2.5-flash',
        isFastMode = false
    } = config;

    const jKey = jinaKey || process.env.NEXT_PUBLIC_JINA_API_KEY || "";

    const globalStartTime = Date.now();
    if (onLog) onLog("Investigación", `Iniciando Deep SEO para: "${keyword}"`, "PROCESO ACTIVADO");

    // Phase 1-2: SERP & Intent
    const stage1Start = Date.now();
    if (onProgress) onProgress("serp");
    const baseResult = await runSEOAnalysis(keyword, onLog);
    if (onLog) onLog("Fase 1 (SERP)", `Completada en ${((Date.now() - stage1Start) / 1000).toFixed(1)}s`, JSON.stringify(baseResult.top10Urls));

    // Phase 3: Scraping & Content (Omitido en Modo Rápido)
    const stage3Start = Date.now();
    const scrapedSEO: CompetitorDetail[] = [];

    if (isFastMode) {
        if (onProgress) onProgress("scraping");
        if (onLog) onLog("Modo Rápido", "Saltando scraping profundo. Usando snippets de Serper.", "GROQ ACTIVADO");
        
        (baseResult.top10Urls || []).forEach(comp => {
            scrapedSEO.push({
                url: comp.url,
                title: comp.title,
                content: comp.snippet || "",
                summary: comp.snippet || ""
            });
        });
    } else {
        if (onProgress) onProgress("scraping");
        
        // REDUNDANCY: Always use the URLs from baseResult
        const competitors = baseResult.top10Urls || [];
        if (onLog) onLog("Sistema", `Analizando ${competitors.length} competidores SEO en paralelo.`, JSON.stringify(competitors.map(c => c.url)));
        
        if (competitors.length > 0) {
            // We use a small stagger delay (300ms) to avoid "Burst" rate limits from Jina/Proxy
            const scrapeResults = await Promise.allSettled(competitors.slice(0, 8).map(async (comp, idx) => {
                if (!comp.url || !comp.url.startsWith('http')) {
                    return { url: comp.url, title: comp.title, isInvalid: true } as any;
                }

                try {
                    // Stagger delay
                    // Aumento de Stagger a 1000ms para respetar límites de Jina proxy
                    await new Promise(resolve => setTimeout(resolve, idx * 1000));
                    
                    const scrapingPhase = `Scraping ${idx + 1}/${competitors.slice(0,8).length}`;
                    
                    // FILTRO DE SEGURIDAD: Descartar URLs de Grounding/Redirecciones de Google si llegaran a colarse
                    if (comp.url.includes('google.com/url') || comp.url.includes('grounding-api-redirect')) {
                        if (onLog) onLog(scrapingPhase, `URL Descartada`, comp.url);
                        return { url: comp.url, title: comp.title, isInvalid: true, reason: 'Google Redirect Link' } as any;
                    }

                    if (onLog) onLog(scrapingPhase, `Iniciando extracción`, comp.url);
                    
                    const data = await fetchJinaExtraction(comp.url, jKey);
                    
                    if (onLog) onLog(`Éxito ${idx + 1}`, `${comp.title.substring(0, 30)}...`, data.content?.substring(0, 500));
                    return { 
                        url: comp.url, 
                        title: comp.title, 
                        content: data.content,
                        summary: data.title + ": " + data.content?.substring(0, 300)
                    };
                } catch (innerE: any) {
                    if (onLog) onLog(`Descarte ${idx + 1}`, `${comp.url.substring(0, 30)}`, innerE.message);
                    // LOGICA DE FALLBACK: Si falla Jina, usamos el snippet como contenido mínimo
                    return { 
                        url: comp.url, 
                        title: comp.title, 
                        content: comp.snippet || "", 
                        summary: `(Fallback Snippet) ${comp.snippet}`,
                        isPartial: true 
                    } as any;
                }
            }));
            scrapeResults.forEach(res => {
                if (res.status === 'fulfilled') scrapedSEO.push(res.value);
            });
        }
    }

    const validSEO = scrapedSEO.filter(c => !c.isInvalid);
    if (onLog) onLog("Fase 3 (Extracción)", `Completada en ${((Date.now() - stage3Start) / 1000).toFixed(1)}s`, `Éxito en ${validSEO.length} fuentes.`);

    // Phase 4: LSI Cleaning
    const stage4Start = Date.now();
    if (onProgress) onProgress("keywords");
    let cleanedLSI: any[] = [];
    const allValidTexts = validSEO.map(c => c.content || "");
    if (allValidTexts.length > 0) {
        const rawTfidf = calculateTFIDF(allValidTexts);
        if (onLog) onLog("Sistema", `Términos TF-IDF calculados`, JSON.stringify(rawTfidf.slice(0, 10)));
        
        const cleanPrompt = `Limpia y categoriza términos semánticos para "${keyword}": ${JSON.stringify(rawTfidf.map((t: any) => t.keyword))}\nRetorna JSON array: [{"keyword": "...", "count": "Alto/Medio/Bajo"}]`;
        
        if (isFastMode) {
            const rawRes = await executeWithGroq(cleanPrompt, "Eres un experto en análisis semántico. Retorna ÚNICAMENTE JSON.", "llama-3.1-8b-instant", true);
            cleanedLSI = safeJsonExtract<any[]>(rawRes, []);
            if (onLog) onLog("LSI (Groq)", `LSI Refinado por Groq`, rawRes);
        } else {
            cleanedLSI = await executeWithKeyRotation(async (ai, currentModel) => {
                const model = ai.getGenerativeModel({ model: currentModel, generationConfig: { responseMimeType: "application/json" } });
                const res = await model.generateContent(cleanPrompt);
                const rawRes = res.response.text();
                const results = safeJsonExtract<any[]>(rawRes, []);
                if (onLog) onLog("LSI Detectado", `LSI Refinado por AI`, rawRes);
                return results;
            }, modelName, undefined, undefined, false, 'Limpieza LSI', 90000);
        }
    }
    if (onLog) onLog("Fase 4 (LSI)", `Completada en ${((Date.now() - stage4Start) / 1000).toFixed(1)}s`, JSON.stringify(cleanedLSI.slice(0, 10)));

    // Phase 5-6: Metadata
    const stage5Start = Date.now();
    if (onProgress) onProgress("metadata");
    const synthesisPrompt = `Genera la estrategia SEO definitiva para "${keyword}".\nContexto: ${validSEO.slice(0, 3).map(c => c.summary).join(". ")}\nLSI: ${JSON.stringify(cleanedLSI)}\nRetorna JSON: {"h1": "...", "seo_title": "...", "slug": "...", "meta_description": "...", "extracto": "...", "schemas": []}`;
    
    let seoMetadata: SEOMetadata;

    if (isFastMode) {
        const rawRes = await executeWithGroq(synthesisPrompt, "Eres un estratega SEO experto. Retorna ÚNICAMENTE JSON.", "llama-3.1-8b-instant", true);
        seoMetadata = safeJsonExtract<SEOMetadata>(rawRes, {} as SEOMetadata);
        if (onLog) onLog("Metadatos (Groq)", `Síntesis ultrarápida finalizada`, rawRes);
    } else {
        seoMetadata = await executeWithKeyRotation(async (ai, currentModel) => {
            const model = ai.getGenerativeModel({ model: currentModel, generationConfig: { responseMimeType: "application/json" } });
            const res = await model.generateContent(synthesisPrompt);
            const rawRes = res.response.text();
            const data = safeJsonExtract<SEOMetadata>(rawRes, {} as SEOMetadata);
            if (onLog) onLog("Metadatos Generados", `Síntesis finalizada`, rawRes);
            return data;
        }, modelName, undefined, undefined, false, 'Síntesis SEO', 120000);
    }
    if (onLog) onLog("Fase 5-6 (Metadatos)", `Completada en ${((Date.now() - stage5Start) / 1000).toFixed(1)}s`, JSON.stringify(seoMetadata));

    // Phase 7: Internal Links
    const stage7Start = Date.now();
    let suggestedLinks: any[] = [];
    if (projectId) {
        try {
            const lsiTerms = cleanedLSI?.map((l: any) => l.keyword) || [];
            const atomicTerms = Array.from(new Set([keyword, ...lsiTerms])).flatMap((t: any) => (t as string).toLowerCase().split(/\s+/).filter((w: any) => (w as string).length > 3 && !stopwords.has(w as string)));
            const postgresRegex = atomicTerms.join('|');
            
            const { data: rpcPool } = await supabase.rpc('get_semantic_inventory_matches', { p_project_id: projectId, p_regex: postgresRegex, p_limit: 150 });
            let combinedPool = rpcPool || [];
            if (onLog) onLog("Sistema", `Enlaces internos: ${combinedPool.length} candidatos encontrados.`, JSON.stringify(combinedPool.slice(0, 50)));
            if (combinedPool.length > 0) {
                suggestedLinks = await selectSemanticInternalLinks(keyword, combinedPool, 15, onLog, JSON.stringify({ metadata: seoMetadata, lsi: cleanedLSI }), modelName);
            }
        } catch (e) {}
    }
    if (onLog) onLog("Fase 7 (Internado)", `Completada con éxito.`, JSON.stringify(suggestedLinks));

    if (onLog) onLog("✅ Investigación Finalizada", `Total: ${((Date.now() - globalStartTime) / 1000).toFixed(1)}s`, "Dossier Listo");

    const finalResult = {
        ...baseResult, ...seoMetadata, 
        lsiKeywords: cleanedLSI, 
        suggestedInternalLinks: suggestedLinks,
        research_dossier: { ...baseResult, lsiKeywords: cleanedLSI, suggestedInternalLinks: suggestedLinks, seoMetadata },
        status: "por_redactar"
    };

    if (taskId) {
        await supabase.from('tasks').update({
            h1: finalResult.h1,
            seo_title: finalResult.seo_title,
            meta_description: finalResult.meta_description,
            excerpt: finalResult.extracto,
            target_url_slug: finalResult.slug,
            target_keyword: keyword,
            research_dossier: finalResult.research_dossier,
            target_word_count: parseInt(String(finalResult.recommendedWordCount)) || 1500,
            status: "por_redactar"
        }).eq('id', taskId);
    }

    return finalResult;
};

export const selectTopCompetitorsViaAI = async (keyword: string, competitors: CompetitorDetail[]): Promise<string[]> => {
    const list = competitors.map((c, i) => ({ index: i, url: c.url, title: c.title }));
    const prompt = `Selecciona los TOP 10 competidores para "${keyword}": ${JSON.stringify(list)}. Retorna JSON array de URLs.`;
    return executeWithKeyRotation(async (ai, currentModel) => {
        const model = ai.getGenerativeModel({ model: currentModel, generationConfig: { responseMimeType: "application/json" } });
        const res = await model.generateContent(prompt);
        return safeJsonExtract<string[]>(res.response.text(), []);
    }, 'gemini-3.1-flash-lite-preview', undefined, undefined, false, 'Selección Competidores', 60000);
};

export const selectSemanticInternalLinks = async (keyword: string, pool: any[], maxLinks: number = 10, onLog?: (p: string, pr: string) => void, context?: string, modelName: string = 'gemini-3.1-flash-lite-preview'): Promise<any[]> => {
    const list = pool.map((p, i) => `[ID:${i}] ${p.url} - ${p.title}`).join('\n');
    const prompt = `Selecciona páginas RELEVANTES para "${keyword}".\nContexto: ${context}\nCandidatos:\n${list}\nRetorna array JSON [{"url", "title", "anchor_text"}]`;
    
    return executeWithKeyRotation(async (ai, currentModel) => {
        const model = ai.getGenerativeModel({ model: currentModel, generationConfig: { responseMimeType: "application/json" } });
        const res = await model.generateContent(prompt);
        return safeJsonExtract<any[]>(res.response.text(), []);
    }, modelName, undefined, undefined, false, 'Links Semánticos', 90000);
};
