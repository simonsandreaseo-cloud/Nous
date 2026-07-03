"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { X, Wand2, Loader2, AlertCircle } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import { streamHumanize } from "@/lib/services/writer/ai-streaming";
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

    const extensions = useMemo(() => getSharedExtensions("Pega tu texto aquí..."), []);

    const editor = useEditor({
        extensions,
        content: "<p>Pega tu texto aquí...</p>",
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none focus:outline-none min-h-[300px] text-slate-700 bg-white p-4 rounded-xl border border-slate-200",
            },
        },
    });

    const wordCount = editor?.storage.characterCount.words() || 0;
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

            const result = await streamHumanize(
                currentHtml,
                config,
                50, // Default intensity
                (chunk) => {
                    // Reemplazo directo al final
                },
                (status) => {
                    setStatusMessage(status);
                }
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
            </motion.div>
        </div>
    );
}
