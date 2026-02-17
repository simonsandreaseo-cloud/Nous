import { create } from 'zustand';
import { Task, Project } from '@/types/project';

interface WriterState {
    // Content State
    content: string;
    title: string;
    keyword: string;

    // Editor Status
    isSaving: boolean;
    isCheckSaving: boolean;
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
    seoResults: any;
    researchDossier: any;
    outlineStructure: any;

    // UI State
    isSidebarOpen: boolean;
    activeSidebarTab: 'assistant' | 'seo' | 'research' | 'media' | 'export';

    // Actions
    setContent: (content: string) => void;
    setTitle: (title: string) => void;
    setKeyword: (keyword: string) => void;
    setSaving: (saving: boolean) => void;
    setGenerating: (generating: boolean) => void;
    toggleSidebar: () => void;
    setSidebarTab: (tab: 'assistant' | 'seo' | 'research' | 'media' | 'export') => void;
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
    isCheckSaving: false,
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
    researchDossier: null,
    outlineStructure: null,

    setContent: (content) => set({ content, isSaving: true, isCheckSaving: true }),
    setTitle: (title) => set({ title }),
    setKeyword: (keyword) => set({ keyword }),
    setSaving: (isSaving) => set({ isSaving, isCheckSaving: isSaving, lastSaved: isSaving ? null : new Date() }),
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
        activeSidebarTab: 'research',
        researchDossier: (task as any).research_dossier,
        outlineStructure: (task as any).outline_structure,
        humanizerConfig: {
            ...state.humanizerConfig,
            niche: project?.settings?.niche || project?.description || 'General',
            audience: project?.settings?.audience || 'General',
        }
    })),

    reset: () => set({
        content: '',
        title: '',
        keyword: '',
        isSidebarOpen: true,
        activeSidebarTab: 'assistant',
        isSaving: false,
        isCheckSaving: false,
        isGenerating: false,
        seoResults: null,
        researchDossier: null,
        outlineStructure: null
    })
}));
