import { useWriterStore } from '@/store/useWriterStore';
import { useQueueStore } from '@/store/useQueueStore';
import { refineArticleContent, refineStyling } from '@/components/tools/writer/services';
import type { QueuePayload } from '../registry';

export const handleRefineTask = async (taskId: string, payload: QueuePayload) => {
    const store = useWriterStore.getState();
    const { addLogToTask, setTaskStatus } = useQueueStore.getState();
    
    const draftId = payload.taskId || store.draftId;
    
    if (store.draftId !== draftId) {
        addLogToTask(taskId, `Draft ID mismatch. Aborting.`, 'error');
        throw new Error('Draft ID mismatch');
    }
    
    const originalContent = payload.content;
    const instructions = payload.instructions;
    const researchMode = payload.researchMode || 'rapid';

    useWriterStore.getState().setRefining(true);
    useWriterStore.getState().setStatus('Refinando artículo…');
    addLogToTask(taskId, 'Iniciando refinamiento...', 'info');

    try {
        const modelToUse = researchMode === 'rapid' ? 'gemma-4-31b-it' : 'gemma-4-31b-it';
        addLogToTask(taskId, `Llamando al modelo de IA (${modelToUse})...`, 'info');
        
        setTaskStatus(taskId, 'processing', 20);
        
        const refined = await refineArticleContent(originalContent, instructions, modelToUse);
        
        setTaskStatus(taskId, 'processing', 80);
        await new Promise(resolve => setTimeout(resolve, 10)); // Yield to UI
        
        const styled = refineStyling(refined);
        
        useWriterStore.getState().setIsRemoteUpdate(true);
        useWriterStore.getState().setContent(styled);
        useWriterStore.getState().setStatus('✅ Refinamiento completado.');
        useWriterStore.getState().setRefinementInstructions('');

        useWriterStore.getState().addDebugPrompt('Refinamiento Completado', `Instrucciones aplicadas: ${instructions}`, styled.substring(0, 1000));
        
        await useWriterStore.getState().saveTaskVersion(`Refinada`, styled);
        addLogToTask(taskId, 'Refinamiento completado con éxito.', 'success');
        setTaskStatus(taskId, 'processing', 100);
        
    } catch (e: any) {
        console.error(e);
        useWriterStore.getState().setStatus('❌ Error: ' + e.message);
        addLogToTask(taskId, `Error crítico: ${e.message}`, 'error');
        throw e;
    } finally {
        useWriterStore.getState().setRefining(false);
    }
};
