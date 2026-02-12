import { create } from 'zustand';

interface AppState {
    isLoaded: boolean;
    setIsLoaded: (loaded: boolean) => void;

    // Visuals
    highContrast: boolean;
    toggleHighContrast: () => void;

    // Navigation / Modes
    activeMode: 'home' | 'writer' | 'project_view';
    setMode: (mode: 'home' | 'writer' | 'project_view') => void;

    // Interaction
    hoveredItem: string | null;
    setHoveredItem: (item: string | null) => void;

    // System Status
    systemStatus: 'nominal' | 'analyzing' | 'error' | 'loading';
    setSystemStatus: (status: 'nominal' | 'analyzing' | 'error' | 'loading') => void;

    neuralLinkStatus: 'connected' | 'offline' | 'searching';
    setNeuralLinkStatus: (status: 'connected' | 'offline' | 'searching') => void;

    neuralTrend: 'up' | 'down' | 'neutral';
    setNeuralTrend: (trend: 'up' | 'down' | 'neutral') => void;
}

export const useAppStore = create<AppState>((set) => ({
    isLoaded: false,
    setIsLoaded: (loaded) => set({ isLoaded: loaded }),

    highContrast: false,
    toggleHighContrast: () => set((state) => ({ highContrast: !state.highContrast })),

    activeMode: 'home',
    setMode: (mode) => set({ activeMode: mode }),

    hoveredItem: null,
    setHoveredItem: (item) => set({ hoveredItem: item }),

    systemStatus: 'nominal',
    setSystemStatus: (status) => set({ systemStatus: status }),

    neuralLinkStatus: 'offline',
    setNeuralLinkStatus: (status) => set({ neuralLinkStatus: status }),

    neuralTrend: 'neutral',
    setNeuralTrend: (trend) => set({ neuralTrend: trend }),
}));
