import { create } from 'zustand';

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
    // Force cloud mode
    if (typeof document !== 'undefined') {
        document.cookie = "nous_ai_mode=cloud; path=/; max-age=31536000; SameSite=Lax";
    }

    return {
        isConnected: false,
        status: 'IDLE',
        queueLength: 0,
        lastError: null,
        logs: [],
        modelsReady: false,
        aiMode: 'cloud',
        setAiMode: (mode) => {
            set({ aiMode: 'cloud' }); // Maintain cloud mode only
        },
        flux: {
            tasks: [],
            activeTimer: null,
            stats: null
        },

        connect: () => {
            // Local node connection disabled
            console.log("[NodeStore] Local node connection disabled.");
        },

        clearLogs: () => set({ logs: [] }),
        checkModels: () => {},

        // Local actions are now no-ops
        createTask: () => {},
        startTimer: () => {},
        stopTimer: () => {},
        refreshFlux: () => {}
    };
});

