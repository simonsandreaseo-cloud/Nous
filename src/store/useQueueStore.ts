import { create } from 'zustand';
export type QueueActionType = 
  | 'surgical_edit'
  | 'humanize'
  | 'clean'
  | 'generate'
  | 'refine'
  | 'seo'
  | 'outline'
  | 'planner_batch'
  | 'planner_nous_action'
  | string;

export interface QueueTask {
    id: string;
    type: QueueActionType;
    title: string;
    description?: string;
    execute: () => Promise<void>;
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress?: number;
    createdAt: Date;
    projectId?: string;
    taskId?: string; // Si pertenece a un documento o borrador específico
}

interface QueueStore {
    queue: QueueTask[];
    activeTask: QueueTask | null;
    isProcessingQueue: boolean;
    
    // Actions
    enqueueTask: (
        type: QueueActionType, 
        title: string, 
        executeFn: () => Promise<void>,
        options?: { description?: string; taskId?: string; projectId?: string }
    ) => string;
    dequeueTask: (id: string) => void;
    clearQueue: () => void;
    
    // Internal state updates
    setActiveTask: (task: QueueTask | null) => void;
    setTaskStatus: (id: string, status: QueueTask['status'], progress?: number) => void;
    setIsProcessingQueue: (isProcessing: boolean) => void;
    shiftQueue: () => QueueTask | undefined;
}

export const useQueueStore = create<QueueStore>((set, get) => ({
    queue: [],
    activeTask: null,
    isProcessingQueue: false,

    enqueueTask: (type, title, executeFn, options) => {
        const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
        const newTask: QueueTask = {
            id,
            type,
            title,
            execute: executeFn,
            status: 'pending',
            createdAt: new Date(),
            description: options?.description,
            taskId: options?.taskId,
            projectId: options?.projectId
        };

        set((state) => ({
            queue: [...state.queue, newTask]
        }));
        
        return id;
    },

    dequeueTask: (id) => {
        set((state) => ({
            queue: state.queue.filter(t => t.id !== id)
        }));
    },

    clearQueue: () => {
        set({ queue: [] });
    },

    setActiveTask: (task) => {
        set({ activeTask: task });
    },

    setTaskStatus: (id, status, progress) => {
        set((state) => {
            // Update active task if it's the one
            const newActiveTask = state.activeTask?.id === id 
                ? { ...state.activeTask, status, ...(progress !== undefined && { progress }) } 
                : state.activeTask;

            // Update in queue list if present (usually we shift it out, but just in case)
            const newQueue = state.queue.map(t => 
                t.id === id ? { ...t, status, ...(progress !== undefined && { progress }) } : t
            );

            return { activeTask: newActiveTask, queue: newQueue };
        });
    },

    setIsProcessingQueue: (isProcessing) => {
        set({ isProcessingQueue: isProcessing });
    },

    shiftQueue: () => {
        const { queue } = get();
        if (queue.length === 0) return undefined;
        
        const nextTask = queue[0];
        set((state) => ({
            queue: state.queue.slice(1) // Quitar el primero
        }));
        
        return nextTask;
    }
}));
