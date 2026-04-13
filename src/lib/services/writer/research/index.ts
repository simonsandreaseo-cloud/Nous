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

export { SerpProvider, ScraperService, KeywordAnalyzer, OutlineEngine, SchemaGenerator };


/**
 * SEO Research Orchestrator
 * Main entry point for SEO research and Deep Analysis.
 */
export const ResearchOrchestrator = {
    /**
     * Phase 1: Rapid SEO Analysis (SERP + Intent)
     */
    async runInitialAnalysis(keyword: string, projectId?: string, onLog?: (p: string, m: string, r?: string) => void): Promise<any> {
        // 1. Keyword Sanitization
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

        // 2. Intent Multiplexing
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
        
        // Ensure strictly strings to avoid [object Object] in logs
        const extractedQueries = safeJsonExtract<{queries: string[]}>(multiplexRes.text, {queries: []});
        const cleanQueries = (extractedQueries.queries || []).filter(q => typeof q === 'string');
        const queries = [searchSeed, ...cleanQueries].slice(0, 4);

        // 3. Multilateral Search
        const rawResults = await SerpProvider.multiplexSearch(queries, onLog);
        if (rawResults.length === 0) throw new Error("No organic search results found.");

        // 4. Generate Master H1 & Search Intent (NEW Task 1.1 / REQ-5)
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

        // 6. Linking Profile Analysis (NEW)
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
            linkingProfile
        };
    },

    /**
     * Phase 2: Deep Research Pipeline with Checkpointing
     * 
     * Checkpoints saved to research_dossier:
     *   serp_done         → rankedPool + niche analysis
     *   scraping_done     → competitors[] (HTML cleaned)
     *   lsi_done          → lsiKeywords
     *   metadata_done     → seo_title, meta_description, slug, wordCountGoal
     *   interlinking_done → suggestedInternalLinks
     *   outline_done      → outline_structure (fully complete)
     */
    async runDeepAnalysis(config: DeepSEOConfig) {
        const { keyword, projectId, taskId, onProgress, onLog, isFastMode = false, forceRestart = false } = config;

        // ─── Checkpoint Helpers ──────────────────────────────────────────────────
        const saveCheckpoint = async (phase: string, data: any) => {
            if (!taskId) return data;
            const { data: current } = await supabase
                .from('tasks')
                .select('research_dossier')
                .eq('id', taskId)
                .single();
            const existing = current?.research_dossier || {};
            const updated = {
                ...existing,
                ...data,
                _checkpoint: phase,
                _checkpoints_at: {
                    ...(existing._checkpoints_at || {}),
                    [phase]: new Date().toISOString()
                }
            };
            await supabase.from('tasks').update({ research_dossier: updated }).eq('id', taskId);
            return updated;
        };

        // ─── Load existing dossier to detect resume point ────────────────────────
        let existingDossier: any = {};
        if (taskId && !forceRestart) {
            const { data: taskData } = await supabase
                .from('tasks')
                .select('research_dossier')
                .eq('id', taskId)
                .single();
            existingDossier = taskData?.research_dossier || {};
        }

        const checkpoint = forceRestart ? null : (existingDossier._checkpoint ?? null);
        const PHASES = ['serp_done', 'scraping_done', 'lsi_done', 'metadata_done', 'interlinking_done', 'outline_done'];
        const completedPhaseIndex = PHASES.indexOf(checkpoint ?? '');
        const skip = (phase: string) => !forceRestart && completedPhaseIndex >= PHASES.indexOf(phase);

        if (checkpoint && !forceRestart) {
            if (onLog) onLog("INFO", "♻️ Reanudando", `Retomando desde checkpoint: "${checkpoint}" — saltando fases previas`);
        }

        // ── PHASE 1: SERP + Curation ─────────────────────────────────────────────
        let baseResult: any = {};
        if (skip('serp_done')) {
            if (onLog) onLog("OK", "✓ Serper", "Pool de candidatos restaurado desde checkpoint");
            baseResult = existingDossier;
        } else {
            if (onProgress) onProgress("serp");
            baseResult = await ResearchOrchestrator.runInitialAnalysis(keyword, projectId, onLog);
            baseResult = (await saveCheckpoint('serp_done', baseResult)) ?? baseResult;
        }

        // ── PHASE 2: Scraping + Helios ───────────────────────────────────────────
        let scrapedSEO: any[] = [];

        if (skip('scraping_done')) {
            scrapedSEO = (existingDossier.competitors || []).map((c: any) => ({
                url: c.url, title: c.title, content: c.content, summary: c.summary,
                wordCount: c.content?.split(/\s+/).length || 0, headers: []
            }));
            if (onLog) onLog("OK", "Scraping", `${scrapedSEO.length} competidores restaurados desde checkpoint`);
        } else {
            if (onProgress) onProgress("scraping");
            const rankedPool: any[] = baseResult.rankedPool || baseResult.top10Urls || [];
            
            // Extraer en paralelo via Cloudflare y filtrar con Gemini
            if (!isFastMode && rankedPool.length > 0) {
                let taskContext = { 
                    contentType: 'Blog Post', 
                    searchIntent: baseResult.masterIntent || keyword, 
                    h1: baseResult.masterH1 || keyword 
                };
                
                if (taskId) {
                    const { data: tData } = await supabase.from('tasks').select('content_type, title').eq('id', taskId).single();
                    if (tData) {
                        taskContext = {
                            contentType: tData.content_type || 'Blog Post',
                            searchIntent: baseResult.masterIntent || keyword,
                            h1: baseResult.masterH1 || tData.title || keyword
                        };
                    }
                }
                scrapedSEO = await ScraperService.scrapeMassive(rankedPool, taskContext, onLog);
            }

            await saveCheckpoint('scraping_done', {
                competitors: scrapedSEO.filter(s => !!s.content).map(v => ({
                    url: v.url, title: v.title, summary: v.summary, content: v.content, headers: v.headers, wordCount: v.wordCount
                }))
            });
        }

        const validSEO = scrapedSEO.filter(s => !!s.content);

        // ── PHASE 3: LSI Analysis ─────────────────────────────────────────────────
        let cleanedLSI: any[];
        if (skip('lsi_done')) {
            cleanedLSI = existingDossier.lsiKeywords || [];
            if (onLog) onLog("OK", "✓ LSI", `${cleanedLSI.length} keywords restauradas desde checkpoint`);
        } else {
            if (onProgress) onProgress("keywords");
            cleanedLSI = await KeywordAnalyzer.extractLSIKeywords(validSEO.map(v => v.content), keyword, onLog);
            await saveCheckpoint('lsi_done', { lsiKeywords: cleanedLSI });
        }

        // ── PHASE 4: Strategic Metadata ───────────────────────────────────────────
        let seoMetadata: any;
        let wordCountGoal: number;
        if (skip('metadata_done')) {
            seoMetadata = {
                h1: existingDossier.h1,
                seo_title: existingDossier.seo_title,
                meta_description: existingDossier.meta_description,
                target_url_slug: existingDossier.target_url_slug || existingDossier.slug,
                excerpt: existingDossier.excerpt || existingDossier.extracto,
                recommendedWordCount: existingDossier.recommendedWordCount
            };
            wordCountGoal = existingDossier.recommendedWordCount || 1500;
            if (onLog) onLog("OK", "✓ Metadata", "Metadata SEO restaurada desde checkpoint");
        } else {
            if (onProgress) onProgress("metadata");
            
            // Programmatic Word Count Calculation based on Top 3 competitors
            const validTop3 = validSEO.slice(0, 3).filter(s => s.wordCount > 200);
            if (validTop3.length > 0) {
                const avgWC = validTop3.reduce((acc, curr) => acc + curr.wordCount, 0) / validTop3.length;
                wordCountGoal = Math.round(avgWC * 1.2); // 20% more than average
            } else {
                wordCountGoal = 1500;
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
            seoMetadata = safeJsonExtract<any>(metaRes.text, {});

            await saveCheckpoint('metadata_done', {
                h1: seoMetadata.h1,
                seo_title: seoMetadata.seo_title,
                meta_description: seoMetadata.meta_description,
                target_url_slug: seoMetadata.target_url_slug,
                excerpt: seoMetadata.excerpt,
                recommendedWordCount: wordCountGoal
            });
        }

        // ── PHASE 5: Semantic Interlinking ────────────────────────────────────────
        let suggestedLinks: any[] = [];
        if (skip('interlinking_done')) {
            suggestedLinks = existingDossier.suggestedInternalLinks || [];
            if (onLog) onLog("OK", "✓ Interlinking", `${suggestedLinks.length} enlaces restaurados desde checkpoint`);
        } else if (projectId) {
            try {
                if (onLog) onLog("INFO", "🔗 Interlinking", "Iniciando análisis semántico del inventario...");

                // 1. Audit inventory size and settings
                const { data: projectData } = await supabase.from('projects').select('*').eq('id', projectId).single();
                const settings = projectData?.settings as any;
                const prefs = settings?.content_preferences || {};
                
                const minLinks = prefs.min_internal_links || 5;
                const maxLinks = prefs.max_internal_links || 12;
                const lProfile = baseResult.linkingProfile || { profile: 'auto' };

                const { count: inventoryCount } = await supabase
                    .from('project_urls')
                    .select('*', { count: 'exact', head: true })
                    .eq('project_id', projectId);

                if (onLog) onLog("INFO", "🔗 Interlinking", `Inventario: ${inventoryCount || 0} artículos. Perfil: ${lProfile.profile}. Límites: ${minLinks}-${maxLinks}.`);

                if (!inventoryCount || inventoryCount === 0) {
                    if (onLog) onLog("WARN", "🔗 Interlinking", "Inventario vacío. Sincroniza el Sitemap o GSC en Ajustes.");
                } else {
                    const keywordTerms = keyword.split(/\s+/).filter(w => w.length >= 4).join('|');
                    const searchRegex = keywordTerms || keyword;

                    const { data: units, error: rpcError } = await supabase.rpc('get_semantic_inventory_matches', {
                        p_project_id: projectId,
                        p_regex: searchRegex,
                        p_limit: 120
                    });

                    if (rpcError) throw rpcError;

                    if (units && units.length > 0) {
                        const { data: catData } = await supabase.from('project_urls').select('category').eq('project_id', projectId).not('category', 'is', null);
                        const distinctCategories = Array.from(new Set((catData || []).map((c: any) => c.category))).filter(Boolean);

                        const linkRes = await aiRouter.generate({
                            prompt: `Keyword artículo: "${keyword}"\nPerfil Estratégico: "${lProfile.profile}"\nCategorías del Sitio: ${distinctCategories.join(', ')}\n\nCATÁLOGO (${units.length} artículos):\n${JSON.stringify(units)}\n\nOBJETIVO: Selecciona EXACTAMENTE ${maxLinks} artículos (o todos si el catálogo tiene menos de ${maxLinks}). Es tu prioridad absoluta llenar el cupo de ${maxLinks} enlaces.\n\nREGLAS:\n1. Si el perfil es 'ecommerce_heavy', prioriza categorías de Venta (Productos/Colecciones).\n2. Si es 'pure_content', prioriza Blog/Guías.\n3. Máxima diversidad: No repitas temas.\n4. Anchor Text: Naturales y variados.\n\nJSON:\n{"links": [{"url", "title", "anchor_text"}]}`,
                            model: "gemini-3.1-flash-lite-preview",
                            systemPrompt: "Arquitecto de Silos SEO. Prioriza la conversión y relevancia semántica.",
                            jsonMode: true,
                            label: "Optimización Interlinking"
                        });
                        
                        const linkData = safeJsonExtract<any>(linkRes.text, { links: [] });
                        const rawLinks = (linkData.links || []).slice(0, maxLinks);
                        
                        if (onLog) onLog("INFO", "🔗 Interlinking", `IA seleccionó ${rawLinks.length} enlaces según perfil ${lProfile.profile}.`);

                        if (projectData) {
                            suggestedLinks = await NousExtractorService.processLinks(rawLinks, projectData as any, 'research');
                        } else {
                            suggestedLinks = rawLinks;
                        }
                        
                        if (onLog) onLog("OK", "🔗 Interlinking", `${suggestedLinks.length} enlaces listos.`);
                    } else {
                        if (onLog) onLog("WARN", "🔗 Interlinking", "Sin coincidencias semánticas.");
                    }
                }
                await saveCheckpoint('interlinking_done', { suggestedInternalLinks: suggestedLinks });
            } catch (e: any) {
                console.error("[Orchestrator] Interlinking failure:", e);
                if (onLog) onLog("WARN", "🔗 Interlinking", `Fallo en el sistema de enlaces: ${e.message}`);
            }
        }

        // ── PHASE 6: Final Outline ────────────────────────────────────────────────
        let finalOutline: any;
        if (skip('outline_done')) {
            finalOutline = existingDossier.outline_structure || existingDossier.strategyOutline;
            if (onLog) onLog("OK", "✓ Outline", "Estructura restaurada desde checkpoint");
        } else {
            finalOutline = await OutlineEngine.generate({
                keyword, seoMetadata, cleanedLSI,
                suggestedLinks, validCompetitors: validSEO, wordCountGoal
            });
        }

        const finalResult = {
            ...baseResult,
            ...seoMetadata,
            lsiKeywords: cleanedLSI,
            suggestedInternalLinks: suggestedLinks,
            strategyOutline: finalOutline,
            competitors: validSEO.map(v => ({ url: v.url, title: v.title, summary: v.summary, content: v.content })),
            status: "por_redactar",
            outline_structure: finalOutline
        };

        // Final persistence — marks as fully complete
        await saveCheckpoint('outline_done', finalResult);
        if (taskId) {
            await supabase.from('tasks').update({
                h1: seoMetadata.h1,
                seo_title: seoMetadata.seo_title,
                meta_description: seoMetadata.meta_description,
                excerpt: seoMetadata.excerpt,
                target_url_slug: seoMetadata.target_url_slug,
                target_word_count: wordCountGoal,
                outline_structure: finalOutline,
                status: "por_redactar"
            }).eq('id', taskId);
        }

        return finalResult;
    }
};
