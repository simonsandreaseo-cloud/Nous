"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useWriterStore } from '@/store/useWriterStore';
import { useAppStore } from '@/store/useAppStore';
import { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function NeuralWriter() {
    const { content, setContent, title, setTitle, isSaving, setSaving } = useWriterStore();
    const setMode = useAppStore((state) => state.setMode);

    useEffect(() => {
        setMode('writer');
    }, [setMode]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Transmit thoughts...',
            }),
        ],
        content: content,
        onUpdate: ({ editor }) => {
            setContent(editor.getHTML());
            // Simulate save delay
            setSaving(true);
            setTimeout(() => setSaving(false), 800);
        },
        editorProps: {
            attributes: {
                class: 'prose prose-invert prose-lg max-w-none focus:outline-none min-h-[500px] text-gray-300 font-light',
            },
        },
    });

    // Sync content from store if it changes externally (e.g. AI generation)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full h-full max-w-4xl mx-auto p-8 pt-24"
        >
            {/* Holographic Header */}
            <div className="mb-12 flex items-center justify-between border-b border-cyan-500/20 pb-4">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Neural Session Title"
                    className="bg-transparent text-4xl font-thin text-cyan-50 focus:outline-none w-full placeholder-cyan-500/10 tracking-tight"
                />
                <div className="flex items-center space-x-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)]' : 'bg-cyan-500/50'}`} />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-500/40">
                        {isSaving ? 'SYNCING' : 'STABLE'}
                    </span>
                </div>
            </div>

            {/* Editor Zone */}
            <div className="relative group">
                <EditorContent editor={editor} />
            </div>
        </motion.div>
    );
}
