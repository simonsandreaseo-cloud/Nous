'use client';

import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { useWriterStore } from '@/store/useWriterStore';
import { useEffect, useState } from 'react';
import {
    Bold, Italic, Strikethrough, Code, Quote, List, ListOrdered,
    Heading1, Heading2, Heading3
} from 'lucide-react';
import { cn } from '@/utils/cn';
import SlashMenu from './SlashMenu';

export default function WriterEditor() {
    const { content, setContent, isGenerating } = useWriterStore();
    const [slashMenuPos, setSlashMenuPos] = useState<{ x: number, y: number } | null>(null);
    const [activeTab, setActiveTab] = useState<'visual' | 'html'>('visual');

    const editor = useEditor({
        extensions: [
            StarterKit,
            Typography,
            Placeholder.configure({
                placeholder: 'Escribe algo increíble... (Teclea "/" para comandos)',
            }),
        ],
        content: content,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'prose prose-lg prose-indigo focus:outline-none max-w-none min-h-[500px] pb-32 transition-all duration-500',
            },
        },
        onUpdate: ({ editor }) => {
            // Only update store from editor if NOT generating
            if (!isGenerating) {
                setContent(editor.getHTML());
            }

            // Simple Slash Detection optimizing Keystroke performance
            const { state } = editor;
            const selection = state.selection;
            
            // Only run the check if selection is empty (cursor point) to save performance
            if (selection.empty) {
                const { $from } = selection;
                const textBefore = $from.parent.textContent.substring(0, $from.parentOffset);
                if (textBefore.endsWith('/')) {
                    const coords = editor.view.coordsAtPos($from.pos);
                    setSlashMenuPos({ x: coords.left, y: coords.bottom });
                } else if (slashMenuPos && textBefore.trim().length > 0) {
                    // Cierra el menu si el caracter no es '/' y hay texto
                    setSlashMenuPos(null);
                }
            } else if (slashMenuPos) {
                 setSlashMenuPos(null);
            }
        },
    });

    // Handle Slash Commands
    const handleSlashCommand = (commandId: string) => {
        if (!editor) return;
        editor.commands.deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from });

        switch (commandId) {
            case 'h1': editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
            case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
            case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
            case 'bullet': editor.chain().focus().toggleBulletList().run(); break;
            case 'ordered': editor.chain().focus().toggleOrderedList().run(); break;
            case 'quote': editor.chain().focus().toggleBlockquote().run(); break;
            case 'ai-write':
                // This will be handled in the future or via store
                break;
        }
        setSlashMenuPos(null);
    };

    // Sync content if changed externally (e.g. streaming or reset)
    // Usamos debounce o comparaciones directas para evitar re-posicionar el cursor constantemente
    useEffect(() => {
        if (!editor) return;
        
        const currentHtml = editor.getHTML();
        if (content !== currentHtml) {
            // Solo actualizamos programáticamente si estamos en modo generación/streaming
            // O si el contenido viene nuevo y necesitamos forzar carga inicial
            if (isGenerating || !editor.isFocused) {
               const { from, to } = editor.state.selection;
               editor.commands.setContent(content, false);
               
               // Restore selection on streaming quietly if the update wasn't manual typed
               if (!isGenerating && editor.isFocused) {
                   editor.commands.setTextSelection({ from, to });
               }
            }
        }
    }, [content, editor, isGenerating]);


    if (!editor) return null;

    return (
        <div className="relative w-full max-w-4xl mx-auto py-12 px-6 md:px-12">
            
            {/* TAB SWITCHER */}
            <div className="flex items-center gap-1 mb-8 p-1 bg-slate-100 rounded-xl w-fit mx-auto shadow-inner border border-slate-200/50">
                <button 
                    onClick={() => setActiveTab('visual')}
                    className={cn(
                        "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                        activeTab === 'visual' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    Visual
                </button>
                <button 
                    onClick={() => setActiveTab('html')}
                    className={cn(
                        "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                        activeTab === 'html' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    Código HTML
                </button>
            </div>

            <div className={cn(activeTab !== 'visual' && 'hidden')}>
                <SlashMenu
                    position={slashMenuPos}
                    onSelect={handleSlashCommand}
                    onClose={() => setSlashMenuPos(null)}
                />

                {/* BUBBLE MENU (Selection) */}
                {editor && (
                    <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
                        <div className="flex items-center gap-1 bg-white shadow-xl border border-slate-200 rounded-lg p-1">
                            <button
                                onClick={() => editor.chain().focus().toggleBold().run()}
                                className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('bold') && 'bg-slate-200 text-slate-900')}
                            >
                                <Bold size={16} />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                                className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('italic') && 'bg-slate-200 text-slate-900')}
                            >
                                <Italic size={16} />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleStrike().run()}
                                className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('strike') && 'bg-slate-200 text-slate-900')}
                            >
                                <Strikethrough size={16} />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleCode().run()}
                                className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('code') && 'bg-slate-200 text-slate-900')}
                            >
                                <Code size={16} />
                            </button>
                        </div>
                    </BubbleMenu>
                )}

                {/* FLOATING MENU (Empty Line) */}
                {editor && (
                    <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }}>
                        <div className="flex items-center gap-1 bg-white shadow-xl border border-slate-200 rounded-lg p-1">
                            <button
                                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                                className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('heading', { level: 1 }) && 'bg-slate-200 text-slate-900')}
                            >
                                <Heading1 size={16} />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                                className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('heading', { level: 2 }) && 'bg-slate-200 text-slate-900')}
                            >
                                <Heading2 size={16} />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                                className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('heading', { level: 3 }) && 'bg-slate-200 text-slate-900')}
                            >
                                <Heading3 size={16} />
                            </button>
                            <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                            <button
                                onClick={() => editor.chain().focus().toggleBulletList().run()}
                                className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('bulletList') && 'bg-slate-200 text-slate-900')}
                            >
                                <List size={16} />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('orderedList') && 'bg-slate-200 text-slate-900')}
                            >
                                <ListOrdered size={16} />
                            </button>
                            <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                            <button
                                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                                className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('blockquote') && 'bg-slate-200 text-slate-900')}
                            >
                                <Quote size={16} />
                            </button>
                        </div>
                    </FloatingMenu>
                )}

                <EditorContent editor={editor} />
            </div>

            <div className={cn("relative animate-in fade-in duration-300", activeTab !== 'html' && 'hidden')}>
                <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full min-h-[600px] p-6 bg-slate-900 text-emerald-400 font-mono text-sm rounded-2xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 selection:bg-indigo-500/30 custom-scrollbar resize-none"
                    spellCheck={false}
                />
                <div className="absolute top-4 right-4 bg-slate-800 text-[10px] text-slate-400 px-2 py-1 rounded border border-slate-700 font-bold tracking-widest uppercase">
                    Modo Código
                </div>
            </div>
        </div>
    );
}
