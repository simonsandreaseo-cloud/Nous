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

export const useWriterStore = create<WriterStore>()((...a) => ({
    ...createUiSlice(...a),
    ...createContentSlice(...a),
    ...createStrategySlice(...a),
    ...createConfigSlice(...a),
    ...createPersistenceSlice(...a),
}));

// Export types for use in components if needed
export type { WriterViewMode, SidebarTab, StrategyOutlineItem } from './writer/types';
export type { WriterStoreState } from './writer/types';
