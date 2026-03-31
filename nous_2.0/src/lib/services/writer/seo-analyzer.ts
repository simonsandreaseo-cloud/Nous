import { ContentItem, SEOAnalysisResult, DeepSEOAnalysisResult, CompetitorDetail, ArticleConfig, HumanizerConfig } from "./types";
import { executeWithKeyRotation } from "./ai-core";
import { SchemaType as Type } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";

// --- SERP & Content Fetching ---

export const fetchSerperSearch = async (query: string, apiKey: string): Promise<any> => {
    try {
        const res = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ q: query, gl: "es", hl: "es" })
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

export const fetchUnstructuredContent = async (url: string): Promise<string> => {
    try {
        const response = await fetch('/api/unstructured', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        if (!response.ok) return "";
        const data = await response.json();
        return data.text || "";
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
    const candidates = results.map((r, i) => ({ id: i, title: r.title, snippet: r.snippet, link: r.link })).slice(0, 15);
    const prompt = `Filter out "Junk" URLs for a blog about "${keyword}". KEEP: Blogs, News, Guides. DISCARD: Product/Login pages. Return JSON Array of IDs. Candidates: ${JSON.stringify(candidates)}`;

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
            const filtered = results.filter((_, index) => goodIds.includes(index));
            return filtered.length > 0 ? filtered.slice(0, 8) : results.slice(0, 3);
        } catch (e) {
            return results.slice(0, 3);
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
    modelName?: string,
    isIdea: boolean = false
): Promise<SEOAnalysisResult> => {
    const serperKey = serperKeyOverride || process.env.NEXT_PUBLIC_SERPER_API_KEY || '';
    const context = retrieveContext(csvData, keyword, "");
    const productContext = context.products.slice(0, 30).map(p => `- ${p.title} (${p.url})`).join('\n');
    const collectionContext = context.collections.slice(0, 15).map(c => `- ${c.title} (${c.url})`).join('\n');

    let serpContext = "";
    if (serperKey) {
        try {
            const intentPrompt = `Google Search query for Articles/Blogs about "${keyword}". Exclude ${projectName || ''}. Return ONLY query string.`;
            let smartQuery = await executeWithKeyRotation(async (ai) => {
                const modelObj = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
                const queryResponse = await modelObj.generateContent(intentPrompt);
                return queryResponse.response.text()?.trim().replace(/^"|"$/g, '') || keyword;
            });
            smartQuery += " -site:amazon.* -site:ebay.* -inurl:cart";

            let realSerpData = await fetchSerperSearch(smartQuery, serperKey);
            if (!realSerpData?.organic?.length) realSerpData = await fetchSerperSearch(keyword, serperKey);

            if (realSerpData?.organic) {
                const filtered = await filterQualityResults(realSerpData.organic, keyword);
                const compCtx = filtered.map((r: any) => ({ title: r.title, url: r.link, snippet: r.snippet }));
                serpContext = `REAL SERP DATA: ${JSON.stringify(compCtx)}`;
            }
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
            lsiKeywords: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { keyword: { type: Type.STRING }, count: { type: Type.STRING } } } },
            recommendedWords: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedWordCount: { type: Type.STRING },
            recommendedSchemas: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["nicheDetected", "keywordIdeas", "frequentQuestions", "top10Urls", "recommendedWordCount"]
    };

    return executeWithKeyRotation(async (ai) => {
        const model = ai.getGenerativeModel({
            model: modelName || 'gemini-2.5-flash',
            generationConfig: { responseMimeType: "application/json", responseSchema: schema as any }
        });
        const prompt = `Analiza SEO para "${keyword}". SERP External: ${serpContext}. Database Internal: ${productContext} ${collectionContext}. Retorna JSON.`;
        const response = await model.generateContent(prompt);
        let json = JSON.parse(response.response.text());
        return json as SEOAnalysisResult;
    }, modelName);
};

export const runDeepSEOAnalysis = async (
    keyword: string,
    csvData: any[],
    projectName?: string,
    isIdea: boolean = false,
    projectId?: string
): Promise<DeepSEOAnalysisResult> => {
    const baseResult = await runSEOAnalysis(keyword, csvData, projectName);
    let internalDomain = csvData.length > 0 ? new URL(csvData[0].url).hostname.replace(/^www\./, '') : "";

    const top10 = baseResult.top10Urls.filter(u => !internalDomain || !u.url.includes(internalDomain)).slice(0, 10);
    const scrapedCompetitors = await Promise.all(top10.map(async (comp) => ({ url: comp.url, title: comp.title, content: await fetchUnstructuredContent(comp.url) })));
    const selectedUrls = await selectTopCompetitorsViaAI(keyword, scrapedCompetitors);
    
    const competitors = await Promise.all(scrapedCompetitors.map(async (comp) => {
        if (!selectedUrls.includes(comp.url)) return { ...comp, rankingKeywords: [] };
        const kws = await fetchDataForSEOKeywords(comp.url);
        return { ...comp, rankingKeywords: kws?.map((k: any) => ({ keyword: k.keyword_data?.keyword, pos: k.rank_group?.rank_absolute, vol: k.keyword_data?.keyword_info?.search_volume })).slice(0, 10) || [] };
    }));

    const globalMetrics = await fetchGlobalMetrics(keyword);
    const validTexts = competitors.filter(c => selectedUrls.includes(c.url) && c.content).map(c => c.content!);
    const tfidf = validTexts.length > 0 ? calculateTFIDF(validTexts).map(t => ({ keyword: t.keyword, count: Math.round(t.score * 100).toString() })) : [];
    
    baseResult.lsiKeywords = tfidf.slice(0, 50);

    let suggestedLinks: any[] = [];
    if (projectId) {
        const { data: dbLinks } = await supabase.from('project_inventory').select('url, title').eq('project_id', projectId).limit(50);
        if (dbLinks) suggestedLinks = (await selectSemanticInternalLinks(keyword, dbLinks)).filter(s => dbLinks.some(d => d.url === s.url));
    }

    return { ...baseResult, searchVolume: globalMetrics.volume, keywordDifficulty: globalMetrics.difficulty, competitors, suggestedInternalLinks: suggestedLinks };
};

// --- Specialized AI Helpers ---

export const selectTopCompetitorsViaAI = async (keyword: string, competitors: CompetitorDetail[]): Promise<string[]> => {
    const list = competitors.map((c, i) => ({ index: i, url: c.url, title: c.title, snippet: c.content?.substring(0, 1000) }));
    const prompt = `Select top 5 quality blog competitors for "${keyword}" from: ${JSON.stringify(list)}. Return JSON string array of URLs.`;
    return executeWithKeyRotation(async (ai) => {
        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { responseMimeType: "application/json" } });
        const res = await model.generateContent(prompt);
        return JSON.parse(res.response.text()).slice(0, 5);
    });
};

export const selectSemanticInternalLinks = async (keyword: string, pool: any[]): Promise<any[]> => {
    const prompt = `Select 5 relevant internal links for "${keyword}" from: ${pool.map(p => p.url).join(', ')}. Return JSON [{"url": "...", "title": "..."}].`;
    return executeWithKeyRotation(async (ai) => {
        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { responseMimeType: "application/json" } });
        const res = await model.generateContent(prompt);
        return JSON.parse(res.response.text());
    });
};

export const generateOutlineStrategy = async (config: ArticleConfig, keyword: string, rawSeoData: SEOAnalysisResult, modelName?: string) => {
    const prompt = `Create content outline for "${keyword}". Tone: ${config.tone}. Target: ${config.wordCount} words. Return JSON {snippet, outline}.`;
    return executeWithKeyRotation(async (ai) => {
        const model = ai.getGenerativeModel({ model: modelName || 'gemini-2.5-flash', generationConfig: { responseMimeType: "application/json" } });
        const res = await model.generateContent(prompt);
        return JSON.parse(res.response.text());
    });
};

export const runHumanizerPipeline = async (html: string, config: HumanizerConfig, intensity: number, onStatus: (msg: string) => void): Promise<{ html: string }> => {
    onStatus("Humanizando contenido...");
    const prompt = `Humanize this HTML. Niche: ${config.niche}. Keywords: ${config.keywords}. Return ONLY HTML. HTML: ${html}`;
    return executeWithKeyRotation(async (ai) => {
        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const res = await model.generateContent(prompt);
        return { html: res.response.text().replace(/```html/g, '').replace(/```/g, '').trim() };
    });
};

export const generateBriefingText = (seoData: SEOAnalysisResult): string => {
    let brief = `# Investigación SEO: ${seoData.nicheDetected}\n\n`;
    if (seoData.top10Urls) brief += `## Competidores\n` + seoData.top10Urls.map((u, i) => `${i+1}. [${u.title}](${u.url})`).join('\n') + '\n\n';
    if (seoData.lsiKeywords) brief += `## Semántica\n` + seoData.lsiKeywords.map(k => `- ${k.keyword}`).join('\n') + '\n\n';
    return brief.trim();
};
