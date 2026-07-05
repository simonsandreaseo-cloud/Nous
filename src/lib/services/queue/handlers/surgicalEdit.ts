import { useWriterStore } from '@/store/useWriterStore';
import { useQueueStore } from '@/store/useQueueStore';
import { streamSurgicalEdit } from '@/lib/services/writer/ai-streaming';
import { refineStyling } from '@/components/tools/writer/services';
import type { QueuePayload } from '../registry';

/**
 * Handler registrable para el tipo 'surgical_edit'.
 *
 * Todos los datos que necesita vienen en el payload serializable,
 * nunca desde un closure capturado al momento del enqueue.
 *
 * Payload esperado:
 *   - draftId:      string  — ID del borrador a editar
 *   - content:      string  — HTML original en el momento del dispatch
 *   - projectName:  string
 *   - niche:        string
 *   - audience:     string
 *   - language:     string
 */
export const handleSurgicalEditTask = async (taskId: string, payload: QueuePayload): Promise<void> => {
    const { addLogToTask, setTaskStatus } = useQueueStore.getState();
    const writerStore = useWriterStore.getState();

    const { draftId, content, projectName, niche, audience, language } = payload;

    // Guardar versión previa sólo si el borrador activo es el mismo
    if (writerStore.draftId === draftId) {
        await writerStore.saveTaskVersion('Pre-Edición Quirúrgica', content);
        writerStore.setSurgicalEditing(true);
        writerStore.setSurgicalEditStatus('Iniciando edición quirúrgica...');
    }

    const config = { projectName, niche, audience, language };

    const chunkHtml = (htmlString: string, maxBlocks = 2): string[] => {
        if (typeof window === 'undefined') return [htmlString];
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const chunks: string[] = [];
        let currentChunk = '';
        let blockCount = 0;

        Array.from(doc.body.children).forEach((el) => {
            currentChunk += el.outerHTML;
            if (['p', 'ul', 'ol', 'blockquote', 'table', 'div'].includes(el.tagName.toLowerCase())) {
                blockCount++;
            }
            if (blockCount >= maxBlocks) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
                blockCount = 0;
            }
        });

        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        return chunks.length > 0 ? chunks : [htmlString];
    };

    const rawChunks = chunkHtml(content, 2);
    addLogToTask(taskId, `Documento dividido en ${rawChunks.length} partes para edición.`, 'info');

    // Inicializar chunks con marcadores de estado
    let currentDocumentChunks = rawChunks.map(
        (chunk, index) => `<div data-chunk-id="${index}" data-processing-state="idle">${chunk}</div>`
    );

    const syncContent = (chunks: string[]) => {
        const fresh = useWriterStore.getState();
        if (fresh.draftId === draftId) {
            fresh.setContent(chunks.join('\n'));
        }
    };

    syncContent(currentDocumentChunks);

    try {
        for (let i = 0; i < rawChunks.length; i++) {
            let success = false;
            let attempts = 0;
            const MAX_ATTEMPTS = 4;

            currentDocumentChunks[i] = `<div data-chunk-id="${i}" data-processing-state="processing">${rawChunks[i]}</div>`;
            syncContent(currentDocumentChunks);

            while (!success && attempts < MAX_ATTEMPTS) {
                try {
                    addLogToTask(taskId, `Procesando chunk ${i + 1} de ${rawChunks.length}${attempts > 0 ? ` (Reintento ${attempts})` : ''}...`, 'info');

                    const chunkResult = await streamSurgicalEdit(
                        rawChunks[i],
                        config,
                        50,
                        () => {}, // Streaming parcial desactivado para DOM estable
                        (msg) => addLogToTask(taskId, `[Chunk ${i + 1}] ${msg}`, 'info')
                    );

                    addLogToTask(taskId, `Chunk ${i + 1} completado.`, 'success');
                    currentDocumentChunks[i] = chunkResult.html;
                    syncContent(currentDocumentChunks);
                    success = true;
                } catch (err: any) {
                    attempts++;
                    addLogToTask(taskId, `Error en chunk ${i + 1}: ${err.message}`, 'error');

                    if (attempts >= MAX_ATTEMPTS) {
                        addLogToTask(taskId, `Fallo definitivo en chunk ${i + 1} tras ${MAX_ATTEMPTS} intentos. Se mantendrá el original.`, 'error');
                        currentDocumentChunks[i] = rawChunks[i];
                        syncContent(currentDocumentChunks);
                        break;
                    }

                    addLogToTask(taskId, `Esperando 70s antes de reintentar chunk ${i + 1}...`, 'warning');
                    await new Promise(resolve => setTimeout(resolve, 70_000));
                }
            }

            setTaskStatus(taskId, 'processing', ((i + 1) / rawChunks.length) * 100);
        }

        await new Promise(resolve => setTimeout(resolve, 10)); // Yield to UI

        const refined = refineStyling(currentDocumentChunks.join('\n'));

        const freshStore = useWriterStore.getState();
        if (freshStore.draftId === draftId) {
            freshStore.setContent(refined);
            freshStore.setSurgicalEditStatus('✅ ¡Edición Quirúrgica completada!');
            freshStore.addDebugPrompt('Edición Quirúrgica Finalizada', 'Contenido mejorado quirúrgicamente con éxito', refined.substring(0, 1000));
            await freshStore.saveTaskVersion('Edición Quirúrgica', refined);
        }

        addLogToTask(taskId, 'Edición quirúrgica finalizada.', 'success');
    } catch (error: any) {
        console.error('[SurgicalEdit] Error:', error);
        addLogToTask(taskId, `Error crítico: ${error.message}`, 'error');

        const freshStore = useWriterStore.getState();
        if (freshStore.draftId === draftId) {
            freshStore.setSurgicalEditStatus(`❌ Error: ${error.message}`);
            freshStore.addDebugPrompt('Error en Edición Quirúrgica', 'Fallo general', error.message);
        }

        throw error; // Re-throw para que el QueueProcessor lo marque como 'error'
    } finally {
        const freshStore = useWriterStore.getState();
        if (freshStore.draftId === draftId) {
            freshStore.setSurgicalEditing(false);
            setTimeout(() => freshStore.setSurgicalEditStatus(''), 5000);
        }
    }
};
