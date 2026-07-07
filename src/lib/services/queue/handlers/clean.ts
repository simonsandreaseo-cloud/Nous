import { useWriterStore } from '@/store/useWriterStore';
import { useQueueStore } from '@/store/useQueueStore';
import { streamFinalCleanup } from '@/components/tools/writer/services';
import type { QueuePayload } from '../registry';

export const handleCleanTask = async (taskId: string, payload: QueuePayload) => {
    const store = useWriterStore.getState();
    const { addLogToTask, setTaskStatus } = useQueueStore.getState();
    
    const draftId = payload.taskId || store.draftId;
    
    if (store.draftId !== draftId) {
        addLogToTask(taskId, `Draft ID mismatch. Aborting.`, 'error');
        throw new Error('Draft ID mismatch');
    }
    
    const originalContent = payload.content;

    useWriterStore.getState().setRefining(true);
    useWriterStore.getState().setStatus('Limpiando ruido IA del artículo…');
    addLogToTask(taskId, 'Iniciando limpieza IA...', 'info');

    try {
        await useWriterStore.getState().saveTaskVersion(`Pre-Limpieza`, originalContent);
        
        const chunkHtml = (htmlString: string, maxBlocks: number = 3): string[] => {
            if (typeof window === 'undefined') {
                // Si esto llegara a ejecutarse en Node, haríamos un split básico. 
                // Pero este handler se ejecuta en cliente en el QueueProcessor.
                const elements = htmlString.split(/(?=<h[1-6]|<p|<ul|<ol|<li>|<div|<table|<blockquote)/gi);
                const chunks = [];
                for (let i = 0; i < elements.length; i += maxBlocks) {
                    const chunk = elements.slice(i, i + maxBlocks).join('').trim();
                    if (chunk) chunks.push(chunk);
                }
                return chunks;
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');
            const chunks: string[] = [];
            let currentChunk = '';
            let blockCount = 0;
            
            Array.from(doc.body.children).forEach((el) => {
                currentChunk += el.outerHTML;
                
                const tagName = el.tagName.toLowerCase();
                if (['p', 'ul', 'ol', 'blockquote', 'table', 'div'].includes(tagName)) {
                    blockCount++;
                }
                
                if (blockCount >= maxBlocks) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                    blockCount = 0;
                }
            });
            
            if (currentChunk.trim()) {
                chunks.push(currentChunk.trim());
            }
            
            return chunks.length > 0 ? chunks : [htmlString];
        };

        const rawChunks = chunkHtml(originalContent, 3);
        useWriterStore.getState().setStatus(`Documento dividido en ${rawChunks.length} partes para limpieza...`);
        addLogToTask(taskId, `Documento dividido en ${rawChunks.length} fragmentos para limpieza.`, 'info');
        
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
                    useWriterStore.getState().setStatus(`Limpiando Chunk ${i + 1}/${rawChunks.length} (Intento ${attempts + 1})...`);
                    addLogToTask(taskId, `Procesando limpieza de fragmento ${i + 1} de ${rawChunks.length}...`, 'info');
                    
                    const chunkResult = await streamFinalCleanup(
                        rawChunks[i],
                        (msg) => {
                            console.log(`[Clean Chunk ${i+1}] ${msg}`);
                            addLogToTask(taskId, `[Fragmento ${i+1}] ${msg}`, 'info');
                        }
                    );
                    
                    currentDocumentChunks[i] = chunkResult;
                    useWriterStore.getState().setContent(currentDocumentChunks.join('\n'));
                    success = true;
                } catch (err: any) {
                    attempts++;
                    console.error(`[Clean Chunk ${i+1}] Fallo intento ${attempts}:`, err);
                    
                    if (attempts >= MAX_ATTEMPTS) {
                        console.error(`Fallo definitivo en la limpieza del chunk ${i + 1} tras ${MAX_ATTEMPTS} intentos. Se mantendrá original.`);
                        addLogToTask(taskId, `Fallo definitivo en fragmento ${i + 1}. Se mantiene original.`, 'error');
                        currentDocumentChunks[i] = rawChunks[i];
                        useWriterStore.getState().setContent(currentDocumentChunks.join('\n'));
                        break;
                    }
                    
                    useWriterStore.getState().setStatus(`Error en Limpieza Chunk ${i + 1}. Reintentando en 10s... (${attempts}/${MAX_ATTEMPTS})`);
                    addLogToTask(taskId, `Reintentando limpieza en 10s... (${attempts}/${MAX_ATTEMPTS})`, 'warning');
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
            }
            
            setTaskStatus(taskId, 'processing', ((i + 1) / rawChunks.length) * 100);
        }
        
        await new Promise(resolve => setTimeout(resolve, 10)); // Yield to UI
        
        const accumulatedHtml = currentDocumentChunks.join('\n');
        
        useWriterStore.getState().setIsRemoteUpdate(true);
        useWriterStore.getState().setContent(accumulatedHtml);
        useWriterStore.getState().setStatus('✅ ¡Limpieza mágica aplicada en todo el artículo!');

        useWriterStore.getState().addDebugPrompt('Limpieza Completada', `Ruido IA eliminado con éxito mediante chunks`, accumulatedHtml.substring(0, 1000));
        
        await useWriterStore.getState().saveTaskVersion(`Limpieza IA`, accumulatedHtml);
        
        addLogToTask(taskId, 'Limpieza completada con éxito.', 'success');
        setTaskStatus(taskId, 'processing', 100);
        
    } catch (e: any) {
        console.error(e);
        useWriterStore.getState().setStatus('❌ Error en limpieza: ' + e.message);
        addLogToTask(taskId, `Error crítico: ${e.message}`, 'error');
        throw e;
    } finally {
        useWriterStore.getState().setRefining(false);
    }
};
