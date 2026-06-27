import { useEffect } from 'react';
import { useQueueStore } from '@/store/useQueueStore';
import { toast } from 'sonner';

export function useQueueProcessor() {
    const { 
        queue, 
        activeTask, 
        isProcessingQueue, 
        shiftQueue, 
        setActiveTask, 
        setIsProcessingQueue,
        setTaskStatus
    } = useQueueStore();

    useEffect(() => {
        const processQueue = async () => {
            // If already processing or queue is empty, do nothing
            if (isProcessingQueue || queue.length === 0) return;

            const nextTask = shiftQueue();
            if (!nextTask) return;

            setIsProcessingQueue(true);
            setActiveTask(nextTask);
            setTaskStatus(nextTask.id, 'processing');

            try {
                console.log(`[QueueProcessor] Starting task: ${nextTask.title}`);
                await nextTask.execute();
                
                console.log(`[QueueProcessor] Finished task: ${nextTask.title}`);
                setTaskStatus(nextTask.id, 'completed', 100);
                toast.success(`${nextTask.title} completado`);
            } catch (error: any) {
                console.error(`[QueueProcessor] Error in task ${nextTask.title}:`, error);
                setTaskStatus(nextTask.id, 'error');
                toast.error(`Error en ${nextTask.title}: ${error.message || 'Error desconocido'}`);
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
