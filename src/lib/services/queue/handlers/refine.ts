import { useWriterStore } from '@/store/useWriterStore';
import { useQueueStore } from '@/store/useQueueStore';
import { refineArticleContent } from '@/lib/actions/aiActions';
import { refineStyling } from '@/components/tools/writer/services';
import type { QueuePayload } from '../registry';

export const handleRefineTask = async (taskId: string, payload: QueuePayload) => {
    const store = useWriterStore.getState();
    const { addLogToTask, setTaskStatus } = useQueueStore.getState();
    
    const draftId = payload.taskId || store.draftId;
    
    // Verificación dinámica de borrador activo
    const isCurrentDraft = () => useWriterStore.getState().draftId === draftId;
    
    const originalContent = payload.content;
    const instructions = payload.instructions;
    const researchMode = payload.researchMode || 'rapid';

    if (isCurrentDraft()) {
        useWriterStore.getState().setRefining(true);
        useWriterStore.getState().setStatus('Refinando artículo…');
    }
    addLogToTask(taskId, 'Iniciando refinamiento...', 'info');

    try {
        const modelToUse = payload.model || payload.config?.model || (researchMode === 'rapid' ? 'gemma-4-31b-it' : 'gemma-4-31b-it');
        addLogToTask(taskId, `Llamando al modelo de IA (${modelToUse})...`, 'info');
        
        setTaskStatus(taskId, 'processing', 20);
        
        const refined = await refineArticleContent(originalContent, instructions, modelToUse);
        
        setTaskStatus(taskId, 'processing', 80);
        await new Promise(resolve => setTimeout(resolve, 10)); // Yield to UI
        
        const styled = refineStyling(refined);
        
        // 1. Guardar la versión de la tarea en la base de datos de manera agnóstica al borrador activo
        await useWriterStore.getState().saveTaskVersion(`Refinada`, styled, draftId);
        
        // 2. Persistir directamente en las tablas de Supabase
        const { supabase } = require('@/lib/supabase');
        await supabase.from('task_contents').upsert({ id: draftId, content_body: styled });
        await supabase.from('tasks').update({ content_body: styled }).eq('id', draftId);

        // 3. Si sigue siendo el borrador activo en pantalla, actualizamos el editor visual y los estados
        if (isCurrentDraft()) {
            useWriterStore.getState().setIsRemoteUpdate(true);
            useWriterStore.getState().setContent(styled);
            useWriterStore.getState().setStatus('✅ Refinamiento completado.');
            useWriterStore.getState().setRefinementInstructions('');
            useWriterStore.getState().addDebugPrompt('Refinamiento Completado', `Instrucciones aplicadas: ${instructions}`, styled.substring(0, 1000));
        }

        addLogToTask(taskId, 'Refinamiento completado con éxito.', 'success');
        setTaskStatus(taskId, 'processing', 100);
        
    } catch (e: any) {
        console.error(e);
        if (isCurrentDraft()) {
            useWriterStore.getState().setStatus('❌ Error: ' + e.message);
        }
        addLogToTask(taskId, `Error crítico: ${e.message}`, 'error');
        throw e;
    } finally {
        if (isCurrentDraft()) {
            useWriterStore.getState().setRefining(false);
        }
    }
};
