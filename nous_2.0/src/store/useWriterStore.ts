import { create } from 'zustand';
import { Task, Project } from '@/types/project';

interface WriterState {
    // Content State
    content: string;
    title: string;
    keyword: string;

    // Editor Status
    isSaving: boolean;
    isGenerating: boolean;
    lastSaved: Date | null;

    // AI Configuration
    apiKeys: string[];
    humanizerConfig: {
        niche: string;
        audience: string;
        intensity: number;
        sentiment: string;
    };
    seoResults: any; // Store analysis results

    // UI State
    isSidebarOpen: boolean;
    activeSidebarTab: 'assistant' | 'seo' | 'media' | 'export';

    // Actions
    setContent: (content: string) => void;
    setTitle: (title: string) => void;
    setKeyword: (keyword: string) => void;
    setSaving: (saving: boolean) => void;
    setGenerating: (generating: boolean) => void;
    toggleSidebar: () => void;
    setSidebarTab: (tab: 'assistant' | 'seo' | 'media' | 'export') => void;
    setApiKeys: (keys: string[]) => void;
    updateHumanizerConfig: (config: Partial<WriterState['humanizerConfig']>) => void;
    setSeoResults: (results: any) => void;
    initializeFromTask: (task: Task, project: Project | null) => void;
    reset: () => void;
}

export const useWriterStore = create<WriterState>((set) => ({
    content: '',
    title: '',
    keyword: '',
    isSaving: false,
    isGenerating: false,
    lastSaved: null,

    isSidebarOpen: true,
    activeSidebarTab: 'assistant',

    apiKeys: [],
    humanizerConfig: {
        niche: 'General',
        audience: 'General',
        intensity: 50,
        sentiment: 'Neutral'
    },
    seoResults: null,

    setContent: (content) => set({ content, isSaving: true }), // Trigger save effect in component
    setTitle: (title) => set({ title }),
    setKeyword: (keyword) => set({ keyword }),
    setSaving: (isSaving) => set({ isSaving, lastSaved: isSaving ? null : new Date() }),
    setGenerating: (isGenerating) => set({ isGenerating }),

    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    setSidebarTab: (activeSidebarTab) => set({ activeSidebarTab }),

    setApiKeys: (apiKeys) => set({ apiKeys }),
    updateHumanizerConfig: (config) => set((state) => ({
        humanizerConfig: { ...state.humanizerConfig, ...config }
    })),
    setSeoResults: (seoResults) => set({ seoResults }),

    initializeFromTask: (task: Task, project: Project | null) => set((state) => ({
        title: task.title,
        keyword: task.target_keyword || '',
        activeSidebarTab: 'seo',
        humanizerConfig: {
            ...state.humanizerConfig,
            niche: project?.settings?.niche || project?.description || 'General',
            audience: project?.settings?.audience || 'General',
            // Default intensity could be set here too
        }
    })),

    reset: () => set({
        content: '',
        title: '',
        keyword: '',
        isSidebarOpen: true,
        activeSidebarTab: 'assistant',
        isSaving: false,
        isGenerating: false,
        seoResults: null
    })
}));
