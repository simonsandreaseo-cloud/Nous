import { create } from 'zustand';

interface WriterState {
    content: string;
    title: string;
    isSaving: boolean;
    isGenerating: boolean;
    lastSaved: Date | null;

    setContent: (content: string) => void;
    setTitle: (title: string) => void;
    setSaving: (saving: boolean) => void;
    setGenerating: (generating: boolean) => void;
}

export const useWriterStore = create<WriterState>((set) => ({
    content: '',
    title: '',
    isSaving: false,
    isGenerating: false,
    lastSaved: null,

    setContent: (content) => set({ content, isSaving: true }), // Trigger save effect in component
    setTitle: (title) => set({ title }),
    setSaving: (isSaving) => set({ isSaving, lastSaved: isSaving ? null : new Date() }),
    setGenerating: (isGenerating) => set({ isGenerating })
}));
