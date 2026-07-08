import { useEffect } from 'react';
import { useQueueStore } from '@/store/useQueueStore';
import { QueueRegistry } from '@/lib/services/queue/registry';
import { toast } from 'sonner';

export function useQueueProcessor() {
    const { 
        queue, 
        activeTask, 
        isProcessingQueue, 
        shiftQueue, 
        setActiveTask, 
        setIsProcessingQueue,
        setTaskStatus,
        incrementBatchCompleted
    } = useQueueStore();

    useEffect(() => {
        const processQueue = async () => {
            // If already processing or queue is empty, do nothing
            if (isProcessingQueue || queue.length === 0) return;

            // Encontrar la próxima tarea PENDIENTE real (ignorar las que ya se completaron/fallaron por pipelineExecutor, y también ignorar las que son manejadas localmente por el pipelineExecutor)
            const nextTask = queue.find(t => t.status === 'pending' && !t.payload?.isPipelineMode);
            if (!nextTask) return;

            setIsProcessingQueue(true);
            setActiveTask(nextTask);
            setTaskStatus(nextTask.id, 'processing');
            const { addLogToTask } = useQueueStore.getState();

            try {
                console.log(`[QueueProcessor] Starting task: ${nextTask.title}`);
                addLogToTask(nextTask.id, `Iniciando tarea: ${nextTask.title}`, 'info');
                
                let executor = QueueRegistry.get(nextTask.type);
                if (!executor && typeof nextTask.payload === 'function') {
                    executor = async (taskId: string, payload: any) => {
                        await (nextTask.payload as Function)(nextTask.id);
                    };
                }

                if (!executor) {
                    // Silently clear "ghost" tasks from previous sessions that required an in-memory function
                    console.log(`[QueueProcessor] Removing ghost task without executor: ${nextTask.type}`);
                    const { dequeueTask } = useQueueStore.getState();
                    dequeueTask(nextTask.id);
                    // Skip to next tick
                    setTimeout(() => {
                        setActiveTask(null);
                        setIsProcessingQueue(false);
                    }, 50);
                    return;
                }
                
                await executor(nextTask.id, nextTask.payload || {});
                
                console.log(`[QueueProcessor] Finished task: ${nextTask.title}`);
                addLogToTask(nextTask.id, `Tarea completada exitosamente`, 'success');
                setTaskStatus(nextTask.id, 'completed', 100);
                incrementBatchCompleted();
                toast.success(`${nextTask.title} completado`);
            } catch (error: any) {
                console.error(`[QueueProcessor] Error in task ${nextTask.title}:`, error);
                addLogToTask(nextTask.id, `Error del sistema: ${(error as Error).message}`, 'error');
                setTaskStatus(nextTask.id, 'error');
                incrementBatchCompleted();
                toast.error(`Error en ${nextTask.title}: ${(error as Error).message}`);
            } finally {
                // Wait a tiny bit before taking the next one to allow UI to breathe
                setTimeout(() => {
                    setActiveTask(null);
                    setIsProcessingQueue(false);
                }, 1500);
            }
        };

        processQueue();
    }, [queue, isProcessingQueue, shiftQueue, setActiveTask, setIsProcessingQueue, setTaskStatus]);
}
