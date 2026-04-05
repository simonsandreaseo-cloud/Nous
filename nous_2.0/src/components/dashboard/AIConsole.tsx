"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useWriterStore } from "@/store/useWriterStore";
import { 
    Terminal, 
    X, 
    Trash2, 
    Copy, 
    ChevronDown, 
    ChevronUp, 
    Cpu, 
    Zap, 
    Bot,
    Search,
    MessageSquare,
    CheckCircle2,
    Clock,
    AlertTriangle
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/utils/cn";

export default function AIConsole() {
    const { 
        debugPrompts, 
        clearDebugPrompts, 
        isConsoleOpen, 
        setIsConsoleOpen,
        strategyCannibalization,
        isResearching,
        researchProgress,
        researchTopic,
        researchPhaseId 
    } = useWriterStore();
    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
    const [viewMode, setViewMode] = useState<'prompt' | 'response'>('prompt');

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-[450px] flex flex-col bg-slate-950 border-l border-white/10 h-full shadow-2xl relative z-50 transition-all overflow-hidden"
        >
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Terminal size={16} className="text-emerald-400" />
                    </div>
                    <div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400">Neural Monitor</h4>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Gemini Real-time Stream</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={clearDebugPrompts}
                        className="p-2 text-slate-500 hover:text-white transition-colors"
                        title="Limpiar Consola"
                    >
                        <Trash2 size={16} />
                    </button>
                    <button 
                        onClick={() => setIsConsoleOpen(false)}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition-all shadow-sm"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
            {/* Progress Monitor (Active only during research) */}
            <AnimatePresence>
                {isResearching && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-indigo-600/10 border-b border-indigo-500/20 p-4"
                    >
                        <div className="flex justify-between items-end mb-3">
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest truncate">{researchTopic}</span>
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Analizando en segundo plano</span>
                            </div>
                            <span className="text-sm font-black text-white italic tracking-tighter">{researchProgress}%</span>
                        </div>
                        
                        <div className="h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/5">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${researchProgress}%` }}
                                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full relative"
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:10px_10px] animate-[progress-bar-stripes_1s_linear_infinite]" />
                            </motion.div>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-3 p-2 bg-black/40 rounded-md border border-white/5">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Fase Actual: {researchPhaseId}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {/* Cannibalization Alert */}
                {strategyCannibalization && strategyCannibalization.length > 0 && (
                    <div className="p-5 mb-2 bg-rose-500/10 border border-rose-500/20 rounded-[32px] overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <AlertTriangle size={48} className="text-rose-500" />
                        </div>
                        
                        <div className="flex items-center gap-3 mb-3 relative">
                            <div className="w-8 h-8 rounded-md bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
                                <AlertTriangle className="text-rose-500" size={16} />
                            </div>
                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-500">Canibalización Detectada</h4>
                        </div>
                        
                        <p className="text-[10px] text-slate-400 mb-4 leading-relaxed font-bold uppercase tracking-tight relative">
                            Se han detectado <span className="text-rose-400">{strategyCannibalization.length} URLs</span> de tu proyecto en el SERP. 
                            Posible duplicidad de intención detectada.
                        </p>

                        <div className="space-y-2 mb-6 max-h-32 overflow-y-auto custom-scrollbar-dark pr-2">
                            {strategyCannibalization.map((url, idx) => (
                                <div key={idx} className="p-2 bg-black/40 rounded-md border border-white/5 text-[9px] font-mono text-slate-500 truncate hover:text-rose-300 transition-colors cursor-help" title={url}>
                                    {url}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3 relative">
                            <button 
                                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[9px] font-black uppercase tracking-widest transition-all border border-white/5"
                                onClick={() => useWriterStore.setState({ strategyCannibalization: [] })}
                            >
                                Conservar
                            </button>
                            <button 
                                className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-900/20 border border-rose-400/20"
                                onClick={() => {
                                    // logic to cancel/delete would go here
                                    useWriterStore.setState({ strategyCannibalization: [] });
                                }}
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                )}

                {debugPrompts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20">
                        <Cpu size={48} className="mb-4 text-emerald-400" />
                        <p className="text-[10px] font-black uppercase tracking-widest leading-loose">
                            Sistema en espera...<br/>
                            Inicia una investigación o redacción para capturar logs.
                        </p>
                    </div>
                ) : (
                    debugPrompts.map((log, i) => (
                        <div 
                            key={i} 
                            className={cn(
                                "group border rounded-lg transition-all overflow-hidden",
                                expandedIndex === i 
                                    ? "bg-slate-900/80 border-emerald-500/30 shadow-lg shadow-emerald-500/5" 
                                    : "bg-white/5 border-white/5 hover:border-white/10"
                            )}
                        >
                            {/* Log Header */}
                            <div 
                                onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                                className="p-4 cursor-pointer flex items-center justify-between gap-4"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        log.response ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500 animate-pulse"
                                    )} />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest truncate">{log.phase}</span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Clock size={10} className="text-slate-600" />
                                            <span className="text-[9px] font-mono text-slate-600 uppercase">{log.timestamp}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    {log.response && (
                                        <CheckCircle2 size={14} className="text-emerald-500/50" />
                                    )}
                                    {expandedIndex === i ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                                </div>
                            </div>

                            {/* Log Content */}
                            <AnimatePresence>
                                {expandedIndex === i && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-white/5"
                                    >
                                        {/* Tabs */}
                                        <div className="flex p-2 gap-2 bg-black/20">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setViewMode('prompt'); }}
                                                className={cn(
                                                    "flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                                    viewMode === 'prompt' ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                                                )}
                                            >
                                                <Bot size={12} /> Prompt
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setViewMode('response'); }}
                                                className={cn(
                                                    "flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                                    viewMode === 'response' ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300",
                                                    !log.response && "opacity-30 cursor-not-allowed"
                                                )}
                                                disabled={!log.response}
                                            >
                                                <Zap size={12} /> Response
                                            </button>
                                        </div>

                                        <div className="relative p-4 bg-black/40">
                                            <pre className="text-[11px] text-slate-400 font-mono leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar-dark selection:bg-emerald-500/20 selection:text-emerald-200">
                                                {viewMode === 'prompt' ? log.prompt : log.response || "No data yet..."}
                                            </pre>
                                            <button 
                                                onClick={() => navigator.clipboard.writeText(viewMode === 'prompt' ? log.prompt : (log.response || ""))}
                                                className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md transition-all shadow-lg shadow-black/20"
                                                title="Copiar al portapapeles"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))
                )}
            </div>

            {/* Footer Stats */}
            <div className="p-4 bg-slate-900/80 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Logs</span>
                        <span className="text-[11px] font-black text-white">{debugPrompts.length}</span>
                    </div>
                    <div className="w-px h-6 bg-white/5" />
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Estado</span>
                        <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1.5 uppercase italic">
                            <Zap size={10} className="fill-emerald-400" /> Live
                        </span>
                    </div>
                </div>
                
                <div className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">
                    Powered by Helios Engine
                </div>
            </div>
        </motion.div>
    );
}
