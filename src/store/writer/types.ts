import { ContentItem, SEOAnalysisResult } from '@/lib/services/writer/types';

export type WriterViewMode = 'dashboard' | 'setup' | 'workspace' | 'seo-review' | 'structure-review';
export type SidebarTab = 'assistant' | 'generate' | 'seo' | 'research' | 'humanize' | 'media' | 'history' | 'export' | 'tools' | 'translate';

export interface StrategyOutlineItem {
    type: string;
    text: string;
    wordCount: string;      
    currentWordCount?: number; 
    notes?: string;
}

export interface DebugPrompt {
    phase: string;
    prompt: string;
    response?: string;
    timestamp: string;
}

export interface HumanizerConfig {
    niche?: string;
    audience?: string;
    notes?: string;
}

/**
 * Combined State Interface
 * This will be used by slices to know about the full store shape.
 */
export interface WriterStoreState {
    // Content
    content: string;
    title: string;
    keyword: string;
    draftId: string | null;
    linkedTaskId: string | null;
    linkedTaskTitle: string | null;
    projectId: string | null;
    isRefreshingLinks: boolean;

    // UI
    viewMode: WriterViewMode;
    activeSidebarTab: SidebarTab;
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
    isConsoleOpen: boolean;
    debugPrompts: DebugPrompt[];

    // Research
    isResearching: boolean;
    researchProgress: number;
    researchPhaseId: string;
    researchTopic: string;
    researchMode: 'rapid' | 'quality';
    model: string;
    csvData: ContentItem[];
    csvFileName: string | null;
    projectName: string;
    rawSeoData: SEOAnalysisResult | null;
    seoResults: any;
    researchDossier: any;
    outlineStructure: any;

    // Strategy
    strategyTitle: string;
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
    strategyLSI: { keyword: string; count: string | number; relevance?: number }[];
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
    metadata: any;

    // Collaboration
    activeUsers: Record<string, { name: string; photo: string; color: string }>;
    isRemoteUpdate: boolean;

    // Persistence
    projectContents: any[];
    humanizerConfig: HumanizerConfig;
    humanizerStatus: string;
    refinementInstructions: string;
    editor: any | null;
    isSidebarOpen: boolean;
    strategyDensity: number;
    editorTab: 'visual' | 'code';
    wordCountReal: number;
    
    // Link Master Engine
    nousExtractorFindings: Record<string, any[]>;
    patcherFindings: Record<string, any[]>;

    // IMAGENESIA 
    taskImages: any[];

    // MULTI-LANGUAGE VERSIONS
    currentLanguage: string;
    parentTaskId: string | null;
    contentVersions: Record<string, string>; // langCode -> taskUuid

    // UI - Dual Mode & Resizable
    redactorUI: 'zen' | 'standard';
    leftSidebarWidth: number;
    rightSidebarWidth: number;
    isToolboxOpen: boolean;
}
