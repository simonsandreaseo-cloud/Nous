import { create } from 'zustand';
import { Task, Project } from '@/types/project';
import { ContentItem, SEOAnalysisResult } from '@/components/tools/writer/services';

export type WriterViewMode = 'workspace' | 'seo-review' | 'structure-review';
export type SidebarTab = 'assistant' | 'generate' | 'seo' | 'research' | 'humanize' | 'media' | 'history' | 'export';

export interface StrategyOutlineItem {
    type: string;
    text: string;
    wordCount: string;
    notes?: string;
}

interface WriterState {
    // ── Content & Editor ──────────────────────────────────
    content: string;
    title: string;
    keyword: string;
    draftId: string | null;
    linkedTaskId: string | null;
    linkedTaskTitle: string | null;

    // ── View Flow ─────────────────────────────────────────
    viewMode: WriterViewMode;

    // ── Status ────────────────────────────────────────────
    isSaving: boolean;
    isCheckSaving: boolean;
    isGenerating: boolean;
    isAnalyzingSEO: boolean;
    isPlanningStructure: boolean;
    isHumanizing: boolean;
    isExporting: boolean;
    isRefining: boolean;
    lastSaved: Date | null;
    statusMessage: string;

    // ── API Configuration ─────────────────────────────────
    apiKeys: string[];
    serperKey: string;
    valueSerpKey: string;
    jinaKey: string;
    model: string;

    // ── CSV / Project Data ────────────────────────────────
    csvData: ContentItem[];
    csvFileName: string | null;
    projectName: string;

    // ── SEO / Research Results ────────────────────────────
    rawSeoData: SEOAnalysisResult | null;
    seoResults: any; // alias for sidebar
    researchDossier: any;
    outlineStructure: any; // neural outline from BriefingModal

    // ── Strategy State ────────────────────────────────────
    strategyTitle: string;   // Meta Title
    strategyH1: string;
    strategySlug: string;
    strategyDesc: string;
    strategyWordCount: string;
    strategyTone: string;
    strategyOutline: StrategyOutlineItem[];
    strategyCompetitors: string;
    strategyNotes: string;
    strategyLinks: ContentItem[];
    strategyLSI: { keyword: string; count: string }[];
    strategyLongTail: string[];
    strategyQuestions: string[];
    detectedNiche: string;
    creativityLevel: 'low' | 'medium' | 'high';
    contextInstructions: string;
    isStrictMode: boolean;
    strictFrequency: number;
    metadata: any;

    // ── Humanizer ─────────────────────────────────────────
    humanizerConfig: {
        niche: string;
        audience: string;
        intensity: number;
        sentiment: string;
        notes?: string;
    };
    humanizerStatus: string;

    // ── Refinement ────────────────────────────────────────
    refinementInstructions: string;

    // ── UI State ──────────────────────────────────────────
    isSidebarOpen: boolean;
    activeSidebarTab: SidebarTab;

    // ── Actions ───────────────────────────────────────────
    setContent: (content: string) => void;
    setTitle: (title: string) => void;
    setKeyword: (keyword: string) => void;
    setDraftId: (id: string | null) => void;
    setLinkedTask: (id: string | null, title: string | null) => void;
    setViewMode: (mode: WriterViewMode) => void;

    setSaving: (saving: boolean) => void;
    setGenerating: (generating: boolean) => void;
    setAnalyzingSEO: (v: boolean) => void;
    setPlanningStructure: (v: boolean) => void;
    setHumanizing: (v: boolean) => void;
    setExporting: (v: boolean) => void;
    setRefining: (v: boolean) => void;
    setStatus: (msg: string) => void;
    downloadProgress: number | null;
    setDownloadProgress: (progress: number | null) => void;

    setApiKeys: (keys: string[]) => void;
    setSerperKey: (key: string) => void;
    setValueSerpKey: (key: string) => void;
    setJinaKey: (key: string) => void;
    setModel: (model: string) => void;

    setCsvData: (data: ContentItem[], fileName?: string) => void;
    setProjectName: (name: string) => void;

    setRawSeoData: (data: SEOAnalysisResult | null) => void;
    setSeoResults: (results: any) => void;
    setResearchDossier: (dossier: any) => void;
    setOutlineStructure: (outline: any) => void;

    setStrategyTitle: (v: string) => void;
    setStrategyH1: (v: string) => void;
    setStrategySlug: (v: string) => void;
    setStrategyDesc: (v: string) => void;
    setStrategyWordCount: (v: string) => void;
    setStrategyTone: (v: string) => void;
    setStrategyOutline: (outline: StrategyOutlineItem[]) => void;
    setStrategyCompetitors: (v: string) => void;
    setStrategyNotes: (v: string) => void;
    setStrategyLinks: (links: ContentItem[]) => void;
    setStrategyLSI: (lsi: { keyword: string; count: string }[]) => void;
    setStrategyLongTail: (lt: string[]) => void;
    setStrategyQuestions: (q: string[]) => void;
    setDetectedNiche: (niche: string) => void;
    setCreativityLevel: (level: 'low' | 'medium' | 'high') => void;
    setContextInstructions: (v: string) => void;
    setIsStrictMode: (v: boolean) => void;
    setStrictFrequency: (v: number) => void;
    setMetadata: (meta: any) => void;

    updateHumanizerConfig: (config: Partial<WriterState['humanizerConfig']>) => void;
    setHumanizerStatus: (msg: string) => void;
    setRefinementInstructions: (v: string) => void;

    toggleSidebar: () => void;
    setSidebarTab: (tab: SidebarTab) => void;

    initializeFromTask: (task: Task, project: Project | null) => void;
    resetStrategy: () => void;
    reset: () => void;
}

const defaultState = {
    content: '',
    title: '',
    keyword: '',
    draftId: null,
    linkedTaskId: null,
    linkedTaskTitle: null,
    viewMode: 'workspace' as WriterViewMode,

    isSaving: false,
    isCheckSaving: false,
    isGenerating: false,
    isAnalyzingSEO: false,
    isPlanningStructure: false,
    isHumanizing: false,
    isExporting: false,
    isRefining: false,
    lastSaved: null,
    statusMessage: '',
    downloadProgress: null,

    apiKeys: [],
    serperKey: '',
    valueSerpKey: '',
    jinaKey: '',
    model: 'gemini-2.5-flash',

    csvData: [],
    csvFileName: null,
    projectName: '',

    rawSeoData: null,
    seoResults: null,
    researchDossier: null,
    outlineStructure: null,

    strategyTitle: '',
    strategyH1: '',
    strategySlug: '',
    strategyDesc: '',
    strategyWordCount: '1500',
    strategyTone: 'Profesional y cercano',
    strategyOutline: [],
    strategyCompetitors: '',
    strategyNotes: '',
    strategyLinks: [],
    strategyLSI: [],
    strategyLongTail: [],
    strategyQuestions: [],
    detectedNiche: '',
    creativityLevel: 'medium' as const,
    contextInstructions: '',
    isStrictMode: false,
    strictFrequency: 30,
    metadata: null,

    humanizerConfig: {
        niche: 'General',
        audience: 'General',
        intensity: 50,
        sentiment: 'Neutral',
        notes: '',
    },
    humanizerStatus: '',
    refinementInstructions: '',

    isSidebarOpen: true,
    activeSidebarTab: 'generate' as SidebarTab,
};

export const useWriterStore = create<WriterState>((set) => ({
    ...defaultState,

    setContent: (content) => set({ content, isSaving: true, isCheckSaving: true }),
    setTitle: (title) => set({ title }),
    setKeyword: (keyword) => set({ keyword }),
    setDraftId: (draftId) => set({ draftId }),
    setLinkedTask: (linkedTaskId, linkedTaskTitle) => set({ linkedTaskId, linkedTaskTitle }),
    setViewMode: (viewMode) => set({ viewMode }),

    setSaving: (isSaving) => set({ isSaving, isCheckSaving: isSaving, lastSaved: isSaving ? null : new Date() }),
    setGenerating: (isGenerating) => set({ isGenerating }),
    setAnalyzingSEO: (isAnalyzingSEO) => set({ isAnalyzingSEO }),
    setPlanningStructure: (isPlanningStructure) => set({ isPlanningStructure }),
    setHumanizing: (isHumanizing) => set({ isHumanizing }),
    setExporting: (isExporting) => set({ isExporting }),
    setRefining: (v) => set({ isRefining: v }),
    setStatus: (statusMessage) => set({ statusMessage }),
    setDownloadProgress: (progress) => set({ downloadProgress: progress }),

    setApiKeys: (apiKeys) => set({ apiKeys }),
    setSerperKey: (serperKey) => set({ serperKey }),
    setValueSerpKey: (valueSerpKey) => set({ valueSerpKey }),
    setJinaKey: (jinaKey) => set({ jinaKey }),
    setModel: (model) => set({ model }),

    setCsvData: (csvData, csvFileName) => set({ csvData, csvFileName: csvFileName ?? null }),
    setProjectName: (projectName) => set({ projectName }),

    setRawSeoData: (rawSeoData) => set({ rawSeoData, seoResults: rawSeoData }),
    setSeoResults: (seoResults) => set({ seoResults }),
    setResearchDossier: (researchDossier) => set({ researchDossier }),
    setOutlineStructure: (outlineStructure) => set({ outlineStructure }),

    setStrategyTitle: (strategyTitle) => set({ strategyTitle }),
    setStrategyH1: (strategyH1) => set({ strategyH1, title: strategyH1 }),
    setStrategySlug: (strategySlug) => set({ strategySlug }),
    setStrategyDesc: (strategyDesc) => set({ strategyDesc }),
    setStrategyWordCount: (strategyWordCount) => set({ strategyWordCount }),
    setStrategyTone: (strategyTone) => set({ strategyTone }),
    setStrategyOutline: (strategyOutline) => set({ strategyOutline }),
    setStrategyCompetitors: (strategyCompetitors) => set({ strategyCompetitors }),
    setStrategyNotes: (strategyNotes) => set({ strategyNotes }),
    setStrategyLinks: (strategyLinks) => set({ strategyLinks }),
    setStrategyLSI: (strategyLSI) => set({ strategyLSI }),
    setStrategyLongTail: (strategyLongTail) => set({ strategyLongTail }),
    setStrategyQuestions: (strategyQuestions) => set({ strategyQuestions }),
    setDetectedNiche: (detectedNiche) => set({ detectedNiche }),
    setCreativityLevel: (creativityLevel) => set({ creativityLevel }),
    setContextInstructions: (contextInstructions) => set({ contextInstructions }),
    setIsStrictMode: (isStrictMode) => set({ isStrictMode }),
    setStrictFrequency: (strictFrequency) => set({ strictFrequency }),
    setMetadata: (metadata) => set({ metadata }),

    updateHumanizerConfig: (config) => set((state) => ({
        humanizerConfig: { ...state.humanizerConfig, ...config }
    })),
    setHumanizerStatus: (humanizerStatus) => set({ humanizerStatus }),
    setRefinementInstructions: (refinementInstructions) => set({ refinementInstructions }),

    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    setSidebarTab: (activeSidebarTab) => set({ activeSidebarTab }),

    initializeFromTask: (task: Task, project: Project | null) => set((state) => ({
        title: task.title,
        keyword: task.target_keyword || '',
        strategyH1: task.title || '',
        activeSidebarTab: 'generate',
        researchDossier: (task as any).research_dossier,
        outlineStructure: (task as any).outline_structure,
        humanizerConfig: {
            ...state.humanizerConfig,
            niche: project?.settings?.niche || project?.description || 'General',
            audience: project?.settings?.audience || 'General',
        }
    })),

    resetStrategy: () => set({
        keyword: '',
        strategyTitle: '',
        strategyH1: '',
        strategySlug: '',
        strategyDesc: '',
        strategyOutline: [],
        strategyLinks: [],
        strategyCompetitors: '',
        strategyLSI: [],
        strategyLongTail: [],
        strategyQuestions: [],
        rawSeoData: null,
        seoResults: null,
        detectedNiche: '',
        contextInstructions: '',
        metadata: null,
        statusMessage: '',
        viewMode: 'workspace',
    }),

    reset: () => set({ ...defaultState }),
}));
