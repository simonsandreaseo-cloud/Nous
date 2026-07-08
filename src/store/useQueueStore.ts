import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
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
  | 'custom_transform'
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
    metrics?: Record<string, number>;
}

interface QueueStore {
    queue: QueueTask[];
    activeTask: QueueTask | null;
    isProcessingQueue: boolean;
    
    // Global Batch Tracking
    batchTotalTasks: number;
    batchCompletedTasks: number;
    isPaused: boolean;
    
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
    setTaskMetrics: (id: string, metrics: Partial<Record<string, number>>) => void;
    setIsProcessingQueue: (isProcessing: boolean) => void;
    shiftQueue: () => QueueTask | undefined;
    
    // Batch updates
    setBatchInfo: (total: number) => void;
    incrementBatchCompleted: () => void;
    resetBatch: () => void;
    
    // Pause Control
    togglePause: () => void;
    setIsPaused: (isPaused: boolean) => void;
}

const syncTimers: Record<string, NodeJS.Timeout> = {};

const syncTaskToSupabase = async (task: QueueTask) => {
    if (syncTimers[task.id]) clearTimeout(syncTimers[task.id]);
    syncTimers[task.id] = setTimeout(async () => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) return;

            const payload = {
                id: task.id,
                user_id: userData.user.id,
                project_id: task.projectId || null,
                type: task.type,
                title: task.title,
                description: task.description || null,
                status: task.status,
                progress: task.progress || 0,
                logs: task.logs,
                payload: task.payload || null,
                created_at: task.createdAt,
                completed_at: (task.status === 'completed' || task.status === 'error') ? new Date().toISOString() : null
            };

            await supabase.from('queue_tasks').upsert(payload, { onConflict: 'id' });
        } catch (e) {
            console.error('Failed to sync task:', e);
        }
    }, 1500);
};

export const useQueueStore = create<QueueStore>()(
    persist(
        (set, get) => ({
            queue: [],
            activeTask: null,
            isProcessingQueue: false,
            batchTotalTasks: 0,
            batchCompletedTasks: 0,
            isPaused: false,

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
                
                syncTaskToSupabase(newTask);
                
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
            const roundedProgress = progress !== undefined ? Number(progress.toFixed(2)) : undefined;

            // Update active task if it's the one
            const newActiveTask = state.activeTask?.id === id 
                ? { ...state.activeTask, status, ...(roundedProgress !== undefined && { progress: roundedProgress }) } 
                : state.activeTask;

            // Update in queue list if present (usually we shift it out, but just in case)
            const newQueue = state.queue.map(t => 
                t.id === id ? { ...t, status, ...(roundedProgress !== undefined && { progress: roundedProgress }) } : t
            );

            if (newActiveTask && newActiveTask.id === id) syncTaskToSupabase(newActiveTask);
            else {
                const updatedTask = newQueue.find(t => t.id === id);
                if (updatedTask) syncTaskToSupabase(updatedTask);
            }

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

            if (newActiveTask && newActiveTask.id === id) syncTaskToSupabase(newActiveTask);
            else {
                const updatedTask = newQueue.find(t => t.id === id);
                if (updatedTask) syncTaskToSupabase(updatedTask);
            }

            return { activeTask: newActiveTask, queue: newQueue };
        });
    },

    setTaskMetrics: (id, metrics) => {
        set((state) => {
            const newActiveTask = state.activeTask?.id === id 
                ? { ...state.activeTask, metrics: { ...(state.activeTask.metrics || {}), ...metrics } } 
                : state.activeTask;

            const newQueue = state.queue.map(t => 
                t.id === id ? { ...t, metrics: { ...(t.metrics || {}), ...metrics } } : t
            );

            // Supabase sync for metrics is optional, but we'll include it in payload if needed
            // Currently syncTaskToSupabase doesn't persist metrics to db, but that's fine for Live Metrics

            return { activeTask: newActiveTask, queue: newQueue };
        });
    },

    setIsProcessingQueue: (isProcessing) => {
        set({ isProcessingQueue: isProcessing });
    },

    shiftQueue: () => {
        let nextTask: QueueTask | undefined;
        set((state) => {
            if (state.queue.length === 0) return state;
            
            const [first, ...rest] = state.queue;
            nextTask = first;
            
            return {
                queue: rest,
                activeTask: first
            };
        });
        return nextTask;
    },

    setBatchInfo: (total) => {
        set({ batchTotalTasks: total, batchCompletedTasks: 0 });
    },
    
    incrementBatchCompleted: () => {
        set((state) => ({ batchCompletedTasks: state.batchCompletedTasks + 1 }));
    },
    
    resetBatch: () => {
        set({ batchTotalTasks: 0, batchCompletedTasks: 0 });
    },
    
    togglePause: () => {
        set((state) => ({ isPaused: !state.isPaused }));
    },
    
    setIsPaused: (isPaused) => {
        set({ isPaused });
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
