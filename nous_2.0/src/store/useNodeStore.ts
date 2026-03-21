import { create } from 'zustand';
import { LocalNodeBridge, NodeState } from '@/lib/local-node/bridge';

interface NodeStoreState {
    isConnected: boolean;
    status: 'IDLE' | 'CRAWLING' | 'PROCESSING' | 'ERROR' | 'DOWNLOADING';
    queueLength: number;
    lastError: string | null;
    logs: { source: string; message: string; timestamp: number; level?: 'info' | 'error' }[];
    modelsReady: boolean;

    // AI Integration Mode
    aiMode: 'local' | 'cloud';
    setAiMode: (mode: 'local' | 'cloud') => void;

    // Flux State
    flux: {
        tasks: any[];
        activeTimer: any | null;
        stats: {
            totalTasks: number;
            completedTasks: number;
            totalTimeSeconds: number;
            formattedTime: string;
        } | null;
    };

    // Actions
    connect: () => void;
    checkModels: () => void;
    clearLogs: () => void;
    // Flux Actions
    createTask: (title: string, category: string, priority?: 'low' | 'medium' | 'high') => void;
    startTimer: (taskId: string, description: string) => void;
    stopTimer: () => void;
    refreshFlux: () => void;
}

export const useNodeStore = create<NodeStoreState>((set) => {
    // Inicializar cookie desde el navegador si existe
    let initialMode: 'local' | 'cloud' = 'local';
    if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(^| )nous_ai_mode=([^;]+)/);
        if (match && (match[2] === 'local' || match[2] === 'cloud')) {
            initialMode = match[2] as 'local' | 'cloud';
        } else {
            document.cookie = "nous_ai_mode=local; path=/; max-age=31536000; SameSite=Lax";
        }
    }

    return {
        isConnected: false,
        status: 'IDLE',
        queueLength: 0,
        lastError: null,
        logs: [],
        modelsReady: false, // Start false, check on connect
        aiMode: initialMode,
        setAiMode: (mode) => {
            set({ aiMode: mode });
            if (typeof document !== 'undefined') {
                document.cookie = `nous_ai_mode=${mode}; path=/; max-age=31536000; SameSite=Lax`;
            }
        },
        flux: {
            tasks: [],
            activeTimer: null,
            stats: null
        },

        connect: () => {
            // Listen to Bridge events
            LocalNodeBridge.on('CONNECTED', () => {
                set({ isConnected: true });
            });

            LocalNodeBridge.on('DISCONNECTED', () => {
                set({ isConnected: false, status: 'IDLE' });
            });

            LocalNodeBridge.on('STATE_UPDATE', (payload: any) => {
                set({
                    status: payload.status,
                    queueLength: payload.queueLength,
                    lastError: payload.lastError
                });
            });

            LocalNodeBridge.on('DOWNLOAD_STATUS', (payload: any) => {
                if (payload.status === 'downloading') {
                    set({ status: 'DOWNLOADING' });
                }
            });

            LocalNodeBridge.on('MODELS_STATUS', (payload: any) => {
                const { image_ready, text_ready, gemma, sdxl } = payload;
                // Support both new boolean format and old 'complete' string format for robustness
                const isImageReady = image_ready === true || sdxl === 'complete';
                const isTextReady = text_ready === true || gemma === 'complete';
                
                set({ modelsReady: isImageReady && isTextReady });
            });


            LocalNodeBridge.on('ENGINE_READY', (payload: any) => {
                // When an engine is ready, we force a check to sync the whole state
                LocalNodeBridge.checkModels();
            });

            LocalNodeBridge.on('LOG', (payload: any) => {

                set(state => ({
                    logs: [...state.logs.slice(-99), { ...payload, timestamp: Date.now() }]
                }));
            });

            // --- Flux Listeners ---
            LocalNodeBridge.on('FLUX_TASKS_LIST', (tasks: any[]) => {
                set(state => ({ flux: { ...state.flux, tasks } }));
            });

            LocalNodeBridge.on('FLUX_TASK_CREATED', (task: any) => {
                set(state => ({ flux: { ...state.flux, tasks: [task, ...state.flux.tasks] } }));
            });

            LocalNodeBridge.on('FLUX_TIMER_STARTED', (timer: any) => {
                set(state => ({ flux: { ...state.flux, activeTimer: timer } }));
            });

            LocalNodeBridge.on('FLUX_TIMER_STOPPED', () => {
                set(state => ({ flux: { ...state.flux, activeTimer: null } }));
            });

            LocalNodeBridge.on('FLUX_STATS', (stats: any) => {
                set(state => ({ flux: { ...state.flux, stats } }));
            });
        },

        clearLogs: () => set({ logs: [] }),
        checkModels: () => LocalNodeBridge.checkModels(),

        // Flux Actions Implementation
        createTask: (title, category, priority) => LocalNodeBridge.createFluxTask(title, category, priority),
        startTimer: (taskId, description) => LocalNodeBridge.startFluxTimer(taskId, description),
        stopTimer: () => LocalNodeBridge.stopFluxTimer(),
        refreshFlux: () => {
            LocalNodeBridge.getFluxTasks();
            LocalNodeBridge.getFluxStats();
        }
    };
});

// Auto-init connection listener only in development or Tauri
if (typeof window !== 'undefined') {
    const isDev = process.env.NODE_ENV === 'development';
    const isTauriApp = (window as any).__TAURI__ !== undefined;

    if (isDev || isTauriApp) {
        useNodeStore.getState().connect();
    }
}
