import { create } from 'zustand';
import { createUiSlice, UiSlice } from './writer/ui-slice';
import { createContentSlice, ContentSlice } from './writer/content-slice';
import { createStrategySlice, StrategySlice } from './writer/strategy-slice';
import { createConfigSlice, ConfigSlice } from './writer/config-slice';
import { createPersistenceSlice, PersistenceSlice } from './writer/persistence-slice';

/**
 * useWriterStore - Refactored Mega-Store
 * 
 * This store is now composed of specialized slices for better maintainability:
 * - UiSlice: View modes, status messages, progresses, and debug logs.
 * - ContentSlice: Core article content, titles, and basic draft metadata.
 * - StrategySlice: SEO results, LSI keywords, content outlines, and interlinking.
 * - ConfigSlice: AI models, humanizer configs, and strict mode settings.
 * - PersistenceSlice: Supabase sync, task initialization, and loading logic.
 * 
 * @GentlemanAI: "La arquitectura es el arte de separar lo que cambia por 
 * razones diferentes. Hemos fragmentado el monolito."
 */

export type WriterStore = UiSlice & ContentSlice & StrategySlice & ConfigSlice & PersistenceSlice;

export const useWriterStore = create<WriterStore>()((set, get, api) => {
    const customSet: typeof set = (partial, replace) => {
        const p = typeof partial === 'function' ? (partial as Function)(get()) : partial;
        if (p && 'strategyOutline' in p) {
            const out = p.strategyOutline;
            if (out && out.length === 0) {
                const stack = new Error().stack;
                p.debugLastEmptyStack = stack;
            }
        }
        return set(p, replace);
    };
    
    return {
        ...createUiSlice(customSet, get, api),
        ...createContentSlice(customSet, get, api),
        ...createStrategySlice(customSet, get, api),
        ...createConfigSlice(customSet, get, api),
        ...createPersistenceSlice(customSet, get, api),
    };
});

// Export types for use in components if needed
export type { WriterViewMode, SidebarTab, StrategyOutlineItem } from './writer/types';
export type { WriterStoreState } from './writer/types';
