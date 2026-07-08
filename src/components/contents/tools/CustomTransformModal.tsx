"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { X, Sparkles, Loader2, AlertCircle, Copy, Check, Eye, Code, FileText } from "lucide-react";
import { streamCustomTransform } from "@/lib/services/writer/ai-streaming";
import { cn } from "@/utils/cn";
import { useProjectStore } from "@/store/useProjectStore";

interface CustomTransformModalProps {
    onClose: () => void;
}

const PRESETS = [
    {
        id: "revista",
        name: "Revista",
        description: "Estilo revista de modas, asimétrico, overlaps, sin H1, reseteo de tablas e integración de shortcodes de Shopify.",
        guidelines: `1. Límites de Acción: NUNCA generes etiquetas <h1> ni banners hero (.hero). Inicia el código directamente con texto o <h2>.
2. Solo CSS Estructural: NO utilices CSS decorativo (fuentes, colores, line-height). El tema de Shopify se encarga de esto.
3. Layouts de Revista: Usa CSS Grid de 12 columnas para crear overlaps (superposiciones) asimétricas con z-index: 2 y fondos translúcidos sobre las imágenes.
4. Mosaicos y Splits: Genera splits limpios y grillas con márgenes amplios (gap: 60px o 80px) y líneas finas negras (1px o 2px) antes de títulos importantes.
5. Manejo de Imágenes: Aplica mix-blend-mode: multiply a imágenes con fondos claros. Usa selectores de hijo directo (ej. .split-img > img) para no romper componentes internos de Shopify.
6. Tablas sin Bordes: Al usar tablas de catálogo, aplica reset de bordes (table, td { border: 0px solid transparent !important; }).
7. Hack de Splide: Si un shortcode individual está dentro de un contenedor reducido, inyecta el hack CSS de Splide (.splide__slide { width: 100% !important; max-width: 400px !important; }).`
    },
    {
        id: "limpio",
        name: "Limpio",
        description: "Limpia clases innecesarias, unifica CSS estructural, remueve estilos embebidos ajenos y asegura HTML5 semántico puro.",
        guidelines: `1. Remueve cualquier estilo decorativo en línea (style="...") que imponga colores, fuentes o márgenes no estándar.
2. Asegura el uso de elementos semánticos de HTML5 (<article>, <section>, <figure>, etc.).
3. Unifica todo el CSS de diseño estructural limpio dentro de un único bloque <style> al inicio.
4. Preserva la estructura lógica del texto de manera idéntica.`
    },
    {
        id: "tablas",
        name: "Tablas",
        description: "Reglas específicas para estructurar catálogos y listas comparativas en tablas HTML sin bordes.",
        guidelines: `1. Tablas de Catálogo: Diseña layouts de filas o columnas para tablas sin bordes usando reset de bordes (table, td { border: 0px solid transparent !important; }).
2. Hack de Splide en Tablas: Si un shortcode individual está dentro de una columna reducida de tabla, inyecta siempre el hack CSS de Splide para evitar que se reduzca el tamaño del producto.
3. Alineación: Asegura una alineación de texto a la izquierda en las columnas de descripción y centrada en los productos.`
    },
    {
        id: "custom",
        name: "Personalizado",
        description: "Define tus directrices y guías de diseño desde cero para el modelo.",
        guidelines: "Escribe aquí las directrices que el modelo debe seguir estrictamente al transformar el HTML..."
    }
];

export function CustomTransformModal({ onClose }: CustomTransformModalProps) {
    const activeProject = useProjectStore((state) => state.activeProject);
    const projectGuidelines = activeProject?.settings?.custom_transform_guidelines || "";

    const allPresets = useMemo(() => [
        ...(projectGuidelines ? [{
            id: "proyecto",
            name: "Proyecto",
            description: "Directrices de maquetación HTML/CSS guardadas permanentemente para este proyecto.",
            guidelines: projectGuidelines
        }] : []),
        ...PRESETS
    ], [projectGuidelines]);

    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [inputHtml, setInputHtml] = useState("");
    const [outputHtml, setOutputHtml] = useState("");
    const [selectedPreset, setSelectedPreset] = useState(() => projectGuidelines ? "proyecto" : "revista");
    const [brandGuidelines, setBrandGuidelines] = useState(() => projectGuidelines ? projectGuidelines : PRESETS[0].guidelines);
    const [userInstructions, setUserInstructions] = useState("");
    const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash");
    const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const preset = allPresets.find(p => p.id === selectedPreset);
        if (preset) {
            setBrandGuidelines(preset.guidelines);
        }
    }, [selectedPreset, allPresets]);

    const handleCopy = () => {
        navigator.clipboard.writeText(outputHtml);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleTransform = async () => {
        if (!inputHtml.trim()) return;

        setIsProcessing(true);
        setError(null);
        setStatusMessage("Iniciando...");
        setOutputHtml("");

        try {
            const provider = selectedModel.includes("gemini-3.5") || selectedModel.includes("gemini-3.1-pro")
                ? "vertex-ai"
                : "google-ai-studio";

            const result = await streamCustomTransform(
                inputHtml,
                brandGuidelines,
                userInstructions,
                (chunk) => {
                    setOutputHtml(chunk);
                },
                (status) => {
                    setStatusMessage(status);
                },
                selectedModel,
                provider
            );

            if (result && result.html) {
                setOutputHtml(result.html);
            }
        } catch (err: any) {
            setError(err.message || "Ocurrió un error al procesar la transformación estructural.");
        } finally {
            setIsProcessing(false);
            setStatusMessage("");
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={!isProcessing ? onClose : undefined}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal Container */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 15 }}
                className="relative w-full max-w-7xl h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 bg-slate-900 border-b border-slate-800 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Sparkles size={20} className="text-white animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white tracking-tight">Transformador HTML Custom</h2>
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                                Maquetación Editorial Pro
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Main Body */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden bg-slate-950">
                    
                    {/* Left Column: Inputs & Instructions */}
                    <div className="flex flex-col border-r border-slate-800 overflow-y-auto p-6 gap-5 bg-slate-900/40">
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-950/40 text-red-400 text-sm font-medium rounded-xl border border-red-900/50">
                                <AlertCircle size={18} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Preset Selector */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Directrices Editoriales (Preset)</label>
                            <select
                                value={selectedPreset}
                                onChange={(e) => setSelectedPreset(e.target.value)}
                                disabled={isProcessing}
                                className="text-sm font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 cursor-pointer transition-colors"
                            >
                                {allPresets.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Brand Guidelines Area */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <FileText size={14} className="text-indigo-400" />
                                Reglas de Diseño y Estructura
                            </label>
                            <textarea
                                value={brandGuidelines}
                                onChange={(e) => setBrandGuidelines(e.target.value)}
                                disabled={isProcessing}
                                className="text-xs font-mono text-slate-300 bg-slate-950 border border-slate-800 rounded-xl p-4 h-44 resize-none outline-none focus:border-indigo-500/80 transition-colors leading-relaxed"
                            />
                        </div>

                        {/* User Instructions (Ad-hoc) */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Instrucciones Ad-hoc para esta corrida (Opcional)</label>
                            <textarea
                                value={userInstructions}
                                onChange={(e) => setUserInstructions(e.target.value)}
                                placeholder="Ej: 'Alineá el catálogo de Balenciaga a la izquierda en una tabla de 2 columnas' o 'Cambiá el espaciado entre mosaicos a 90px'..."
                                disabled={isProcessing}
                                className="text-xs font-medium text-slate-300 bg-slate-950 border border-slate-800 rounded-xl p-4 h-24 resize-none outline-none focus:border-indigo-500/80 transition-colors placeholder:text-slate-600"
                            />
                        </div>

                        {/* HTML Input Area */}
                        <div className="flex flex-col gap-2 flex-1 min-h-[250px]">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">HTML Original</label>
                            <textarea
                                value={inputHtml}
                                onChange={(e) => setInputHtml(e.target.value)}
                                placeholder="Pega el código HTML completo aquí..."
                                disabled={isProcessing}
                                className="flex-1 text-xs font-mono text-slate-300 bg-slate-950 border border-slate-800 rounded-xl p-4 resize-none outline-none focus:border-indigo-500/80 transition-colors leading-normal placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    {/* Right Column: Output & Live Preview */}
                    <div className="flex flex-col overflow-hidden relative">
                        {/* Tabs Bar */}
                        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 z-10 shrink-0">
                            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                                <button
                                    onClick={() => setActiveTab("code")}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                                        activeTab === "code" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    <Code size={14} />
                                    Código Resultante
                                </button>
                                <button
                                    onClick={() => setActiveTab("preview")}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                                        activeTab === "preview" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    <Eye size={14} />
                                    Vista Previa
                                </button>
                            </div>

                            {outputHtml && (
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors border border-slate-800"
                                >
                                    {copied ? (
                                        <>
                                            <Check size={14} className="text-emerald-500" />
                                            ¡Copiado!
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={14} />
                                            Copiar Código
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 bg-slate-950 overflow-hidden relative">
                            {activeTab === "code" ? (
                                <textarea
                                    value={outputHtml}
                                    readOnly
                                    placeholder="Aquí aparecerá el HTML transformado de manera progresiva..."
                                    className="w-full h-full text-xs font-mono text-indigo-300 bg-slate-950 p-6 resize-none border-none outline-none leading-relaxed select-all"
                                />
                            ) : (
                                <div className="w-full h-full p-4 bg-white">
                                    {outputHtml ? (
                                        <iframe
                                            title="Transform Preview"
                                            srcDoc={outputHtml}
                                            className="w-full h-full border-none rounded-xl bg-white"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-950">
                                            <Eye size={36} className="text-slate-650" />
                                            <span className="text-xs font-bold tracking-wider uppercase text-slate-600">Sin renderizado disponible</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Processing Overlay */}
                            {isProcessing && (
                                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-25">
                                    <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-lg shadow-indigo-500/5 animate-pulse">
                                        <Loader2 size={36} className="text-indigo-500 animate-spin" />
                                    </div>
                                    <div className="text-center">
                                        <span className="block text-sm font-black text-white uppercase tracking-wider mb-1 animate-pulse">
                                            {statusMessage || "Procesando HTML..."}
                                        </span>
                                        <span className="text-xs text-slate-400 font-medium">Esto puede demorar de 20 a 50 segundos.</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="px-8 py-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            disabled={isProcessing}
                            className="text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 outline-none cursor-pointer focus:border-indigo-500"
                        >
                            <option value="gemini-3.5-flash-gas">Gemini 3.5 Flash (GAS)</option>
                            <option value="gemini-3.5-flash-vertex">Gemini 3.5 Flash (Vertex)</option>
                            <option value="gemini-3-flash-preview-gas">Gemini 3 Flash (GAS)</option>
                            <option value="gemini-3-flash-preview-vertex">Gemini 3 Flash (Vertex)</option>
                            <option value="gemini-3.1-pro-preview-gas">Gemini 3.1 Pro (GAS)</option>
                            <option value="gemini-3.1-pro-preview-vertex">Gemini 3.1 Pro (Vertex)</option>
                            <option value="gemini-3.1-flash-lite-preview-gas">Gemini 3.1 Flash Lite (GAS)</option>
                            <option value="gemini-3.1-flash-lite-preview-vertex">Gemini 3.1 Flash Lite (Vertex)</option>
                            <option value="gemma-4-31b-it">Gemma 4 31B IT (GAS)</option>
                            <option value="gemma-4-26b-a4b-it">Gemma 4 26B IT (GAS)</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleTransform}
                            disabled={isProcessing || !inputHtml.trim()}
                            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/25 active:scale-[0.98]"
                        >
                            <Sparkles size={16} />
                            {isProcessing ? "Transformando..." : "Transformar HTML completo"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
