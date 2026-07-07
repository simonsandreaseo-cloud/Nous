import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useQueueStore } from '@/store/useQueueStore';
import { supabase } from '@/lib/supabase';
import { streamHumanize } from '@/lib/services/writer/ai-streaming';
import { refineStyling } from '@/components/tools/writer/services';
import type { QueuePayload } from '../registry';

export const handleHumanizeTask = async (taskId: string, payload: QueuePayload) => {
    const store = useWriterStore.getState();
    const activeProject = useProjectStore.getState().activeProject;
    const { addLogToTask, setTaskStatus } = useQueueStore.getState();
    
    const draftId = payload.taskId || store.draftId;
    
    // Si no estamos en el borrador correcto, abortar
    if (store.draftId !== draftId) {
        addLogToTask(taskId, `Draft ID mismatch, expected ${store.draftId} but got ${draftId}. Aborting.`, 'error');
        throw new Error('Draft ID mismatch');
    }
    
    const config = payload.config;
    const originalContent = payload.content;

    console.log("[DEBUG-Humanize Handler] Starting pipeline for content length:", originalContent?.length);
    useWriterStore.getState().setHumanizing(true);
    useWriterStore.getState().setHumanizerStatus('Iniciando humanización...');
    
    try {
        await useWriterStore.getState().saveTaskVersion(`Pre-Humanización`, originalContent);

        const chunkHtml = (htmlString: string, chunkSize: number): string[] => {
            const elements = htmlString.split(/(?=<h[1-6]|<p|<ul|<ol|<li>|<div|<table|<blockquote)/gi);
            const chunks = [];
            for (let i = 0; i < elements.length; i += chunkSize) {
                const chunk = elements.slice(i, i + chunkSize).join('').trim();
                if (chunk) chunks.push(chunk);
            }
            return chunks;
        };

        const rawChunks = chunkHtml(originalContent, 4);
        console.log(`[DEBUG-Humanize Handler] Documento dividido en ${rawChunks.length} chunks.`);
        useWriterStore.getState().setHumanizerStatus(`Documento dividido en ${rawChunks.length} partes...`);
        addLogToTask(taskId, `Documento dividido en ${rawChunks.length} partes para procesar.`, 'info');
        
        let currentDocumentChunks = rawChunks.map((chunk, index) => 
            `<div data-chunk-id="${index}" data-processing-state="idle">${chunk}</div>`
        );
        
        useWriterStore.getState().setContent(currentDocumentChunks.join('\n'));

        for (let i = 0; i < rawChunks.length; i++) {
            let success = false;
            let attempts = 0;
            const MAX_ATTEMPTS = 4;

            currentDocumentChunks[i] = `<div data-chunk-id="${i}" data-processing-state="processing">${rawChunks[i]}</div>`;
            useWriterStore.getState().setContent(currentDocumentChunks.join('\n'));

            while (!success && attempts < MAX_ATTEMPTS) {
                try {
                    useWriterStore.getState().setHumanizerStatus(`Humanizando Chunk ${i + 1}/${rawChunks.length} (Intento ${attempts + 1})...`);
                    addLogToTask(taskId, `Procesando chunk ${i + 1} de ${rawChunks.length}${attempts > 0 ? ` (Reintento ${attempts})` : ''}...`, 'info');
                    
                    const chunkResult = await streamHumanize(
                        rawChunks[i],
                        config,
                        50,
                        (partialHtml) => {
                            currentDocumentChunks[i] = partialHtml;
                            useWriterStore.getState().setIsRemoteUpdate(true);
                            useWriterStore.getState().setContent(currentDocumentChunks.join('\n'));
                        },
                        (msg) => {
                            console.log(`[Chunk ${i+1}] ${msg}`);
                            addLogToTask(taskId, `[Chunk ${i+1}] ${msg}`, 'info');
                        },
                        undefined,
                        (batchProgress) => {
                            const baseProgress = (i / rawChunks.length) * 100;
                            const additionalProgress = (batchProgress / 100) * (1 / rawChunks.length) * 100;
                            setTaskStatus(taskId, 'processing', Number((baseProgress + additionalProgress).toFixed(2)));
                        }
                    );
                    
                    addLogToTask(taskId, `Chunk ${i + 1} completado.`, 'success');
                    
                    currentDocumentChunks[i] = chunkResult.html;
                    useWriterStore.getState().setContent(currentDocumentChunks.join('\n'));
                    success = true;
                } catch (err: any) {
                    attempts++;
                    console.error(`[Chunk ${i+1}] Fallo intento ${attempts}:`, err);
                    addLogToTask(taskId, `Error en chunk ${i + 1}: ${err.message}`, 'error');
                    
                    if (attempts >= MAX_ATTEMPTS) {
                        addLogToTask(taskId, `Fallo definitivo en chunk ${i + 1} tras ${MAX_ATTEMPTS} intentos. Se mantendrá original.`, 'error');
                        currentDocumentChunks[i] = rawChunks[i];
                        useWriterStore.getState().setContent(currentDocumentChunks.join('\n'));
                        break;
                    }
                    
                    useWriterStore.getState().setHumanizerStatus(`Error en Chunk ${i + 1}. Reintentando en 70s... (${attempts}/${MAX_ATTEMPTS})`);
                    addLogToTask(taskId, `Esperando 70s antes de reintentar chunk ${i + 1}...`, 'warning');
                    await new Promise(resolve => setTimeout(resolve, 70000));
                }
            }
            
            setTaskStatus(taskId, 'processing', ((i + 1) / rawChunks.length) * 100);
        }

        const finalResult = { html: currentDocumentChunks.join('\n') };

        await new Promise(resolve => setTimeout(resolve, 10)); // Yield to UI

        const refined = refineStyling(finalResult.html);
        
        useWriterStore.getState().setIsRemoteUpdate(true);
        useWriterStore.getState().setContent(refined);
        useWriterStore.getState().setHasHumanized(true);
        useWriterStore.getState().setHumanizerStatus('✅ ¡Humanización completada!');

        useWriterStore.getState().addDebugPrompt('Humanización Finalizada', `Contenido humanizado con éxito`, refined.substring(0, 1000));
        
        await useWriterStore.getState().saveTaskVersion(`Humanizada`, refined);
        
        if (draftId) {
            const { data: taskData } = await supabase
                .from('tasks')
                .select('metadata')
                .eq('id', draftId)
                .single();

            const newMetadata = { 
                ...(taskData?.metadata || {}), 
                is_humanized: true, 
                humanized_at: new Date().toISOString() 
            };

            const { error: humanizeError } = await supabase
                .from('tasks')
                .update({ metadata: newMetadata })
                .eq('id', draftId);
            
            if (humanizeError) console.error("[Humanize Handler] Error updating humanization metadata:", humanizeError.message);
        }

        setTimeout(() => useWriterStore.getState().setHumanizerStatus(''), 3000);
    } catch (e: any) {
        console.error(e);
        useWriterStore.getState().setHumanizerStatus('❌ Error: ' + e.message);
        addLogToTask(taskId, `Error crítico: ${e.message}`, 'error');
        throw e;
    } finally {
        useWriterStore.getState().setHumanizing(false);
    }
};
