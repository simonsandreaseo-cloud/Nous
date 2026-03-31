import { create } from 'zustand';
import { Task, Project } from '@/types/project';
import { ContentItem, SEOAnalysisResult } from '@/components/tools/writer/services';

export type WriterViewMode = 'dashboard' | 'setup' | 'workspace' | 'seo-review' | 'structure-review';
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
    downloadProgress: number | null;

    model: string;

    // ── CSV / Project Data ────────────────────────────────
    csvData: ContentItem[];
    csvFileName: string | null;
    projectName: string;

    // ── SEO / Research Results ────────────────────────────
    rawSeoData: SEOAnalysisResult | null;
    seoResults: any; // alias for sidebar
    researchDossier: any;
    outlineStructure: any; // neural content structure

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
    strategyCannibalization: string[];
    strategyVolume: string;
    strategyDifficulty: string;
    competitorDetails: any[];
    strategyLSI: { keyword: string; count: string }[];
    strategyKeywords: { keyword: string; volume: string }[];
    strategyInternalLinks: { url: string; title: string }[];
    strategyExternalLinks: { url: string; title: string }[];
    strategyMinWords: string;
    strategyMaxWords: string;
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

    // ── Dashboard State ───────────────────────────────────
    projectContents: any[];
    setProjectContents: (contents: any[]) => void;
    loadProjectContents: (projectId: string | string[]) => Promise<void>;

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
    setDownloadProgress: (progress: number | null) => void;

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
    setStrategyCannibalization: (v: string[]) => void;
    setStrategyVolume: (v: string) => void;
    setStrategyDifficulty: (v: string) => void;
    setCompetitorDetails: (v: any[]) => void;
    setStrategyLSI: (lsi: { keyword: string; count: string }[]) => void;
    setStrategyKeywords: (k: { keyword: string; volume: string }[]) => void;
    setStrategyInternalLinks: (links: { url: string; title: string }[]) => void;
    setStrategyExternalLinks: (links: { url: string; title: string }[]) => void;
    setStrategyMinWords: (v: string) => void;
    setStrategyMaxWords: (v: string) => void;
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

    updateStrategyFromSeo: (seoData: SEOAnalysisResult) => void;
    loadProjectInventory: (projectId: string) => Promise<void>;
    saveResearchData: (contentId: string, keyword: string, serp: any, competitors: any) => Promise<void>;
    loadResearchData: (contentId: string) => Promise<void>;

    toggleSidebar: () => void;
    setSidebarTab: (tab: SidebarTab) => void;

    initializeFromTask: (task: Task, project: Project | null) => void;
    resetStrategy: () => void;
    reset: () => void;
    loadContentById: (contentId: string) => Promise<void>;
    deleteContent: (contentId: string) => Promise<boolean>;
}

const defaultState = {
    content: '',
    title: '',
    keyword: '',
    draftId: null,
    linkedTaskId: null,
    linkedTaskTitle: null,
    viewMode: 'dashboard' as WriterViewMode,
    projectContents: [],

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
    strategyCannibalization: [],
    strategyVolume: '0',
    strategyDifficulty: '0',
    competitorDetails: [],
    strategyLSI: [],
    strategyKeywords: [],
    strategyInternalLinks: [],
    strategyExternalLinks: [],
    strategyMinWords: '1000',
    strategyMaxWords: '2000',
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
    setStrategyCannibalization: (strategyCannibalization) => set({ strategyCannibalization }),
    setStrategyVolume: (strategyVolume) => set({ strategyVolume }),
    setStrategyDifficulty: (strategyDifficulty) => set({ strategyDifficulty }),
    setCompetitorDetails: (competitorDetails) => set({ competitorDetails }),
    setStrategyLSI: (strategyLSI) => set({ strategyLSI }),
    setStrategyKeywords: (strategyKeywords) => set({ strategyKeywords }),
    setStrategyInternalLinks: (strategyInternalLinks) => set({ strategyInternalLinks }),
    setStrategyExternalLinks: (strategyExternalLinks) => set({ strategyExternalLinks }),
    setStrategyMinWords: (strategyMinWords) => set({ strategyMinWords }),
    setStrategyMaxWords: (strategyMaxWords) => set({ strategyMaxWords }),
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

    updateStrategyFromSeo: (seoData: SEOAnalysisResult) => {
        const { generateBriefingText } = require('@/components/tools/writer/services');
        const brief = generateBriefingText(seoData);
        set({
            rawSeoData: seoData,
            seoResults: seoData,
            strategyLSI: seoData.lsiKeywords || [],
            strategyQuestions: seoData.frequentQuestions || [],
            strategyWordCount: seoData.recommendedWordCount || '1500',
            strategyNotes: brief,
            detectedNiche: seoData.nicheDetected || '',
            strategyCannibalization: seoData.cannibalizationUrls || [],
            strategyVolume: seoData.searchVolume || '0',
            strategyDifficulty: seoData.keywordDifficulty || '0',
            competitorDetails: seoData.competitors || seoData.top10Urls || [],
            strategyLinks: seoData.suggestedInternalLinks || [],
        });
    },

    loadProjectInventory: async (projectId: string) => {
        const { supabase } = require('@/lib/supabase');
        const { data, error } = await supabase
            .from('project_urls')
            .select('url, title')
            .eq('project_id', projectId);

        if (!error && data) {
            set({ 
                csvData: data.map((item: any) => {
                    const title = item.title || item.url;
                    const type = item.type || 'page';
                    return {
                        url: item.url,
                        title,
                        type,
                        search_index: `${title} ${type} ${item.url}`.toLowerCase()
                    };
                })
            });
        }
    },

    syncProjectInventory: async (projectId: string, siteUrl: string) => {
        const { useProjectStore } = require('@/store/useProjectStore');
        const { syncProjectInventory } = useProjectStore.getState();
        await syncProjectInventory(projectId, siteUrl);
        const { loadProjectInventory } = useWriterStore.getState();
        await loadProjectInventory(projectId);
    },

    saveResearchData: async (contentId, keyword, serp, competitors) => {
        const { supabase } = require('@/lib/supabase');
        const { error } = await supabase
            .from('content_research')
            .upsert({
                content_id: contentId,
                keyword,
                serp_data: serp,
                competitors_data: competitors
            }, { onConflict: 'content_id' });
        if (error) console.error('[saveResearchData] Error:', error);
    },

    loadResearchData: async (contentId) => {
        const { supabase } = require('@/lib/supabase');
        const { data, error } = await supabase
            .from('content_research')
            .select('*')
            .eq('content_id', contentId)
            .maybeSingle();
        if (!error && data) {
            set({
                rawSeoData: data.serp_data,
                competitorDetails: data.competitors_data || [],
                strategyLinks: data.serp_data?.suggestedInternalLinks || []
            });
        }
    },

    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    setSidebarTab: (activeSidebarTab) => set({ activeSidebarTab }),

    initializeFromTask: (task, project) => set((state) => ({
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
        },
        strategyLinks: (task as any).suggested_links || [],
        viewMode: 'workspace'
    })),

    setProjectContents: (projectContents) => set({ projectContents }),
    loadProjectContents: async (projectId) => {
        const { supabase } = require('@/lib/supabase');
        let query = supabase.from('contents').select('*');

        if (Array.isArray(projectId)) {
            query = query.in('project_id', projectId);
        } else {
            query = query.eq('project_id', projectId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) set({ projectContents: data });
    },

    loadContentById: async (contentId) => {
        const { supabase } = require('@/lib/supabase');
        const { data, error } = await supabase
            .from('contents')
            .select('*')
            .eq('id', contentId)
            .maybeSingle();

        if (!error && data) {
            set((state) => ({
                draftId: data.id,
                title: data.title,
                content: data.content_body || '',
                statusMessage: `Cargado: ${data.title}`,
                viewMode: 'workspace',
                keyword: data.target_keyword || state.keyword
            }));
            const { loadResearchData, loadProjectInventory } = useWriterStore.getState();
            await loadResearchData(contentId);
            if (data.project_id) {
                await loadProjectInventory(data.project_id);
            }
        }
    },

    deleteContent: async (contentId) => {
        const { supabase } = require('@/lib/supabase');
        const { error } = await supabase
            .from('contents')
            .delete()
            .eq('id', contentId);
        
        if (error) {
            console.error('[deleteContent] Error:', error);
            return false;
        }

        const { loadProjectContents } = useWriterStore.getState();
        const { activeProjectIds } = require('@/store/useProjectStore').useProjectStore.getState();
        if (activeProjectIds.length > 0) {
            await loadProjectContents(activeProjectIds);
        }
        return true;
    },

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
        viewMode: 'setup',
    }),

    reset: () => set({ ...defaultState }),
}));
