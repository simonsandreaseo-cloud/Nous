import { StateCreator } from 'zustand';
import { WriterStoreState } from './types';

export interface ContentActions {
    setContent: (content: string) => void;
    setTitle: (title: string) => void;
    setKeyword: (keyword: string) => void;
    setDraftId: (draftId: string | null) => void;
    setLinkedTask: (linkedTaskId: string | null, linkedTaskTitle: string | null) => void;
    setProjectId: (projectId: string | null) => void;
    setIsRemoteUpdate: (isRemoteUpdate: boolean) => void;
    setWordCountReal: (count: number) => void;
    markAsReadyForReview: () => Promise<void>;
}

export type ContentSlice = WriterStoreState & ContentActions;

export const createContentSlice: StateCreator<ContentSlice, [], [], ContentSlice> = (set, get) => ({
    // Initial State
    content: '',
    title: '',
    keyword: '',
    draftId: null,
    linkedTaskId: null,
    linkedTaskTitle: null,
    projectId: null,
    isRefreshingLinks: false,
    isRemoteUpdate: false,
    wordCountReal: 0,

    // Actions
    setContent: (content) => set({ content }),
    setTitle: (title) => set({ title }),
    setKeyword: (keyword) => set({ keyword }),
    setDraftId: (draftId) => set({ draftId }),
    setLinkedTask: (linkedTaskId, linkedTaskTitle) => set({ linkedTaskId, linkedTaskTitle }),
    setProjectId: (projectId) => set({ projectId }),
    setIsRemoteUpdate: (isRemoteUpdate) => set({ isRemoteUpdate }),
    setWordCountReal: (wordCountReal) => set({ wordCountReal }),

    markAsReadyForReview: async () => {
        const { draftId, setStatus, setViewMode } = get() as any;
        if (!draftId) return;

        const { supabase } = await import('@/lib/supabase');
        const { error } = await supabase
            .from('tasks')
            .update({ status: 'por_corregir' })
            .eq('id', draftId);

        if (!error) {
            if (setStatus) setStatus('✅ Tarea enviada a Corrección');
            setTimeout(() => {
                if (setStatus) setStatus('');
                if (setViewMode) setViewMode('dashboard');
            }, 2000);
        } else {
            if (setStatus) setStatus('❌ Error: ' + error.message);
        }
    },
} as any);
