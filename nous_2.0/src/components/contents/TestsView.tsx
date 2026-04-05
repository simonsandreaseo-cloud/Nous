"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    AtSign, 
    CheckCircle2, 
    Cpu, 
    Key, 
    RefreshCw, 
    AlertCircle, 
    Clock, 
    History, 
    MessageSquare, 
    Play, 
    Copy, 
    ListRestart, 
    ShieldAlert, 
    Image as ImageIcon, 
    Download, 
    Eye
} from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";
import { cn } from "@/utils/cn";
import { executeWithKeyRotation, executeWithImagenRotation } from "@/lib/services/writer/ai-core";


interface TestHistoryItem {
    id: string;
    model: string;
    latency: number;
    response: string;
    timestamp: Date;
    status: 'success' | 'error';
    query?: string;
    attempts: number;
    rotationDetails?: string[];
}

export default function TestsView() {
    return (
        <div className="flex-1 flex flex-col p-4 w-full h-full relative overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start content-start">
                <GeminiTesterWidget />
                <ImagenTesterWidget />

                
                <div className="glass-panel border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center min-h-[140px] opacity-10 hover:opacity-50 transition-all">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Modulo Vacío</p>
                </div>
            </div>
        </div>
    );
}

function GeminiTesterWidget() {
    const [activeTab, setActiveTab] = useState<'test' | 'history'>('test');
    const [modelName, setModelName] = useState("gemini-2.5-flash");
    const [apiKey, setApiKey] = useState("");
    const [customQuery, setCustomQuery] = useState("");
    const [isTesting, setIsTesting] = useState(false);
    const [useRotation, setUseRotation] = useState(true);
    const [latency, setLatency] = useState<number | null>(null);
    const [history, setHistory] = useState<TestHistoryItem[]>([]);
    const [result, setResult] = useState<{ status: 'success' | 'error', message: string } | null>(null);

    const copyToClipboard = () => {
        const text = history.map(item => {
            const date = item.timestamp.toLocaleTimeString();
            let log = `[${item.status.toUpperCase()}] ${date} - MOD: ${item.model} - Latency: ${item.latency}ms\n`;
            log += `Prompt: ${item.query || 'ping'}\n`;
            log += `Keys Tried: ${item.attempts}\n`;
            if (item.rotationDetails?.length) {
                log += `Rotation:\n - ${item.rotationDetails.join('\n - ')}\n`;
            }
            log += `Response: ${item.response.substring(0, 500)}\n`;
            log += `----------------------------------------\n`;
            return log;
        }).join('\n');
        
        navigator.clipboard.writeText(text);
        alert("Historial copiado al portapapeles");
    };

    const runTest = async () => {
        if (!modelName.trim()) return;
        
        setIsTesting(true);
        setResult(null);
        setLatency(null);
        const start = performance.now();
        const queryToUse = customQuery.trim() || "ping";
        const rotationLogs: string[] = [];

        try {
            const activeKey = apiKey.trim() || undefined; // If empty, undefined to use env key pool
            
            const textResponse = await executeWithKeyRotation(
                async (client) => {
                    const model = client.getGenerativeModel({ model: modelName });
                    const response = await model.generateContent(queryToUse);
                    return await response.response.text();
                },
                modelName,
                activeKey,
                useRotation ? (key, reason, attempt, max) => {
                    rotationLogs.push(`Attempt ${attempt}/${max}: ${key.substring(0, 5)}... failed (${reason})`);
                } : undefined
            );

            const end = performance.now();
            const ms = Math.round(end - start);
            setLatency(ms);
            setResult({ status: 'success', message: `${modelName} OK` });

            setHistory(prev => [{
                id: Math.random().toString(36).substring(7),
                model: modelName,
                latency: ms,
                response: textResponse,
                timestamp: new Date(),
                status: 'success' as const,
                query: queryToUse,
                attempts: rotationLogs.length + 1,
                rotationDetails: rotationLogs
            }, ...prev].slice(0, 50));

        } catch (error: any) {
            const errorMsg = error.message || "Error desconocido";
            setResult({ status: 'error', message: `FAIL: ${modelName}` });
            
            setHistory(prev => [{
                id: Math.random().toString(36).substring(7),
                model: modelName,
                latency: 0,
                response: errorMsg,
                timestamp: new Date(),
                status: 'error' as const,
                query: queryToUse,
                attempts: rotationLogs.length + 1,
                rotationDetails: rotationLogs
            }, ...prev].slice(0, 50));

        } finally {
            setIsTesting(false);
        }
    };

    return (
        <section className="glass-panel border-hairline rounded-[24px] p-4 shadow-sm flex flex-col gap-4 min-w-[280px] max-w-[320px] bg-white/40 backdrop-blur-md">
            {/* Header & Tabs */}
            <div className="flex items-center justify-between">
                <div className="flex bg-slate-100/60 p-1 rounded-md">
                    <button 
                        onClick={() => setActiveTab('test')}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                            activeTab === 'test' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        Probar
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all relative",
                            activeTab === 'history' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        Historial
                        {history.length > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-500 text-white text-[7px] flex items-center justify-center rounded-full border border-white font-black">{history.length}</span>}
                    </button>
                </div>
                
                {activeTab === 'history' && history.length > 0 && (
                    <button 
                        onClick={copyToClipboard}
                        className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent"
                    >
                        <Copy size={12} />
                    </button>
                )}

                {latency !== null && activeTab === 'test' && (
                    <div className="flex items-center gap-1 text-slate-400">
                        <Clock size={10} className="stroke-[2.5px]" />
                        <span className="text-[9px] font-black tracking-widest">{latency}ms</span>
                    </div>
                )}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'test' ? (
                    <motion.div 
                        key="test-tab"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex flex-col gap-3"
                    >
                        <div className="flex flex-col gap-2">
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors">
                                    <AtSign size={12} />
                                </div>
                                <input 
                                    type="text" 
                                    value={modelName}
                                    onChange={(e) => setModelName(e.target.value)}
                                    placeholder="Modelo ID..."
                                    className="w-full bg-slate-50 border border-slate-100 rounded-md pl-9 pr-4 py-2.5 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-200 transition-all placeholder:text-slate-300"
                                />
                            </div>

                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors">
                                    <MessageSquare size={12} />
                                </div>
                                <input 
                                    type="text" 
                                    value={customQuery}
                                    onChange={(e) => setCustomQuery(e.target.value)}
                                    placeholder="Pregunta (Opcional)..."
                                    className="w-full bg-slate-50 border border-slate-100 rounded-md pl-9 pr-4 py-2.5 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-200 transition-all placeholder:text-slate-300"
                                />
                            </div>

                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors">
                                    <Key size={12} />
                                </div>
                                <input 
                                    type="password" 
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="API Key Específica"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-md pl-9 pr-4 py-2.5 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-200 transition-all placeholder:text-slate-300"
                                />
                            </div>
                        </div>

                        {/* Rotation Toggle */}
                        <div className="flex items-center justify-between px-1 py-1">
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "p-1.5 rounded-lg",
                                    useRotation ? "bg-indigo-50 text-indigo-500" : "bg-slate-50 text-slate-400"
                                )}>
                                    <ListRestart size={12} />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">¿Activar Rotación?</span>
                            </div>
                            <button 
                                onClick={() => setUseRotation(!useRotation)}
                                className={cn(
                                    "w-8 h-4 rounded-full relative transition-all",
                                    useRotation ? "bg-indigo-500" : "bg-slate-200"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                                    useRotation ? "left-[18px]" : "left-0.5"
                                )} />
                            </button>
                        </div>

                        <button 
                            onClick={runTest}
                            disabled={isTesting}
                            className="w-full relative h-[42px] rounded-md bg-slate-900 group/btn overflow-hidden transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                            <div className="relative flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                                {isTesting ? (
                                    <RefreshCw size={14} className="animate-spin stroke-[2.5px]" />
                                ) : (
                                    <>
                                        <Play size={12} className="stroke-[3px] fill-current" />
                                        Ejecutar Diagnóstico
                                    </>
                                )}
                            </div>
                        </button>

                        <AnimatePresence>
                            {result && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={cn(
                                        "rounded-md px-3 py-2 border flex items-center gap-2",
                                        result.status === 'success' 
                                            ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                                            : "bg-rose-50 border-rose-100 text-rose-700"
                                    )}
                                >
                                    {result.status === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                    <span className="text-[9px] font-black tracking-widest uppercase truncate">{result.message}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="history-tab"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex flex-col gap-2 max-h-[340px] overflow-y-auto custom-scrollbar pr-1"
                    >
                        {history.length === 0 ? (
                            <div className="py-8 text-center opacity-30 flex flex-col items-center gap-2">
                                <History size={20} className="text-slate-400" />
                                <p className="text-[9px] font-black uppercase tracking-widest">Sin registros</p>
                            </div>
                        ) : (
                            history.map((item) => (
                                <div key={item.id} className="p-3 rounded-lg bg-white border border-slate-100 shadow-sm flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                item.status === 'success' ? "bg-emerald-400" : "bg-rose-400"
                                            )} />
                                            <span className="text-[9px] font-black text-slate-800 truncate uppercase mt-0.5">{item.model}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                             <span className="text-[8px] font-black text-slate-400 whitespace-nowrap uppercase tracking-widest">{item.latency}ms</span>
                                             <div className={cn(
                                                 "px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest",
                                                 item.attempts > 1 ? "bg-amber-100 text-amber-600" : "bg-indigo-50 text-indigo-400"
                                             )}>
                                                 {item.attempts > 1 ? `Rot: ${item.attempts - 1}` : "Intento 1"}
                                             </div>
                                        </div>
                                    </div>

                                    {item.rotationDetails && item.rotationDetails.length > 0 && (
                                        <div className="flex flex-col gap-1 p-2 bg-slate-50/50 rounded-md border border-slate-100">
                                            <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                                <ShieldAlert size={8} /> Fallos previos
                                            </p>
                                            {item.rotationDetails.map((log, idx) => (
                                                <p key={idx} className="text-[8px] font-bold text-rose-500/70 truncate">{log}</p>
                                            ))}
                                        </div>
                                    )}

                                    <p className={cn(
                                        "text-[9px] font-bold p-2.5 rounded-md line-clamp-3 leading-relaxed",
                                        item.status === 'success' ? "bg-slate-50/50 text-slate-600 italic" : "bg-rose-50/30 text-rose-500 font-black"
                                    )}>
                                        "{item.response}"
                                    </p>
                                    
                                    {item.query && item.query !== 'ping' && (
                                        <div className="flex items-center gap-1.5 opacity-50 px-1">
                                            <MessageSquare size={8} />
                                            <span className="text-[7px] font-black uppercase tracking-widest truncate">{item.query}</span>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}

// GEO/Grounding logic and widgets removed per user request.

function ImagenTesterWidget() {
    const [modelName, setModelName] = useState("imagen-4.0-generate-001");
    const [apiKey, setApiKey] = useState("");
    const [isTesting, setIsTesting] = useState(false);
    const [latency, setLatency] = useState<number | null>(null);
    const [images, setImages] = useState<{ url: string, base64: string }[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const TEST_PROMPT = "A majestic phoenix rising from ashes, digital art style, high resolution";

    const runTest = async () => {
        console.log("[IMAGEN-MINIMAL] Clicked test", { modelName, apiKey: !!apiKey });
        setIsTesting(true);
        setError(null);
        setImages([]);
        
        if (!modelName.trim()) {
            setError("Error: El nombre del modelo es obligatorio.");
            setIsTesting(false);
            return;
        }

        const start = performance.now();



        try {
            const result = await executeWithImagenRotation(
                async (client, currentModel) => {
                    console.log("[IMAGEN-MINIMAL] Calling with prompt:", TEST_PROMPT);
                    // Single image, no extra config for maximum simplicity
                    const response = await client.models.generateImages({
                        model: currentModel,
                        prompt: TEST_PROMPT,
                        config: {
                            numberOfImages: 1
                        }
                    });
                    return response;
                },
                modelName.trim(),
                apiKey.trim() || undefined
            );
            
            console.log("[IMAGEN-MINIMAL] Result received:", result);

            const end = performance.now();
            const ms = Math.round(end - start);
            setLatency(ms);

            const generatedImages = result.generatedImages?.map(img => {
                const b64 = img.image?.imageBytes;
                if (!b64) return null;
                return {
                    url: `data:image/png;base64,${b64}`,
                    base64: b64 as string
                };
            }).filter((img): img is { url: string, base64: string } => img !== null) || [];

            setImages(generatedImages);
            
            const historyEntry = {
                id: Math.random().toString(36).substring(7),
                model: modelName,
                prompt: TEST_PROMPT,
                latency: ms,
                images: generatedImages,
                timestamp: new Date()
            };
            
            setHistory(prev => [historyEntry, ...prev].slice(0, 5));
        } catch (e: any) {
            console.error("[IMAGEN-MINIMAL] Error:", e);
            setError(e.message || "Error al generar imágenes");
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <section className="glass-panel border-hairline rounded-[24px] p-5 shadow-sm flex flex-col gap-5 min-w-[320px] max-w-[360px] bg-white/40 backdrop-blur-md border-violet-100/50">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-md bg-violet-50 text-violet-600">
                        <ImageIcon size={16} />
                    </div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2rem] text-slate-800">Prueba Imagen 4</h3>
                </div>
                {latency !== null && (
                    <div className="flex items-center gap-1.5 text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                        <Clock size={10} className="stroke-[2.5px]" />
                        <span className="text-[9px] font-black tracking-widest">{latency}ms</span>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-violet-400 transition-colors">
                            <Cpu size={14} />
                        </div>
                        <input 
                            type="text" 
                            value={modelName}
                            onChange={(e) => setModelName(e.target.value)}
                            placeholder="Nombre del Modelo"
                            className="w-full bg-slate-50 border border-slate-100 rounded-md pl-10 pr-4 py-3 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-violet-200 transition-all placeholder:text-slate-300"
                        />
                    </div>

                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-violet-400 transition-colors">
                            <Key size={14} />
                        </div>
                        <input 
                            type="password" 
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Tu API Key (Opcional - usa sistema)"
                            className="w-full bg-slate-50 border border-slate-100 rounded-md pl-10 pr-4 py-3 text-[12px] font-bold text-slate-800 focus:outline-none focus:border-violet-200 transition-all placeholder:text-slate-300"
                        />

                    </div>
                </div>

                <div className="p-4 rounded-lg bg-indigo-50/40 border border-indigo-100/30 text-[10px] text-slate-600 leading-relaxed italic">
                    <span className="font-black uppercase tracking-widest text-indigo-400 block mb-1.5 text-[8px]">Prompt de Prueba:</span>
                    "{TEST_PROMPT}"
                </div>

                <button 
                    onClick={runTest}
                    disabled={isTesting}
                    className="w-full h-12 rounded-lg bg-violet-600 text-white text-[10px] font-black uppercase tracking-[0.15em] hover:bg-violet-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-violet-100/50"
                >

                    {isTesting ? (
                        <RefreshCw size={16} className="animate-spin" />
                    ) : (
                        <>
                            <Play size={12} className="fill-current" />
                            Ejecutar Generación
                        </>
                    )}
                </button>
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-orange-50 border border-orange-100 text-orange-600 text-[10px] font-bold flex items-start gap-3">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{error}</p>
                </div>
            )}

            {images.length > 0 && (
                <div className="mt-2">
                    {images.map((img, i) => (
                        <div key={i} className="group relative aspect-square rounded-[24px] overflow-hidden border border-slate-100 bg-slate-50 shadow-md transition-all hover:shadow-lg">
                            <img src={img.url} alt="Generated Test" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <button 
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = img.url;
                                        link.download = `test-imagen-${Date.now()}.png`;
                                        link.click();
                                    }}
                                    className="p-3 rounded-lg bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-all"
                                >
                                    <Download size={16} />
                                </button>
                                <button 
                                    onClick={() => window.open(img.url, '_blank')}
                                    className="p-3 rounded-lg bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-all"
                                >
                                    <Eye size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {history.length > 0 && (
                <div className="flex flex-col gap-3 mt-2 border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2 px-1">
                        <History size={12} className="text-slate-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Últimos Resultados</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {history.map((entry) => (
                            <div key={entry.id} className="shrink-0 w-16 h-16 rounded-md overflow-hidden border border-slate-100 bg-slate-50 relative group cursor-pointer" onClick={() => window.open(entry.images[0]?.url, '_blank')}>
                                <img src={entry.images[0]?.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
