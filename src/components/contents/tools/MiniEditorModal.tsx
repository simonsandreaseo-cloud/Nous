"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { X, Edit3, Copy, Check, Trash2, Maximize2, Minimize2, Wand2, Loader2, AlertCircle } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';
import { Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, Quote } from 'lucide-react';
import { streamSurgicalEdit } from "@/lib/services/writer/ai-streaming";
import { cn } from "@/utils/cn";
import { getSharedExtensions } from "@/lib/tiptap-extensions";

interface MiniEditorModalProps {
    onClose: () => void;
}

export function MiniEditorModal({ onClose }: MiniEditorModalProps) {
    const [isCopied, setIsCopied] = useState(false);
    const [wordCount, setWordCount] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // AI Processing states
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash-gas");

    const extensions = useMemo(() => getSharedExtensions("Comienza a escribir aquí..."), []);

    const editor = useEditor({
        extensions,
        content: "<p></p>",
        onUpdate: ({ editor }) => {
            setWordCount(editor.storage.characterCount.words());
        },
        editorProps: {
            attributes: {
                class: cn(
                    "prose prose-sm md:prose-base prose-indigo focus:outline-none max-w-none text-slate-700 bg-white p-6 md:p-8 rounded-b-2xl border-t-0 shadow-inner overflow-y-auto",
                    isFullscreen ? "h-[calc(100vh-140px)]" : "min-h-[400px] max-h-[60vh]",
                    "prose-h1:text-3xl prose-h1:font-black prose-h1:text-slate-900 prose-h1:mb-6",
                    "prose-h2:text-2xl prose-h2:font-bold prose-h2:text-slate-800 prose-h2:mt-8 prose-h2:mb-4",
                    "prose-h3:text-xl prose-h3:font-bold prose-h3:text-indigo-900 prose-h3:mt-6 prose-h3:mb-3",
                    "prose-p:text-slate-600 prose-p:leading-relaxed prose-p:mb-4",
                    "prose-li:text-slate-600 prose-li:leading-relaxed prose-li:mb-1",
                    "prose-strong:text-slate-900 prose-strong:font-bold"
                ),
            },
        },
    });

    const handleCopy = () => {
        if (!editor) return;
        const html = editor.getHTML();
        navigator.clipboard.writeText(html);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleClear = () => {
        if (!editor) return;
        if (confirm("¿Estás seguro de que quieres limpiar el editor? Se perderá todo el texto.")) {
            editor.commands.setContent("");
        }
    };

    const handleSurgicalEdit = async () => {
        if (!editor || wordCount === 0) return;

        const currentHtml = editor.getHTML();
        setIsProcessing(true);
        setError(null);
        setStatusMessage("Iniciando edición quirúrgica...");

        try {
            const config = {
                instructions: "Mejora este texto, corrigiendo gramática, fluidez y claridad sin alterar el significado fundamental."
            };

            let modelToSend = selectedModel;
            let providerToSend: "google-ai-studio" | "vertex-ai" | undefined = undefined;
            if (selectedModel.endsWith("-vertex")) {
                modelToSend = selectedModel.slice(0, -7);
                providerToSend = "vertex-ai";
            } else if (selectedModel.endsWith("-gas")) {
                modelToSend = selectedModel.slice(0, -4);
                providerToSend = "google-ai-studio";
            }

            const result = await streamSurgicalEdit(
                currentHtml,
                config,
                50, // Default intensity
                (chunk) => {
                    editor.commands.setContent(chunk);
                },
                (status) => {
                    setStatusMessage(status);
                },
                modelToSend
            );

            if (result && result.html) {
                editor.commands.setContent(result.html);
            }
        } catch (err: any) {
            setError(err.message || "Ocurrió un error al procesar el texto.");
        } finally {
            setIsProcessing(false);
            setStatusMessage("");
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={!isProcessing ? onClose : undefined}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className={cn(
                    "relative w-full bg-slate-50 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300",
                    isFullscreen ? "max-w-none h-full" : "max-w-5xl"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Edit3 size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Mini Editor</h2>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                Editor de Texto Libre + IA
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            disabled={isProcessing}
                            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-50"
                            title={isFullscreen ? "Minimizar" : "Pantalla completa"}
                        >
                            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </button>
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors disabled:opacity-50"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between px-6 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                        <button disabled={isProcessing} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className={cn("p-2 rounded-lg transition-colors", editor?.isActive('heading', { level: 1 }) ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-200")}><Heading1 size={18} /></button>
                        <button disabled={isProcessing} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={cn("p-2 rounded-lg transition-colors", editor?.isActive('heading', { level: 2 }) ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-200")}><Heading2 size={18} /></button>
                        <button disabled={isProcessing} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} className={cn("p-2 rounded-lg transition-colors", editor?.isActive('heading', { level: 3 }) ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-200")}><Heading3 size={18} /></button>
                        <div className="w-[1px] h-6 bg-slate-300 mx-2" />
                        <button disabled={isProcessing} onClick={() => editor?.chain().focus().toggleBold().run()} className={cn("p-2 rounded-lg transition-colors", editor?.isActive('bold') ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-200")}><Bold size={18} /></button>
                        <button disabled={isProcessing} onClick={() => editor?.chain().focus().toggleItalic().run()} className={cn("p-2 rounded-lg transition-colors", editor?.isActive('italic') ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-200")}><Italic size={18} /></button>
                        <button disabled={isProcessing} onClick={() => editor?.chain().focus().toggleStrike().run()} className={cn("p-2 rounded-lg transition-colors", editor?.isActive('strike') ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-200")}><Strikethrough size={18} /></button>
                        <div className="w-[1px] h-6 bg-slate-300 mx-2" />
                        <button disabled={isProcessing} onClick={() => editor?.chain().focus().toggleBulletList().run()} className={cn("p-2 rounded-lg transition-colors", editor?.isActive('bulletList') ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-200")}><List size={18} /></button>
                        <button disabled={isProcessing} onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={cn("p-2 rounded-lg transition-colors", editor?.isActive('orderedList') ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-200")}><ListOrdered size={18} /></button>
                        <button disabled={isProcessing} onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={cn("p-2 rounded-lg transition-colors", editor?.isActive('blockquote') ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-200")}><Quote size={18} /></button>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:inline-block">
                            Palabras: <span className="text-slate-700">{wordCount}</span>
                        </span>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="px-6 py-3 bg-red-50 text-red-600 text-sm font-medium border-b border-red-100 flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 relative bg-white flex flex-col min-h-0">
                    <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
                    
                    {isProcessing && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
                            <Loader2 size={32} className="text-indigo-500 animate-spin" />
                            <span className="text-sm font-bold text-slate-600 animate-pulse">
                                {statusMessage || "Procesando..."}
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleClear}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                        >
                            <Trash2 size={16} />
                            Limpiar
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            disabled={isProcessing}
                            className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                        >
                            <option value="gemini-3.5-flash-gas">Gemini 3.5 Flash (GAS)</option>
                            <option value="gemini-3.5-flash-vertex">Gemini 3.5 Flash (Vertex)</option>
                            <option value="gemini-3-flash-vertex">Gemini 3 Flash (Vertex)</option>
                            <option value="gemini-3.1-pro-preview-vertex">Gemini 3.1 Pro (Vertex)</option>
                            <option value="gemini-3.1-flash-lite-preview-gas">Gemini 3.1 Flash Lite (GAS)</option>
                            <option value="gemini-3.1-flash-lite-preview-vertex">Gemini 3.1 Flash Lite (Vertex)</option>
                            <option value="gemma-4-31b-it">Gemma 4 31B IT</option>
                            <option value="gemma-4-26b-a4b-it">Gemma 4 26B IT</option>
                        </select>

                        <button
                            onClick={handleSurgicalEdit}
                            disabled={isProcessing || wordCount === 0}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-100 text-indigo-700 rounded-xl font-bold hover:bg-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            <Wand2 size={16} />
                            {isProcessing ? "Editando..." : "Edición Quirúrgica"}
                        </button>

                        <button
                            onClick={handleCopy}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                        >
                            {isCopied ? <Check size={18} /> : <Copy size={18} />}
                            {isCopied ? "¡Copiado!" : "Copiar HTML"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
