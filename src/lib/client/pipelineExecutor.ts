import { PipelineBlock, ExecutionMode, ExecutionStrategy } from '@/store/usePipelineStore';
import { Task, useProjectStore } from '@/store/useProjectStore';
import { supabase } from '@/lib/supabase';
import { 
    executeHumanizePipeline, 
    executeSurgicalEditPipeline,
    executeDraftPipeline 
} from '@/lib/services/writer/pipeline';
import { streamFinalCleanup, streamSurgicalEdit } from '@/lib/services/writer/ai-streaming';
import { NotificationService } from '@/lib/services/notifications';
import { useQueueStore } from '@/store/useQueueStore';

export interface PipelineExecutionOptions {
    blocks: PipelineBlock[];
    mode: ExecutionMode;
    strategy: ExecutionStrategy;
    targetTasks: Task[];
    project: any;
    onLog: (taskId: string, stage: string, msg: string) => void;
    onProgress: (taskId: string, progress: number) => void;
}

/**
 * Motor de Ejecución Centralizado del Pipeline (Hot-Handover / Doble Blindaje)
 * Procesa las tareas de manera aislada o en lote, manteniendo una cola en memoria.
 */
export const executePipeline = async (options: PipelineExecutionOptions) => {
    const { blocks, mode, strategy, targetTasks, project, onLog, onProgress } = options;
    
    // Cola en memoria para el Doble Blindaje.
    // Esto asegura que si el Paso 1 modifica un contenido, el Paso 2 use esa versión exacta de la memoria
    // y no dependa de la latencia de la base de datos.
    const memoryState = new Map<string, Task>();
    
    // Precargamos los contenidos actuales desde la BD para asegurar tener la última versión
    const taskIds = targetTasks.map(t => t.id);
    const { data: dbContents } = await supabase.from('task_contents').select('id, content_body').in('id', taskIds);
    
    for (const t of targetTasks) {
        const dbContent = dbContents?.find(c => c.id === t.id)?.content_body;
        memoryState.set(t.id, { 
            ...t, 
            content_body: dbContent || t.content_body 
        });
    }
    
    const queueStore = useQueueStore.getState();
    // Limpiar estado previo persistido en localStorage antes de arrancar
    queueStore.setActiveTask(null);
    queueStore.clearQueue();
    queueStore.setIsPaused(false);
    queueStore.setIsProcessingQueue(true);

    let totalOperations = 0;
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        for (const [id, task] of memoryState.entries()) {
            if (mode === 'manual') {
                totalOperations++;
            } else if (mode === 'status' && task.status === block.inputStatus) {
                totalOperations++;
            }
        }
    }
    queueStore.setBatchInfo(totalOperations);


    // =============================================
    // ROUTING: pick loop strategy before execution
    // =============================================
    if (strategy === 'by-content') {
        // 🎯 Modo Uno a Uno: each task goes through ALL blocks before moving to the next
        for (const [, task] of memoryState.entries()) {
            onLog('SYSTEM', 'Info', `▶ Iniciando contenido completo: "${task.title}"`);
            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i];
                // Check eligibility for this block
                const eligible = (mode === 'manual') || (mode === 'status' && task.status === block.inputStatus);
                if (!eligible) continue;

                while (useQueueStore.getState().isPaused) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                await executeTaskInBlock({ task, block, project, queueStore, memoryState, onLog, onProgress });
            }
        }
    } else {
        // 🌊 Modo En Olas (default): all tasks per block before next block
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            
            // 1. Determinar Targets del Bloque
            const tasksForThisBlock = [];
            for (const [id, task] of memoryState.entries()) {
                if (mode === 'manual') {
                    tasksForThisBlock.push(task);
                } else if (mode === 'status') {
                    if (task.status === block.inputStatus) {
                        tasksForThisBlock.push(task);
                    }
                }
            }
            
            if (tasksForThisBlock.length === 0) continue;
            
            onLog('SYSTEM', 'Info', `Iniciando bloque ${i + 1}/${blocks.length}: ${block.actionType.toUpperCase()}`);
            
            // 2. Ejecutar Bloque para los Targets
            for (const task of tasksForThisBlock) {
                // Check for pause state before starting the next task
                while (useQueueStore.getState().isPaused) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                await executeTaskInBlock({ task, block, project, queueStore, memoryState, onLog, onProgress });
            }
        }
    }
    
    queueStore.setIsProcessingQueue(false);
    queueStore.setActiveTask(null);
    queueStore.setIsPaused(false);
    NotificationService.success("Pipeline Completado", "El motor de ejecución ha finalizado todas las tareas.");
};

// ===================================================================
// HELPER: Executes one task through one block — shared by both strategies
// ===================================================================
async function executeTaskInBlock({
    task, block, project, queueStore, memoryState, onLog, onProgress,
}: {
    task: Task;
    block: PipelineBlock;
    blockIndex?: number;
    totalBlocks?: number;
    project: any;
    queueStore: ReturnType<typeof useQueueStore.getState>;
    memoryState: Map<string, Task>;
    onLog: (tid: string, stage: string, msg: string) => void;
    onProgress: (tid: string, progress: number) => void;
    enhancedLogFactory?: any;
    enhancedProgressFactory?: any;
}) {
    const queueTaskId = queueStore.enqueueTask(
        block.actionType,
        `${block.actionType.toUpperCase()}: ${task.title}`,
        undefined,
        { taskId: task.id, projectId: project?.id }
    );

    const qTask = useQueueStore.getState().queue.find(t => t.id === queueTaskId);
    if (qTask) queueStore.setActiveTask(qTask);
    queueStore.setTaskStatus(queueTaskId, 'processing', 0);

    const enhancedLog = (tid: string, stage: string, msg: string) => {
        onLog(tid, stage, msg);
        queueStore.addLogToTask(queueTaskId, `[${stage}] ${msg}`, 'info');
        if (block.actionType === 'seo' || block.actionType === 'research' || block.actionType === 'outline') {
            if (msg.includes('URLs para scraping profundo')) queueStore.setTaskMetrics(queueTaskId, { 'Competidores Scrapeados': parseInt(msg.match(/(\d+)/)?.[0] || '0') });
            if (msg.includes('golden keywords de alto valor obtenidas')) queueStore.setTaskMetrics(queueTaskId, { 'Golden Keywords': parseInt(msg.match(/(\d+)/)?.[0] || '0') });
            if (msg.includes('LSI únicas')) queueStore.setTaskMetrics(queueTaskId, { 'Keywords LSI Extraídas': parseInt(msg.match(/(\d+)/)?.[0] || '0') });
            if (msg.includes('Filtrando') && msg.includes('candidatas crudas')) queueStore.setTaskMetrics(queueTaskId, { 'Resultados Analizados': parseInt(msg.match(/(\d+)/)?.[0] || '0') });
            if (msg.includes('Se infirieron') || msg.includes('códigos posibles')) queueStore.setTaskMetrics(queueTaskId, { 'Productos Encontrados': parseInt(msg.match(/(\d+)/)?.[0] || '0') });
        }
    };

    const enhancedProgress = (tid: string, progress: number) => {
        onProgress(tid, progress);
        queueStore.setTaskStatus(queueTaskId, 'processing', progress);
    };

    const checkPause = async () => {
        while (useQueueStore.getState().isPaused) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    };

    try {
        enhancedProgress(task.id, 0);
        enhancedLog(task.id, block.actionType.toUpperCase(), `Iniciando proceso... (Modelo: ${block.model})`);

        let currentTaskState = memoryState.get(task.id)!;
        let newContent = currentTaskState.content_body || '';

        if (block.actionType === 'generate') {
            const res = await executeDraftPipeline(currentTaskState, project, (msg) => enhancedLog(task.id, 'Generación', msg), () => {}, checkPause, (p) => enhancedProgress(task.id, p));
            if (res.success && res.updates) { newContent = res.updates.content_body || newContent; Object.assign(currentTaskState, res.updates); }
            else throw new Error(res.error || 'Fallo en generación');
        }
        else if (block.actionType === 'humanize') {
            if (!newContent) throw new Error('No hay contenido para humanizar.');
            const res = await executeHumanizePipeline(currentTaskState, newContent, project, (msg) => enhancedLog(task.id, 'Humanización', msg), () => {}, block.model, checkPause, (p) => enhancedProgress(task.id, p));
            if (res.success && res.updates) { newContent = res.updates.content_body || newContent; Object.assign(currentTaskState, res.updates); }
            else throw new Error(res.error || 'Fallo en humanización');
        }
        else if (block.actionType === 'clean') {
            if (!newContent) throw new Error('No hay contenido para limpiar.');
            newContent = await streamFinalCleanup(newContent, () => {});
            currentTaskState.metadata = { ...(currentTaskState.metadata as object), is_cleaned: true };
        }
        else if (block.actionType === 'surgical_edit') {
            if (!newContent) throw new Error('No hay contenido para edición quirúrgica.');
            const res = await executeSurgicalEditPipeline(currentTaskState, newContent, project, (msg) => enhancedLog(task.id, 'Edición Quirúrgica', msg), () => {}, block.model, checkPause, (p) => enhancedProgress(task.id, p));
            if (res.success && res.updates) { newContent = res.updates.content_body || newContent; Object.assign(currentTaskState, res.updates); }
            else throw new Error('Fallo en edición quirúrgica');
        }
        else if (block.actionType === 'seo' || block.actionType === 'research' || block.actionType === 'outline') {
            const { StrategyService } = await import('@/lib/services/strategy');
            const res = await StrategyService.runDeepSEOAnalysis({
                projectId: project.id,
                keyword: currentTaskState.target_keyword || currentTaskState.title,
                taskId: task.id, forceRestart: true, cascade: true,
                onLog: (_stage: string, msg: string) => enhancedLog(task.id, 'Research', msg),
                onProgress: (p: any) => { if (typeof p === 'number') enhancedProgress(task.id, p); }
            });
            if (res.status === 'error' || res.status === 'idea') throw new Error(res.brief || 'Fallo en la investigación SEO');
            currentTaskState.title = res.title || currentTaskState.title;
            currentTaskState.target_keyword = res.target_keyword || currentTaskState.target_keyword;
            currentTaskState.volume = res.volume || currentTaskState.volume;
            currentTaskState.target_word_count = res.word_count || currentTaskState.target_word_count;
            currentTaskState.brief = res.brief || currentTaskState.brief;
        }

        currentTaskState.content_body = newContent;
        if (newContent) await supabase.from('task_contents').upsert({ id: task.id, content_body: newContent });
        if (block.outputStatus !== 'none') {
            currentTaskState.status = block.outputStatus;
            await supabase.from('tasks').update({ status: block.outputStatus }).eq('id', task.id);
            useProjectStore.getState().updateTask(task.id, { status: block.outputStatus });
            onLog(task.id, 'Estatus', `Actualizado a: ${block.outputStatus}`);
            queueStore.addLogToTask(queueTaskId, `[Estatus] Actualizado a: ${block.outputStatus}`, 'success');
        }
        memoryState.set(task.id, currentTaskState);
        enhancedProgress(task.id, 100);
        enhancedLog(task.id, block.actionType.toUpperCase(), '✅ Completado exitosamente.');
        queueStore.setTaskStatus(queueTaskId, 'completed', 100);
        queueStore.incrementBatchCompleted();
        setTimeout(() => {
            useQueueStore.getState().dequeueTask(queueTaskId);
        }, 2000);

    } catch (err: any) {
        console.error(`Error in block ${block.actionType} for task ${task.id}:`, err);
        enhancedLog(task.id, 'Error', `❌ Fallo en ${block.actionType}: ${err.message}`);
        enhancedProgress(task.id, -1);
        queueStore.setTaskStatus(queueTaskId, 'error', -1);
        queueStore.incrementBatchCompleted();
        setTimeout(() => {
            useQueueStore.getState().dequeueTask(queueTaskId);
        }, 3000);
    }
}
