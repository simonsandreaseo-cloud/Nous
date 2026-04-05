import { ContentItem, SEOAnalysisResult, DeepSEOAnalysisResult, CompetitorDetail, ArticleConfig, HumanizerConfig } from "./types";
import { executeWithKeyRotation } from "./ai-core";
import { SchemaType as Type } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";
import { useWriterStore } from "@/store/useWriterStore";

// --- SERP & Content Fetching ---

export const fetchSerperSearch = async (query: string, apiKey: string): Promise<any> => {
    try {
        const res = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ q: query, gl: "es", hl: "es", num: 50, page: 1 })
        });
        if (!res.ok) throw new Error("Serper API Error");
        return await res.json();
    } catch (e) {
        return null;
    }
}

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
    } catch (e) {
        return { volume: "0", difficulty: "N/A" };
    }
};

export const fetchJinaExtraction = async (url: string): Promise<string> => {
    try {
        const apiKey = process.env.NEXT_PUBLIC_JINA_API_KEY || '';
        const res = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'X-Retain-Images': 'none',
                'X-No-Cache': 'true'
            }
        });
        if (!res.ok) return "";
        return await res.text();
    } catch (e) {
        return "";
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
}

export const fetchJinaSearch = async (query: string): Promise<any> => {
    try {
        const apiKey = process.env.NEXT_PUBLIC_JINA_API_KEY || '';
        const url = `https://s.jina.ai/${encodeURIComponent(query)}`;
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'X-Retain-Images': 'none'
            }
        });
        if (!res.ok) throw new Error("Jina AI Error");
        const text = await res.text();
        return { organic_results: [], raw_text: text, source: 'jina' };
    } catch (e) {
        return null;
    }
}

// --- Quality & Semantic Helpers ---

export const filterQualityResults = async (results: any[], keyword: string): Promise<any[]> => {
    if (!results || results.length === 0) return [];
    
    const SOCIAL_DOMAINS = [
        'tiktok.com', 'instagram.com', 'facebook.com', 'pinterest.com', 'twitter.com', 'x.com', 
        'youtube.com', 'linkedin.com', 'reddit.com', 'quora.com', 'etsy.com', 'ebay.com', 'amazon.com',
        'mercadolibre.com', 'shopee.com', 'alibaba.com'
    ];

    const preFiltered = results.filter(r => {
        try {
            const host = new URL(r.link).hostname.toLowerCase();
            return !SOCIAL_DOMAINS.some(d => host.includes(d));
        } catch (e) {
            return true;
        }
    });

    const candidates = preFiltered.map((r, i) => ({ id: i, title: r.title, snippet: r.snippet, link: r.link })).slice(0, 30);
    const prompt = `Actúa como un experto en SEO. Analiza los siguientes candidatos de búsqueda para el keyword "${keyword}". 
    Identifica los resultados que son artículos de blog, guías informativas, noticias o contenido educativo de ALTA CALIDAD. 
    ESTRICTAMENTE DESCARTA: 
    - Páginas de redes sociales (TikTok, Instagram, etc)
    - Sitios de comercio electrónico (Amazon, eBay)
    - Pantallas de login o paywalls
    - Directorios de empresas o cupones
    - Contenido muy breve o sin valor editorial
    
    Retorna ÚNICAMENTE un array JSON con los IDs de los mejores candidatos (máximo 25). 
    Candidatos: ${JSON.stringify(candidates)}`;

    return executeWithKeyRotation(async (ai) => {
        try {
            const modelObj = ai.getGenerativeModel({
                model: 'gemini-2.5-flash',
                generationConfig: { responseMimeType: "application/json" }
            });
            const response = await modelObj.generateContent(prompt);
            let rawText = response.response.text() || "[]";
            const start = rawText.indexOf('[');
            const end = rawText.lastIndexOf(']');
            if (start !== -1 && end !== -1) rawText = rawText.substring(start, end + 1);
            const goodIds = JSON.parse(rawText);
            const filtered = preFiltered.filter((_, index) => goodIds.includes(index));
            return filtered.length > 0 ? filtered.slice(0, 20) : preFiltered.slice(0, 10);
        } catch (e) {
            return preFiltered.slice(0, 10);
        }
    });
}

export const retrieveContext = (allData: ContentItem[], topic: string, keywords: string) => {
    if (!allData || allData.length === 0) return { products: [], collections: [], others: [] };
    const cleanText = (topic + " " + keywords).toLowerCase();
    const terms = cleanText.replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(w => w.length >= 3);

    const scoreItem = (item: ContentItem) => {
        let score = 0;
        const title = item.title || item.url || "";
        const idx = (item.search_index || `${title} ${item.type || 'page'} ${item.url}`).toLowerCase();
        if (idx.includes(topic.toLowerCase())) score += 50;
        terms.forEach(term => { if (idx.includes(term.toLowerCase())) score += 20; });
        if (item.url.length > 150) score -= 5;
        if (item.type === 'collection') score += 5;
        if (item.type === 'product') score += 2;
        return score;
    };

    const scored = allData.map(item => ({ item, score: scoreItem(item) }));
    scored.sort((a, b) => b.score - a.score);
    const relevant = scored.filter(s => s.score > 10);
    const resultPool = relevant.length < 5 ? scored.slice(0, 50) : relevant;

    return {
        products: resultPool.filter(x => x.item.type === 'product').slice(0, 50).map(x => x.item),
        collections: resultPool.filter(x => x.item.type === 'collection').slice(0, 20).map(x => x.item),
        others: resultPool.filter(x => x.item.type !== 'product' && x.item.type !== 'collection').slice(0, 20).map(x => x.item)
    };
};

export const calculateTFIDF = (documents: string[]): { keyword: string; score: number }[] => {
    const stopwords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'en', 'a', 'y', 'o', 'que', 'con', 'por', 'sobre', 'para', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel', 'aquella', 'aquellos', 'aquellas', 'mi', 'tu', 'su', 'nuestro', 'vuestro', 'sus', 'como', 'más', 'pero', 'cuando', 'si', 'sin', 'todo', 'cada', 'bien', 'muy', 'tan', 'así', 'donde', 'ser', 'estar', 'hacer', 'tener', 'poder', 'decir', 'ver', 'ir', 'dar', 'saber', 'querer', 'venir', 'deber', 'entre', 'dentro', 'fuera', 'después', 'antes', 'entonces', 'ahora', 'aquí', 'allí', 'siempre', 'nunca', 'también', 'tampoco', 'solo', 'ya', 'hasta', 'desde', 'durante', 'mientras', 'contra', 'según', 'bajo', 'ante', 'cabe', 'so', 'tras', 'vía', 'versus', 'mediante', 'durante', 'dondequiera', 'además', 'asimismo', 'entretanto', 'ojalá', 'incluso', 'inclusive', 'quizás', 'acaso', 'tal', 'vez', 'posiblemente', 'probablemente', 'seguramente', 'verdaderamente', 'completamente', 'totalmente', 'parcialmente', 'casualmente', 'finalmente', 'actualmente', 'recientemente', 'últimamente', 'próximamente', 'inmediatamente', 'ahora', 'luego', 'después', 'anteayer', 'ayer', 'hoy', 'mañana', 'pasado', 'mañana', 'siempre', 'nunca', 'jamás', 'temprano', 'tarde', 'pronto', 'siempre', 'todavía', 'aún', 'ya', 'despacio', 'deprisa', 'así', 'bien', 'mal', 'apenas', 'casi', 'solo', 'solamente', 'tanto', 'tan', 'mucho', 'poco', 'muy', 'más', 'menos', 'bastante', 'demasiado', 'nada', 'algo', 'así', 'bastante', 'medio', 'extremadamente', 'sumamente']);
    const tokenize = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopwords.has(w));
    const docTokens = documents.map(tokenize);
    const allTokens = Array.from(new Set(docTokens.flat()));
    const idf: Record<string, number> = {};
    allTokens.forEach(token => {
        const count = docTokens.filter(doc => doc.includes(token)).length;
        idf[token] = Math.log(documents.length / (1 + count));
    });
    const scores: Record<string, number> = {};
    docTokens.forEach(tokens => {
        const tf: Record<string, number> = {};
        tokens.forEach(token => tf[token] = (tf[token] || 0) + 1);
        Object.keys(tf).forEach(token => {
            scores[token] = (scores[token] || 0) + (tf[token] / tokens.length) * idf[token];
        });
    });
    return Object.entries(scores).map(([keyword, score]) => ({ keyword, score })).sort((a, b) => b.score - a.score).slice(0, 30);
};

// --- Analysis Orchestration ---

export const runSEOAnalysis = async (
    keyword: string,
    csvData: any[],
    projectName?: string,
    serperKeyOverride?: string,
    modelName: string = 'gemini-2.5-flash',
    isIdea: boolean = false,
    onLog?: (phaseId: string, prompt: string) => void
): Promise<SEOAnalysisResult> => {
    const serperKey = serperKeyOverride || process.env.NEXT_PUBLIC_SERPER_API_KEY || '';
    const context = retrieveContext(csvData, keyword, "");
    const productContext = context.products.slice(0, 30).map(p => `- ${p.title} (${p.url})`).join('\n');
    const collectionContext = context.collections.slice(0, 15).map(c => `- ${c.title} (${c.url})`).join('\n');

    let serpContext = "";
    let realSerpData: any = null;

    if (serperKey) {
        try {
            // PHASE 1: Traditional SERP Query
            const intentPrompt = `
            Eres un experto en investigación de keywords y estrategia de contenidos SEO.
            Tu objetivo es generar un QUERY DE BÚSQUEDA en Google que encuentre los mejores artículos, guías y blogs informativos para el keyword: "${keyword}".
            Reglas: - Evita páginas puramente transaccionales - No uses comandos complejos - Optimiza para encontrar competidores informativos.
            Retorna ÚNICAMENTE la cadena de búsqueda (query string). No incluyas explicaciones.
            `;
            if (onLog) onLog("Investigación: Generación de Query Inteligente", intentPrompt);
            let smartQuery = await executeWithKeyRotation(async (ai, currentModel) => {
                const modelObj = ai.getGenerativeModel({ model: currentModel });
                const queryResponse = await modelObj.generateContent(intentPrompt);
                const respText = queryResponse.response.text()?.trim().replace(/^"|"$/g, '') || keyword;
                useWriterStore.getState().addDebugPrompt("Investigación: Query Inteligente", intentPrompt, respText);
                return respText;
            });
            smartQuery += " -site:tiktok.com -site:instagram.com -site:pinterest.com -site:facebook.com -site:amazon.* -site:ebay.* -site:mercadolibre.* -inurl:product -inurl:cart";

            realSerpData = await fetchSerperSearch(smartQuery, serperKey);
            if (!realSerpData?.organic?.length) realSerpData = await fetchSerperSearch(keyword, serperKey);

            if (realSerpData?.organic) {
                const totalResults = realSerpData.organic.length;
                const filtered = await filterQualityResults(realSerpData.organic, keyword);
                const compCtx = filtered.map((r: any) => ({ title: r.title, url: r.link, snippet: r.snippet }));
                serpContext = `REAL SERP DATA: ${JSON.stringify(compCtx)}`;
            }

            // GEO Discovery (Grounding) removal per user request

        } catch (e) { serpContext = "External tools failed."; }
    }

    const schema = {
        type: Type.OBJECT,
        properties: {
            nicheDetected: { type: Type.STRING },
            keywordIdeas: { type: Type.OBJECT, properties: { shortTail: { type: Type.ARRAY, items: { type: Type.STRING } }, midTail: { type: Type.ARRAY, items: { type: Type.STRING } } } },
            autocompleteLongTail: { type: Type.ARRAY, items: { type: Type.STRING } },
            frequentQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            top10Urls: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, url: { type: Type.STRING } } } },
            top20Urls: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, url: { type: Type.STRING } } } },
            lsiKeywords: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { keyword: { type: Type.STRING }, count: { type: Type.STRING } } } },
            recommendedWords: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedWordCount: { type: Type.STRING },
            recommendedSchemas: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["nicheDetected", "keywordIdeas", "frequentQuestions", "top10Urls", "top20Urls", "recommendedWordCount"]
    };

    return executeWithKeyRotation(async (ai, currentModel) => {
        const model = ai.getGenerativeModel({
            model: currentModel,
            generationConfig: { responseMimeType: "application/json", responseSchema: schema as any }
        });
        const seoPrompt = `Analiza profundamente el panorama SEO para el keyword: "${keyword}". 
        
        Contexto SERP Real: ${serpContext}
        Contexto Base de Datos Interna: 
        ${productContext} 
        ${collectionContext}
        
        Tu tarea es:
        1. Evaluar el nicho y la intención de búsqueda.
        2. Proporcionar ideas de keywords (short y mid tail).
        3. Identificar las preguntas más frecuentes.
        4. Listar los TOP 10 competidores directos.
        5. Listar los TOP 20 competidores.
        
        Retorna los resultados en el esquema JSON solicitado.`;

        if (onLog) onLog("Investigación: Análisis SERP & Intención (Final)", seoPrompt);
        const response = await model.generateContent(seoPrompt);
        const respText = response.response.text();
        useWriterStore.getState().addDebugPrompt("Investigación: Análisis SERP Final", seoPrompt, respText);
        let json = JSON.parse(respText);
        if (realSerpData) {
            json.peopleAlsoAsk = (realSerpData as any).peopleAlsoAsk || [];
            json.frequentQuestions = json.peopleAlsoAsk.map((q: any) => q.question);
        }
        return json as SEOAnalysisResult;
    }, modelName);
};

export const runDeepSEOAnalysis = async (
    keyword: string,
    csvData: any[],
    projectName?: string,
    isIdea: boolean = false,
    projectId?: string,
    onProgress?: (phaseId: string) => void,
    onLog?: (phaseId: string, prompt: string) => void,
    modelName: string = 'gemini-2.5-flash'
): Promise<DeepSEOAnalysisResult> => {
    // Stage 1: SERP Discovery
    if (onProgress) onProgress("serp");
    const baseResult = await runSEOAnalysis(keyword, csvData, projectName, undefined, modelName, false, onLog);
    
    let internalDomain = "";
    try {
        if (csvData.length > 0 && csvData[0].url) {
            internalDomain = new URL(csvData[0].url).hostname.replace(/^www\./, '');
        }
    } catch (e) {
        console.warn("[Deep-SEO] Invalid URL in CSV data for internal domain detection");
    }

    // Phase 2: Filter Candidates
    const topUrls = (baseResult as any).top20Urls || baseResult.top10Urls || [];
    const cannibalizedUrls: string[] = [];
    
    const candidates = topUrls.filter((u: any) => {
        try {
            if (!u.url) return false;
            const host = new URL(u.url).hostname.toLowerCase().replace(/^www\./, '');
            const SOCIAL_DOMAINS = ['tiktok.com', 'instagram.com', 'facebook.com', 'pinterest.com', 'twitter.com', 'x.com', 'amazon.', 'ebay.', 'mercadolibre.', 'youtube.com'];
            const isSocial = SOCIAL_DOMAINS.some(d => host.includes(d));
            
            if (internalDomain && host.includes(internalDomain)) {
                cannibalizedUrls.push(u.url);
                return true; 
            }
            return !isSocial;
        } catch (e) {
            return false;
        }
    }).slice(0, 10);

    if (cannibalizedUrls.length > 0 && onLog) {
        onLog("Alerta Canibalización", `Se han detectado ${cannibalizedUrls.length} URLs de tu propio dominio en el SERP:\n${cannibalizedUrls.join('\n')}`);
    }

    // Phase 3: Scrape & AI Analysis (SEO)
    if (onProgress) onProgress("extraction");
    
    // 3.1: Profile SEO Competitors
    if (onLog) onLog("Sistema", `Analizando ${candidates.length} competidores SEO (tradicionales)...`);
    const scrapedSEO: CompetitorDetail[] = [];
    for (const comp of candidates) {
        if (onLog) onLog("Sistema", `Extrayendo SEO: ${new URL(comp.url).hostname}`);
        const content = await fetchJinaExtraction(comp.url);
        if (!content) {
            scrapedSEO.push({ url: comp.url, title: comp.title, isInvalid: true } as any);
            continue;
        }
        let profilingRes: any = { summary: "", headers: [], isInvalid: false };
        try {
            await new Promise(res => setTimeout(res, 2000));
            profilingRes = await executeWithKeyRotation(async (ai, currentModel) => {
                const model = ai.getGenerativeModel({ model: currentModel, generationConfig: { responseMimeType: "application/json" } });
                const prompt = `Analiza este competidor SEO para "${keyword}": ${comp.url}\nContenido: ${content.substring(0, 10000)}
                Retorna JSON: {"summary": "breve resumen", "headers": [{"tag": "h2", "text": "..."}], "isInvalid": boolean}`;
                const r = await model.generateContent(prompt);
                return JSON.parse(r.response.text());
            }, modelName);
        } catch (e) {}
        scrapedSEO.push({ 
            ...comp, 
            content: content, 
            summary: profilingRes.summary, 
            headers: profilingRes.headers, 
            isInvalid: profilingRes.isInvalid || content.length < 300 
        } as any);
    }

    // GEO Competitors removed per user request

    const validSEO = scrapedSEO.filter(c => !c.isInvalid);
    if (onLog) onLog("Sistema", `Extracción completada. SEO Actualizado: ${validSEO.length}`);

    // Phase 4: TF-IDF & AI Semantic Cleaning
    if (onProgress) onProgress("keywords");
    const allValidTexts = validSEO.map(c => c.content || "");
    const rawTfidf = calculateTFIDF(allValidTexts);
    
    const cleanedLSI = await executeWithKeyRotation(async (ai, currentModel) => {
        const model = ai.getGenerativeModel({ model: currentModel, generationConfig: { responseMimeType: "application/json" } });
        const cleanPrompt = `Limpia y categoriza términos semánticos para "${keyword}": ${JSON.stringify(rawTfidf.map(t => t.keyword))}
        Retorna JSON array: [{"keyword": "...", "count": "Alto/Medio/Bajo"}]`;
        const res = await model.generateContent(cleanPrompt);
        return JSON.parse(res.response.text());
    }, modelName);
    baseResult.lsiKeywords = cleanedLSI;

    // Phase 5: Selection & Metadata
    if (onProgress) onProgress("competitors");
    const selectedUrls = await selectTopCompetitorsViaAI(keyword, validSEO);
    const finalSEOCompetitors = validSEO.map(c => ({
        ...c,
        isSelected: selectedUrls.includes(c.url)
    }));

    if (onProgress) onProgress("metadata");
    const synthesisPrompt = `Genera la estrategia SEO definitiva para "${keyword}". 
    Contexto Competidores: ${validSEO.slice(0, 3).map(c => c.summary).join(". ")}
    LSI: ${JSON.stringify(cleanedLSI)}
    Retorna JSON: {"h1": "...", "seo_title": "...", "slug": "...", "meta_description": "...", "extracto": "...", "schemas": []}`;
    
    const seoMetadata = await executeWithKeyRotation(async (ai, currentModel) => {
        const model = ai.getGenerativeModel({ model: currentModel, generationConfig: { responseMimeType: "application/json" } });
        const res = await model.generateContent(synthesisPrompt);
        return JSON.parse(res.response.text());
    }, modelName);

    // Stage 7: Internal Linking
    if (onProgress) onProgress("links");
    let suggestedLinks: any[] = [];
    if (projectId) {
        if (onLog) onLog("Sistema", `Analizando oportunidades de enlazado interno...`);
        const { data: project } = await supabase.from('projects').select('domain, architecture_rules').eq('id', projectId).single();
        const { data: poolLow } = await supabase.from('project_urls').select('url, title, impressions_gsc').eq('project_id', projectId).order('impressions_gsc', { ascending: false }).limit(300);
        
        if (poolLow && poolLow.length > 0) {
            suggestedLinks = await selectSemanticInternalLinks(keyword, poolLow, 15, onLog, JSON.stringify({ metadata: seoMetadata, lsi: cleanedLSI }), modelName);
        }
    }

    const globalMetrics = await fetchGlobalMetrics(keyword);

    return {
        ...baseResult,
        ...seoMetadata,
        cannibalizationUrls: cannibalizedUrls,
        competitors: finalSEOCompetitors,
        suggestedInternalLinks: suggestedLinks,
        target_keyword: keyword,
        searchVolume: globalMetrics.volume,
        keywordDifficulty: globalMetrics.difficulty,
        word_count: parseInt(baseResult.recommendedWordCount) || 1500,
        research_dossier: { ...baseResult, cannibalizedUrls, lsiKeywords: cleanedLSI, suggestedInternalLinks: suggestedLinks, seoMetadata },
        brief: generateBriefingText({ ...baseResult, ...seoMetadata, lsiKeywords: cleanedLSI } as any),
        excerpt: seoMetadata.extracto || seoMetadata.excerpt,
        schemas: seoMetadata.schemas
    };
};

export const selectTopCompetitorsViaAI = async (keyword: string, competitors: CompetitorDetail[]): Promise<string[]> => {
    const list = competitors.filter(c => c.content && c.content.length > 100).map((c, i) => ({ index: i, url: c.url, title: c.title }));
    if (list.length === 0) return [];
    const prompt = `Selecciona los TOP 10 competidores para "${keyword}": ${JSON.stringify(list)}. Retorna JSON array de URLs.`;
    return executeWithKeyRotation(async (ai, currentModel) => {
        const model = ai.getGenerativeModel({ model: currentModel, generationConfig: { responseMimeType: "application/json" } });
        const res = await model.generateContent(prompt);
        return JSON.parse(res.response.text());
    });
};

export const selectSemanticInternalLinks = async (keyword: string, pool: any[], maxLinks: number = 10, onLog?: (p: string, pr: string) => void, context?: string, modelName: string = 'gemini-2.5-flash'): Promise<any[]> => {
    const list = pool.map((p, i) => `[ID:${i}] ${p.url} - ${p.title}`).join('\n');
    const prompt = `Actúa como estratega experto de enlazado interno SEO.
    A partir de la siguiente lista de páginas de nuestro inventario, selecciona las más RELEVANTES (Mín 3, Máx ${maxLinks}) 
    para el nuevo artículo de "${keyword}".
    
    Contexto SEO del artículo:
    ${context}

    Candidatos (Top por impresiones):
    ${list}
    
    Retorna ÚNICAMENTE un array JSON [{"url", "title", "anchor_text"}]`;
    
    if (onLog) onLog("Investigación: Selección Semántica de Enlaces (Fase 3)", prompt);
    return executeWithKeyRotation(async (ai, currentModel) => {
        const model = ai.getGenerativeModel({ model: currentModel, generationConfig: { responseMimeType: "application/json" } });
        const res = await model.generateContent(prompt);
        const raw = res.response.text();
        if (onStatus) onStatus("IA: Selección completada."); // Not used here but keep logic consistent
        if (onLog) onLog("Respuesta Selección Enlaces", raw);
        return JSON.parse(raw);
    }, modelName);
};

// Placeholder as selectSemanticInternalLinks was using it incorrectly via copy-paste
const onStatus = (msg: string) => {}; 

export const generateOutlineStrategy = async (config: ArticleConfig, keyword: string, rawSeoData: SEOAnalysisResult, modelName?: string) => {
    const prompt = `Create outline for "${keyword}". JSON {snippet, outline}.`;
    return executeWithKeyRotation(async (ai, currentModel) => {
        const model = ai.getGenerativeModel({ model: currentModel, generationConfig: { responseMimeType: "application/json" } });
        const res = await model.generateContent(prompt);
        return JSON.parse(res.response.text());
    }, modelName || 'gemini-2.5-flash');
};

export const runHumanizerPipeline = async (html: string, config: HumanizerConfig, intensity: number, onStatus: (msg: string) => void): Promise<{ html: string }> => {
    const prompt = `Humanize HTML: ${html}`;
    return executeWithKeyRotation(async (ai, currentModel) => {
        const model = ai.getGenerativeModel({ model: currentModel });
        const res = await model.generateContent(prompt);
        return { html: res.response.text() };
    }, 'gemini-2.5-flash');
};

export const generateBriefingText = (seoData: SEOAnalysisResult): string => {
    let brief = `# Investigación SEO: ${seoData.nicheDetected}\n\n`;
    brief += `## Metadatos\n- H1: ${(seoData as any).h1}\n- Slug: ${(seoData as any).slug}\n\n`;
    const comps = (seoData as any).top20Urls || seoData.top10Urls || [];
    brief += `## Competidores\n` + comps.map((u: any) => `- [${u.title}](${u.url})`).join('\n') + '\n\n';
    return brief;
};
