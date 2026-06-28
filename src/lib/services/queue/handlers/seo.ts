import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useQueueStore } from '@/store/useQueueStore';
import { supabase } from '@/lib/supabase';
import { ResearchOrchestrator } from '@/lib/services/writer/research';
import { generateBriefingText } from '@/components/tools/writer/services';
import { QueuePayload } from '../registry';

export const handleSEOTask = async (taskId: string, payload: QueuePayload) => {
    const store = useWriterStore.getState();
    const activeProject = useProjectStore.getState().activeProject;
    
    const draftId = payload.taskId || store.draftId;
    const keyword = payload.keyword || store.keyword;

    if (!keyword) {
        useQueueStore.getState().addLogToTask(taskId, 'Falta la palabra clave.', 'error');
        throw new Error('Falta la palabra clave.');
    }

    if (store.draftId === draftId) {
        useWriterStore.getState().setAnalyzingSEO(true);
        useWriterStore.getState().setStatus('Realizando análisis profundo de SEO...');
    }

    try {
        const modelToUse = store.researchMode === 'rapid' ? 'gemma-4-31b-it' : 'gemma-4-31b-it';
        const res = await ResearchOrchestrator.runDeepAnalysis({
            keyword: keyword,
            projectId: activeProject?.id,
            onProgress: (phase) => {
                if (useWriterStore.getState().draftId === draftId) {
                    useWriterStore.getState().setStatus(phase);
                }
            },
            modelName: modelToUse,
            language: activeProject?.settings?.content_preferences?.default_content_language || 'es'
        });

        if (draftId) {
            console.log("[QueueRegistry] Persisting SEO Strategy to DB for task:", draftId);
            const { error: updateError } = await supabase
                .from('tasks')
                .update({
                    seo_data: res, 
                    h1: res.h1,
                    seo_title: res.seo_title,
                    meta_description: res.meta_description,
                    excerpt: res.extracto,
                    target_url_slug: res.target_url_slug,
                    target_word_count: res.target_word_count,
                    outline_structure: res.strategyOutline || [],
                    status: 'por_redactar'
                })
                .eq('id', draftId);
            
            if (updateError) console.error("[QueueRegistry] Error persisting research:", updateError.message);
        }

        if (useWriterStore.getState().draftId === draftId) {
            const s = useWriterStore.getState();
            s.setRawSeoData(res);
            if (res.nicheDetected) s.setDetectedNiche(res.nicheDetected);
            if (res.lsiKeywords) s.setStrategyLSI(res.lsiKeywords);
            if (res.frequentQuestions) s.setStrategyQuestions(res.frequentQuestions);
            if (res.suggestedInternalLinks) s.setStrategyLinks(res.suggestedInternalLinks || []);
            if (res.keywordIdeas) s.setStrategyKeywords(res.keywordIdeas);
            if (res.searchVolume || res.volume) s.setStrategyVolume(String(res.searchVolume || res.volume));
            if (res.keywordDifficulty) s.setStrategyDifficulty(res.keywordDifficulty);
            
            const cannibalUrls = (res as any).cannibalizationUrls || [];
            s.setStrategyCannibalization(cannibalUrls);
            if (cannibalUrls.length > 0) s.setIsConsoleOpen(true);

            const brief = generateBriefingText(res);
            s.setStrategyNotes(brief);
            
            if (res.strategyOutline) s.setStrategyOutline(res.strategyOutline);
            if (res.h1) s.setStrategyH1(res.h1);
            if (res.seo_title) s.setStrategyTitle(res.seo_title);
            if (res.target_url_slug) s.setStrategySlug(res.target_url_slug);
            if (res.meta_description) s.setStrategyDesc(res.meta_description);
            if (res.extracto) s.setStrategyExcerpt(res.extracto);
            if (res.target_word_count) s.setStrategyWordCount(String(res.target_word_count));
            
            s.setStatus('✅ Análisis SEO y Arquitectura completados.');
            s.setSidebarTab('seo');
        }
        
        useQueueStore.getState().addLogToTask(taskId, 'Análisis SEO completado.', 'success');
    } catch (e: any) {
        console.error(e);
        useQueueStore.getState().addLogToTask(taskId, `Error: ${e.message}`, 'error');
        if (useWriterStore.getState().draftId === draftId) {
            useWriterStore.getState().setStatus('❌ Error SEO: ' + e.message);
        }
        throw e;
    } finally {
        if (useWriterStore.getState().draftId === draftId) {
            useWriterStore.getState().setAnalyzingSEO(false);
        }
    }
};
