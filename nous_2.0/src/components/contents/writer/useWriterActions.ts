'use client';

import { 
    runHumanizerPipeline, 
    runDeepSEOAnalysis, 
    generateOutlineStrategy, 
    generateArticleStream, 
    generateBriefingText, 
    buildPrompt, 
    autoInterlinkAsync, 
    cleanAndFormatHtml, 
    refineStyling, 
    runSEOPostProcessor,
    selectTopRelevantLinks,
    refineArticleContent, 
    ArticleConfig 
} from '@/components/tools/writer/services';
import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase';
import { useState, useCallback } from 'react';

export function useWriterActions() {
    const store = useWriterStore();
    const { user } = useAuthStore();
    const { activeProject } = useProjectStore();
    const { canTakeContents, canEditAny, canUseAllTools, hasTokens, consumeTokens, getTokensLimit } = usePermissions();

    const [isLocalConnected, setIsLocalConnected] = useState(false);

    // Context check for hasContentAccess
    const hasAccess = activeProject ? (canTakeContents() || canEditAny() || canUseAllTools()) : true;

    // --- SEO Research ---
    const handleSEO = useCallback(async () => {
        if (!store.keyword) return alert('Ingresa una palabra clave primero.');
        store.setAnalyzingSEO(true);
        store.setStatus('Realizando análisis profundo de SEO...');
        try {
            const modelToUse = store.researchMode === 'rapid' ? 'gemini-3.1-flash-lite-preview' : 'gemma-3-27b-it';
            const res = await runDeepSEOAnalysis(
                store.keyword,
                store.csvData,
                store.projectName,
                false,
                activeProject?.id,
                (phase) => store.setStatus(phase),
                undefined,
                modelToUse
            );
            store.setRawSeoData(res);
            store.setDetectedNiche(res.nicheDetected);
            store.setStrategyLSI(res.lsiKeywords || []);
            store.setStrategyQuestions(res.frequentQuestions || []);
            store.setStrategyLinks(res.suggestedInternalLinks || []);
            store.setStrategyCompetitors(res.top10Urls?.slice(0, 5).map(u => u.url).join(', ') || "");
            
            // New: Cannibalization handling
            const cannibalUrls = (res as any).cannibalizationUrls || [];
            store.setStrategyCannibalization(cannibalUrls);
            if (cannibalUrls.length > 0) {
                store.setIsConsoleOpen(true);
            }

            const brief = generateBriefingText(res);
            store.setStrategyNotes(brief);

            // Persist the 15 high-quality links and LSI research to DB
            if (store.draftId) {
                console.log("[useWriterActions] Persisting 15 quality links to DB for task:", store.draftId);
                const { error: updateError } = await supabase
                    .from('tasks')
                    .update({
                        seo_data: res, // Contains the 15 suggestedInternalLinks and LSI
                        status: 'investigacion_proceso'
                    })
                    .eq('id', store.draftId);
                
                if (updateError) console.error("[useWriterActions] Error persisting research:", updateError.message);
            }
            
            store.setStatus('✅ Análisis SEO completado y guardado.');
            store.setSidebarTab('seo');
        } catch (e: any) {
            console.error(e);
            store.setStatus('❌ Error SEO: ' + e.message);
        } finally {
            store.setAnalyzingSEO(false);
        }
    }, [store, activeProject]);

    // --- Plan Structure ---
    const handlePlanStructure = useCallback(async () => {
        if (!store.rawSeoData) return alert('Realiza el análisis SEO primero.');
        store.setPlanningStructure(true);
        store.setStatus('Diseñando outline estratégico...');
        try {
            const config: ArticleConfig = {
                projectName: store.projectName, 
                niche: store.detectedNiche || 'General', 
                topic: store.keyword,
                metaTitle: store.keyword, 
                keywords: (store.rawSeoData.keywordIdeas?.shortTail || []).slice(0, 3).join(', ') || store.keyword, 
                tone: store.strategyTone || 'Profesional',
                wordCount: store.strategyWordCount || '1500', 
                refUrls: store.strategyCompetitors,
                refContent: store.strategyNotes, 
                approvedLinks: store.strategyLinks,
            };
            const modelToUse = store.researchMode === 'rapid' ? 'gemini-3.1-flash-lite-preview' : 'gemma-3-27b-it';
            const res = await generateOutlineStrategy(config, store.keyword, store.rawSeoData as any, modelToUse);
            
            if (res.snippet) {
                store.setStrategyTitle(res.snippet.metaTitle);
                store.setStrategyH1(res.snippet.h1);
                store.setStrategySlug(res.snippet.slug);
                store.setStrategyDesc(res.snippet.metaDescription);
            }
            if (res.outline) {
                store.setStrategyOutline(res.outline.headers || []);
            }
            
            store.setStatus('✅ Outline generado con éxito. Persistiendo...');
            
            // Guardado inmediato en BD
            if (store.draftId) {
                await supabase.from('tasks').update({
                    outline_structure: { headers: res.outline?.headers || [] },
                    // También actualizamos metadatos generados por el outline si existen
                    h1: res.snippet?.h1 || store.strategyH1,
                    seo_title: res.snippet?.metaTitle || store.strategyTitle,
                    target_url_slug: res.snippet?.slug || store.strategySlug,
                    meta_description: res.snippet?.metaDescription || store.strategyDesc
                }).eq('id', store.draftId);
            }

            store.setSidebarTab('generate');
        } catch (e: any) {
            console.error(e);
            store.setStatus('❌ Error Estrategia: ' + e.message);
        } finally {
            store.setPlanningStructure(false);
        }
    }, [store]);

    // --- Generate ---
    const handleGenerate = useCallback(async () => {
        if (!hasAccess) return alert('No tienes permisos.');
        if (!store.strategyH1 && !store.keyword) return alert('Necesitas un H1 o keyword objetivo.');
        
        store.setGenerating(true);
        store.setContent('');
        store.setStatus('Redactando artículo completo…');
        try {
            const h1 = store.strategyH1 || store.keyword;
            
            // Unify links from strategy and research
            const allLinks = [
                ...(store.strategyLinks || []),
                ...(store.strategyInternalLinks || []),
                ...(store.rawSeoData?.suggestedInternalLinks || [])
            ];
            const uniqueLinksMap = new Map();
            allLinks.forEach((l: any) => {
                if (!l.url) return;
                if (!uniqueLinksMap.has(l.url)) {
                    uniqueLinksMap.set(l.url, { 
                        ...l, 
                        url: l.url, 
                        title: l.title || l.url,
                        type: l.type || 'other'
                    });
                }
            });
            const researchLinks = Array.from(uniqueLinksMap.values()).map(link => {
                if (!link.category && activeProject?.architecture_rules) {
                    for (const rule of activeProject.architecture_rules) {
                        try {
                            const reg = new RegExp(rule.regex, 'i');
                            if (reg.test(link.url)) return { ...link, category: rule.name };
                        } catch (_) { }
                    }
                }
                return link;
            });

            // Ensure we have at least 15-20 relevant links to provide the AI
            const topInventoryLinks = selectTopRelevantLinks(h1, store.csvData, 25);
            const combinedLinksMap = new Map();
            researchLinks.forEach(l => combinedLinksMap.set(l.url, l));
            topInventoryLinks.forEach(l => {
                if (!combinedLinksMap.has(l.url)) combinedLinksMap.set(l.url, l);
            });
            const finalApprovedLinks = Array.from(combinedLinksMap.values()).slice(0, 20);

            const config: ArticleConfig = {
                projectName: store.projectName, niche: store.detectedNiche, topic: h1,
                metaTitle: store.strategyTitle || h1,
                keywords: store.rawSeoData?.keywordIdeas?.shortTail?.slice(0, 5).join(', ') || store.keyword,
                tone: store.strategyTone || 'Profesional',
                wordCount: store.strategyWordCount,
                refUrls: store.strategyCompetitors, refContent: store.strategyNotes,
                csvData: store.csvData, outlineStructure: store.strategyOutline,
                approvedLinks: finalApprovedLinks,
                questions: store.strategyQuestions,
                lsiKeywords: store.strategyLSI.map((l) => l.keyword).concat(store.strategyLongTail),
                creativityLevel: store.creativityLevel, 
                contextInstructions: store.contextInstructions,
                architectureInstructions: activeProject?.architecture_instructions,
                architectureRules: activeProject?.architecture_rules,
                isStrictMode: store.isStrictMode, 
                strictFrequency: store.strictFrequency,
            };

            if (activeProject && !hasTokens(1)) {
                store.setStatus('❌ Límite de tokens mensual alcanzado.');
                return alert(`Has superado tu límite de ${getTokensLimit()} tokens.`);
            }

            const prompt = buildPrompt(config);
            store.addDebugPrompt('Fase 1: Redacción Inicial', prompt);
            store.setStatus('Redactando artículo (1 Token usado)…');
            if (activeProject) await consumeTokens(1);

            const modelToUse = store.researchMode === 'rapid' ? 'gemini-3.1-flash-lite-preview' : 'gemma-3-27b-it';
            const stream = await generateArticleStream(modelToUse, prompt);
            let buffer = '';
            for await (const chunk of stream) {
                if (chunk.text) {
                    buffer += chunk.text;
                    store.setContent(buffer);
                }
            }

            let cleanHtml = buffer;
            if (cleanHtml.includes('<!-- METADATA_START -->')) {
                const parts = cleanHtml.split('<!-- METADATA_START -->');
                cleanHtml = parts[0];
                try {
                    const meta = JSON.parse(parts[1].replace(/```json/g, '').replace(/```/g, '').trim());
                    store.setMetadata(meta);
                    if (meta.title) store.setTitle(meta.title);
                } catch (_) { }
            }

            store.setStatus('Generando vínculos interlinking...');
            const linked = await autoInterlinkAsync(
                cleanHtml, 
                finalApprovedLinks
            );
            store.setAnalyzingSEO(true);
            // Log Phase 2 context for debugging
            store.addDebugPrompt('Fase 2: Refinamiento SEO', `Optimizando con keywords: ${config.topic}, LSI: ${config.lsiKeywords?.join(', ')}. Enlaces aprobados: ${finalApprovedLinks.length}`);
            const refinedSEO = await runSEOPostProcessor(linked, config, (msg) => store.setStatus(msg));
            store.setAnalyzingSEO(false);
            
            const formatted = cleanAndFormatHtml(refinedSEO);
            store.setContent(formatted);
            store.setHasGenerated(true);
            store.setStatus('✅ Artículo generado con éxito.');
            store.setSidebarTab('assistant');
        } catch (e: any) {
            console.error(e);
            store.setStatus('❌ Error: ' + e.message);
        } finally {
            store.setGenerating(false);
        }
    }, [store, hasAccess, activeProject, hasTokens, consumeTokens, getTokensLimit]);

    // --- Humanize ---
    const handleHumanize = useCallback(async () => {
        if (!hasAccess) return alert('No tienes permisos.');
        if (!store.content) return;
        
        store.setHumanizing(true);
        store.setHumanizerStatus('Iniciando humanización...');
        // Unify links for humanizer
        const allLinks = [
            ...(store.strategyLinks || []),
            ...(store.strategyInternalLinks || []),
            ...(store.rawSeoData?.suggestedInternalLinks || [])
        ];
        const uniqueLinksMap = new Map();
        allLinks.forEach(l => {
            if (!l.url) return;
            if (!uniqueLinksMap.has(l.url)) {
                uniqueLinksMap.set(l.url, { url: l.url, title: l.title || l.url });
            }
        });
        const unifiedLinks = Array.from(uniqueLinksMap.values());

        try {
            const config: any = {
                projectName: store.projectName, 
                niche: store.detectedNiche || store.humanizerConfig.niche || 'General', 
                audience: store.humanizerConfig.audience || 'Público General',
                keywords: store.keyword, 
                notes: store.humanizerConfig.notes || '',
                lsiKeywords: store.strategyLSI.map(l => l.keyword).concat(store.strategyLongTail),
                links: unifiedLinks, 
                questions: store.strategyQuestions
            };

            const modelToUse = store.researchMode === 'rapid' ? 'gemini-3.1-flash-lite-preview' : 'gemma-3-27b-it';
            const result = await runHumanizerPipeline(
                store.content,
                config,
                50, // Intensity
                (msg: string) => store.setHumanizerStatus(msg),
                modelToUse
            ) as any;

            // result now contains { html, metadata }
            const refined = refineStyling(result.html);
            store.setContent(refined);
            
            if (result.metadata) {
                if (result.metadata.metaTitle) store.setStrategyTitle(result.metadata.metaTitle);
                if (result.metadata.metaDescription) store.setStrategyDesc(result.metadata.metaDescription);
                if (result.metadata.slug) store.setStrategySlug(result.metadata.slug);
                if (result.metadata.extracto) store.setStrategyExcerpt(result.metadata.extracto);
            }

            store.setHasHumanized(true);
            store.setHumanizerStatus('✅ ¡Humanización completada!');
            setTimeout(() => store.setHumanizerStatus(''), 3000);
        } catch (e: any) {
            console.error(e);
            store.setHumanizerStatus('❌ Error: ' + e.message);
        } finally {
            store.setHumanizing(false);
        }
    }, [store, hasAccess]);

    // --- Refine ---
    const handleRefine = useCallback(async () => {
        if (!hasAccess) return alert('No tienes permisos.');
        if (!store.content || !store.refinementInstructions) return;
        store.setRefining(true);
        store.setStatus('Refinando artículo…');
        try {
            const modelToUse = store.researchMode === 'rapid' ? 'gemini-3.1-flash-lite-preview' : 'gemma-3-27b-it';
            const refined = await refineArticleContent(store.content, store.refinementInstructions, modelToUse);
            const styled = refineStyling(refined);
            store.setContent(styled);
            store.setRefinementInstructions('');
            store.setStatus('✅ Refinamiento completado.');
        } catch (e: any) {
            console.error(e);
            store.setStatus('❌ Error: ' + e.message);
        } finally {
            store.setRefining(false);
        }
    }, [store, hasAccess]);

    return {
        handleSEO,
        handlePlanStructure,
        handleGenerate,
        handleHumanize,
        handleRefine,
        isLocalConnected,
        setIsLocalConnected,
        hasAccess
    };
}
