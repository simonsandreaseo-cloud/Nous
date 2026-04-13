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

    // AI Model Selection
    nousMode: 'alta_calidad' | 'equilibrado' | 'rapido';
    setNousMode: (mode: 'alta_calidad' | 'equilibrado' | 'rapido') => void;
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

    nousMode: 'equilibrado',
    setNousMode: (mode) => set({ nousMode: mode }),
}));
