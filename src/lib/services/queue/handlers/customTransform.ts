import { useWriterStore } from '@/store/useWriterStore';
import { useQueueStore } from '@/store/useQueueStore';
import { streamCustomTransform } from '@/lib/services/writer/ai-streaming';
import type { QueuePayload } from '../registry';

export const handleCustomTransformTask = async (taskId: string, payload: QueuePayload) => {
    const store = useWriterStore.getState();
    const { addLogToTask, setTaskStatus } = useQueueStore.getState();
    
    const draftId = payload.taskId || store.draftId;
    const originalContent = payload.content;
    const presetInstructions = payload.presetInstructions;
    const userInstructions = payload.userInstructions;
    const model = payload.model || 'gemini-3.5-flash';
    const provider = payload.provider;

    console.log("[DEBUG-CustomTransform Handler] Starting transform for length:", originalContent?.length);
    addLogToTask(taskId, `Iniciando transformación HTML...`, 'info');
    
    try {
        await store.saveTaskVersion(`Pre-Transformación Custom`, originalContent);
        
        setTaskStatus(taskId, 'processing', 20);
        addLogToTask(taskId, `Enviando HTML al modelo ${model}...`, 'info');

        const result = await streamCustomTransform(
            originalContent,
            presetInstructions,
            userInstructions,
            (partialHtml) => {
                if (store.draftId === draftId) {
                    store.setIsRemoteUpdate(true);
                    store.setContent(partialHtml);
                }
            },
            (msg) => {
                addLogToTask(taskId, msg, 'info');
            },
            model,
            provider
        );

        setTaskStatus(taskId, 'processing', 90);
        addLogToTask(taskId, `Guardando contenido transformado...`, 'success');

        if (store.draftId === draftId) {
            store.setIsRemoteUpdate(true);
            store.setContent(result.html);
            await store.saveTaskVersion(`Transformación Custom`, result.html);
        }

        setTaskStatus(taskId, 'completed', 100);
        addLogToTask(taskId, `✅ ¡Transformación completada con éxito!`, 'success');
    } catch (e: any) {
        console.error(e);
        addLogToTask(taskId, `Error crítico: ${e.message}`, 'error');
        setTaskStatus(taskId, 'error', -1);
        throw e;
    }
};
