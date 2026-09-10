"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wand2, Loader2, AlertCircle, SlidersHorizontal, Ban, RotateCcw } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import { streamMiniHumanize } from "@/lib/services/writer/ai-streaming";
import type { MiniHumanizerParams } from "@/lib/services/writer/types";
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
    const [selectedProvider, setSelectedProvider] = useState("google-ai-studio");
    const [reasoningLevel, setReasoningLevel] = useState("none");
    const [mode, setMode] = useState("standard");

    // Estados para Alteración de Parámetros
    const [customParamsEnabled, setCustomParamsEnabled] = useState(false);
    const [enableTemp, setEnableTemp] = useState(true);
    const [paramTemp, setParamTemp] = useState(1.0);
    const [enableTopP, setEnableTopP] = useState(true);
    const [paramTopP, setParamTopP] = useState(0.95);
    const [enableTopK, setEnableTopK] = useState(true);
    const [paramTopK, setParamTopK] = useState(40);
    const [enablePresencePenalty, setEnablePresencePenalty] = useState(false);
    const [paramPresencePenalty, setParamPresencePenalty] = useState(0.0);
    const [enableFrequencyPenalty, setEnableFrequencyPenalty] = useState(false);
    const [paramFrequencyPenalty, setParamFrequencyPenalty] = useState(0.0);

    // Detección de compatibilidad según el modelo seleccionado
    const capabilities = useMemo(() => {
        const isGemini3 = selectedModel.includes("3.") || selectedModel.includes("3-");
        const isGemma = selectedModel.includes("gemma");

        return {
            temperature: {
                supported: true,
                min: 0.0,
                max: 2.0,
                step: 0.05,
                default: 1.0,
                reason: undefined,
            },
            topP: {
                supported: true,
                min: 0.0,
                max: 1.0,
                step: 0.01,
                default: 0.95,
                reason: undefined,
            },
            topK: {
                supported: true,
                min: 1,
                max: isGemini3 ? 40 : (isGemma ? 64 : 100),
                step: 1,
                default: 40,
                reason: isGemini3 ? "Límite máx. 40 en Gemini 3.x" : undefined,
            },
            presencePenalty: {
                supported: !isGemini3 && !isGemma,
                min: -2.0,
                max: 2.0,
                step: 0.1,
                default: 0.0,
                reason: isGemini3 ? "No admitido en Gemini 3.x" : isGemma ? "No admitido en Gemma" : undefined,
            },
            frequencyPenalty: {
                supported: !isGemini3 && !isGemma,
                min: -2.0,
                max: 2.0,
                step: 0.1,
                default: 0.0,
                reason: isGemini3 ? "No admitido en Gemini 3.x" : isGemma ? "No admitido en Gemma" : undefined,
            },
        };
    }, [selectedModel]);

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
                    "prose prose-sm prose-indigo focus:outline-none max-w-none min-h-[260px] text-slate-700 bg-white p-6 rounded-xl border border-slate-200 shadow-inner",
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

    const resetToDefaults = () => {
        setParamTemp(1.0);
        setParamTopP(0.95);
        setParamTopK(40);
        setParamPresencePenalty(0.0);
        setParamFrequencyPenalty(0.0);
        setEnableTemp(true);
        setEnableTopP(true);
        setEnableTopK(true);
        setEnablePresencePenalty(false);
        setEnableFrequencyPenalty(false);
    };

    const handleHumanize = async () => {
        if (!editor || isOverLimit || wordCount === 0) return;

        const currentHtml = editor.getHTML();
        setIsProcessing(true);
        setError(null);
        setStatusMessage("Iniciando...");

        try {
            const config = {
                niche: "General",
                audience: "General",
                language: "es",
            };

            let modelToUse = selectedModel;
            let providerToUse: "google-ai-studio" | "vertex-ai" | undefined = selectedProvider as any;
            if (modelToUse.endsWith("-vertex")) {
                modelToUse = modelToUse.slice(0, -7);
                providerToUse = "vertex-ai";
            } else if (modelToUse.endsWith("-gas")) {
                modelToUse = modelToUse.slice(0, -4);
                providerToUse = "google-ai-studio";
            }

            // Construir parámetros personalizados si el modo está activo
            const customParams: MiniHumanizerParams | undefined = customParamsEnabled ? {
                ...(enableTemp && capabilities.temperature.supported ? { temperature: paramTemp } : {}),
                ...(enableTopP && capabilities.topP.supported ? { topP: paramTopP } : {}),
                ...(enableTopK && capabilities.topK.supported ? { topK: Math.min(paramTopK, capabilities.topK.max) } : {}),
                ...(enablePresencePenalty && capabilities.presencePenalty.supported ? { presencePenalty: paramPresencePenalty } : {}),
                ...(enableFrequencyPenalty && capabilities.frequencyPenalty.supported ? { frequencyPenalty: paramFrequencyPenalty } : {}),
            } : undefined;

            const reasoningParam = reasoningLevel === "none" ? undefined : reasoningLevel;

            if (mode === "lipograma") {
                let stepHtml = currentHtml;

                setStatusMessage("Iniciando Capa 1/3 (Esqueleto)...");
                const result1 = await streamMiniHumanize(
                    stepHtml, config, 50, () => {}, setStatusMessage, modelToUse, "lipograma_1", providerToUse, reasoningParam, customParams
                );
                if (result1 && result1.html) {
                    editor.commands.setContent(result1.html);
                    stepHtml = result1.html;
                }

                setStatusMessage("Iniciando Capa 2/3 (Anomalías)...");
                const result2 = await streamMiniHumanize(
                    stepHtml, config, 50, () => {}, setStatusMessage, modelToUse, "lipograma_2", providerToUse, reasoningParam, customParams
                );
                if (result2 && result2.html) {
                    editor.commands.setContent(result2.html);
                    stepHtml = result2.html;
                }

                setStatusMessage("Iniciando Capa 3/3 (Cierre)...");
                const result3 = await streamMiniHumanize(
                    stepHtml, config, 50, () => {}, setStatusMessage, modelToUse, "lipograma_3", providerToUse, reasoningParam, customParams
                );
                if (result3 && result3.html) {
                    editor.commands.setContent(result3.html);
                }
            } else if (mode === "babel") {
                let stepHtml = currentHtml;
                const steps = [
                    { mode: "babel_1", msg: "Capa 1/5: Traduciendo al Alemán (Estructurando)..." },
                    { mode: "babel_2", msg: "Capa 2/5: Traduciendo al Japonés (Invirtiendo)..." },
                    { mode: "babel_3", msg: "Capa 3/5: Traduciendo al Ruso (Declinando)..." },
                    { mode: "babel_4", msg: "Capa 4/5: Traduciendo al Chino (Aislando)..." },
                    { mode: "babel_5", msg: "Capa 5/5: Recuperando al Español (Cierre)..." }
                ];

                for (const s of steps) {
                    setStatusMessage(s.msg);
                    const result = await streamMiniHumanize(
                        stepHtml, config, 50, () => {}, setStatusMessage, modelToUse, s.mode, providerToUse, reasoningParam, customParams
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
                    50,
                    () => {},
                    (status) => {
                        setStatusMessage(status);
                    },
                    modelToUse,
                    mode,
                    providerToUse,
                    reasoningParam,
                    customParams
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
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
                className="relative w-full max-w-4xl max-h-[92vh] bg-slate-50 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 flex-shrink-0">
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

                {/* Content Area */}
                <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-grow">
                    {error && (
                        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-200 shadow-sm animate-in fade-in duration-200">
                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <span className="font-bold">Error en la ejecución:</span> {error}
                            </div>
                        </div>
                    )}

                    <div className="relative">
                        <EditorContent editor={editor} />

                        {isProcessing && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3 z-10">
                                <Loader2 size={32} className="text-amber-500 animate-spin" />
                                <span className="text-sm font-bold text-slate-600 animate-pulse">
                                    {statusMessage || "Procesando..."}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Panel de Alteración de Parámetros */}
                    <AnimatePresence>
                        {customParamsEnabled && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm flex flex-col gap-3.5">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                        <div className="flex items-center gap-2">
                                            <SlidersHorizontal size={15} className="text-amber-500" />
                                            <span className="text-xs font-bold text-slate-800">
                                                Ajuste Manual de Parámetros de Generación
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-400 hidden sm:inline">
                                                (Activa o desactiva cada control según lo requieras)
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={resetToDefaults}
                                            disabled={isProcessing}
                                            className="flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 transition-colors disabled:opacity-50"
                                        >
                                            <RotateCcw size={12} />
                                            <span>Valores Estándar</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                        {/* Temperatura */}
                                        <div className={cn(
                                            "flex flex-col gap-2 p-3 rounded-xl border transition-colors",
                                            enableTemp && capabilities.temperature.supported ? "bg-slate-50 border-slate-200" : "bg-slate-100/60 border-slate-200/60 opacity-60"
                                        )}>
                                            <div className="flex items-center justify-between">
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={enableTemp}
                                                        onChange={(e) => setEnableTemp(e.target.checked)}
                                                        disabled={isProcessing || !capabilities.temperature.supported}
                                                        className="rounded text-amber-500 focus:ring-amber-400 w-3.5 h-3.5 cursor-pointer"
                                                    />
                                                    <span className="text-xs font-bold text-slate-700">Temperatura</span>
                                                </label>
                                                <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                    {paramTemp.toFixed(2)}
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min={capabilities.temperature.min}
                                                max={capabilities.temperature.max}
                                                step={capabilities.temperature.step}
                                                value={paramTemp}
                                                onChange={(e) => setParamTemp(parseFloat(e.target.value))}
                                                disabled={isProcessing || !enableTemp || !capabilities.temperature.supported}
                                                className="w-full accent-amber-500 cursor-pointer disabled:cursor-not-allowed"
                                            />
                                            <span className="text-[10px] text-slate-400">
                                                Creatividad (0.0 muy estricto, 1.4+ creativo). Default: 1.0
                                            </span>
                                        </div>

                                        {/* Top-P */}
                                        <div className={cn(
                                            "flex flex-col gap-2 p-3 rounded-xl border transition-colors",
                                            enableTopP && capabilities.topP.supported ? "bg-slate-50 border-slate-200" : "bg-slate-100/60 border-slate-200/60 opacity-60"
                                        )}>
                                            <div className="flex items-center justify-between">
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={enableTopP}
                                                        onChange={(e) => setEnableTopP(e.target.checked)}
                                                        disabled={isProcessing || !capabilities.topP.supported}
                                                        className="rounded text-amber-500 focus:ring-amber-400 w-3.5 h-3.5 cursor-pointer"
                                                    />
                                                    <span className="text-xs font-bold text-slate-700">Top-P</span>
                                                </label>
                                                <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                    {paramTopP.toFixed(2)}
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min={capabilities.topP.min}
                                                max={capabilities.topP.max}
                                                step={capabilities.topP.step}
                                                value={paramTopP}
                                                onChange={(e) => setParamTopP(parseFloat(e.target.value))}
                                                disabled={isProcessing || !enableTopP || !capabilities.topP.supported}
                                                className="w-full accent-amber-500 cursor-pointer disabled:cursor-not-allowed"
                                            />
                                            <span className="text-[10px] text-slate-400">
                                                Muestreo por núcleo acumulado (0.0 - 1.0). Default: 0.95
                                            </span>
                                        </div>

                                        {/* Top-K */}
                                        <div className={cn(
                                            "flex flex-col gap-2 p-3 rounded-xl border transition-colors",
                                            enableTopK && capabilities.topK.supported ? "bg-slate-50 border-slate-200" : "bg-slate-100/60 border-slate-200/60 opacity-60"
                                        )}>
                                            <div className="flex items-center justify-between">
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={enableTopK}
                                                        onChange={(e) => setEnableTopK(e.target.checked)}
                                                        disabled={isProcessing || !capabilities.topK.supported}
                                                        className="rounded text-amber-500 focus:ring-amber-400 w-3.5 h-3.5 cursor-pointer"
                                                    />
                                                    <span className="text-xs font-bold text-slate-700">Top-K</span>
                                                </label>
                                                <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                    {Math.min(paramTopK, capabilities.topK.max)}
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min={capabilities.topK.min}
                                                max={capabilities.topK.max}
                                                step={capabilities.topK.step}
                                                value={Math.min(paramTopK, capabilities.topK.max)}
                                                onChange={(e) => setParamTopK(parseInt(e.target.value, 10))}
                                                disabled={isProcessing || !enableTopK || !capabilities.topK.supported}
                                                className="w-full accent-amber-500 cursor-pointer disabled:cursor-not-allowed"
                                            />
                                            <span className="text-[10px] text-slate-400">
                                                {capabilities.topK.reason || "Candidatos más probables. Default: 40"}
                                            </span>
                                        </div>

                                        {/* Presence Penalty */}
                                        <div className={cn(
                                            "flex flex-col gap-2 p-3 rounded-xl border transition-colors",
                                            capabilities.presencePenalty.supported
                                                ? (enablePresencePenalty ? "bg-slate-50 border-slate-200" : "bg-slate-100/60 border-slate-200/60 opacity-60")
                                                : "bg-red-50/50 border-red-200/60 opacity-70"
                                        )}>
                                            <div className="flex items-center justify-between">
                                                <label className={cn(
                                                    "flex items-center gap-2 select-none",
                                                    capabilities.presencePenalty.supported ? "cursor-pointer" : "cursor-not-allowed"
                                                )}>
                                                    <input
                                                        type="checkbox"
                                                        checked={enablePresencePenalty && capabilities.presencePenalty.supported}
                                                        onChange={(e) => setEnablePresencePenalty(e.target.checked)}
                                                        disabled={isProcessing || !capabilities.presencePenalty.supported}
                                                        className="rounded text-amber-500 focus:ring-amber-400 w-3.5 h-3.5 disabled:opacity-50"
                                                    />
                                                    <span className="text-xs font-bold text-slate-700">Presence Penalty</span>
                                                </label>
                                                <span className={cn(
                                                    "text-xs font-mono font-bold px-2 py-0.5 rounded border",
                                                    capabilities.presencePenalty.supported
                                                        ? "text-amber-600 bg-amber-50 border-amber-200"
                                                        : "text-slate-400 bg-slate-100 border-slate-200"
                                                )}>
                                                    {paramPresencePenalty.toFixed(1)}
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min={capabilities.presencePenalty.min}
                                                max={capabilities.presencePenalty.max}
                                                step={capabilities.presencePenalty.step}
                                                value={paramPresencePenalty}
                                                onChange={(e) => setParamPresencePenalty(parseFloat(e.target.value))}
                                                disabled={isProcessing || !enablePresencePenalty || !capabilities.presencePenalty.supported}
                                                className="w-full accent-amber-500 cursor-pointer disabled:cursor-not-allowed"
                                            />
                                            {!capabilities.presencePenalty.supported ? (
                                                <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                                                    <Ban size={11} /> {capabilities.presencePenalty.reason}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-400">
                                                    Penaliza repetición conceptual (-2.0 a 2.0). Default: 0.0
                                                </span>
                                            )}
                                        </div>

                                        {/* Frequency Penalty */}
                                        <div className={cn(
                                            "flex flex-col gap-2 p-3 rounded-xl border transition-colors",
                                            capabilities.frequencyPenalty.supported
                                                ? (enableFrequencyPenalty ? "bg-slate-50 border-slate-200" : "bg-slate-100/60 border-slate-200/60 opacity-60")
                                                : "bg-red-50/50 border-red-200/60 opacity-70"
                                        )}>
                                            <div className="flex items-center justify-between">
                                                <label className={cn(
                                                    "flex items-center gap-2 select-none",
                                                    capabilities.frequencyPenalty.supported ? "cursor-pointer" : "cursor-not-allowed"
                                                )}>
                                                    <input
                                                        type="checkbox"
                                                        checked={enableFrequencyPenalty && capabilities.frequencyPenalty.supported}
                                                        onChange={(e) => setEnableFrequencyPenalty(e.target.checked)}
                                                        disabled={isProcessing || !capabilities.frequencyPenalty.supported}
                                                        className="rounded text-amber-500 focus:ring-amber-400 w-3.5 h-3.5 disabled:opacity-50"
                                                    />
                                                    <span className="text-xs font-bold text-slate-700">Frequency Penalty</span>
                                                </label>
                                                <span className={cn(
                                                    "text-xs font-mono font-bold px-2 py-0.5 rounded border",
                                                    capabilities.frequencyPenalty.supported
                                                        ? "text-amber-600 bg-amber-50 border-amber-200"
                                                        : "text-slate-400 bg-slate-100 border-slate-200"
                                                )}>
                                                    {paramFrequencyPenalty.toFixed(1)}
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min={capabilities.frequencyPenalty.min}
                                                max={capabilities.frequencyPenalty.max}
                                                step={capabilities.frequencyPenalty.step}
                                                value={paramFrequencyPenalty}
                                                onChange={(e) => setParamFrequencyPenalty(parseFloat(e.target.value))}
                                                disabled={isProcessing || !enableFrequencyPenalty || !capabilities.frequencyPenalty.supported}
                                                className="w-full accent-amber-500 cursor-pointer disabled:cursor-not-allowed"
                                            />
                                            {!capabilities.frequencyPenalty.supported ? (
                                                <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                                                    <Ban size={11} /> {capabilities.frequencyPenalty.reason}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-400">
                                                    Penaliza palabras repetidas (-2.0 a 2.0). Default: 0.0
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Footer / Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
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

                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Botón de Alteración de Parámetros */}
                            <button
                                type="button"
                                onClick={() => setCustomParamsEnabled(!customParamsEnabled)}
                                disabled={isProcessing}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border outline-none",
                                    customParamsEnabled
                                        ? "bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20"
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                )}
                            >
                                <SlidersHorizontal size={14} className={customParamsEnabled ? "text-white" : "text-slate-500"} />
                                <span>Parámetros</span>
                                <span className={cn(
                                    "text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider",
                                    customParamsEnabled ? "bg-amber-600 text-amber-100" : "bg-slate-100 text-slate-400"
                                )}>
                                    {customParamsEnabled ? "ON" : "OFF"}
                                </span>
                            </button>

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
                                className="text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-indigo-500"
                            >
                                <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
                                <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                                <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                                <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite</option>
                                <option value="gemini-3-flash">Gemini 3 Flash</option>
                                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                                <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite</option>
                                <option value="gemma-4-31b-it">Gemma 4 31B IT</option>
                                <option value="gemma-4-26b-a4b-it">Gemma 4 26B IT</option>
                                <option value="gemma-3-27b-it">Gemma 3 27B IT</option>
                            </select>

                            <select
                                value={selectedProvider}
                                onChange={(e) => setSelectedProvider(e.target.value)}
                                disabled={isProcessing}
                                className="text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-indigo-500"
                            >
                                <option value="google-ai-studio">Google AI Studio</option>
                                <option value="vertex-ai">Vertex AI</option>
                            </select>

                            <select
                                value={reasoningLevel}
                                onChange={(e) => setReasoningLevel(e.target.value)}
                                disabled={isProcessing || !(selectedModel.includes("3.6-flash") || selectedModel.includes("3.7-flash"))}
                                className="text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="none">Razonamiento: Por defecto</option>
                                <option value="low">Razonamiento: Bajo</option>
                                <option value="medium">Razonamiento: Medio</option>
                                <option value="high">Razonamiento: Alto</option>
                            </select>

                            <button
                                onClick={handleHumanize}
                                disabled={isProcessing || isOverLimit || wordCount === 0}
                                className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-slate-900/10"
                            >
                                <Wand2 size={15} />
                                {isProcessing ? "Humanizando..." : "Humanizar Texto"}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
