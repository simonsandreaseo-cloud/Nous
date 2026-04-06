'use client';
import { motion, AnimatePresence } from "framer-motion";

import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Link from '@tiptap/extension-link';
import { useWriterStore } from '@/store/useWriterStore';
import { useEffect, useState } from 'react';
import {
    Bold, Italic, Strikethrough, Code, Quote, List, ListOrdered,
    Heading1, Heading2, Heading3, Sparkles,
    CheckCircle2, Search, Layout, FileText, Zap, Loader2
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { StrategyOutlineItem } from '@/store/useWriterStore';
import SlashMenu from './SlashMenu';
import { useWriterActions } from './useWriterActions';

const StepIcon = ({ active, done, icon: Icon, label }: any) => (
    <div className="flex flex-col items-center gap-1 group/step relative">
        <div className={cn(
            "flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-500 border",
            active ? "bg-indigo-50 border-indigo-200 text-indigo-600 scale-110 shadow-sm shadow-indigo-100" : 
            done ? "bg-emerald-50 border-emerald-100 text-emerald-500" : 
            "bg-slate-50 border-slate-100 text-slate-300"
        )}>
            {done ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Icon size={13} className={cn(active && "animate-pulse")} />}
        </div>
        {/* Tooltip-like label */}
        <span className={cn(
            "absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/step:opacity-100 transition-opacity pointer-events-none",
            active ? "bg-indigo-600 text-white" : done ? "bg-emerald-600 text-white" : "bg-slate-800 text-white"
        )}>
            {label}
        </span>
    </div>
);

export default function WriterEditor() {
    const { 
        content, setContent, isGenerating, editorTab,
        strategyOutline, updateSectionProgress, setEditor,
        strategyDensity, setStrategyDensity, creativityLevel, setCreativityLevel,
        setSidebarTab, isPlanningStructure, isAnalyzingSEO,
        isHumanizing, humanizerConfig, updateHumanizerConfig, humanizerStatus,
        hasGenerated, hasHumanized, researchMode, setResearchMode,
        statusMessage, rawSeoData
    } = useWriterStore();
    const { handlePlanStructure, handleGenerate, handleHumanize } = useWriterActions();

    // Specific Status Logic
    const isPostProd = isGenerating && (
        statusMessage.toLowerCase().includes('vínculos') || 
        statusMessage.toLowerCase().includes('optimizando') || 
        statusMessage.toLowerCase().includes('interlinking') ||
        statusMessage.toLowerCase().includes('estilos')
    );
    const isDrafting = isGenerating && !isPostProd;

    const [slashMenuPos, setSlashMenuPos] = useState<{ x: number, y: number } | null>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Typography,
            Placeholder.configure({
                placeholder: 'Escribe algo increíble... (Teclea "/nous" para llamar a la IA o "/" para comandos)',
            }),
            Link.configure({
                openOnClick: true,
                autolink: true,
                defaultProtocol: 'https',
                HTMLAttributes: {
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    class: 'cursor-pointer'
                },
            }),
        ],
        content: content,
        immediatelyRender: false,
        editorProps: {
            attributes: {

                class: 'prose prose-lg prose-indigo focus:outline-none max-w-none min-h-[700px] pb-32 transition-all duration-500 mx-auto ' +
                       'prose-h1:text-5xl prose-h1:font-black prose-h1:text-slate-900 prose-h1:mb-10 prose-h1:tracking-tight prose-h1:leading-tight ' +
                       'prose-h2:text-3xl prose-h2:font-black prose-h2:text-slate-800 prose-h2:mt-16 prose-h2:mb-8 prose-h2:pb-4 prose-h2:border-b-2 prose-h2:border-slate-100 ' +
                       'prose-h3:text-2xl prose-h3:font-black prose-h3:text-indigo-900 prose-h3:mt-12 prose-h3:mb-6 ' +
                       'prose-p:text-slate-600 prose-p:leading-[1.9] prose-p:text-[18px] prose-p:mb-10 ' +
                       'prose-li:text-slate-600 prose-li:leading-relaxed prose-li:mb-2 ' +
                       'prose-strong:text-slate-900 prose-strong:font-black ' +
                       'prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50/30 prose-blockquote:py-4 prose-blockquote:px-8 prose-blockquote:rounded-r-3xl prose-blockquote:not-italic prose-blockquote:text-indigo-900 prose-blockquote:text-xl prose-blockquote:font-medium',

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

    // --- Sync editor instance with store ---
    useEffect(() => {
        if (editor) setEditor(editor);
        return () => { setEditor(null); };
    }, [editor, setEditor]);

    // Real-time section word count tracker (Sync with strategyOutline)
    // Batched update to avoid infinite loop / maximum update depth
    useEffect(() => {
        if (!editor || strategyOutline.length === 0) return;

        const text = editor.getText();
        let lastHeaderIdx = 0;
        let hasChanges = false;

        const newOutline = strategyOutline.map((item, index) => {
            const currentHeaderText = item.text.trim();
            const nextHeader = strategyOutline[index + 1];

            // Search for current header starting after the last one found to handle duplicates
            const startIdx = text.toLowerCase().indexOf(currentHeaderText.toLowerCase(), lastHeaderIdx);

            if (startIdx === -1) {
                if (item.currentWordCount !== 0) hasChanges = true;
                return { ...item, currentWordCount: 0 };
            }

            // Update last found index (plus length of header itself)
            const afterHeaderIdx = startIdx + currentHeaderText.length;
            lastHeaderIdx = afterHeaderIdx;

            // Find start of next section
            let endIdx = text.length;
            if (nextHeader) {
                const nextHeaderIdx = text.toLowerCase().indexOf(nextHeader.text.toLowerCase(), afterHeaderIdx);
                if (nextHeaderIdx !== -1) {
                    endIdx = nextHeaderIdx;
                    // Don't update lastHeaderIdx here, we'll do it in the next iteration
                }
            }

            const sectionContent = text.substring(afterHeaderIdx, endIdx).trim();
            const wordCount = sectionContent === '' ? 0 : sectionContent.split(/\s+/).length;

            if (item.currentWordCount !== wordCount) {
                hasChanges = true;
            }

            return { ...item, currentWordCount: wordCount };
        });

        // Only update store if there's an actual change to avoid loop
        if (hasChanges) {
            useWriterStore.getState().setStrategyOutline(newOutline);
        }
    }, [content, editor, strategyOutline]);

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
        <div className="relative w-full h-full flex flex-col">
            {/* VIEW MODE SWITCHER & NOUS STATUS - ALWAYS VISIBLE */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100/50 bg-white/40 mb-4 rounded-2xl">
                {/* NOUS ASSISTANT PROCESS INDICATOR */}
                <div className="flex-1 flex items-center justify-start">
                    <AnimatePresence>
                        {(isAnalyzingSEO || isPlanningStructure || isGenerating || isHumanizing) && (
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex items-center gap-3 px-3 py-1.5 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-sm"
                            >
                                {/* Small Orb */}
                                <div className="relative w-6 h-6 flex items-center justify-center">
                                    <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping" />
                                    <div className="relative w-4 h-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                                        <div className="w-full h-full absolute inset-0 bg-white/20 animate-[spin_2s_linear_infinite] rounded-full" />
                                        <span className="text-[7px] text-white font-black">N</span>
                                    </div>
                                </div>

                                <div className="flex flex-col min-w-[120px]">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600 leading-none">Agente Nous</span>
                                    <span className="text-[9px] text-slate-500 font-bold mt-1 truncate max-w-[220px]">
                                        {isHumanizing ? humanizerStatus : statusMessage || "Procesando..."}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-1">
                                    <StepIcon 
                                        active={isAnalyzingSEO} 
                                        done={!!rawSeoData && !isAnalyzingSEO} 
                                        icon={Search} 
                                        label="Investigación SEO" 
                                    />
                                    <StepIcon 
                                        active={isPlanningStructure} 
                                        done={strategyOutline.length > 0 && !isPlanningStructure} 
                                        icon={Layout} 
                                        label="Estructura Outline" 
                                    />
                                    <StepIcon 
                                        active={isDrafting} 
                                        done={(hasGenerated || isPostProd) && !isDrafting} 
                                        icon={FileText} 
                                        label="Redacción IA" 
                                    />
                                    <StepIcon 
                                        active={isPostProd} 
                                        done={hasGenerated && !isPostProd} 
                                        icon={Zap} 
                                        label="Post-Producción" 
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex items-center gap-1 p-0.5 bg-slate-100/50 border border-slate-200/40 rounded-lg shadow-sm">
                    <button 
                        onClick={() => useWriterStore.getState().setEditorTab('visual')}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                            editorTab === 'visual' ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        Visual
                    </button>
                    <button 
                        onClick={() => useWriterStore.getState().setEditorTab('code')}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                            editorTab === 'code' ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        Código
                    </button>
                </div>
            </div>

            <div className={cn("relative flex-1", editorTab !== 'visual' && 'hidden')}>
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

                <style>{`
                    .ProseMirror p { margin-bottom: 2rem !important; line-height: 1.9 !important; }
                    .ProseMirror h1 { margin-bottom: 2.5rem !important; font-weight: 900 !important; }
                    .ProseMirror h2 { margin-top: 4rem !important; margin-bottom: 2rem !important; font-weight: 900 !important; border-bottom: 2px solid #f1f5f9; padding-bottom: 1rem; color: #1e293b; }
                    .ProseMirror h3 { margin-top: 3rem !important; margin-bottom: 1rem !important; font-weight: 900 !important; color: #334155; }
                    .ProseMirror ul { list-style-type: disc !important; margin-bottom: 2rem !important; padding-left: 2rem !important; }
                    .ProseMirror ol { list-style-type: decimal !important; margin-bottom: 2rem !important; padding-left: 2rem !important; }
                    .ProseMirror li { margin-bottom: 0.75rem !important; line-height: 1.7 !important; color: #475569; }
                    .ProseMirror li strong { color: #0f172a; font-weight: 800; }
                    .ProseMirror strong { font-weight: 900 !important; color: #0f172a; }
                    .ProseMirror a { 
                        color: #2563eb !important; 
                        text-decoration: underline !important; 
                        text-underline-offset: 4px !important;
                        text-decoration-thickness: 2px !important;
                        font-weight: 700 !important;
                        transition: all 0.2s ease;
                    }
                    .ProseMirror a:hover { 
                        color: #1d4ed8 !important; 
                        background-color: #eff6ff;
                        text-decoration-thickness: 3px !important;
                    }
                `}</style>
                <EditorContent editor={editor} />
            </div>

            <div className={cn("relative animate-in fade-in duration-300", editorTab !== 'code' && 'hidden')}>
                <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full min-h-[600px] p-6 bg-slate-900 text-emerald-400 font-mono text-sm rounded-2xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 selection:bg-indigo-500/30 custom-scrollbar resize-none"
                    spellCheck={false}
                />
            </div>
        </div>
    );
}