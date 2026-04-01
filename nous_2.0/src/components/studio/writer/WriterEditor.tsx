'use client';
import { motion, AnimatePresence } from "framer-motion";

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
    const [isOrbOpen, setIsOrbOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'visual' | 'html'>('visual');

    const editor = useEditor({
        extensions: [
            StarterKit,
            Typography,
            Placeholder.configure({
                placeholder: 'Escribe algo increíble... (Teclea "/nous" para llamar a la IA o "/" para comandos)',
            }),
        ],
        content: content,
        immediatelyRender: false,
        editorProps: {
            attributes: {

                class: 'prose prose-lg prose-indigo focus:outline-none max-w-none min-h-[700px] pb-32 transition-all duration-500 mx-auto ' +
                       'prose-h1:text-4xl prose-h1:font-black prose-h1:text-slate-800 prose-h1:mb-8 prose-h1:tracking-tight ' +
                       'prose-h2:text-2xl prose-h2:font-extrabold prose-h2:text-slate-800 prose-h2:mt-12 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-100 ' +
                       'prose-h3:text-xl prose-h3:font-bold prose-h3:text-indigo-900 prose-h3:mt-8 prose-h3:mb-3 ' +
                       'prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-[17px] ' +
                       'prose-a:text-indigo-600 prose-a:font-bold prose-a:no-underline hover:prose-a:underline ' +
                       'prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50/50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic prose-blockquote:text-indigo-900',

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
                editor.commands.insertContent(" *[AI Generando...]* ");
                break;
            case 'ai-nous':
                const prompt = window.prompt("¿Qué deseas que redacte Nous?");
                if (prompt) {
                     editor.commands.insertContent(`\n**[Nous]:** *Generando respuesta para "${prompt}"...*\n`);
                }
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
            <div className="flex items-center gap-1 mb-10 p-1.5 bg-slate-50 rounded-2xl w-fit mx-auto shadow-inner border border-slate-100/80">
                <button 
                    onClick={() => setActiveTab('visual')}
                    className={cn(
                        "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'visual' ? "bg-white text-indigo-600 shadow-sm border border-slate-100/50" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    VISUAL
                </button>
                <button 
                    onClick={() => setActiveTab('html')}
                    className={cn(
                        "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'html' ? "bg-white text-indigo-600 shadow-sm border border-slate-100/50" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    Código CÓDIGO HTML
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
                </div>

            {/* AGENTE NOUS - ORBE FLOTANTE Y MENÚ */}
            <div className="fixed bottom-8 right-8 z-[100]">
                {/* Menú Contextual (Popover) */}
                <AnimatePresence>
                    {isOrbOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute bottom-20 right-0 w-[320px] bg-white/95 backdrop-blur-xl border border-slate-200 rounded-[28px] shadow-2xl overflow-hidden"
                        >
                            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <div>
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Agente Nous</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Configuración de Escritura IA</p>
                                </div>
                                <button onClick={() => setIsOrbOpen(false)} className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                </button>
                            </div>

                            <div className="p-5 space-y-5">
                                {/* Tono de Voz */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tono de Voz</label>
                                    <select className="w-full text-[12px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400">
                                        <option>Profesional</option>
                                        <option>Casual</option>
                                        <option>Académico</option>
                                        <option>Persuasivo</option>
                                        <option>Humorístico</option>
                                    </select>
                                </div>

                                {/* Palabras Objetivo */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Longitud Objetivo</label>
                                    <select className="w-full text-[12px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400">
                                        <option>Corta (~800 palabras)</option>
                                        <option>Estándar (~1500 palabras)</option>
                                        <option>Larga (~2500 palabras)</option>
                                        <option>Pilar ({">3500"} palabras)</option>
                                    </select>
                                </div>

                                {/* Nivel de Creatividad */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center justify-between">
                                        <span>Creatividad</span>
                                        <span className="text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">Equilibrada</span>
                                    </label>
                                    <input type="range" min="1" max="100" defaultValue="50" className="w-full accent-indigo-500" />
                                    <div className="flex justify-between text-[9px] font-bold text-slate-300 uppercase tracking-wider mt-2">
                                        <span>Mín.</span>
                                        <span>Max.</span>
                                    </div>
                                </div>

                                <button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl py-3 font-black text-[11px] uppercase tracking-widest hover:shadow-lg hover:shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                    Generar Artículo Completo
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Botón Orbe */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse" />
                    <button
                        onClick={() => setIsOrbOpen(!isOrbOpen)}
                        className={cn("relative w-16 h-16 backdrop-blur-xl border border-indigo-100 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500", isOrbOpen ? "bg-white scale-95" : "bg-white/80 hover:scale-105 active:scale-95")}
                    >
                        <div className={cn("bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center relative overflow-hidden transition-all duration-500", isOrbOpen ? "w-12 h-12" : "w-10 h-10")}>
                            <div className="absolute inset-0 bg-white/20 w-full h-full animate-[spin_4s_linear_infinite]" />
                            <span className="text-white font-black relative z-10 transition-all duration-500" style={{ fontSize: isOrbOpen ? '18px' : '12px' }}>{isOrbOpen ? "✕" : "N"}</span>
                        </div>
                    </button>
                    {!isOrbOpen && (
                        <div className="absolute -top-12 right-0 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            Agente Nous
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}