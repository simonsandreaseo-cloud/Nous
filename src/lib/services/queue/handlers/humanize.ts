import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useQueueStore } from '@/store/useQueueStore';
import { supabase } from '@/lib/supabase';
import { streamHumanize } from '@/lib/services/writer/ai-streaming';
import { refineStyling } from '@/components/tools/writer/services';
import { HtmlProtectionService, sizeAwareChunkHtml } from '@/lib/utils/html-protection';
import type { QueuePayload } from '../registry';

export const handleHumanizeTask = async (taskId: string, payload: QueuePayload) => {
    const store = useWriterStore.getState();
    const activeProject = useProjectStore.getState().activeProject;
    const { addLogToTask, setTaskStatus } = useQueueStore.getState();
    
    const draftId = payload.taskId || store.draftId;
    
    // Verificación dinámica de borrador activo
    const isCurrentDraft = () => useWriterStore.getState().draftId === draftId;
    
    const config = payload.config;
    let originalContent = payload.content;
    if (draftId) {
        try {
            const { supabase: supabaseClient } = require('@/lib/supabase');
            const { data: dbContent } = await supabaseClient
                .from('task_contents')
                .select('content_body')
                .eq('id', draftId)
                .single();
            if (dbContent?.content_body) {
                originalContent = dbContent.content_body;
            }
        } catch (dbErr) {
            console.warn(`[Queue] Failed to load latest content from database for draft ${draftId}:`, dbErr);
        }
    }

    console.log("[DEBUG-Humanize Handler] Starting pipeline for content length:", originalContent?.length);
    
    if (isCurrentDraft()) {
        useWriterStore.getState().setHumanizing(true);
        useWriterStore.getState().setHumanizerStatus('Iniciando humanización...');
    }
    
    try {
        await useWriterStore.getState().saveTaskVersion(`Pre-Humanización`, originalContent, draftId);

        // Protection Phase
        const { blindedHtml, map: protectionMap } = HtmlProtectionService.protect(originalContent);
        
        const chunkSize = payload.chunkSize || payload.config?.chunkSize || 4;
        const rawChunks = sizeAwareChunkHtml(blindedHtml, chunkSize);
        console.log(`[DEBUG-Humanize Handler] Documento dividido en ${rawChunks.length} chunks.`);
        
        if (isCurrentDraft()) {
            useWriterStore.getState().setHumanizerStatus(`Documento dividido en ${rawChunks.length} partes...`);
        }
        addLogToTask(taskId, `Documento dividido en ${rawChunks.length} partes para procesar.`, 'info');
        
        let currentDocumentChunks = rawChunks.map((chunk, index) => 
            `<div data-chunk-id="${index}" data-processing-state="idle">${chunk}</div>`
        );
        
        if (isCurrentDraft()) {
            useWriterStore.getState().setContent(currentDocumentChunks.join('\n'));
        }

        for (let i = 0; i < rawChunks.length; i++) {
            let success = false;
            let attempts = 0;
            const MAX_ATTEMPTS = 2;

            currentDocumentChunks[i] = `<div data-chunk-id="${i}" data-processing-state="processing">${rawChunks[i]}</div>`;
            if (isCurrentDraft()) {
                useWriterStore.getState().setContent(currentDocumentChunks.join('\n'));
            }

            while (!success && attempts < MAX_ATTEMPTS) {
                try {
                    if (isCurrentDraft()) {
                        useWriterStore.getState().setHumanizerStatus(`Humanizando Chunk ${i + 1}/${rawChunks.length} (Intento ${attempts + 1})...`);
                    }
                    addLogToTask(taskId, `Procesando chunk ${i + 1} de ${rawChunks.length}${attempts > 0 ? ` (Reintento ${attempts})` : ''}...`, 'info');
                    
                    const chunkResult = await streamHumanize(
                        rawChunks[i],
                        config,
                        50,
                        (partialHtml) => {
                            currentDocumentChunks[i] = partialHtml;
                            if (isCurrentDraft()) {
                                useWriterStore.getState().setIsRemoteUpdate(true);
                                useWriterStore.getState().setContent(currentDocumentChunks.join('\n'));
                            }
                        },
                        (msg) => {
                            console.log(`[Chunk ${i+1}] ${msg}`);
                            addLogToTask(taskId, `[Chunk ${i+1}] ${msg}`, 'info');
                        },
                        payload.model || payload.config?.model || undefined,
                        (batchProgress) => {
                            const baseProgress = (i / rawChunks.length) * 100;
                            const additionalProgress = (batchProgress / 100) * (1 / rawChunks.length) * 100;
                            setTaskStatus(taskId, 'processing', Number((baseProgress + additionalProgress).toFixed(2)));
                        }
                    );
                    
                    addLogToTask(taskId, `Chunk ${i + 1} completado.`, 'success');
                    
                    currentDocumentChunks[i] = chunkResult.html;
                    if (isCurrentDraft()) {
                        useWriterStore.getState().setContent(currentDocumentChunks.join('\n'));
                    }
                    success = true;
                } catch (err: any) {
                    attempts++;
                    console.error(`[Chunk ${i+1}] Fallo intento ${attempts}:`, err);
                    addLogToTask(taskId, `Error en chunk ${i + 1}: ${err.message}`, 'error');
                    
                    if (attempts >= MAX_ATTEMPTS) {
                        addLogToTask(taskId, `Fallo definitivo en chunk ${i + 1} tras ${MAX_ATTEMPTS} intentos. Se mantendrá original.`, 'error');
                        currentDocumentChunks[i] = rawChunks[i];
                        if (isCurrentDraft()) {
                            useWriterStore.getState().setContent(currentDocumentChunks.join('\n'));
                        }
                        break;
                    }
                    
                    if (isCurrentDraft()) {
                        useWriterStore.getState().setHumanizerStatus(`Error en Chunk ${i + 1}. Reintentando en 70s... (${attempts}/${MAX_ATTEMPTS})`);
                    }
                    addLogToTask(taskId, `Esperando 70s antes de reintentar chunk ${i + 1}...`, 'warning');
                    await new Promise(resolve => setTimeout(resolve, 70000));
                }
            }
            
            setTaskStatus(taskId, 'processing', ((i + 1) / rawChunks.length) * 100);
        }

        const finalResult = { html: currentDocumentChunks.join('\n') };
        
        await new Promise(resolve => setTimeout(resolve, 10)); // Yield to UI
        
        // Restore protected atomic blocks
        const restoredHtml = HtmlProtectionService.restore(finalResult.html, protectionMap);
        const refined = refineStyling(restoredHtml);
        
        // 1. Guardar la versión de la tarea en la base de datos de manera agnóstica al borrador activo
        await useWriterStore.getState().saveTaskVersion(`Humanizada`, refined, draftId);

        
        // 2. Persistir directamente en las tablas de Supabase
        await supabase.from('task_contents').upsert({ id: draftId, content_body: refined });
        await supabase.from('tasks').update({ content_body: refined }).eq('id', draftId);

        // 3. Si sigue siendo el borrador activo en pantalla, actualizamos el editor visual y los estados
        if (isCurrentDraft()) {
            useWriterStore.getState().setIsRemoteUpdate(true);
            useWriterStore.getState().setContent(refined);
            useWriterStore.getState().setHasHumanized(true);
            useWriterStore.getState().setHumanizerStatus('✅ ¡Humanización completada!');
            useWriterStore.getState().addDebugPrompt('Humanización Finalizada', `Contenido humanizado con éxito`, refined.substring(0, 1000));
            setTimeout(() => {
                if (isCurrentDraft()) {
                    useWriterStore.getState().setHumanizerStatus('');
                }
            }, 3000);
        }
        
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

        useQueueStore.getState().addLogToTask(taskId, 'Humanización completada.', 'success');
    } catch (e: any) {
        console.error(e);
        if (isCurrentDraft()) {
            useWriterStore.getState().setHumanizerStatus('❌ Error: ' + e.message);
        }
        addLogToTask(taskId, `Error crítico: ${e.message}`, 'error');
        throw e;
    } finally {
        if (isCurrentDraft()) {
            useWriterStore.getState().setHumanizing(false);
        }
    }
};
