import { StateCreator } from 'zustand';
import { WriterStoreState, HumanizerConfig } from './types';

export interface ConfigActions {
    setModel: (model: string) => void;
    setResearchMode: (mode: 'rapid' | 'quality') => void;
    updateHumanizerConfig: (config: Partial<HumanizerConfig>) => void;
    setHumanizerStatus: (status: string) => void;
    setRefinementInstructions: (instructions: string) => void;
    setContextInstructions: (instructions: string) => void;
    setIsStrictMode: (isStrict: boolean) => void;
    setStrictFrequency: (freq: number) => void;
    setMetadata: (metadata: any) => void;
}

export type ConfigSlice = WriterStoreState & ConfigActions;

export const createConfigSlice: StateCreator<ConfigSlice, [], [], ConfigSlice> = (set) => ({
    // Initial State
    model: 'gemini-3.1-flash',
    researchMode: 'quality',
    humanizerConfig: {
        niche: 'General',
        audience: 'General',
        notes: '',
    },
    humanizerStatus: '',
    refinementInstructions: '',
    contextInstructions: '',
    isStrictMode: false,
    strictFrequency: 30,
    metadata: null,

    // Actions
    setModel: (model) => set({ model }),
    setResearchMode: (researchMode) => set({ researchMode }),
    updateHumanizerConfig: (config) => set((state) => ({
        humanizerConfig: { ...state.humanizerConfig, ...config }
    })),
    setHumanizerStatus: (humanizerStatus) => set({ humanizerStatus }),
    setRefinementInstructions: (refinementInstructions) => set({ refinementInstructions }),
    setContextInstructions: (contextInstructions) => set({ contextInstructions }),
    setIsStrictMode: (isStrictMode) => set({ isStrictMode }),
    setStrictFrequency: (strictFrequency) => set({ strictFrequency }),
    setMetadata: (metadata) => set({ metadata }),
} as any);
