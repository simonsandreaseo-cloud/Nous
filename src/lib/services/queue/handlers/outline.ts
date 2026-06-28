import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useQueueStore } from '@/store/useQueueStore';
import { supabase } from '@/lib/supabase';
import { OutlineEngine } from '@/lib/services/writer/research/outline-engine';
import { QueuePayload } from '../registry';

export const handleOutlineTask = async (taskId: string, payload: QueuePayload) => {
    const store = useWriterStore.getState();
    const activeProject = useProjectStore.getState().activeProject;
    
    const draftId = payload.taskId || store.draftId;

    if (!store.rawSeoData) {
        useQueueStore.getState().addLogToTask(taskId, 'Realiza el análisis SEO primero.', 'error');
        throw new Error('Realiza el análisis SEO primero.');
    }

    if (store.draftId === draftId) {
        useWriterStore.getState().setPlanningStructure(true);
        useWriterStore.getState().setStatus('Regenerando outline estratégico con Gemini 3.1 Flash Lite...');
    }

    try {
        const res = await OutlineEngine.generate({
            keyword: store.keyword,
            seoMetadata: {
                h1: store.strategyH1,
                seo_title: store.strategyTitle,
                slug: store.strategySlug,
                meta_description: store.strategyDesc,
                extracto: store.strategyExcerpt,
                recommendedWordCount: store.strategyWordCount
            },
            cleanedLSI: store.strategyLSI,
            suggestedLinks: store.strategyLinks,
            validCompetitors: (store.rawSeoData as any).competitors || [],
            wordCountGoal: parseInt(String(store.strategyWordCount)) || 1500
        });

        if (draftId) {
            await supabase.from('tasks').update({
                outline_structure: res
            }).eq('id', draftId);
        }
        
        if (useWriterStore.getState().draftId === draftId) {
            const s = useWriterStore.getState();
            s.setStrategyOutline(res);
            s.addDebugPrompt('Regeneración de Outline', `Nuevo outline generado para: ${s.keyword}`, JSON.stringify(res));
            s.setStatus('✅ Outline regenerado con éxito.');
        }

        useQueueStore.getState().addLogToTask(taskId, 'Outline regenerado con éxito.', 'success');
    } catch (e: any) {
        console.error(e);
        useQueueStore.getState().addLogToTask(taskId, `Error Regeneración: ${e.message}`, 'error');
        if (useWriterStore.getState().draftId === draftId) {
            useWriterStore.getState().setStatus('❌ Error Regeneración: ' + e.message);
        }
        throw e;
    } finally {
        if (useWriterStore.getState().draftId === draftId) {
            useWriterStore.getState().setPlanningStructure(false);
        }
    }
};
