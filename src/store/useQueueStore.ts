import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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

export interface QueueTaskLog {
    id: string;
    text: string;
    type: 'info' | 'success' | 'error' | 'warning';
    timestamp: Date;
}

export interface QueueTask {
    id: string;
    type: QueueActionType;
    title: string;
    description?: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress?: number;
    createdAt: Date;
    projectId?: string;
    taskId?: string; // Si pertenece a un documento o borrador específico
    payload?: Record<string, any>; // Serializable data needed to resume the task
    logs: QueueTaskLog[];
}

interface QueueStore {
    queue: QueueTask[];
    activeTask: QueueTask | null;
    isProcessingQueue: boolean;
    
    // Actions
    enqueueTask: (
        type: QueueActionType, 
        title: string, 
        payload?: Record<string, any>,
        options?: { description?: string; taskId?: string; projectId?: string }
    ) => string;
    dequeueTask: (id: string) => void;
    clearQueue: () => void;
    
    // Internal state updates
    setActiveTask: (task: QueueTask | null) => void;
    setTaskStatus: (id: string, status: QueueTask['status'], progress?: number) => void;
    addLogToTask: (id: string, text: string, type?: QueueTaskLog['type']) => void;
    setIsProcessingQueue: (isProcessing: boolean) => void;
    shiftQueue: () => QueueTask | undefined;
}

export const useQueueStore = create<QueueStore>()(
    persist(
        (set, get) => ({
            queue: [],
            activeTask: null,
            isProcessingQueue: false,

            enqueueTask: (type, title, payload, options) => {
                const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
                const newTask: QueueTask = {
                    id,
                    type,
                    title,
                    status: 'pending',
                    createdAt: new Date(),
                    description: options?.description,
                    taskId: options?.taskId,
                    projectId: options?.projectId,
                    payload,
                    logs: []
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

    addLogToTask: (id, text, type = 'info') => {
        const newLog: QueueTaskLog = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
            text,
            type,
            timestamp: new Date()
        };

        set((state) => {
            const newActiveTask = state.activeTask?.id === id 
                ? { ...state.activeTask, logs: [...state.activeTask.logs, newLog] } 
                : state.activeTask;

            const newQueue = state.queue.map(t => 
                t.id === id ? { ...t, logs: [...t.logs, newLog] } : t
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
        }),
        {
            name: 'nous-queue-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ 
                queue: state.queue.map(q => ({
                    ...q,
                    status: q.status === 'processing' ? 'pending' : q.status // Reset processing tasks to pending on reload
                })),
                activeTask: state.activeTask ? {
                    ...state.activeTask,
                    status: 'pending' // Reset active task to pending
                } : null
            }),
        }
    )
);
