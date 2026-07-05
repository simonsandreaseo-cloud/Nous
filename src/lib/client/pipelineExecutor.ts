import { PipelineBlock, ExecutionMode } from '@/store/usePipelineStore';
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
    const { blocks, mode, targetTasks, project, onLog, onProgress } = options;
    
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
    queueStore.setIsProcessingQueue(true);

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
            // Encolamos en el store global para que la consola lo muestre en tiempo real
            const queueTaskId = queueStore.enqueueTask(
                block.actionType,
                `${block.actionType.toUpperCase()}: ${task.title}`,
                undefined,
                { taskId: task.id, projectId: project?.id }
            );

            // Activamos la tarea para la UI de la consola
            const qTask = useQueueStore.getState().queue.find(t => t.id === queueTaskId);
            if (qTask) queueStore.setActiveTask(qTask);
            queueStore.setTaskStatus(queueTaskId, 'processing', 0);

            // Funciones "Enhanced" que notifican tanto a EditorialCalendar como a la Consola Global
            const enhancedLog = (tid: string, stage: string, msg: string) => {
                onLog(tid, stage, msg);
                queueStore.addLogToTask(queueTaskId, `[${stage}] ${msg}`, 'info');
            };

            const enhancedProgress = (tid: string, progress: number) => {
                onProgress(tid, progress);
                queueStore.setTaskStatus(queueTaskId, 'processing', progress);
            };

            try {
                enhancedProgress(task.id, 50);
                enhancedLog(task.id, block.actionType.toUpperCase(), `Iniciando proceso... (Modelo: ${block.model})`);
                
                let currentTaskState = memoryState.get(task.id)!;
                let newContent = currentTaskState.content_body || '';
                
                // ==========================
                // ENRUTADOR DE ACCIONES
                // ==========================
                if (block.actionType === 'generate') {
                    const res = await executeDraftPipeline(
                        currentTaskState, 
                        project, 
                        (msg) => enhancedLog(task.id, 'Generación', msg), 
                        () => {}
                    );
                    if (res.success && res.updates) {
                        newContent = res.updates.content_body || newContent;
                        Object.assign(currentTaskState, res.updates);
                    } else {
                        throw new Error(res.error || "Fallo en generación");
                    }
                } 
                else if (block.actionType === 'humanize') {
                    if (!newContent) throw new Error("No hay contenido para humanizar.");
                    const res = await executeHumanizePipeline(
                        currentTaskState, 
                        newContent, 
                        project, 
                        (msg) => enhancedLog(task.id, 'Humanización', msg), 
                        () => {}
                    );
                    if (res.success && res.updates) {
                        newContent = res.updates.content_body || newContent;
                        Object.assign(currentTaskState, res.updates);
                    } else {
                        throw new Error(res.error || "Fallo en humanización");
                    }
                }
                else if (block.actionType === 'clean') {
                    if (!newContent) throw new Error("No hay contenido para limpiar.");
                    const cleanHtml = await streamFinalCleanup(newContent, () => {});
                    newContent = cleanHtml;
                    currentTaskState.metadata = { ...(currentTaskState.metadata as object), is_cleaned: true };
                }
                else if (block.actionType === 'surgical_edit') {
                    if (!newContent) throw new Error("No hay contenido para edición quirúrgica.");
                    const res = await executeSurgicalEditPipeline(
                        currentTaskState, 
                        newContent, 
                        project, 
                        (msg) => enhancedLog(task.id, 'Edición Quirúrgica', msg), 
                        () => {}
                    );
                    if (res.success && res.updates) {
                        newContent = res.updates.content_body || newContent;
                        Object.assign(currentTaskState, res.updates);
                    } else {
                        throw new Error("Fallo en edición quirúrgica");
                    }
                }
                // (Nota: Outline, Visuals y otros se mapearán aquí según se expandan los servicios core)
                
                // ==========================
                // ACTUALIZACIÓN DE ESTADO EXITOSA
                // ==========================
                currentTaskState.content_body = newContent;
                
                // Guardar contenido actualizado en DB
                if (newContent) {
                    await supabase.from('task_contents').upsert({ id: task.id, content_body: newContent });
                }

                // Cambiar el Estatus si está configurado
                if (block.outputStatus !== 'none') {
                    currentTaskState.status = block.outputStatus;
                    await supabase.from('tasks').update({ status: block.outputStatus }).eq('id', task.id);
                    // Actualizar UI Store inmediatamente
                    useProjectStore.getState().updateTask(task.id, { status: block.outputStatus });
                    onLog(task.id, 'Estatus', `Actualizado a: ${block.outputStatus}`);
                    queueStore.addLogToTask(queueTaskId, `[Estatus] Actualizado a: ${block.outputStatus}`, 'success');
                }
                
                // Actualizar la caché en memoria para el SIGUIENTE bloque
                memoryState.set(task.id, currentTaskState);
                enhancedProgress(task.id, 100);
                enhancedLog(task.id, block.actionType.toUpperCase(), `✅ Completado exitosamente.`);
                queueStore.setTaskStatus(queueTaskId, 'completed', 100);

            } catch (err: any) {
                console.error(`Error in block ${block.actionType} for task ${task.id}:`, err);
                enhancedLog(task.id, 'Error', `❌ Fallo en ${block.actionType}: ${err.message}`);
                enhancedProgress(task.id, -1);
                queueStore.setTaskStatus(queueTaskId, 'error', -1);
                // IMPORTANTE: Al fallar, NO modificamos el estatus de la memoria, 
                // evitando que herede al siguiente bloque.
            }
        }
    }
    
    queueStore.setIsProcessingQueue(false);
    queueStore.setActiveTask(null);
    NotificationService.success("Pipeline Completado", "El motor de ejecución ha finalizado todas las tareas.");
};
