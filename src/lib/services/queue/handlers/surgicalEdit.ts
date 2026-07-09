import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useQueueStore } from '@/store/useQueueStore';
import { supabase } from '@/lib/supabase';
import { streamSurgicalEdit } from '@/lib/services/writer/ai-streaming';
import { refineStyling } from '@/components/tools/writer/services';
import type { QueuePayload } from '../registry';

export const handleSurgicalEditTask = async (taskId: string, payload: QueuePayload) => {
    const store = useWriterStore.getState();
    const activeProject = useProjectStore.getState().activeProject;
    const { addLogToTask, setTaskStatus } = useQueueStore.getState();
    
    const draftId = payload.taskId || store.draftId;
    
    // Verificación dinámica de borrador activo
    const isCurrentDraft = () => useWriterStore.getState().draftId === draftId;
    
    const config = payload.config;
    const originalContent = payload.content || store.content;

    console.log("[DEBUG-SurgicalEdit Handler] Starting pipeline for content length:", originalContent?.length);
    
    if (isCurrentDraft()) {
        useWriterStore.getState().setSurgicalEditing(true);
        useWriterStore.getState().setSurgicalEditStatus('Iniciando edición quirúrgica...');
    }
    
    try {
        await useWriterStore.getState().saveTaskVersion(`Pre-Edición Quirúrgica`, originalContent, draftId);

        const chunkHtml = (htmlString: string, chunkSize: number): string[] => {
            const elements = htmlString.split(/(?=<h[1-6]|<p|<ul|<ol|<li>|<div|<table|<blockquote)/gi);
            const chunks = [];
            for (let i = 0; i < elements.length; i += chunkSize) {
                const chunk = elements.slice(i, i + chunkSize).join('').trim();
                if (chunk) chunks.push(chunk);
            }
            return chunks;
        };

        const chunkSize = payload.chunkSize || payload.config?.chunkSize || 4;
        const rawChunks = chunkHtml(originalContent, chunkSize);
        console.log(`[DEBUG-SurgicalEdit Handler] Documento dividido en ${rawChunks.length} chunks.`);
        
        if (isCurrentDraft()) {
            useWriterStore.getState().setSurgicalEditStatus(`Documento dividido en ${rawChunks.length} partes...`);
        }
        addLogToTask(taskId, `Documento dividido en ${rawChunks.length} partes para edición.`, 'info');
        
        let currentDocumentChunks = rawChunks.map((chunk, index) => 
            `<div data-chunk-id="${index}" data-processing-state="idle">${chunk}</div>`
        );
        
        if (isCurrentDraft()) {
            useWriterStore.getState().setContent(currentDocumentChunks.join('\n'));
        }

        for (let i = 0; i < rawChunks.length; i++) {
            let success = false;
            let attempts = 0;
            const MAX_ATTEMPTS = 4;

            currentDocumentChunks[i] = `<div data-chunk-id="${i}" data-processing-state="processing">${rawChunks[i]}</div>`;
            if (isCurrentDraft()) {
                useWriterStore.getState().setContent(currentDocumentChunks.join('\n'));
            }

            while (!success && attempts < MAX_ATTEMPTS) {
                try {
                    if (isCurrentDraft()) {
                        useWriterStore.getState().setSurgicalEditStatus(`Editando Chunk ${i + 1}/${rawChunks.length} (Intento ${attempts + 1})...`);
                    }
                    addLogToTask(taskId, `Procesando chunk ${i + 1} de ${rawChunks.length}${attempts > 0 ? ` (Reintento ${attempts})` : ''}...`, 'info');
                    
                    const chunkResult = await streamSurgicalEdit(
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
                        useWriterStore.getState().setSurgicalEditStatus(`Error en Chunk ${i + 1}. Reintentando en 70s... (${attempts}/${MAX_ATTEMPTS})`);
                    }
                    addLogToTask(taskId, `Esperando 70s antes de reintentar chunk ${i + 1}...`, 'warning');
                    await new Promise(resolve => setTimeout(resolve, 70000));
                }
            }
            
            setTaskStatus(taskId, 'processing', ((i + 1) / rawChunks.length) * 100);
        }

        const finalResult = { html: currentDocumentChunks.join('\n') };

        await new Promise(resolve => setTimeout(resolve, 10)); // Yield to UI

        const refined = refineStyling(finalResult.html);
        
        // 1. Guardar la versión de la tarea en la base de datos de manera agnóstica al borrador activo
        await useWriterStore.getState().saveTaskVersion(`Edición Quirúrgica`, refined, draftId);
        
        // 2. Persistir directamente en las tablas de Supabase
        await supabase.from('task_contents').upsert({ id: draftId, content_body: refined });
        await supabase.from('tasks').update({ content_body: refined }).eq('id', draftId);

        // 3. Si sigue siendo el borrador activo en pantalla, actualizamos el editor visual y los estados
        if (isCurrentDraft()) {
            useWriterStore.getState().setIsRemoteUpdate(true);
            useWriterStore.getState().setContent(refined);
            useWriterStore.getState().setSurgicalEditStatus('✅ ¡Edición Quirúrgica completada!');
            useWriterStore.getState().addDebugPrompt('Edición Quirúrgica Finalizada', `Contenido mejorado quirúrgicamente con éxito`, refined.substring(0, 1000));
            setTimeout(() => {
                if (isCurrentDraft()) {
                    useWriterStore.getState().setSurgicalEditStatus('');
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
                is_surgically_edited: true, 
                surgically_edited_at: new Date().toISOString() 
            };

            const { error: surgicalError } = await supabase
                .from('tasks')
                .update({ metadata: newMetadata })
                .eq('id', draftId);
            
            if (surgicalError) console.error("[SurgicalEdit Handler] Error updating metadata:", surgicalError.message);
        }

        useQueueStore.getState().addLogToTask(taskId, 'Edición quirúrgica completada.', 'success');
    } catch (e: any) {
        console.error(e);
        if (isCurrentDraft()) {
            useWriterStore.getState().setSurgicalEditStatus('❌ Error: ' + e.message);
        }
        addLogToTask(taskId, `Error crítico: ${e.message}`, 'error');
        throw e;
    } finally {
        if (isCurrentDraft()) {
            useWriterStore.getState().setSurgicalEditing(false);
        }
    }
};
