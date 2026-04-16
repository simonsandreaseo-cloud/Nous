import { aiRouter } from "@/lib/ai/router";
import { safeJsonExtract } from "@/utils/json";
import { supabase } from "@/lib/supabase";
import { NousExtractorService } from "@/lib/services/nous-extractor";
import { SEOAnalysisResult, DeepSEOConfig } from "../types";

import { SerpProvider } from "./serp-provider";
import { ScraperService } from "./scrapers";
import { KeywordAnalyzer } from "./keyword-analyzer";
import { OutlineEngine } from "./outline-engine";
import { SchemaGenerator } from "./schema-generator";

import { DataForSeoService } from "@/lib/services/dataforseo";

export { SerpProvider, ScraperService, KeywordAnalyzer, OutlineEngine, SchemaGenerator };

const STRUCTURAL_NOISE = new Set([
    'blog', 'news', 'page', 'post', 'article', 'category', 'tag', 'product', 'shop', 'store',
    'cart', 'checkout', 'account', 'login', 'register', 'contact', 'about', 'faq', 'terms',
    'privacy', 'policy', 'sitemap', 'xml', ' feed', 'rss', 'archive', 'search', 'results',
    'home', 'index', 'main', 'default', 'static', 'assets', 'public', 'cdn', 'media', 'images',
    'uploads', 'files', 'download', 'pdf', 'doc', 'docx', 'video', 'audio', 'podcast',
    'wp-content', 'wp-includes', 'node_modules', 'vendor', 'dist', 'build', 'static',
    'api', 'auth', 'admin', 'dashboard', 'settings', 'profile', 'user', 'guest',
    'preview', 'draft', 'test', 'dev', 'staging', 'production', 'cloud', 'app'
]);

const filterStructuralNoise = (tokens: Set<string>) => {
    const filtered = new Set<string>();
    for (const token of tokens) {
        const lower = token.toLowerCase();
        if (!STRUCTURAL_NOISE.has(lower) && !lower.match(/^(https?|www\.)/i) && !lower.match(/^\d+$/)) {
            filtered.add(token);
        }
    }
    return filtered;
};

export type ResearchPhase = 'serp_done' | 'scraping_done' | 'lsi_done' | 'ask_done' | 'real_kws_done' | 'metadata_done' | 'interlinking_done' | 'outline_done';

export interface QualityAudit {
    isValid: boolean;
    issues: { phase: ResearchPhase; message: string }[];
    suggestions: string[];
}

/**
 * SEO Research Orchestrator
 * Main entry point for SEO research and Deep Analysis.
 */
export const ResearchOrchestrator = {
    /**
     * Quality Audit: Checks if the research dossier meets minimum quality standards.
     */
    async validateQuality(taskId: string): Promise<QualityAudit> {
        const { data: taskData } = await supabase
            .from('tasks')
            .select('research_dossier')
            .eq('id', taskId)
            .single();

        const dossier = taskData?.research_dossier || {};
        const issues: { phase: ResearchPhase; message: string }[] = [];

        if (!dossier.top10Urls || dossier.top10Urls.length === 0) {
            issues.push({ phase: 'serp_done', message: 'No se encontraron URLs en el SERP.' });
        }
        if (!dossier.competitors || dossier.competitors.length === 0) {
            issues.push({ phase: 'scraping_done', message: 'No hay competidores analizados.' });
        }
        if (!dossier.lsiKeywords || dossier.lsiKeywords.length === 0) {
            issues.push({ phase: 'lsi_done', message: 'No se extrajeron keywords LSI.' });
        }
        if (!dossier.askKeywords || dossier.askKeywords.length === 0) {
            issues.push({ phase: 'ask_done', message: 'No hay keywords de argot técnico (ASK).' });
        }
        if (!dossier.seo_title || !dossier.meta_description) {
            issues.push({ phase: 'metadata_done', message: 'Metadata SEO incompleta.' });
        }
        if (!dossier.suggestedInternalLinks || dossier.suggestedInternalLinks.length === 0) {
            issues.push({ phase: 'interlinking_done', message: 'No se encontraron enlaces internos sugeridos.' });
        }
        if (!dossier.outline_structure) {
            issues.push({ phase: 'outline_done', message: 'No hay estructura de outline generada.' });
        }

        return {
            isValid: issues.length === 0,
            issues,
            suggestions: issues.map(i => `Re-ejecutar fase: ${i.phase}`)
        };
    },

    /**
     * Phase 1: Rapid SEO Analysis (SERP + Intent)
     */
    async runInitialAnalysis(keyword: string, projectId?: string, onLog?: (p: string, m: string, r?: string) => void): Promise<any> {
        let searchSeed = keyword;
        if (keyword.split(/\s+/).length > 7) {
            const seedRes = await aiRouter.generate({
                prompt: `Extrae la "Core Keyword" (máximo 4 palabras) de este título: "${keyword}". Responde solo con la keyword limpia.`,
                model: "gemma-3-4b-it",
                systemPrompt: "Experto SEO.",
                label: "Sanitización Técnica"
            });
            if (seedRes.text) searchSeed = seedRes.text.trim().replace(/"/g, '');
        }

        const intentPrompt = `Genera 5 variaciones de búsqueda derivadas de: "${searchSeed}".
Áreas a cubrir: Informativo, Comparativo, FAQs, Tendencias y Guía.
Responde ÚNICAMENTE con este formato JSON:
{"queries": ["variacion 1", "variacion 2", "variacion 3", "variacion 4", "variacion 5"]}`;
        const multiplexRes = await aiRouter.generate({
            prompt: intentPrompt,
            model: "gemini-3.1-flash-lite-preview",
            systemPrompt: "Eres un SEO Multiplexer. Tu única función es devolver el objeto JSON solicitado, sin markdown ni explicaciones.",
            jsonMode: true,
            label: "Multiplexing Research"
        });
        
        const extractedQueries = safeJsonExtract<{queries: string[]}>(multiplexRes.text, {queries: []});
        const cleanQueries = (extractedQueries.queries || []).filter(q => typeof q === 'string');
        const queries = [searchSeed, ...cleanQueries].slice(0, 4);

        const multiplexData = await SerpProvider.multiplexSearch(queries, onLog);
        const rawResults = multiplexData.results;
        const faqs = multiplexData.faqs;
        if (rawResults.length === 0) throw new Error("No organic search results found.");

        if (onLog) onLog("IA", "Estratega Nous", "Sintetizando H1 Maestro e Intención de Búsqueda desde ecosistema SERP...");
        
        const masterStrategyPrompt = `Analiza estas fuentes orgánicas para la keyword principal: "${keyword}".
Tu tarea es definir la dirección técnica del artículo:
1. Genera un "masterH1": El título más potente y optimizado (Atractivo, curiosidad + SEO).
2. Define la "searchIntent": Explica exactamente qué está buscando el usuario y qué necesita resolver (Intención de búsqueda refinada).

Fuentes:
${rawResults.slice(0, 15).map((r, i) => `[${i}] ${r.title} | ${r.snippet}`).join('\n')}

Responde ÚNICAMENTE con este JSON:
{
  "masterH1": "...",
  "searchIntent": "..."
}`;

        const strategyRes = await aiRouter.generate({
            prompt: masterStrategyPrompt,
            model: "gemini-3.1-flash-lite-preview",
            systemPrompt: "Director de Estrategia SEO. Devuelves SOLO JSON.",
            jsonMode: true,
            label: "Estrategia de Intención"
        });

        const masterStrategy = safeJsonExtract<{ masterH1: string, searchIntent: string }>(strategyRes.text, { masterH1: keyword, searchIntent: keyword });

        if (onLog) {
            onLog("OK", "🎯 H1 Maestro", masterStrategy.masterH1);
            onLog("OK", "🔍 Intención", masterStrategy.searchIntent);
        }

        let linkingProfile = { profile: 'informational_mixed', reasoning: 'Default (No Project)' };
        if (projectId) {
            if (onLog) onLog("IA", "Estratega de Silos", "Analizando perfil de enlazado ideal...");
            const { data: catData } = await supabase.from('project_urls').select('category').eq('project_id', projectId).not('category', 'is', null);
            const distinctCategories = Array.from(new Set((catData || []).map(c => c.category))).filter(Boolean);
            
            const profilePrompt = `Basado en la keyword "${keyword}" y considerando que el sitio tiene estas categorías de contenido: ${distinctCategories.join(', ')}.
            ¿Cuál debería ser el perfil de enlazado interno ideal para este artículo?
            
            Opciones: 
            - 'ecommerce_heavy': Priorizar productos y colecciones (Venta directa).
            - 'informational_mixed': Mezcla equilibrada de guías, blogs y productos.
            - 'pure_content': Solo artículos informativos, tutoriales o blog.
            
            Responde ÚNICAMENTE en JSON con este formato: { "profile": "...", "reasoning": "..." }`;
            
            const profileRes = await aiRouter.generate({
                prompt: profilePrompt,
                model: "gemini-3.1-flash-lite-preview",
                systemPrompt: "Arquitecto de Silos SEO y Experto en UX de Conversión.",
                jsonMode: true,
                label: "Linking Profile"
            });
            linkingProfile = safeJsonExtract<any>(profileRes.text, linkingProfile);
            if (onLog) onLog("INFO", "🔗 Perfil Detectado", `${linkingProfile.profile} (${linkingProfile.reasoning?.substring(0, 60)}...)`);
        }

        return { 
            top10Urls: rawResults.slice(0, 10), 
            top20Urls: rawResults.slice(0, 20), 
            rankedPool: rawResults.slice(0, 30),
            masterH1: masterStrategy.masterH1,
            masterIntent: masterStrategy.searchIntent,
            linkingProfile,
            faqs,
            searchAngles: queries
        };
    },

    /**
     * Phase Logic Methods (Decoupled)
     */
    async runSerpPhase(config: DeepSEOConfig, onLog?: any): Promise<any> {
        return await this.runInitialAnalysis(config.keyword, config.projectId, onLog);
    },

    async runScrapingPhase(config: DeepSEOConfig, baseResult: any, onLog?: any): Promise<any[]> {
        const { isFastMode = false } = config;
        const rankedPool: any[] = baseResult.rankedPool || baseResult.top10Urls || [];
        
        if (!isFastMode && rankedPool.length > 0) {
            let taskContext = { 
                contentType: 'Blog Post', 
                searchIntent: baseResult.masterIntent || config.keyword, 
                h1: baseResult.masterH1 || config.keyword 
            };
            
            if (config.taskId) {
                const { data: tData } = await supabase.from('tasks').select('content_type, title').eq('id', config.taskId).single();
                if (tData) {
                    taskContext = {
                        contentType: tData.content_type || 'Blog Post',
                        searchIntent: baseResult.masterIntent || config.keyword,
                        h1: baseResult.masterH1 || tData.title || config.keyword
                    };
                }
            }
            return await ScraperService.scrapeMassive(rankedPool, taskContext, onLog);
        }
        return [];
    },

    async runLSIPhase(validSEO: any[], keyword: string, onLog?: any): Promise<any[]> {
        return await KeywordAnalyzer.extractLSIKeywords(validSEO.map(v => v.content), keyword, onLog);
    },

    async runASKPhase(validSEO: any[], keyword: string, onLog?: any): Promise<{ askKeywords: any[] }> {
        const top3Texts = validSEO.slice(0, 3).map(v => v.content);
        const askKeywords = await KeywordAnalyzer.extractASKKeywords(top3Texts, keyword, onLog);
        return { askKeywords };
    },

    async runGoldenKeywordsPhase(validSEO: any[], keyword: string, onLog?: any, sniperUrlsCache?: string[]): Promise<{ realKeywords: any[], sniperUrls: string[] }> {
        const top5Candidates = (validSEO || []).filter(v => v.originalPosition <= 5);
        let sniperUrls: string[] = sniperUrlsCache && sniperUrlsCache.length > 0 ? sniperUrlsCache : [];

        if (onLog) onLog("INFO", "Golden Keywords", "Iniciando extracción de keywords con volumen real...");

        if (top5Candidates.length === 0 && sniperUrls.length === 0) {
            if (onLog) onLog("WARN", "Golden Keywords", "No se encontraron competidores válidos en el Top 5 para analizar. Abortando extracción.");
            return { realKeywords: [], sniperUrls: [] };
        }

        if (sniperUrls.length > 0) {
            if (onLog) onLog("INFO", "Francotirador SEO", `Utilizando ${sniperUrls.length} competidores afines desde la memoria caché.`);
        } else {
            if (top5Candidates.length <= 3) {
                sniperUrls = top5Candidates.map(v => v.url);
        } else {
            if (onLog) onLog("IA", "Francotirador SEO", "Seleccionando top 3 competidores más afines...");
            const sniperPrompt = `OBJETIVO: Eres un Francotirador SEO. Tienes que elegir los 3 competidores cuyo H1/Título se parezca más a nuestra intención.\n\nNUESTRO H1: ${keyword}\n\nCANDIDATOS:\n${top5Candidates.map((c, i) => `[ID: ${i}] Título: ${c.title}`).join('\n')}\n\nRESPONDE ÚNICAMENTE CON UN ARRAY JSON ESTRICTO con los 3 IDs elegidos: [0, 2, 4]`;
            const sniperRes = await aiRouter.generate({
                prompt: sniperPrompt,
                model: "gemini-3.1-flash-lite-preview",
                systemPrompt: "Eres un Francotirador SEO estricto. Devuelves SOLO un array JSON con números.",
                jsonMode: true,
                label: "Sniper Mode"
            });
            const selectedIds = safeJsonExtract<number[]>(sniperRes.text, [0, 1, 2]);
            sniperUrls = selectedIds.filter(id => id >= 0 && id < top5Candidates.length).map(id => top5Candidates[id].url);
                if (sniperUrls.length === 0) sniperUrls = top5Candidates.slice(0, 3).map(v => v.url);
            }
        }
        
        let realKeywords: any[] = [];
        if (sniperUrls.length > 0) {
            if (onLog) onLog("INFO", "DataForSEO", `Consultando keywords posicionadas para ${sniperUrls.length} competidores...`);
            try {
                const rawKws = await DataForSeoService.getRankedKeywordsForUrls(sniperUrls);
                if (rawKws && rawKws.length > 0) {
                    if (onLog) onLog("INFO", "Análisis SEO", `Filtrando ${rawKws.length} candidatas crudas contra el H1...`);
                    realKeywords = await KeywordAnalyzer.filterRealKeywords(rawKws, keyword, onLog);
                    if (onLog) onLog("SUCCESS", "Golden Keywords", `Extracción exitosa: ${realKeywords.length} golden keywords de alto valor obtenidas.`);
                } else {
                    if (onLog) onLog("WARN", "DataForSEO", "No se encontraron keywords posicionadas para estos competidores.");
                }
            } catch (e) {
                if (onLog) onLog("WARN", "DataForSEO", `Error de API: ${e.message}. Continuando sin Golden Keywords.`);
            }
        }
        return { realKeywords, sniperUrls };
    },

    async runMetadataPhase(keyword: string, cleanedLSI: any[], validSEO: any[], onLog?: any): Promise<{ seoMetadata: any, wordCountGoal: number }> {
        if (onLog) onLog("Fase 5 (Metadata)", "Diseñando arquitectura de metadatos y estrategia E-E-A-T...");
        let wordCountGoal = 1500;
        const validTop3 = validSEO.slice(0, 3).filter(s => s.wordCount > 200);
        if (validTop3.length > 0) {
            const avgWC = validTop3.reduce((acc, curr) => acc + curr.wordCount, 0) / validTop3.length;
            wordCountGoal = Math.round(avgWC * 1.2);
        }

        const metadataPrompt = `Crea la estrategia SEO final y optimizada para el tema: "${keyword}".
Términos Semánticos (LSI) relevantes encontrados: ${cleanedLSI.slice(0, 15).map((l: any) => l.keyword).join(", ")}.

INSTRUCCIONES Y RESTRICCIONES ESTRICTAS:
1. "h1": Título principal del artículo (Atractivo y natural).
2. "seo_title": Título para Google. MÁXIMO 60 caracteres. Debe incluir la keyword principal o una variación fuerte al principio.
3. "meta_description": Descripción para el SERP. MÁXIMO 155 caracteres. Incluye un Call to Action (CTA) al final.
4. "target_url_slug": URL limpia, solo en minúsculas y con guiones (ej. "mi-keyword-principal").
5. "excerpt": Un párrafo corto de introducción (hook) que incite a leer el artículo.

Retorna ÚNICAMENTE este formato JSON válido:
{
  "h1": "...",
  "seo_title": "...",
  "target_url_slug": "...",
  "meta_description": "...",
  "excerpt": "..."
}`;
        const metaRes = await aiRouter.generate({
            prompt: metadataPrompt,
            model: "llama-3.3-70b-versatile",
            systemPrompt: "Eres el Director de Estrategia SEO de más alto nivel. Tu única función es devolver objetos JSON estables respetando escrupulosamente los límites de caracteres (60 para title, 155 para meta).",
            jsonMode: true,
            label: "Estrategia Writing"
        });
        return { seoMetadata: safeJsonExtract<any>(metaRes.text, {}), wordCountGoal };
    },

    async runInterlinkingPhase(config: DeepSEOConfig, baseResult: any, seoMetadata: any, cleanedLSI: any[], askKeywords: any[], realKeywords: any[], onLog?: any): Promise<any[]> {
        if (onLog) onLog("Fase 6 (Relaciones)", "Mapeando inventario semántico para enlaces internos...");
        const { projectId } = config;
        if (!projectId) return [];

        const { data: projectData } = await supabase.from('projects').select('*').eq('id', projectId).single();
        const settings = projectData?.settings as any;
        const prefs = settings?.content_preferences || {};
        const minLinks = prefs.min_internal_links || 5;
        const maxLinks = prefs.max_internal_links || 12;
        const lProfile = baseResult.linkingProfile || { profile: 'auto' };

        const { count: inventoryCount } = await supabase.from('project_urls').select('*', { count: 'exact', head: true }).eq('project_id', projectId);

        if (!inventoryCount || inventoryCount === 0) return [];

        const stopWords = new Set(['para', 'como', 'sobre', 'desde', 'entre', 'hacia', 'hasta', 'segun', 'cual', 'quien', 'donde', 'cuando', 'porque', 'este', 'esta', 'estos', 'estas', 'aquel', 'aquella', 'todo', 'toda', 'todos', 'todas', 'mucho', 'mucha', 'poco', 'poca', 'nada', 'algo', 'otro', 'otra', 'unos', 'unas', 'cada', 'cualquier', 'mismo', 'misma', 'propio', 'propia', 'mejor', 'peor', 'mayor', 'menor', 'gran', 'mas', 'menos', 'muy', 'tan', 'siempre', 'nunca', 'jamas', 'tambien', 'tampoco', 'solo', 'solamente', 'incluso', 'aun', 'ademas', 'sino', 'pero', 'aunque', 'pues', 'entonces', 'luego', 'asi', 'como', 'si', 'no', 'tal', 'vez', 'quizas', 'acaso', 'tiene', 'tienen', 'hacer', 'puede', 'pueden', 'hace', 'debe', 'deben']);
        const tokenize = (text: string) => (text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !stopWords.has(w));
        
        const askStr = askKeywords?.map((k: any) => k.keyword).join(' ') || '';
        const baseStr = `${config.keyword} ${seoMetadata?.seo_title || ''} ${seoMetadata?.h1 || ''} ${(baseResult?.searchAngles || []).join(' ')} ${(cleanedLSI || []).map((l: any) => l.keyword).join(' ')} ${(realKeywords || []).map((k: any) => k.keyword).join(' ')}`;
        
        const askSet = filterStructuralNoise(new Set(tokenize(askStr)));
        const baseSet = filterStructuralNoise(new Set(tokenize(baseStr)));
        for (const askWord of askSet) baseSet.delete(askWord);
        
        const p_ask_regex = Array.from(askSet).join('|') || '';
        const fallbackKeyword = tokenize(config.keyword).join('|');
        const p_base_regex = Array.from(baseSet).join('|') || fallbackKeyword || '';
        
        const resV3 = await supabase.rpc('get_semantic_inventory_matches_v3', {
            p_project_id: projectId, p_base_regex, p_ask_regex, p_limit: 120
        });

        let units = resV3.data;
        if (resV3.error && resV3.error.message.includes('function get_semantic_inventory_matches_v3 does not exist')) {
            const resV2 = await supabase.rpc('get_semantic_inventory_matches_v2', { p_project_id: projectId, p_base_regex, p_ask_regex, p_limit: 120 });
            units = resV2.data;
        }

        if (units && units.length > 0) {
            // Optimized: Fetch unique categories via RPC instead of downloading thousands of rows
            const { data: distinctCategoriesData } = await supabase.rpc('get_unique_categories', { p_project_id: projectId });
            const distinctCategories = (distinctCategoriesData || []).map((c: any) => c.category || c).filter(Boolean);
            
            const argotRule = askSet.size > 0 ? `\n\nREGLA DE PUNTAJE DE ARGOT: prioritiza x5 palabras ASK: ${Array.from(askSet).join(', ')}` : '';


            const linkRes = await aiRouter.generate({
                prompt: `Keyword artículo: "${config.keyword}"\nPerfil Estratégico: "${lProfile.profile}"\nCategorías del Sitio: ${distinctCategories.join(', ')}\n\nCATÁLOGO (${units.length} artículos):\n${JSON.stringify(units)}\n\nOBJETIVO: Selecciona EXACTAMENTE ${maxLinks} artículos.\n\nREGLAS:\n1. 'ecommerce_heavy' -> Venta. 2. 'pure_content' -> Blog. 3. Diversidad. 4. Anchor Text naturales.${argotRule}\n\nJSON:\n{"links": [{"url", "title", "anchor_text"}]}`,
                model: "gemini-3.1-flash-lite-preview",
                systemPrompt: "Arquitecto de Silos SEO.",
                jsonMode: true,
                label: "Optimización Interlinking"
            });
            
            const linkData = safeJsonExtract<any>(linkRes.text, { links: [] });
            const rawLinks = (linkData.links || []).slice(0, maxLinks);
            return await NousExtractorService.processLinks(rawLinks, projectData as any, 'research');
        }
        return [];
    },

    async runOutlinePhase(config: DeepSEOConfig, baseResult: any, seoMetadata: any, cleanedLSI: any[], askKeywords: any[], realKeywords: any[], suggestedLinks: any[], validSEO: any[], wordCountGoal: number, onLog?: any): Promise<any> {
        if (onLog) onLog("Fase 7 (Estructura)", "Ensamblando arquitectura del contenido con enriquecimiento multimodelo...");
        return await OutlineEngine.generate({
            keyword: config.keyword, seoMetadata, cleanedLSI,
            suggestedLinks, validCompetitors: validSEO, wordCountGoal,
            faqs: baseResult.faqs,
            askKeywords,
            realKeywords,
            masterIntent: baseResult.masterIntent
        });
    },

    /**
     * Orchestrator: Main flow with resumability and phase control
     */
    async runDeepAnalysis(config: DeepSEOConfig, phaseToRun?: ResearchPhase) {
        const { keyword, projectId, taskId, onProgress, onLog, isFastMode = false, forceRestart = false, cascade = true } = config;

        const saveCheckpoint = async (phase: string, data: any) => {
            if (!taskId) return data;
            const { data: current } = await supabase.from('tasks').select('research_dossier').eq('id', taskId).single();
            const existing = current?.research_dossier || {};
            const updated = { ...existing, ...data, _checkpoint: phase, _checkpoints_at: { ...(existing._checkpoints_at || {}), [phase]: new Date().toISOString() } };
            await supabase.from('tasks').update({ research_dossier: updated }).eq('id', taskId);
            return updated;
        };

        let dossier: any = {};
        if (taskId && !forceRestart) {
            const { data: taskData } = await supabase.from('tasks').select('research_dossier').eq('id', taskId).single();
            dossier = taskData?.research_dossier || {};
        }
        
        // Initialize State Machine Cache
        dossier.context_cache = dossier.context_cache || {};

        const PHASES: ResearchPhase[] = ['serp_done', 'scraping_done', 'lsi_done', 'ask_done', 'real_kws_done', 'metadata_done', 'interlinking_done', 'outline_done'];
        
        // If a specific phase is requested, we determine where to start
        let startIndex = 0;
        if (phaseToRun) {
            startIndex = PHASES.indexOf(phaseToRun);
        } else if (!forceRestart && dossier._checkpoint) {
            startIndex = PHASES.indexOf(dossier._checkpoint as ResearchPhase);
            if (startIndex === -1) startIndex = 0;
        }

        // Ensure we don't start at the very end
        if (startIndex >= PHASES.length) startIndex = 0;

        // --- ACTIVE DEPENDENCY RESOLVER (PRE-FLIGHT CHECKS) ---
        // Evalúa en silencio si la fase solicitada carece de dependencias críticas y 
        // las recarga auto-inyectándolas en el dossier antes de dejar fluir la cascada.

        // Dependencia de Nivel 0 (SERP Base)
        const hasRankedPool = (dossier.rankedPool && dossier.rankedPool.length > 0) || 
                              (dossier.validCompetitors && dossier.validCompetitors.length > 0) || 
                              (dossier.top10Urls && dossier.top10Urls.length > 0);

        if (startIndex > 0 && !hasRankedPool) {
            if (onLog) onLog("WARN", "Auto-Fix", "Falta dependencias de SERP base. Ejecutando extracción ligera...");
            const res = await this.runSerpPhase(config, onLog);
            dossier = await saveCheckpoint('_auto_serp', res);
            Object.assign(dossier, res);
        }

        // Dependencia de Nivel 1 (Scraping Base)
        if (startIndex > 1) {
            dossier.validSEO = dossier.competitors || dossier.validCompetitors || [];
            
            const reqHtml = startIndex === 2 || startIndex === 3; // LSI (2) y ASK (3) necesitan HTML íntegro.
            const hasHtml = dossier.validSEO.length > 0 && !!dossier.validSEO[0].content;

            if (dossier.validSEO.length === 0 || (reqHtml && !hasHtml)) {
                if (onLog) onLog("WARN", "Auto-Fix", "Falta contenido indexable profundo. Ejecutando Scraping dinámico...");
                const scraped = await this.runScrapingPhase(config, dossier, onLog);
                const validSEO = scraped.filter(s => !!s.content);
                const mappedCompetitors = validSEO.map(v => ({ url: v.url, title: v.title, summary: v.summary, originalPosition: v.originalPosition, headers: v.headers, wordCount: v.wordCount }));
                dossier = await saveCheckpoint('_auto_scraping', { competitors: mappedCompetitors });
                dossier.competitors = mappedCompetitors;
                dossier.validSEO = validSEO; // Retiene el HTML completo para fases pesadas inmediatas.
            }
        }

        // --- Execution ---
        
        // Phase 1: SERP
        if (startIndex <= 0) {
            if (onProgress) onProgress("serp");
            const res = await this.runSerpPhase(config, onLog);
            dossier = await saveCheckpoint('serp_done', res);
            if (phaseToRun === 'serp_done' && !cascade) return dossier;
        }

        // Phase 2: Scraping
        if (startIndex <= 1) {
            if (onProgress) onProgress("scraping");
            const scraped = await this.runScrapingPhase(config, dossier, onLog);
            const validSEO = scraped.filter(s => !!s.content);
            dossier = await saveCheckpoint('scraping_done', { competitors: validSEO.map(v => ({ url: v.url, title: v.title, summary: v.summary, originalPosition: v.originalPosition, headers: v.headers, wordCount: v.wordCount })) });
            dossier.validSEO = validSEO; // Temporary for next phases
            if (phaseToRun === 'scraping_done' && !cascade) return dossier;
        }

        // Phase 3: LSI
        if (startIndex <= 2) {
            if (onProgress) onProgress("keywords");
            const lsi = await this.runLSIPhase(dossier.validSEO || [], keyword, onLog);
            dossier = await saveCheckpoint('lsi_done', { lsiKeywords: lsi });
            dossier.cleanedLSI = lsi;
            if (phaseToRun === 'lsi_done' && !cascade) return dossier;
        }

        // Phase 3.5: ASK
        if (startIndex <= 3) {
            if (onProgress) onProgress("keywords");
            const { askKeywords } = await this.runASKPhase(dossier.validSEO || [], keyword, onLog);
            dossier = await saveCheckpoint('ask_done', { askKeywords });
            dossier.askKeywords = askKeywords;
            if (phaseToRun === 'ask_done' && !cascade) return dossier;
        }

        // Phase 3.8: Golden Keywords
        if (startIndex <= 4) {
            if (onProgress) onProgress("keywords");
            const { realKeywords, sniperUrls } = await this.runGoldenKeywordsPhase(dossier.validSEO || [], keyword, onLog, dossier.context_cache.sniperUrls);
            dossier.context_cache.sniperUrls = sniperUrls;
            dossier = await saveCheckpoint('real_kws_done', { realKeywords, context_cache: dossier.context_cache });
            dossier.realKeywords = realKeywords;
            if (phaseToRun === 'real_kws_done' && !cascade) return dossier;
        }

        // Phase 4: Metadata
        if (startIndex <= 5) {
            if (onProgress) onProgress("metadata");
            const { seoMetadata, wordCountGoal } = await this.runMetadataPhase(keyword, dossier.cleanedLSI || [], dossier.validSEO || [], onLog);
            dossier = await saveCheckpoint('metadata_done', { ...seoMetadata, recommendedWordCount: wordCountGoal });
            dossier.seoMetadata = seoMetadata;
            dossier.wordCountGoal = wordCountGoal;
            if (phaseToRun === 'metadata_done' && !cascade) return dossier;
        }

        // Phase 5: Interlinking
        if (startIndex <= 6) {
            if (onProgress) onProgress("interlinking");
            const links = await this.runInterlinkingPhase(config, dossier, dossier.seoMetadata || {}, dossier.cleanedLSI || [], dossier.askKeywords || [], dossier.realKeywords || [], onLog);
            dossier = await saveCheckpoint('interlinking_done', { suggestedInternalLinks: links });
            dossier.suggestedInternalLinks = links;
            if (phaseToRun === 'interlinking_done' && !cascade) return dossier;
        }

        // Phase 6: Outline
        if (startIndex <= 7) {
            if (onProgress) onProgress("outline");
            const outline = await this.runOutlinePhase(config, dossier, dossier.seoMetadata || {}, dossier.cleanedLSI || [], dossier.askKeywords || [], dossier.realKeywords || [], dossier.suggestedInternalLinks || [], dossier.validSEO || [], dossier.wordCountGoal || 1500, onLog);
            dossier = await saveCheckpoint('outline_done', { outline_structure: outline });
            dossier.outline_structure = outline;
            if (phaseToRun === 'outline_done' && !cascade) return dossier;
        }

        // Final persistence
        if (config.taskId) {
            await supabase.from('tasks').update({
                h1: dossier.h1,
                seo_title: dossier.seo_title,
                meta_description: dossier.meta_description,
                excerpt: dossier.excerpt,
                target_url_slug: dossier.target_url_slug,
                target_word_count: dossier.recommendedWordCount,
                outline_structure: dossier.outline_structure,
                status: "por_redactar",
                research_dossier: dossier
            }).eq('id', config.taskId);
        }

        return dossier;
    }
};
