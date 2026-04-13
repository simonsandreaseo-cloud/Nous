import { StateCreator } from 'zustand';
import { WriterStoreState, WriterViewMode, SidebarTab, DebugPrompt } from './types';

export interface UiActions {
    setViewMode: (mode: WriterViewMode) => void;
    setSidebarTab: (tab: SidebarTab) => void;
    setStatus: (msg: string) => void;
    setSaving: (isSaving: boolean) => void;
    setCheckSaving: (isCheckSaving: boolean) => void;
    setGenerating: (isGenerating: boolean) => void;
    setAnalyzingSEO: (isAnalyzingSEO: boolean) => void;
    setPlanningStructure: (isPlanningStructure: boolean) => void;
    setHumanizing: (isHumanizing: boolean) => void;
    setExporting: (isExporting: boolean) => void;
    setRefining: (isRefining: boolean) => void;
    setHasGenerated: (has: boolean) => void;
    setHasHumanized: (has: boolean) => void;
    setDownloadProgress: (progress: number | null) => void;
    setIsConsoleOpen: (open: boolean) => void;
    addDebugPrompt: (phase: string, prompt: string, response?: string) => void;
    clearDebugPrompts: () => void;
    setActiveUsers: (users: Record<string, any>) => void;
    setEditor: (editor: any) => void;
    toggleSidebar: () => void;
    setEditorTab: (tab: 'visual' | 'code') => void;
    setNousExtractorFindings: (findings: Record<string, any[]>) => void;
    setPatcherFindings: (findings: Record<string, any[]>) => void;
}


export type UiSlice = WriterStoreState & UiActions;

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set) => ({
    // Initial State
    viewMode: 'dashboard',
    activeSidebarTab: 'assistant',
    statusMessage: '',
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
    downloadProgress: null,
    isConsoleOpen: false,
    debugPrompts: [],
    activeUsers: {},
    isSidebarOpen: true,
    editor: null,
    editorTab: 'visual',
    nousExtractorFindings: {},
    patcherFindings: {},


    // Actions
    setViewMode: (viewMode) => set({ viewMode }),
    setSidebarTab: (activeSidebarTab) => set({ activeSidebarTab }),
    setStatus: (statusMessage) => set({ statusMessage }),
    setSaving: (isSaving) => set({ isSaving }),
    setCheckSaving: (isCheckSaving) => set({ isCheckSaving }),
    setGenerating: (isGenerating) => set({ isGenerating }),
    setAnalyzingSEO: (isAnalyzingSEO) => set({ isAnalyzingSEO }),
    setPlanningStructure: (isPlanningStructure) => set({ isPlanningStructure }),
    setHumanizing: (isHumanizing) => set({ isHumanizing }),
    setExporting: (isExporting) => set({ isExporting }),
    setRefining: (isRefining) => set({ isRefining }),
    setHasGenerated: (hasGenerated) => set({ hasGenerated }),
    setHasHumanized: (hasHumanized) => set({ hasHumanized }),
    setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
    setIsConsoleOpen: (isConsoleOpen) => set({ isConsoleOpen }),
    
    addDebugPrompt: (phase, prompt, response) => set((state) => ({
        debugPrompts: [
            { phase, prompt, response, timestamp: new Date().toLocaleTimeString() },
            ...state.debugPrompts
        ].slice(0, 50)
    })),
    
    clearDebugPrompts: () => set({ debugPrompts: [] }),

    setActiveUsers: (activeUsers) => set({ activeUsers }),
    setEditor: (editor) => set({ editor }),
    toggleSidebar: () => set((state: any) => ({ isSidebarOpen: !state.isSidebarOpen })),
    setEditorTab: (editorTab) => set({ editorTab }),
    setNousExtractorFindings: (nousExtractorFindings) => set({ nousExtractorFindings }),
    setPatcherFindings: (patcherFindings) => set({ patcherFindings }),
} as any);

