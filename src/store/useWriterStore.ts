import { create } from 'zustand';
import { Task, Project } from '@/types/project';
import type { ContentItem, SEOAnalysisResult } from '@/lib/services/writer/types';

export type WriterViewMode = 'dashboard' | 'setup' | 'workspace' | 'seo-review' | 'structure-review';
export type SidebarTab = 'assistant' | 'generate' | 'seo' | 'research' | 'humanize' | 'media' | 'history' | 'export';

export interface StrategyOutlineItem {
    type: string;
    text: string;
    wordCount: string;      // Target
    currentWordCount?: number; // Actual real-time count
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
    projectId: string | null;
    isRefreshingLinks: boolean;

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
    hasGenerated: boolean;
    hasHumanized: boolean;
    lastSaved: Date | null;
    statusMessage: string;
    downloadProgress: number | null;
    
    // ── Global Research Tracker ───────────────────────────
    isResearching: boolean;
    researchProgress: number;
    researchPhaseId: string;
    researchTopic: string;
    researchMode: 'rapid' | 'quality';

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
    strategyExcerpt: string;
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
    strategyInternalLinks: ContentItem[];
    strategyExternalLinks: ContentItem[];
    strategyMinWords: string;
    strategyMaxWords: string;
    strategyLongTail: string[];
    strategyQuestions: string[];
    detectedNiche: string;

    contextInstructions: string;
    isStrictMode: boolean;
    strictFrequency: number;
    removeStrategyLink: (url: string) => void;
    clearStrategyLinks: () => void;
    refreshInterlinking: (mode?: 'overwrite' | 'append') => Promise<void>;
    metadata: any;
    activeUsers: Record<string, { name: string; photo: string; color: string }>;
    isRemoteUpdate: boolean;

    // ── Humanizer ─────────────────────────────────────────
    humanizerConfig: {
        niche: string;
        audience: string;
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
    setHasGenerated: (v: boolean) => void;
    setHasHumanized: (v: boolean) => void;
    setModel: (model: string) => void;
    setStatus: (msg: string) => void;
    setDownloadProgress: (progress: number | null) => void;
    markAsReadyForReview: () => Promise<void>;

    // ── Research Actions ──────────────────────────────────
    setResearching: (isResearching: boolean, topic?: string) => void;
    updateResearchProgress: (progress: number, phaseId: string) => void;

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
    setStrategyExcerpt: (v: string) => void;
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
    setStrategyInternalLinks: (links: ContentItem[]) => void;
    setStrategyExternalLinks: (links: ContentItem[]) => void;
    updateSectionProgress: (sectionIndex: number, count: number) => void;
    strategyDensity: number;
    setStrategyDensity: (v: number) => void;
    setStrategyMinWords: (v: string) => void;
    setStrategyMaxWords: (v: string) => void;
    setStrategyLongTail: (lt: string[]) => void;
    setStrategyQuestions: (q: string[]) => void;
    removeStrategyLSI: (index: number) => void;
    removeStrategyQuestion: (index: number) => void;
    setDetectedNiche: (niche: string) => void;

    setActiveUsers: (users: Record<string, { name: string; photo: string; color: string }>) => void;
    setContextInstructions: (v: string) => void;
    setIsStrictMode: (v: boolean) => void;
    setStrictFrequency: (v: number) => void;
    setMetadata: (meta: any) => void;
    setIsRemoteUpdate: (v: boolean) => void;
    setResearchMode: (mode: 'rapid' | 'quality') => void;

    updateHumanizerConfig: (config: Partial<WriterState['humanizerConfig']>) => void;
    setHumanizerStatus: (msg: string) => void;
    setRefinementInstructions: (v: string) => void;

    updateStrategyFromSeo: (seoData: SEOAnalysisResult) => void;
    loadProjectInventory: (projectId: string) => Promise<void>;
    syncProjectInventory: (projectId: string, siteUrl: string) => Promise<void>;
    saveResearchData: (contentId: string, keyword: string, serp: any, competitors: any) => Promise<void>;
    loadResearchData: (contentId: string) => Promise<void>;

    toggleSidebar: () => void;
    setSidebarTab: (tab: SidebarTab) => void;
    editorTab: 'visual' | 'code';
    setEditorTab: (tab: 'visual' | 'code') => void;

    initializeFromTask: (task: Task, project: Project | null) => void;
    resetStrategy: () => void;
    reset: () => void;
    loadContentById: (contentId: string) => Promise<void>;
    deleteContent: (contentId: string) => Promise<boolean>;
    finishContent: () => Promise<void>;
    editor: any;
    setEditor: (editor: any) => void;
    setStatus: (status: string) => void;
    setSaving: (saving: boolean) => void;
    isSaving: boolean;
    lastSaved: Date | null;
    keyword: string;
    strategyH1: string;
    draftId: string | null;
    viewMode: WriterViewMode;
    setViewMode: (mode: WriterViewMode) => void;
    rawSeoData: any;
    editorTab: 'visual' | 'code';
    setEditorTab: (tab: 'visual' | 'code') => void;
    content: string;
    activeUsers: Record<string, { name: string; photo: string; color: string }>;
    setActiveUsers: (users: Record<string, { name: string; photo: string; color: string }>) => void;
    strategyOutline: StrategyOutlineItem[];
    strategyTitle: string;
    strategySlug: string;
    strategyDesc: string;
    strategyExcerpt: string;
    strategyLinks: any[];
    strategyNotes: string;
    setIsRemoteUpdate: (v: boolean) => void;
    setStatusMessage: (msg: string) => void;
    setSavingState: (saving: boolean) => void;
    isGenerating: boolean;
    isAnalyzingSEO: boolean;
    isPlanningStructure: boolean;
    isHumanizing: boolean;
    isRefining: boolean;
    researchProgress: number;
    statusMessage: string;
    humanizerStatus: string;
    researchTopic: string;
    researchPhaseId: string | null;
    isRefreshingLinks: boolean;
    
    // ── Debug / Console ───────────────────────────────────
    isConsoleOpen: boolean;
    setIsConsoleOpen: (isConsoleOpen: boolean) => void;
    debugPrompts: { phase: string, prompt: string, response?: string, timestamp: string }[];
    addDebugPrompt: (phase: string, prompt: string, response?: string) => void;
    clearDebugPrompts: () => void;

    // ── Image Gallery ─────────────────────────────────────
    taskImages: any[];
    loadTaskImages: (taskId: string) => Promise<void>;
}

const defaultState = {
    content: '',
    title: '',
    keyword: '',
    draftId: null,
    linkedTaskId: null,
    linkedTaskTitle: null,
    projectId: null,
    isRefreshingLinks: false,
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
    hasGenerated: false,
    hasHumanized: false,
    lastSaved: null,
    statusMessage: '',
    downloadProgress: null,
    isRemoteUpdate: false,
    
    isResearching: false,
    researchProgress: 0,
    researchPhaseId: '',
    researchTopic: '',
    researchMode: 'rapid' as const,

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
    strategyExcerpt: '',
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

    contextInstructions: '',
    isStrictMode: false,
    strictFrequency: 30,
    metadata: null,
    activeUsers: {},

    humanizerConfig: {
        niche: 'General',
        audience: 'General',
        sentiment: 'Neutral',
        notes: '',
    },
    humanizerStatus: '',
    refinementInstructions: '',
    debugPrompts: [],
    isConsoleOpen: false,
    isSidebarOpen: true,
    activeSidebarTab: 'generate' as SidebarTab,
    editorTab: 'visual' as const,
    strategyDensity: 1.0,
    taskImages: [],
};

export const useWriterStore = create<WriterState>((set, get) => ({
    ...defaultState,

    setContent: (content) => set({ content }),
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
    setHasGenerated: (v) => set({ hasGenerated: v }),
    setHasHumanized: (v) => set({ hasHumanized: v }),
    setStatus: (statusMessage) => set({ statusMessage }),
    setDownloadProgress: (progress) => set({ downloadProgress: progress }),
    setIsRemoteUpdate: (isRemoteUpdate) => set({ isRemoteUpdate }),

    markAsReadyForReview: async () => {
        const state = get() as any;
        const { draftId, setStatus, setViewMode } = state;
        if (!draftId) return;

        const { supabase } = await import('@/lib/supabase');
        const { error } = await supabase
            .from('tasks')
            .update({ status: 'por_corregir' })
            .eq('id', draftId);

        if (!error) {
            setStatus('✅ Tarea enviada a Corrección');
            setTimeout(() => {
                setStatus('');
                setViewMode('dashboard');
            }, 2000);
        } else {
            const err = error as any;
            setStatus('❌ Error: ' + err.message);
        }
    },

    setResearching: (isResearching, topic) => set((state) => ({ 
        isResearching, 
        researchTopic: topic ?? state.researchTopic,
        // Reset progress when starting new
        researchProgress: isResearching ? 0 : state.researchProgress,
        researchPhaseId: isResearching ? 'starting' : state.researchPhaseId
    })),
    updateResearchProgress: (researchProgress, researchPhaseId) => set({ 
        researchProgress, 
        researchPhaseId 
    }),

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
    setStrategyExcerpt: (strategyExcerpt) => set({ strategyExcerpt }),
    setStrategyWordCount: (val: string) => {
        const parsed = parseInt(String(val)) || 1500;
        set({ strategyWordCount: String(parsed) });
    },
    setStrategyTone: (strategyTone) => set({ strategyTone }),
    setResearchMode: (researchMode) => set({ researchMode }),
    setStrategyOutline: (strategyOutline) => set({ strategyOutline }),
    setStrategyCompetitors: (strategyCompetitors) => set({ strategyCompetitors }),
    setStrategyNotes: (strategyNotes) => set({ strategyNotes }),
    setStrategyCannibalization: (strategyCannibalization) => set({ strategyCannibalization }),
    setStrategyLSI: (strategyLSI) => set({ strategyLSI }),
    setStrategyQuestions: (strategyQuestions) => set({ strategyQuestions }),
    setStrategyLinks: (strategyLinks) => set({ strategyLinks }),
    setDetectedNiche: (detectedNiche) => set({ detectedNiche }),
    setSidebarTab: (activeSidebarTab) => set({ activeSidebarTab }),
    setStrategyVolume: (strategyVolume) => set({ strategyVolume }),
    setStrategyDifficulty: (strategyDifficulty) => set({ strategyDifficulty }),
    setCompetitorDetails: (competitorDetails) => set({ competitorDetails }),
    setStrategyKeywords: (strategyKeywords) => set({ strategyKeywords }),
    setStrategyInternalLinks: (strategyInternalLinks) => set({ strategyInternalLinks }),
    setStrategyExternalLinks: (links) => set({ strategyExternalLinks: links }),
    updateSectionProgress: (idx, count) => set((state) => ({
        strategyOutline: state.strategyOutline.map((item, i) =>
            i === idx ? { ...item, currentWordCount: count } : item
        )
    })),
    setStrategyDensity: (strategyDensity) => set({ strategyDensity }),
    setStrategyMinWords: (strategyMinWords) => set({ strategyMinWords }),
    setStrategyMaxWords: (strategyMaxWords) => set({ strategyMaxWords }),
    setStrategyLongTail: (strategyLongTail) => set({ strategyLongTail }),

    setActiveUsers: (activeUsers) => set({ activeUsers }),
    setContextInstructions: (contextInstructions) => set({ contextInstructions }),
    setIsStrictMode: (isStrictMode) => set({ isStrictMode }),
    setStrictFrequency: (strictFrequency) => set({ strictFrequency }),
    setMetadata: (metadata) => set({ metadata }),
    setIsConsoleOpen: (isConsoleOpen) => set({ isConsoleOpen }),
    clearDebugPrompts: () => set({ debugPrompts: [] }),
    addDebugPrompt: (phase, prompt, response) => set((state: any) => ({
        debugPrompts: [
            { phase, prompt, response, timestamp: new Date().toLocaleTimeString() },
            ...(state.debugPrompts || [])
        ].slice(0, 50)
    })),
    removeStrategyLSI: (index) => set((state) => ({
        strategyLSI: state.strategyLSI.filter((_, i) => i !== index)
    })),
    removeStrategyQuestion: (index) => set((state) => ({
        strategyQuestions: state.strategyQuestions.filter((_, i) => i !== index)
    })),

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
            strategyWordCount: String(parseInt(String(seoData.recommendedWordCount)) || '1500'),
            strategyNotes: brief,
            detectedNiche: seoData.nicheDetected || '',
            strategyCannibalization: seoData.cannibalizationUrls || [],
            strategyVolume: seoData.searchVolume || '0',
            strategyDifficulty: seoData.keywordDifficulty || '0',
            competitorDetails: seoData.competitors || (seoData as any).top10Urls || [],
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
            set((state) => {
                const serp = data.serp_data || {};
                const sLinks = serp.suggestedInternalLinks || serp.suggested_links || serp.suggestedLinks || [];
                
                return {
                    rawSeoData: serp || state.rawSeoData,
                    competitorDetails: data.competitors_data || state.competitorDetails,
                    strategyLinks: (sLinks && sLinks.length > 0) ? sLinks : state.strategyLinks
                };
            });
        }
    },

    removeStrategyLink: (url) => set((state) => ({
        strategyLinks: state.strategyLinks.filter((l: any) => l.url !== url)
    })),

    clearStrategyLinks: () => set({ strategyLinks: [] }),

    refreshInterlinking: async (mode: 'append' | 'overwrite' = 'overwrite') => {
        try {
            const { executeWithGroq } = require('@/lib/services/groq');
            const { strategyLinks, keyword, strategyH1, strategyExcerpt, strategyLSI, projectId } = get();
            
            if (!projectId) return;

            set({ isRefreshingLinks: true });

            // 1. Cargamos las reglas de arquitectura del proyecto
            const { supabase } = require('@/lib/supabase');
            
            // 2. Preparamos los términos de búsqueda (Regex)
            const rawTerms = [
                ...keyword.split(/\s+/),
                ...(strategyLSI || []).map((l: any) => typeof l === 'string' ? l.split(/\s+/) : (l.keyword?.split(/\s+/) || [])).flat()
            ].filter(w => w && w.length > 3).map(w => w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            const allTerms = Array.from(new Set(rawTerms)).slice(0, 15);
            const searchRegex = allTerms.join('|');

            // 3. Consulta vía RPC optimizado de base de datos
            const { data: units, error: rpcError } = await supabase.rpc('get_semantic_inventory_matches', { 
                p_project_id: projectId,
                p_regex: searchRegex,
                p_limit: 40
            });

            if (rpcError) throw rpcError;

            const highLsis = (strategyLSI || []).filter((l: any) => typeof l !== 'string' && l.count === "Alto").map((l: any) => l.keyword).join(", ");
            const linkPrompt = `ESTRATEGIA DE INTERLINKING PARA: "${keyword}"
H1 PROPUESTO: "${strategyH1}"
RESUMEN: "${strategyExcerpt}"
KEYWORDS CLAVE: ${highLsis || keyword}

CATÁLOGO DISTRIBUIDO POR CATEGORÍAS:
${JSON.stringify((units || []).map((u: any) => ({ 
    title: u.title.substring(0, 60), 
    url: u.url, 
    category: u.category 
})))}

REGLAS:
1. Elige los 5 artículos del catálogo que mejor conecten semánticamente con el contenido.
2. ${mode === 'overwrite' ? 'Ignora los enlaces actuales y genera una lista totalmente nueva.' : 'Busca enlaces complementarios a los que ya existen.'}
3. Retorna ÚNICAMENTE un array JSON válido: [{"url": "...", "title": "...", "anchor_text": "..."}]`;

            const linkRes = await executeWithGroq(linkPrompt, "Arquitecto de Interlinking SEO.", "llama-3.1-8b-instant", true);
            const newLinks = require('@/utils/json').safeJsonExtract(linkRes, []);

            const { updateTask } = require('@/store/useProjectStore').useProjectStore.getState();

            if (mode === 'append') {
                const existingUrls = new Set(strategyLinks.map((l: any) => l.url));
                const filteredNew = newLinks.filter((l: any) => !existingUrls.has(l.url));
                const finalLinks = [...strategyLinks, ...filteredNew];
                set({ strategyLinks: finalLinks });
                // AUTO-SAVE to DB for integrity
                const dossier = get().researchDossier || {};
                await updateTask(get().draftId!, { 
                    research_dossier: { ...dossier, suggestedInternalLinks: finalLinks, suggested_links: finalLinks } 
                });
            } else {
                set({ strategyLinks: newLinks });
                // AUTO-SAVE to DB for integrity
                const dossier = get().researchDossier || {};
                await updateTask(get().draftId!, { 
                    research_dossier: { ...dossier, suggestedInternalLinks: newLinks, suggested_links: newLinks } 
                });
            }
        } catch (e) {
            console.error("Error al refrescar interlinking:", e);
        } finally {
            set({ isRefreshingLinks: false });
        }
    },

    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    editorTab: 'visual' as const,
    setEditorTab: (editorTab) => set({ editorTab }),

    initializeFromTask: (task, project) => set((state) => {
        const dossier = (task as any).research_dossier || (task as any).seo_data || null;
        
        // Extract common fields for easier access and consistency
        const seoTitle = task.seo_title || dossier?.seo_title || dossier?.strategyTitle || task.title || '';
        const h1 = task.h1 || dossier?.h1 || dossier?.title || task.title || '';
        const slug = task.target_url_slug || dossier?.slug || dossier?.target_url_slug || '';
        const desc = task.meta_description || dossier?.meta_description || '';
        const excerpt = (task as any).excerpt || dossier?.excerpt || '';
        const lsi = dossier?.lsiKeywords || dossier?.keywordIdeas || state.strategyLSI;
        const competitors = dossier?.fullCompetitorAnalysis || dossier?.competitors || dossier?.top10Urls || state.competitorDetails;
        
        // Generar briefing si hay dossier
        let notes = state.strategyNotes;
        if (dossier) {
            const { generateBriefingText } = require('@/components/tools/writer/services');
            notes = generateBriefingText(dossier);
        }

        return {
            title: task.title,
            keyword: task.target_keyword || dossier?.target_keyword || '',
            strategyH1: h1,
            strategyTitle: seoTitle,
            strategySlug: slug,
            strategyDesc: desc,
            strategyExcerpt: excerpt,
            activeSidebarTab: 'generate',
            researchDossier: dossier,
            rawSeoData: dossier,
            seoResults: dossier,
            strategyWordCount: String(
                parseInt(String(task.target_word_count)) || 
                parseInt(String(dossier?.recommendedWordCount)) || 
                parseInt(String(dossier?.word_count)) || 
                parseInt(String(state.strategyWordCount)) || 
                1500
            ),
            strategyLSI: lsi,
            strategyQuestions: dossier?.frequentQuestions || state.strategyQuestions,
            strategyKeywords: dossier?.keywordIdeas || state.strategyKeywords,
            competitorDetails: competitors,
            strategyNotes: notes,
            strategyVolume: dossier?.searchVolume || dossier?.volume?.toString() || state.strategyVolume,
            strategyDifficulty: dossier?.keywordDifficulty || state.strategyDifficulty,
            strategyOutline: (() => {
                const rawOutline = (task as any).outline_structure?.headers || (task as any).outline_structure || [];
                if (!Array.isArray(rawOutline)) return [];
                return rawOutline.map(item => {
                    if (typeof item === 'string') return { type: 'h2', text: item, wordCount: '300', currentWordCount: 0 };
                    if (item && typeof item === 'object') return {
                        type: item.type || 'h2',
                        text: item.text || item.title || '',
                        wordCount: String(item.wordCount || '300'),
                        currentWordCount: item.currentWordCount || 0
                    };
                    return null;
                }).filter(Boolean) as StrategyOutlineItem[];
            })(),
            outlineStructure: (task as any).outline_structure,
            humanizerConfig: {
                ...state.humanizerConfig,
                niche: project?.settings?.niche || project?.description || 'General',
                audience: project?.settings?.audience || 'General',
            },
            strategyLinks: dossier?.suggestedInternalLinks || dossier?.suggested_links || dossier?.suggestedLinks || (task as any).suggested_links || [],
            projectId: project?.id || task.project_id || null,
            viewMode: 'workspace'
        };
    }),
    
    finishContent: async () => {
        const { draftId, setSaving, setStatus, setViewMode } = get();
        if (!draftId) return;

        setSaving(true);
        setStatus('Finalizando y enviando a corrección...');

        try {
            const { supabase } = require('@/lib/supabase');
            const { error } = await supabase
                .from('tasks')
                .update({ status: 'por_corregir' })
                .eq('id', draftId);

            if (error) throw error;
            
            setStatus('✅ Contenido finalizado');
            setTimeout(() => {
                setViewMode('dashboard');
                // Refresh local contents to reflect the change
                useWriterStore.getState().loadProjectContents && useWriterStore.getState().loadProjectContents(useWriterStore.getState().projectId || []);
            }, 1000);
        } catch (e: any) {
            console.error('Error al finalizar:', e);
            setStatus('❌ Error: ' + (e.message || 'Error desconocido'));
        } finally {
            setSaving(false);
        }
    },

    setProjectContents: (projectContents) => set({ projectContents }),
    loadProjectContents: async (projectId) => {
        const { supabase } = require('@/lib/supabase');
        let query = supabase.from('tasks').select('*'); // Unified table

        if (Array.isArray(projectId)) {
            query = query.in('project_id', projectId);
        } else {
            query = query.eq('project_id', projectId);
        }

        const { data, error } = await query
            .in('status', ['por_redactar', 'por_corregir', 'en_redaccion'])
            .order('created_at', { ascending: false });
        if (!error && data) set({ projectContents: data });
    },

    loadContentById: async (contentId) => {
        const { supabase } = require('@/lib/supabase');
        const { data, error } = await supabase
            .from('tasks') // Unified table
            .select('*')
            .eq('id', contentId)
            .maybeSingle();

        if (!error && data) {
            const dossier = (data as any).research_dossier || (data as any).seo_data || null;

            set((state) => ({
                draftId: data.id,
                title: data.title,
                currentStatus: data.status,
                content: data.content_body || '',
                statusMessage: `Cargado: ${data.title}`,
                viewMode: 'workspace',
                keyword: data.target_keyword || dossier?.target_keyword || state.keyword,
                rawSeoData: dossier || {},
                seoResults: dossier || {},
                researchDossier: dossier || {},
                
                // Populate strategy fields from dossier or top-level task
                strategyH1: data.h1 || dossier?.h1 || dossier?.title || data.title || '',
                strategyTitle: data.seo_title || dossier?.seo_title || dossier?.strategyTitle || data.title || '',
                strategySlug: data.target_url_slug || dossier?.slug || dossier?.target_url_slug || '',
                strategyDesc: data.meta_description || dossier?.meta_description || '',
                strategyExcerpt: (data as any).excerpt || dossier?.excerpt || '',
                strategyWordCount: String(parseInt(String(data.target_word_count)) || parseInt(String(dossier?.recommendedWordCount)) || parseInt(String(dossier?.word_count)) || parseInt(String(state.strategyWordCount)) || 1500),
                strategyLSI: dossier?.lsiKeywords || dossier?.keywordIdeas || state.strategyLSI,
                strategyQuestions: dossier?.frequentQuestions || state.strategyQuestions,
                strategyKeywords: dossier?.keywordIdeas || state.strategyKeywords,
                competitorDetails: dossier?.fullCompetitorAnalysis || dossier?.competitors || dossier?.top10Urls || state.competitorDetails,
                strategyNotes: dossier ? require('@/components/tools/writer/services').generateBriefingText(dossier) : state.strategyNotes,
                strategyVolume: dossier?.searchVolume || dossier?.volume?.toString() || state.strategyVolume,
                strategyDifficulty: dossier?.keywordDifficulty || state.strategyDifficulty,
                strategyOutline: (() => {
                    const rawOutline = (data as any).outline_structure?.headers || (data as any).outline_structure || state.strategyOutline;
                    if (!Array.isArray(rawOutline)) return [];
                    return rawOutline.map(item => {
                        if (typeof item === 'string') return { type: 'h2', text: item, wordCount: '300', currentWordCount: 0 };
                        if (item && typeof item === 'object') return {
                            type: item.type || 'h2',
                            text: item.text || item.title || '',
                            wordCount: String(item.wordCount || '300'),
                            currentWordCount: item.currentWordCount || 0
                        };
                        return null;
                    }).filter(Boolean) as StrategyOutlineItem[];
                })(),
                outlineStructure: (data as any).outline_structure,
                strategyLinks: dossier?.suggestedInternalLinks || dossier?.suggested_links || dossier?.suggestedLinks || (data as any).suggested_links || state.strategyLinks,
                projectId: data.project_id || null,
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
            .from('tasks') // Unified table
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

    editor: null,
    setEditor: (editor) => set({ editor }),

    resetStrategy: () => set({
        keyword: '',
        strategyTitle: '',
        strategyH1: '',
        strategySlug: '',
        strategyDesc: '',
        strategyExcerpt: '',
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

    loadTaskImages: async (taskId) => {
        const { supabase } = require('@/lib/supabase');
        const { data, error } = await supabase
            .from('task_images')
            .select('*')
            .eq('task_id', taskId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            set({ taskImages: data });
        }
    },
}));
