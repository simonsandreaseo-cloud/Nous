"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { X, Wand2, Loader2, AlertCircle } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import { streamMiniHumanize } from "@/lib/services/writer/ai-streaming";
import { cn } from "@/utils/cn";
import { getSharedExtensions } from "@/lib/tiptap-extensions";

interface MiniHumanizerModalProps {
    onClose: () => void;
}

const MAX_WORDS = 500;

export function MiniHumanizerModal({ onClose }: MiniHumanizerModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [wordCount, setWordCount] = useState(0);
    const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash");
    const [mode, setMode] = useState("standard");

    const extensions = useMemo(() => getSharedExtensions("Pega tu texto aquí..."), []);

    const editor = useEditor({
        extensions,
        content: "<p>Pega tu texto aquí...</p>",
        onUpdate: ({ editor }) => {
            setWordCount(editor.storage.characterCount.words());
        },
        editorProps: {
            attributes: {
                class: cn(
                    "prose prose-sm prose-indigo focus:outline-none max-w-none min-h-[300px] text-slate-700 bg-white p-6 rounded-xl border border-slate-200 shadow-inner",
                    "prose-h1:text-3xl prose-h1:font-black prose-h1:text-slate-900 prose-h1:mb-6",
                    "prose-h2:text-2xl prose-h2:font-black prose-h2:text-slate-800 prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-100",
                    "prose-h3:text-xl prose-h3:font-bold prose-h3:text-indigo-900 prose-h3:mt-6 prose-h3:mb-3",
                    "prose-p:text-slate-600 prose-p:leading-relaxed prose-p:mb-4",
                    "prose-li:text-slate-600 prose-li:leading-relaxed prose-li:mb-1",
                    "prose-strong:text-slate-900 prose-strong:font-bold"
                ),
            },
        },
    });

    const isOverLimit = wordCount > MAX_WORDS;

    const handleHumanize = async () => {
        if (!editor || isOverLimit || wordCount === 0) return;

        const currentHtml = editor.getHTML();
        setIsProcessing(true);
        setError(null);
        setStatusMessage("Iniciando...");

        try {
            const config = {
                niche: "General", // Default config for minitool
                audience: "General",
                language: "es", // Enforce spanish by default
            };

            if (mode === 'lipograma') {
                let stepHtml = currentHtml;
                
                setStatusMessage("Iniciando Capa 1/3 (Esqueleto)...");
                const result1 = await streamMiniHumanize(
                    stepHtml, config, 50, () => {}, setStatusMessage, selectedModel, 'lipograma_1'
                );
                if (result1 && result1.html) {
                    editor.commands.setContent(result1.html);
                    stepHtml = result1.html;
                }

                setStatusMessage("Iniciando Capa 2/3 (Anomalías)...");
                const result2 = await streamMiniHumanize(
                    stepHtml, config, 50, () => {}, setStatusMessage, selectedModel, 'lipograma_2'
                );
                if (result2 && result2.html) {
                    editor.commands.setContent(result2.html);
                    stepHtml = result2.html;
                }

                setStatusMessage("Iniciando Capa 3/3 (Cierre)...");
                const result3 = await streamMiniHumanize(
                    stepHtml, config, 50, () => {}, setStatusMessage, selectedModel, 'lipograma_3'
                );
                if (result3 && result3.html) {
                    editor.commands.setContent(result3.html);
                }
        } else if (mode === 'babel') {
            let stepHtml = currentHtml;
            const steps = [
                { mode: 'babel_1', msg: "Capa 1/5: Traduciendo al Alemán (Estructurando)..." },
                { mode: 'babel_2', msg: "Capa 2/5: Traduciendo al Japonés (Invirtiendo)..." },
                { mode: 'babel_3', msg: "Capa 3/5: Traduciendo al Ruso (Declinando)..." },
                { mode: 'babel_4', msg: "Capa 4/5: Traduciendo al Chino (Aislando)..." },
                { mode: 'babel_5', msg: "Capa 5/5: Recuperando al Español (Cierre)..." }
            ];

            for (const s of steps) {
                setStatusMessage(s.msg);
                const result = await streamMiniHumanize(
                    stepHtml, config, 50, () => {}, setStatusMessage, selectedModel, s.mode
                );
                if (result && result.html) {
                    editor.commands.setContent(result.html);
                    stepHtml = result.html;
                }
            }
        } else {
                const result = await streamMiniHumanize(
                    currentHtml,
                    config,
                    50, // Default intensity
                    (chunk) => {
                        // Reemplazo directo al final
                    },
                    (status) => {
                        setStatusMessage(status);
                    },
                    selectedModel,
                    mode
                );

                if (result && result.html) {
                    editor.commands.setContent(result.html);
                }
            }
        } catch (err: any) {
            setError(err.message || "Ocurrió un error al procesar el texto.");
        } finally {
            setIsProcessing(false);
            setStatusMessage("");
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={!isProcessing ? onClose : undefined}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-3xl bg-slate-50 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                            <Wand2 size={18} className="text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight">Mini Humanizador</h2>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                Herramienta Rápida
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col gap-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="relative">
                        <EditorContent editor={editor} />
                        
                        {isProcessing && (
                            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3">
                                <Loader2 size={32} className="text-amber-500 animate-spin" />
                                <span className="text-sm font-bold text-slate-600 animate-pulse">
                                    {statusMessage || "Procesando..."}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Footer / Controls */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className={cn(
                                "text-xs font-bold uppercase tracking-widest",
                                isOverLimit ? "text-red-500" : "text-slate-400"
                            )}>
                                Palabras: {wordCount} / {MAX_WORDS}
                            </span>
                            {isOverLimit && (
                                <span className="text-xs text-red-500 font-medium">
                                    Límite excedido. Reduce el texto para continuar.
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <select
                                value={mode}
                                onChange={(e) => setMode(e.target.value)}
                                disabled={isProcessing}
                                className="text-xs font-medium text-slate-600 bg-slate-100 border-none rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                            >
                                <option value="standard">Estándar</option>
                                <option value="lipograma">Lipograma Positivo (Cascada)</option>
                                <option value="babel">Torre de Babel (Traducción Inversa)</option>
                                <option value="legacy_json">Diccionario JSON (Legacy)</option>
                            </select>

                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                disabled={isProcessing}
                                className="text-xs font-medium text-slate-600 bg-slate-100 border-none rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                            >
                                <option value="gemini-3.5-flash">Gemini 3.5 Flash (Vertex)</option>
                                <option value="gemma-4-31b-it">Gemma 4 31B IT</option>
                                <option value="gemma-4-26b-a4b-it">Gemma 4 26B 24A IT</option>
                                <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite</option>
                            </select>

                            <button
                                onClick={handleHumanize}
                                disabled={isProcessing || isOverLimit || wordCount === 0}
                                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-slate-900/10"
                            >
                                <Wand2 size={16} />
                                {isProcessing ? "Humanizando..." : "Humanizar Texto"}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
