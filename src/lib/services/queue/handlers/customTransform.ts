import { useWriterStore } from '@/store/useWriterStore';
import { useQueueStore } from '@/store/useQueueStore';
import { runChiefDesignerPlanning, runCustomTransformPipeline } from '@/lib/actions/aiActions';
import type { QueuePayload } from '../registry';

const chunkHtmlContent = (html: string, maxChunkLength: number = 5000): string[] => {
    if (html.length <= maxChunkLength) {
        return [html];
    }

    const parts = html.split(/(?=<h[2-6]|<table|<section|<div\s+class=["'][^"']*split)/gi);
    const chunks: string[] = [];
    let current = "";

    for (const part of parts) {
        if ((current + part).length > maxChunkLength && current.trim()) {
            chunks.push(current);
            current = part;
        } else {
            current += part;
        }
    }
    if (current.trim()) {
        chunks.push(current);
    }
    return chunks;
};

export const handleCustomTransformTask = async (taskId: string, payload: QueuePayload) => {
    const store = useWriterStore.getState();
    const { addLogToTask, setTaskStatus } = useQueueStore.getState();
    
    const draftId = payload.taskId || store.draftId;
    const originalContent = payload.content;
    const presetInstructions = payload.presetInstructions;
    const userInstructions = payload.userInstructions;
    const model = payload.model || 'gemini-3.5-flash';
    const provider = payload.provider;

    console.log("[DEBUG-CustomTransform Handler] Starting chunked transform for length:", originalContent?.length);
    addLogToTask(taskId, `Iniciando maquetación inteligente con Jefe de Diseño + Chunks...`, 'info');
    
    try {
        await store.saveTaskVersion(`Pre-Transformación Custom`, originalContent);
        
        setTaskStatus(taskId, 'processing', 5);
        
        // 1. Chunking
        const chunks = chunkHtmlContent(originalContent);
        const chunkResults = [...chunks];
        addLogToTask(taskId, `El artículo fue dividido en ${chunks.length} bloques lógicos para garantizar máxima precisión y evitar timeouts.`, 'info');
        setTaskStatus(taskId, 'processing', 10);

        // 2. Chief Designer Planning
        setTaskStatus(taskId, 'processing', 15);
        addLogToTask(taskId, `🧠 El Jefe de Diseño está trazando la estrategia editorial y planificando el diseño de cada bloque...`, 'info');
        
        // Use Gemini 3.1 Pro or selected model for planning
        const planningModel = model.includes('pro') ? model : 'gemini-3.1-pro-preview-gas';
        const plan = await runChiefDesignerPlanning(
            chunks, 
            presetInstructions, 
            userInstructions, 
            planningModel, 
            provider
        );
        
        setTaskStatus(taskId, 'processing', 25);
        addLogToTask(taskId, `✨ ¡Plan de maquetación y diseño completado! Iniciando ejecución de bloques...`, 'success');

        // 3. Sequential Worker Steps with Vision
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const planningItem = plan.find(p => p.index === i) || { 
                index: i, 
                focus: `Bloque ${i + 1}`, 
                pautasEspecificas: `${presetInstructions}\n\n${userInstructions}` 
            };
            
            // Calculate starting percentage for this chunk (linearly from 25% to 95%)
            const progressPct = Math.round(25 + (i / chunks.length) * 70);
            setTaskStatus(taskId, 'processing', progressPct);
            
            addLogToTask(taskId, `[${progressPct}%] [Bloque ${i + 1}/${chunks.length}] Diseñando: ${planningItem.focus}...`, 'info');
            
            const mergedInstructions = `
PAUTAS ESPECÍFICAS DE DISEÑO PARA ESTE BLOQUE:
${planningItem.pautasEspecificas}

${userInstructions ? `INSTRUCCIONES EXTRA DEL CLIENTE:\n${userInstructions}` : ''}
`;

            const result = await runCustomTransformPipeline(
                chunk,
                presetInstructions,
                mergedInstructions,
                (statusMsg) => {
                    if (statusMsg.includes('[Vision]')) {
                        addLogToTask(taskId, `  📷 ${statusMsg}`, 'info');
                    }
                },
                model,
                undefined,
                provider
            );

            chunkResults[i] = result.html;

            // Progressive Real-time updates in the editor!
            if (store.draftId === draftId) {
                store.setIsRemoteUpdate(true);
                store.setContent(chunkResults.join('\n'));
            }

            // Set ending percentage for this chunk
            const endProgressPct = Math.round(25 + ((i + 1) / chunks.length) * 70);
            setTaskStatus(taskId, 'processing', endProgressPct);
        }

        const finalHtml = chunkResults.join('\n');

        setTaskStatus(taskId, 'processing', 98);
        addLogToTask(taskId, `Guardando diseño final...`, 'success');

        if (store.draftId === draftId) {
            store.setIsRemoteUpdate(true);
            store.setContent(finalHtml);
            await store.saveTaskVersion(`Transformación Custom`, finalHtml);
        }

        setTaskStatus(taskId, 'completed', 100);
        addLogToTask(taskId, `✅ ¡El artículo ha sido maquetado con éxito siguiendo el plan del Jefe de Diseño!`, 'success');
    } catch (e: any) {
        console.error(e);
        addLogToTask(taskId, `Error crítico durante la maquetación: ${e.message}`, 'error');
        setTaskStatus(taskId, 'error', -1);
        throw e;
    }
};
