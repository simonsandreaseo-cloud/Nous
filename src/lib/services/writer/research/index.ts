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
            .from('task_research')
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
    async runInitialAnalysis(keyword: string, projectId?: string, onLog?: (p: string, m: string, r?: string) => void, language: string = 'es'): Promise<any> {
        if (onLog) onLog("Serper", "Buscando SERP", `Query directa: ${keyword} (Idioma: ${language})`);
        
        let gl = language;
        if (language === 'en') gl = 'us';
        else if (language === 'ca') gl = 'es';
        
        // Single direct search instead of multiplexing
        const serpData = await SerpProvider.fetchSerperSearch(keyword, gl, language);
        const rawResults = serpData.results;
        const faqs = serpData.faqs;

        if (rawResults.length === 0) throw new Error("No organic search results found.");

        if (onLog) onLog("IA", "Analista SERP", "Analizando ecosistema de resultados y seleccionando mejores referencias...");
        
        const serpAnalysisPrompt = `Analiza este SERP para la búsqueda: "${keyword}".
Snippet de los resultados:
${rawResults.slice(0, 15).map((r, i) => `[${i+1}] Título: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`).join('\n\n')}

Tu tarea:
1. Determina el TIPO de SERP (Informativa, Transaccional, Ecommerce, Redes Sociales, Mixta).
2. Identifica en qué posiciones (números del 1 al 15) están los contenidos de tipo "Blog", Guías o Artículos.
3. Define la "searchIntent" (¿Qué busca resolver el usuario?).
4. Genera un "masterH1" potente para nuestro artículo.
5. Selecciona las 3 a 5 URLs más ricas en contenido (Blogs de autoridad, guías detalladas) que debemos scrapear para tener la mejor base técnica.

Responde ÚNICAMENTE en JSON:
{
  "serpType": "...",
  "blogPositions": [1, 3, 5],
  "searchIntent": "...",
  "selectedUrls": ["url1", "url2", "url3"],
  "masterH1": "..."
}`;

        const analysisRes = await aiRouter.generate({
            prompt: serpAnalysisPrompt,
            model: "gemini-3.5-flash",
            systemPrompt: "Analista SEO Senior. Tu objetivo es diseccionar el SERP y elegir las fuentes de mayor calidad para investigación profunda. Devuelves SOLO JSON.",
            jsonMode: true,
            label: "Análisis de SERP"
        });

        const analysis = safeJsonExtract<{ 
            serpType: string, 
            blogPositions: number[], 
            searchIntent: string, 
            selectedUrls: string[],
            masterH1: string 
        }>(analysisRes.text, { 
            serpType: 'mixed', 
            blogPositions: [], 
            searchIntent: keyword, 
            selectedUrls: rawResults.slice(0, 3).map(r => r.url),
            masterH1: keyword 
        });

        // Map the selected URL strings back to full competitor objects from rawResults
        const selectedCompetitors = analysis.selectedUrls.map(url => {
            const original = rawResults.find(r => r.url === url || r.link === url);
            return original || { url, title: 'Referencia Seleccionada', snippet: '' };
        });

        if (onLog) {
            onLog("OK", "📊 Reporte SERP", `Tipo: ${analysis.serpType} | Blogs en: ${analysis.blogPositions.join(', ')}`);
            onLog("OK", "🔍 Intención", analysis.searchIntent);
            onLog("OK", "🎯 H1 Maestro", analysis.masterH1);
            onLog("INFO", "📑 Fuentes seleccionadas", `${selectedCompetitors.length} URLs para scraping profundo.`);
            selectedCompetitors.forEach(c => onLog("INFO", "->", c.url));
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
                model: "gemini-3.5-flash",
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
            selectedUrls: selectedCompetitors,
            serpReport: {
                type: analysis.serpType,
                blogPositions: analysis.blogPositions
            },
            masterH1: analysis.masterH1,
            masterIntent: analysis.searchIntent,
            linkingProfile,
            faqs,
            searchAngles: [keyword]
        };
    },

    /**
     * Phase Logic Methods (Decoupled)
     */
    async runSerpPhase(config: DeepSEOConfig, onLog?: any): Promise<any> {
        return await this.runInitialAnalysis(config.keyword, config.projectId, onLog, config.language);
    },

    async runScrapingPhase(config: DeepSEOConfig, baseResult: any, onLog?: any): Promise<any[]> {
        const { isFastMode = false } = config;
        
        // Priority: Use AI-selected URLs if available, otherwise fallback to top results
        let rawPool: any[] = (baseResult.selectedUrls && baseResult.selectedUrls.length > 0) 
            ? baseResult.selectedUrls 
            : (baseResult.rankedPool || baseResult.top10Urls || []);
            
        // Inyectar referencias explícitas del usuario si existen en el task_context
        if (baseResult.task_context?.refs && Array.isArray(baseResult.task_context.refs)) {
            const userRefs = baseResult.task_context.refs.map((url: string) => ({ url, title: 'Referencia del Usuario (Manual)' }));
            // Prepend user refs to ensure they are at the top of the pool
            rawPool = [...userRefs, ...rawPool];
        }
        
        const rankedPool = rawPool.slice(0, 10); // Final safety limit to avoid over-scraping
        
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

            // Filter out domains that Firecrawl doesn't support to avoid batch rejection
            const UNSUPPORTED_DOMAINS = ['reddit.com', 'amazon.', 'youtube.com', 'youtu.be', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 'linkedin.com', 'pinterest.com'];
            const scrapablePool = rankedPool.filter((r: any) => {
                const url = (r.url || r.link || '').toLowerCase();
                return !UNSUPPORTED_DOMAINS.some(d => url.includes(d));
            });
            const blockedPool = rankedPool.filter((r: any) => {
                const url = (r.url || r.link || '').toLowerCase();
                return UNSUPPORTED_DOMAINS.some(d => url.includes(d));
            });

            if (onLog && blockedPool.length > 0) {
                onLog('INFO', 'Filtro Firecrawl', `${blockedPool.length} URLs de plataformas no scrapeables excluidas (Reddit, Amazon, etc.)`);
            }

            if (scrapablePool.length === 0) {
                if (onLog) onLog('WARN', 'Scraping', 'Todos los resultados son de plataformas no scrapeables. Usando snippets SERP.');
                return rankedPool
                    .filter((r: any) => r.snippet && r.snippet.length > 50)
                    .map((r: any) => ({ url: r.url || r.link, title: r.title, content: `<p>${r.snippet}</p>`, summary: r.snippet, headers: [], wordCount: r.snippet.split(/\s+/).length }));
            }

            return await ScraperService.scrapeMassive(scrapablePool, taskContext, onLog);
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
                model: "gemini-3.5-flash",
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

    async runMetadataPhase(keyword: string, cleanedLSI: any[], validSEO: any[], onLog?: any, masterH1?: string, masterIntent?: string, taskContext?: any): Promise<{ seoMetadata: any, wordCountGoal: number }> {
        if (onLog) onLog("Fase 5 (Metadata)", "Diseñando arquitectura de metadatos y estrategia E-E-A-T...");
        let wordCountGoal = 1500;
        
        if (taskContext?.target_word_count && parseInt(taskContext.target_word_count) > 0) {
            wordCountGoal = parseInt(taskContext.target_word_count);
        } else {
            const validTop3 = validSEO.slice(0, 3).filter(s => s.wordCount > 200);
            if (validTop3.length > 0) {
                const avgWC = validTop3.reduce((acc, curr) => acc + curr.wordCount, 0) / validTop3.length;
                wordCountGoal = Math.round(avgWC * 1.2);
            }
        }

        const userTitle = taskContext?.title || '';
        const titleRule = userTitle ? `\n¡IMPORTANTE!: El usuario ha proporcionado este título exacto: "${userTitle}". DEBES usar este título EXACTO como el H1. NO LO ALTERES.` : '';

        const topCompetitorsInfo = validSEO.slice(0, 10).map((v: any, i: number) => `[${i+1}] Título: ${v.title}`).join('\n');
        
        const observaciones = taskContext?.metadata?.observaciones || taskContext?.observaciones || '';
        const obsRule = observaciones ? `\nOBSERVACIONES DEL USUARIO (Prioridad Máxima):\n"${observaciones}"\nAsegúrate de que la estrategia y los metadatos reflejen este enfoque específico.\n` : '';

        const metadataPrompt = `Crea la estrategia SEO final y optimizada para el tema: "${keyword}".
Intención de búsqueda detectada: ${masterIntent || keyword}
H1 Maestro sugerido: ${masterH1 || keyword}

Términos Semánticos (LSI) relevantes encontrados: ${cleanedLSI.slice(0, 15).map((l: any) => l.keyword).join(", ")}.

TITULARES DE LOS PRINCIPALES COMPETIDORES EN EL SERP:
${topCompetitorsInfo}
${obsRule}
INSTRUCCIONES Y RESTRICCIONES ESTRICTAS:
1. "h1": Título principal del artículo. Debe estar orientado al SEO, responder a la intención de búsqueda de forma clara y enfocada, e incluir palabras clave relevantes de forma natural.${titleRule}
2. "seo_title": Título para Google. MÁXIMO 60 caracteres. Analiza los titulares de los competidores (arriba) y crea un título ÚNICO, muy competitivo, que destaque en el SERP (Click-through rate) y ataque la keyword principal.
3. "meta_description": Descripción para el SERP. MÁXIMO 155 caracteres. Debe tener sus propias pautas enfocadas en persuasión, incluir keywords clave de forma natural e incluir un Call to Action (CTA) al final.
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
            model: "gemini-3.5-flash",
            systemPrompt: "Eres el Director de Estrategia SEO de más alto nivel. Tu única función es devolver objetos JSON estables respetando escrupulosamente los límites de caracteres (60 para title, 155 para meta).",
            jsonMode: true,
            label: "Estrategia Writing",
            timeoutMs: 60000
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

        const taskCtx = baseResult.task_context || {};
        const isStrict = taskCtx.metadata?.strict_linking === true;
        const manualLinks: any[] = [];
        
        // --- ADDED LINK STRATEGY MATRIX ---
        const contentType = taskCtx.content_type || 'Blog Post';
        const linkStrategy = settings?.link_strategy?.per_content_type?.[contentType] || {
            strict_mode: false,
            strict_category: null,
            category_priorities: {},
            planned_priorities: {},
            vip_urls: []
        };
        // ----------------------------------
        
        const parseUrls = (input: string) => {
            if (!input) return [];
            return input.split(/[\r\n,]+/).map(u => u.trim()).filter(u => u && (u.startsWith('http') || u.startsWith('/')));
        };

        const assocUrls = parseUrls(taskCtx.associated_url);
        assocUrls.forEach((u, i) => manualLinks.push({ url: u, title: `Enlace Principal ${i+1} (Manual)`, anchor_text: "Ver más", type: "manual" }));

        const secUrls = parseUrls(taskCtx.secondary_url);
        secUrls.forEach((u, i) => manualLinks.push({ url: u, title: `Enlace Secundario ${i+1} (Manual)`, anchor_text: "Saber más", type: "manual" }));

        if (isStrict && manualLinks.length > 0) {
            if (onLog) onLog("INFO", "Interlinking", "Modo estricto activado. Solo se usarán los enlaces manuales.");
            return manualLinks;
        }

        const finalMaxLinks = Math.max(1, maxLinks - manualLinks.length);

        const { count: inventoryCount } = await supabase.from('project_urls').select('*', { count: 'exact', head: true }).eq('project_id', projectId);

        // if (!inventoryCount || inventoryCount === 0) return []; // BYPASSED FOR TEST

        // Fetch planned contents if toggle is active
        let plannedUnits: any[] = [];
        if (config.linkPlannedContents && config.linkPlannedStatuses && config.linkPlannedStatuses.length > 0) {
            if (onLog) onLog("INFO", "Interlinking", "Incluyendo contenidos planificados en la curación...");
            const { data: plannedTasks } = await supabase
                .from('tasks')
                .select('id, title, target_url_slug, content_type')
                .eq('project_id', projectId)
                .in('status', config.linkPlannedStatuses)
                .not('target_url_slug', 'is', null)
                .neq('id', config.taskId);
            
            if (plannedTasks && plannedTasks.length > 0) {
                const domainRaw = projectData?.domain || '';
                const cleanDomain = domainRaw ? (domainRaw.startsWith('http') ? domainRaw : `https://${domainRaw}`) : '';
                const cleanPrefix = prefs.blog_prefix ? (prefs.blog_prefix.startsWith('/') ? prefs.blog_prefix : `/${prefs.blog_prefix}`) : '';
                
                plannedUnits = plannedTasks.map((t: any) => {
                    const cleanSlug = t.target_url_slug.startsWith('/') ? t.target_url_slug : `/${t.target_url_slug}`;
                    let pseudoUrl = `${cleanDomain}${cleanPrefix}${cleanSlug}`.replace(/([^:]\/)\/+/g, "$1");
                    const priority = linkStrategy.planned_priorities?.[t.content_type] || 5;
                    return {
                        id: `planned_${t.id}`,
                        url: pseudoUrl,
                        title: t.title,
                        type: t.content_type,
                        score: 10 * (priority / 5),
                        isPlanned: true
                    };
                }).sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
            }
        }

        // Optimized: Fetch unique categories via RPC instead of downloading thousands of rows
        const { data: distinctCategoriesData } = await supabase.rpc('get_unique_categories', { p_project_id: projectId });
        const distinctCategories = (distinctCategoriesData || []).map((c: any) => c.category || c).filter(Boolean);

        let p_base_regex = '';
        let p_ask_regex = '';
        let aiProductCodes: string[] = [];

        if (lProfile.profile === 'ecommerce_heavy' || lProfile.profile === 'informational_mixed') {
            if (onLog) onLog("IA", "Product Hunter", "Invocando a Gemini para deducir códigos de modelo de producto...");
            
            const productPrompt = `Basado en la keyword principal "${config.keyword}" y la intención "${baseResult.masterIntent || seoMetadata?.h1 || ''}", 
dame una lista extensa de códigos alfanuméricos de modelos exactos de fabricante que encajen con este tema para buscar en el catálogo. 
Por ejemplo, si es "Gafas retro Miu Miu", quiero que devuelvas códigos como "mu-04uv", "mu-a03s", "mu-09ws".
Si es otro rubro, devuelve códigos de modelo típicos de ese rubro.

CATEGORÍAS DISPONIBLES EN EL SITIO:
${distinctCategories.join(', ')}

REGLAS:
- Devuelve SOLO una lista separada por comas de: (1) códigos de fabricante/modelo exactos, y (2) categorías del sitio relevantes al tema (ej. si ves "collections" o "blogs" en la lista de categorías y son útiles para el tema, inclúyelas).
- NO uses descripciones genéricas inventadas como "gafas retro". Solo usa códigos reales o las categorías exactas provistas.
- Formato esperado: código1, código2, categoriaX`;

            try {
                const productRes = await aiRouter.generate({
                    prompt: productPrompt,
                    model: "gemini-3.5-flash",
                    systemPrompt: "Eres un experto en catálogos de e-commerce. Tu única función es deducir modelos y códigos de fabricante exactos.",
                    jsonMode: false,
                    label: "Product Hunter AI",
                    timeoutMs: 60000
                });
                
                const rawCodes = productRes.text.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 2);
                aiProductCodes = rawCodes;
                
                if (aiProductCodes.length > 0) {
                    if (onLog) onLog("SUCCESS", "Product Hunter", `Se infirieron ${aiProductCodes.length} códigos posibles: ${aiProductCodes.slice(0, 5).join(', ')}...`);
                    p_base_regex = aiProductCodes.join('|');
                }
            } catch (e) {
                if (onLog) onLog("WARN", "Product Hunter", "Fallo al deducir productos. Haciendo fallback a NLP estático.");
            }
        }

        // NLP: Computamos los términos semánticos (LSI, ASKs, Keywords) para combinarlos con los productos
        const stopWords = new Set(['para', 'como', 'sobre', 'desde', 'entre', 'hacia', 'hasta', 'segun', 'cual', 'quien', 'donde', 'cuando', 'porque', 'este', 'esta', 'estos', 'estas', 'aquel', 'aquella', 'todo', 'toda', 'todos', 'todas', 'mucho', 'mucha', 'poco', 'poca', 'nada', 'algo', 'otro', 'otra', 'unos', 'unas', 'cada', 'cualquier', 'mismo', 'misma', 'propio', 'propia', 'mejor', 'peor', 'mayor', 'menor', 'gran', 'mas', 'menos', 'muy', 'tan', 'siempre', 'nunca', 'jamas', 'tambien', 'tampoco', 'solo', 'solamente', 'incluso', 'aun', 'ademas', 'sino', 'pero', 'aunque', 'pues', 'entonces', 'luego', 'asi', 'como', 'si', 'no', 'tal', 'vez', 'quizas', 'acaso', 'tiene', 'tienen', 'hacer', 'puede', 'pueden', 'hace', 'debe', 'deben']);
        const tokenize = (text: string) => (text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !stopWords.has(w));
        
        const askStr = askKeywords?.map((k: any) => k.keyword).join(' ') || '';
        const baseStr = `${config.keyword} ${seoMetadata?.seo_title || ''} ${seoMetadata?.h1 || ''} ${(baseResult?.searchAngles || []).join(' ')} ${(cleanedLSI || []).map((l: any) => l.keyword).join(' ')} ${(realKeywords || []).map((k: any) => k.keyword).join(' ')}`;
        
        const askSet = filterStructuralNoise(new Set(tokenize(askStr)));
        const baseSet = filterStructuralNoise(new Set(tokenize(baseStr)));
        for (const askWord of askSet) baseSet.delete(askWord);
        
        p_ask_regex = Array.from(askSet).join('|') || '';
        const fallbackKeyword = tokenize(config.keyword).join('|');
        const nlpBaseRegex = Array.from(baseSet).join('|') || fallbackKeyword || '';

        // Combinamos el regex de los productos (prioridad 1) con el regex semántico (prioridad 2)
        if (aiProductCodes.length > 0) {
            p_base_regex = nlpBaseRegex ? `${aiProductCodes.join('|')}|${nlpBaseRegex}` : aiProductCodes.join('|');
        } else {
            p_base_regex = nlpBaseRegex;
        }
        
        const resV3 = await supabase.rpc('get_semantic_inventory_matches_v3', {
            p_project_id: projectId, p_base_regex, p_ask_regex, p_limit: 120
        });

        let units = resV3.data;
        if (resV3.error && resV3.error.message.includes('function get_semantic_inventory_matches_v3 does not exist')) {
            const resV2 = await supabase.rpc('get_semantic_inventory_matches_v2', { p_project_id: projectId, p_base_regex, p_ask_regex, p_limit: 120 });
            units = resV2.data;
        }

        if ((units && units.length > 0) || plannedUnits.length > 0 || (linkStrategy.vip_urls && linkStrategy.vip_urls.length > 0)) {
            
            // Apply Strict Mode filtering
            let filteredUnits = units || [];
            if (linkStrategy.strict_mode && linkStrategy.strict_category) {
                if (onLog) onLog("INFO", "Interlinking", `Filtrando por categoría estricta: ${linkStrategy.strict_category}`);
                filteredUnits = filteredUnits.filter((u: any) => u.category === linkStrategy.strict_category);
            }

            // Apply Priorities (multipliers)
            if (!linkStrategy.strict_mode) {
                filteredUnits = filteredUnits.map((u: any) => {
                    const priority = linkStrategy.category_priorities?.[u.category] || 5;
                    return { ...u, score: (u.score || 1) * (priority / 5) };
                }).sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
            }

            const vipUnits = (linkStrategy.vip_urls || []).map((url: string) => ({
                id: `vip_${Math.random()}`,
                url,
                title: 'VIP / Alta Prioridad',
                isVip: true
            }));

            const combinedUnits = [...vipUnits, ...filteredUnits, ...plannedUnits];
            const vipRule = linkStrategy.vip_urls?.length > 0 ? `\n\nREGLA VIP: ES OBLIGATORIO incluir los enlaces VIP al inicio si contextualmente hacen sentido.` : '';
            const argotRule = askSet.size > 0 ? `\n\nREGLA DE PUNTAJE DE ARGOT: prioritiza x5 palabras ASK: ${Array.from(askSet).join(', ')}` : '';

            const linkRes = await aiRouter.generate({
                prompt: `Keyword artículo: "${config.keyword}"\nPerfil Estratégico: "${lProfile.profile}"\nCategorías del Sitio: ${distinctCategories.join(', ')}\n\nCATÁLOGO (${combinedUnits.length} artículos):\n${JSON.stringify(combinedUnits)}\n\nOBJETIVO: Selecciona EXACTAMENTE ${finalMaxLinks} artículos.\n\nREGLAS:\n1. 'ecommerce_heavy' -> Venta. 2. 'pure_content' -> Blog. 3. Diversidad. 4. Anchor Text naturales.${vipRule}${argotRule}\n\nJSON:\n{"links": [{"url", "title", "anchor_text"}]}`,
                model: "gemini-3.5-flash",
                systemPrompt: "Arquitecto de Silos SEO.",
                jsonMode: true,
                label: "Optimización Interlinking",
                timeoutMs: 40000
            });
            const extracted = safeJsonExtract<any>(linkRes.text, { links: [] });
            
            // Tag planned links
            const finalLinks = (extracted.links || []).map((link: any) => {
                const isPlanned = plannedUnits.some(pu => pu.url === link.url);
                if (isPlanned) {
                    return { ...link, isPlanned: true, type: 'planned' };
                }
                return link;
            });

            return [...manualLinks, ...finalLinks].slice(0, maxLinks);
        }
        return manualLinks;
    },

    async runOutlinePhase(config: DeepSEOConfig, baseResult: any, seoMetadata: any, cleanedLSI: any[], askKeywords: any[], realKeywords: any[], suggestedLinks: any[], validSEO: any[], wordCountGoal: number, onLog?: any): Promise<any> {
        if (onLog) onLog("Fase 7 (Estructura)", "Ensamblando arquitectura del contenido con enriquecimiento multimodelo...");
        return await OutlineEngine.generate({
            keyword: config.keyword, seoMetadata, cleanedLSI,
            suggestedLinks, validCompetitors: validSEO, wordCountGoal,
            faqs: baseResult.faqs,
            askKeywords,
            realKeywords,
            masterIntent: baseResult.masterIntent,
            serpReport: baseResult.serpReport,
            taskContext: baseResult.task_context,
            timeoutMs: 150000 // 2.5 minutes for deep outline
        });
    },

    /**
     * Orchestrator: Main flow with resumability and phase control
     */
    async runDeepAnalysis(config: DeepSEOConfig, phaseToRun?: ResearchPhase) {
        const { keyword, projectId, taskId, onProgress, onLog, isFastMode = false, forceRestart = false, cascade = true } = config;

        const saveCheckpoint = async (phase: string, data: any) => {
            if (!taskId) return { ...data, context_cache: dossier.context_cache || {} };
            const { data: current } = await supabase.from('task_research').select('research_dossier').eq('id', taskId).maybeSingle();
            const existing = current?.research_dossier || {};
            // CRITICAL: always carry context_cache forward — it's an in-memory state machine
            // that is never explicitly included in checkpoint data payloads.
            const updated = { 
                ...existing, 
                ...data, 
                context_cache: { ...(existing.context_cache || {}), ...(dossier.context_cache || {}), ...(data.context_cache || {}) },
                _checkpoint: phase, 
                _checkpoints_at: { ...(existing._checkpoints_at || {}), [phase]: new Date().toISOString() } 
            };
            await supabase.from('task_research').upsert({ id: taskId, research_dossier: updated });
            return updated;
        };

        let dossier: any = {};
        if (taskId && !forceRestart) {
            const { data: taskData } = await supabase.from('task_research').select('research_dossier').eq('id', taskId).maybeSingle();
            const { data: mainTaskData } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
            
            dossier = taskData?.research_dossier || {};
            
            if (mainTaskData) {
                dossier.task_context = {
                    title: mainTaskData.title,
                    brief: mainTaskData.brief,
                    content_type: mainTaskData.content_type,
                    associated_url: mainTaskData.associated_url,
                    secondary_url: mainTaskData.secondary_url,
                    refs: mainTaskData.refs,
                    volume: mainTaskData.volume,
                    target_word_count: mainTaskData.target_word_count,
                    metadata: mainTaskData.metadata || {}
                };
            }
            
            // SELF-HEAL: Convert legacy outline format to Studio-compatible format
            if (dossier.outline_structure && Array.isArray(dossier.outline_structure)) {
                console.log("🛠️ [Self-Heal] Detectado formato de outline viejo. Convirtiendo...");
                const legacy = dossier.outline_structure as any[];
                const fixedHeaders = legacy.map(s => ({
                    type: s.type || (s.level ? `H${s.level}` : 'H2'),
                    text: s.text,
                    notes: s.notes || s.instructions || "",
                    keywords: s.keywords || [],
                    wordCount: String(s.wordCount || 500),
                    currentWordCount: 0
                }));
                dossier.outline_structure = {
                    headers: fixedHeaders,
                    totalWordCount: dossier.wordCountGoal || 1500
                };
            }
        }
        
        // Initialize State Machine Cache
        dossier.context_cache = (dossier.context_cache && typeof dossier.context_cache === 'object') ? dossier.context_cache : {};

        const PHASES: ResearchPhase[] = ['serp_done', 'scraping_done', 'lsi_done', 'ask_done', 'real_kws_done', 'metadata_done', 'interlinking_done', 'outline_done'];
        
        // If a specific phase is requested, we determine where to start
        let startIndex = 0;
        if (phaseToRun) {
            startIndex = PHASES.indexOf(phaseToRun);
        } else if (!forceRestart && dossier._checkpoint) {
            const lastIndex = PHASES.indexOf(dossier._checkpoint as ResearchPhase);
            if (lastIndex !== -1) {
                startIndex = lastIndex + 1; // Start at the NEXT phase
            }
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
            // Belt-and-suspenders: ensure context_cache is always an object before accessing it
            dossier.context_cache = dossier.context_cache || {};
            const { realKeywords, sniperUrls } = await this.runGoldenKeywordsPhase(dossier.validSEO || [], keyword, onLog, dossier.context_cache?.sniperUrls);
            dossier.context_cache.sniperUrls = sniperUrls;
            dossier = await saveCheckpoint('real_kws_done', { realKeywords, context_cache: dossier.context_cache });
            dossier.realKeywords = realKeywords;
            if (phaseToRun === 'real_kws_done' && !cascade) return dossier;
        }

        // Phase 4: Metadata
        if (startIndex <= 5 && !['metadata_done', 'interlinking_done', 'outline_done'].includes(phaseToRun || '')) {
            if (onProgress) onProgress("metadata");
            const { seoMetadata, wordCountGoal } = await this.runMetadataPhase(config.keyword, dossier.cleanedLSI || [], dossier.validSEO || [], onLog, dossier.masterH1, dossier.masterIntent, dossier.task_context);
            dossier = await saveCheckpoint('metadata_done', { seoMetadata, wordCountGoal });
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
            const sectionsCount = dossier.outline_structure?.headers?.length || dossier.outline_structure?.length || 0;
            if (onLog) onLog("Finalizando", `Guardando investigación completa. Outline: ${sectionsCount} secciones.`);
            console.log("✅ [INVESTIGACIÓN] Dossier Final:", dossier);

            // Studio Compatibility: Ensure outline_structure is a flat array if possible
            const flatOutline = dossier.outline_structure?.headers || dossier.outline_structure || [];

            try {
                console.log("📤 [Supabase] Iniciando persistencia final para:", config.taskId);
                
                // ONLY update valid columns in 'tasks' (strictly status and target_word_count to avoid 400 errors)
                const links = dossier.suggestedInternalLinks || [];
                const urls = links.map((l: any) => l.url || l.link).filter(Boolean);
                
                // Si había URLs previas en task_context, las unimos
                const previousUrls = (dossier.task_context?.associated_url || '').split(/[\n,]+/).map((u: string) => u.trim()).filter(Boolean);
                const uniqueUrls = Array.from(new Set([...previousUrls, ...urls])).join('\n');

                const { error: taskError } = await supabase.from('tasks').update({
                    status: "por_redactar",
                    target_word_count: dossier.wordCountGoal,
                    associated_url: uniqueUrls || null
                }).eq('id', config.taskId);

                if (taskError) {
                    console.error("❌ [Supabase] Error actualizando tabla tasks:", taskError);
                } else {
                    console.log("✅ [Supabase] Tabla 'tasks' actualizada (Estado: por_redactar)");
                }

                // ALWAYS save the outline in 'task_research' (where the column EXISTS)
                const { error: researchError } = await supabase.from('task_research').upsert({
                    id: config.taskId,
                    outline_structure: flatOutline,
                    research_dossier: dossier
                });

                if (researchError) console.error("❌ [Supabase] Error actualizando tabla task_research:", researchError);

                if (!taskError && !researchError) {
                    console.log("✨ [Supabase] Persistencia completada con éxito.");
                }

            } catch (e) {
                console.error("🔥 [Supabase] Error crítico en el bloque final de guardado:", e);
                if (onLog) onLog("ERROR", "Fallo crítico al guardar en Base de Datos.");
            }
        }

        return dossier;
    }
};
