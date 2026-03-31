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
    const { hasContentAccess, canTakeContents, canEditAny, canUseAllTools, hasTokens, consumeTokens, getTokensLimit } = usePermissions();

    const [isLocalConnected, setIsLocalConnected] = useState(false);

    // Context check for hasContentAccess
    const hasAccess = activeProject ? (canTakeContents() || canEditAny() || canUseAllTools()) : true;

    // --- SEO Research ---
    const handleSEO = useCallback(async () => {
        if (!store.keyword) return alert('Ingresa una palabra clave primero.');
        store.setAnalyzingSEO(true);
        store.setStatus('Realizando análisis profundo de SEO...');
        try {
            const res = await runDeepSEOAnalysis(
                store.keyword,
                store.csvData,
                store.projectName,
                false,
                activeProject?.id
            );
            store.setRawSeoData(res);
            store.setDetectedNiche(res.nicheDetected);
            store.setStrategyLSI(res.lsiKeywords || []);
            store.setStrategyQuestions(res.frequentQuestions || []);
            store.setStrategyCompetitors(res.top10Urls.slice(0, 5).map(u => u.url).join(', '));
            
            const brief = generateBriefingText(res);
            store.setStrategyNotes(brief);
            
            store.setStatus('✅ Análisis SEO completado.');
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
        store.setStatus('Diseñando estrategia de contenido...');
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
                csvData: store.csvData,
                approvedLinks: store.strategyLinks,
            };
            const res = await generateOutlineStrategy(config, store.keyword, store.rawSeoData, store.model);
            
            if (res.snippet) {
                store.setStrategyTitle(res.snippet.metaTitle);
                store.setStrategyH1(res.snippet.h1);
                store.setStrategySlug(res.snippet.slug);
                store.setStrategyDesc(res.snippet.metaDescription);
            }
            if (res.outline) {
                store.setStrategyOutline(res.outline.headers || []);
            }
            
            store.setStatus('✅ Estrategia generada con éxito.');
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
            const config: ArticleConfig = {
                projectName: store.projectName, niche: store.detectedNiche, topic: h1,
                metaTitle: store.strategyTitle || h1,
                keywords: store.rawSeoData?.keywordIdeas?.shortTail?.slice(0, 5).join(', ') || store.keyword,
                tone: store.strategyTone, wordCount: store.strategyWordCount,
                refUrls: store.strategyCompetitors, refContent: store.strategyNotes,
                csvData: store.csvData, outlineStructure: store.strategyOutline,
                approvedLinks: store.strategyLinks,
                questions: store.strategyQuestions,
                lsiKeywords: store.strategyLSI.map((l) => l.keyword).concat(store.strategyLongTail),
                creativityLevel: store.creativityLevel, contextInstructions: store.contextInstructions,
                isStrictMode: store.isStrictMode, strictFrequency: store.strictFrequency,
            };

            if (activeProject && !hasTokens(1)) {
                store.setStatus('❌ Límite de tokens mensual alcanzado.');
                return alert(`Has superado tu límite de ${getTokensLimit()} tokens.`);
            }

            const prompt = buildPrompt(config);
            store.setStatus('Redactando artículo (1 Token usado)…');
            if (activeProject) await consumeTokens(1);

            const stream = await generateArticleStream(store.model, prompt);
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
            const linked = await autoInterlinkAsync(cleanHtml, store.strategyLinks.length > 0 ? store.strategyLinks : store.csvData);
            const formatted = cleanAndFormatHtml(linked);
            store.setContent(formatted);
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
        try {
            const config: any = {
                projectName: store.projectName, niche: store.detectedNiche || 'General', audience: 'Público General',
                keywords: store.keyword, notes: store.humanizerConfig.notes || '',
                lsiKeywords: store.strategyLSI.map(l => l.keyword).concat(store.strategyLongTail),
                links: store.strategyLinks, isStrictMode: store.isStrictMode, strictFrequency: store.strictFrequency,
                questions: store.strategyQuestions
            };

            const result = await runHumanizerPipeline(
                store.content,
                config,
                store.humanizerConfig.intensity,
                (msg) => store.setHumanizerStatus(msg)
            );

            const refined = refineStyling(result.html);
            store.setContent(refined);
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
            const refined = await refineArticleContent(store.content, store.refinementInstructions, store.model);
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
