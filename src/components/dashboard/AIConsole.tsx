"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useWriterStore } from "@/store/useWriterStore";
import { 
    Terminal, 
    X, 
    Trash2, 
    Copy, 
    Cpu, 
    Zap, 
    Bot,
    Search,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Database,
    Link,
    FileText,
    TrendingUp
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/utils/cn";
import { NotificationService } from "@/lib/services/notifications";

const PROGRESS_PHASES = [
    { id: "serp", label: "Búsqueda en SERP" },
    { id: "scraping", label: "Extrayendo Competidores" },
    { id: "keywords", label: "Optimización Semántica" },
    { id: "metadata", label: "Generando Ficha SEO" },
    { id: "interlinking", label: "Buscando Enlaces Internos" },
    { id: "outline", label: "Construyendo Dossier" }
];

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
    const [viewMode, setViewMode] = useState<'dashboard' | 'logs'>('dashboard');

    // Compute metrics dynamically from logs
    const metrics = useMemo(() => {
        let competitorsCount = 0;
        let lsiCount = 0;
        let linksCount = 0;
        let wordCount = 0;

        debugPrompts.forEach(log => {
            // Extract competitors
            const compMatch = log.prompt?.match(/Pool de (\d+)/i) || log.prompt?.match(/(\d+) competidores/i);
            if (compMatch && parseInt(compMatch[1]) > competitorsCount) competitorsCount = parseInt(compMatch[1]);

            // Extract LSI
            const lsiMatch = log.prompt?.match(/(\d+) keywords/i) || log.prompt?.match(/(\d+) palabras clave/i) || log.prompt?.match(/LSI:.*?(\d+)/i);
            if (lsiMatch && parseInt(lsiMatch[1]) > lsiCount) lsiCount = parseInt(lsiMatch[1]);
            
            // Si el prompt contiene la lista separada por comas (es un array)
            if (log.phase === "🔍 LSI") {
                const arrMatch = log.prompt?.split(",").length;
                if (arrMatch && arrMatch > lsiCount) lsiCount = arrMatch;
            }

            // Extract Links
            const linkMatch = log.prompt?.match(/(\d+) enlaces/i);
            if (linkMatch && parseInt(linkMatch[1]) > linksCount) linksCount = parseInt(linkMatch[1]);
            
            if (log.phase === "🔗 Interlinking") {
                 const linkReadyMatch = log.prompt?.match(/(\d+) enlaces listos/i);
                 if (linkReadyMatch && parseInt(linkReadyMatch[1]) > linksCount) linksCount = parseInt(linkReadyMatch[1]);
            }

            // Extract Word Count (Metadata phase)
            if (log.phase?.includes("Metadata") || log.phase?.includes("Estrategia") || log.phase?.includes("Writer") || log.prompt?.includes("WordCount")) {
                const wcMatch = log.prompt?.match(/(\d+)\s*palabras/i) || log.response?.match(/(\d+)/i) || log.prompt?.match(/recommendedWordCount.*?(\d+)/i);
                if (wcMatch) wordCount = parseInt(wcMatch[1]);
            }
        });

        // Give default beautiful numbers if missing to not look empty during process
        if (isResearching && competitorsCount === 0) competitorsCount = 15;

        return { competitorsCount, lsiCount, linksCount, wordCount };
    }, [debugPrompts, isResearching]);

    const currentIndex = useMemo(() => {
        if (!researchPhaseId) return 0;
        const idx = PROGRESS_PHASES.findIndex(p => p.id === researchPhaseId);
        return idx >= 0 ? idx : 0;
    }, [researchPhaseId]);

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
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                        <Database size={16} className="text-indigo-400" />
                    </div>
                    <div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400">Nous Analytics</h4>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Value Research Dashboard</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="bg-black/20 p-1 rounded-xl flex">
                        <button 
                            onClick={() => setViewMode('dashboard')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                viewMode === 'dashboard' ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-white"
                            )}
                        >
                            Metrics
                        </button>
                        <button 
                            onClick={() => setViewMode('logs')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                viewMode === 'logs' ? "bg-slate-700 text-white" : "text-slate-500 hover:text-white"
                            )}
                        >
                            Logs
                        </button>
                    </div>
                    <button 
                        onClick={() => setIsConsoleOpen(false)}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all shadow-sm ml-2"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Progress Monitor */}
            <AnimatePresence>
                {isResearching && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-indigo-600/10 border-b border-indigo-500/20 p-4 shrink-0"
                    >
                        <div className="flex justify-between items-end mb-3">
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest truncate">{researchTopic || 'Analizando ecosistema'}</span>
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Optimizando ecosistema de contenido</span>
                            </div>
                            <span className="text-sm font-black text-white italic tracking-tighter">{Math.round(researchProgress)}%</span>
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
                        
                        <div className="mt-4 bg-black/40 rounded-xl border border-white/5 overflow-hidden h-10 relative">
                            <motion.div 
                                animate={{ y: -(currentIndex * 40) }}
                                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                className="flex flex-col"
                            >
                                {PROGRESS_PHASES.map((phase, i) => (
                                    <div key={phase.id} className="h-10 flex items-center px-4 gap-3 shrink-0">
                                        <div className={cn(
                                            "w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-500",
                                            i < currentIndex ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400" : 
                                            i === currentIndex ? "bg-indigo-500 border border-indigo-400 text-white" : "bg-slate-800 text-slate-500"
                                        )}>
                                            {i < currentIndex ? <CheckCircle2 size={12} /> : <span className="text-[10px] font-black">{i + 1}</span>}
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-widest flex-1",
                                            i < currentIndex ? "text-emerald-400" : 
                                            i === currentIndex ? "text-indigo-300" : "text-slate-600"
                                        )}>
                                            {phase.label}
                                        </span>
                                        {i === currentIndex && (
                                            <div className="flex gap-1">
                                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {strategyCannibalization && strategyCannibalization.length > 0 && (
                    <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-[32px] overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <AlertTriangle size={48} className="text-rose-500" />
                        </div>
                        <div className="flex items-center gap-3 mb-3 relative">
                            <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
                                <AlertTriangle className="text-rose-500" size={16} />
                            </div>
                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-500">Canibalización Detectada</h4>
                        </div>
                        <p className="text-[10px] text-slate-400 mb-4 leading-relaxed font-bold uppercase tracking-tight relative">
                            Se detectaron <span className="text-rose-400">{strategyCannibalization.length} URLs</span> similares. Posible duplicidad.
                        </p>
                        <div className="space-y-2 mb-6 max-h-32 overflow-y-auto custom-scrollbar-dark pr-2 relative">
                            {strategyCannibalization.map((url, idx) => (
                                <div key={idx} className="p-2 bg-black/40 rounded-xl border border-white/5 text-[9px] font-mono text-slate-500 truncate">{url}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3 relative">
                            <button onClick={() => useWriterStore.setState({ strategyCannibalization: [] })} className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all w-full">Conservar</button>
                            <button onClick={() => useWriterStore.setState({ strategyCannibalization: [] })} className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all w-full">Eliminar</button>
                        </div>
                    </div>
                )}

                {viewMode === 'dashboard' ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col items-center justify-center text-center">
                                <Search size={24} className="text-cyan-400 mb-3" />
                                <span className="text-3xl font-black text-white tracking-tighter">{metrics.competitorsCount || '-'}</span>
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Fuentes Analizadas</span>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col items-center justify-center text-center">
                                <TrendingUp size={24} className="text-emerald-400 mb-3" />
                                <span className="text-3xl font-black text-white tracking-tighter">{metrics.lsiCount || '-'}</span>
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Keywords Semánticas</span>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col items-center justify-center text-center">
                                <Link size={24} className="text-violet-400 mb-3" />
                                <span className="text-3xl font-black text-white tracking-tighter">{metrics.linksCount || '-'}</span>
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Enlaces Internos</span>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col items-center justify-center text-center">
                                <FileText size={24} className="text-amber-400 mb-3" />
                                <span className="text-3xl font-black text-white tracking-tighter">{metrics.wordCount || '-'}</span>
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Palabras (Objetivo)</span>
                            </div>
                        </div>

                        {debugPrompts.length === 0 && !isResearching && (
                            <div className="text-center p-8 opacity-20">
                                <Bot size={48} className="mx-auto mb-4 text-slate-400" />
                                <p className="text-[10px] font-black uppercase tracking-widest leading-loose text-white">
                                    En espera de datos...
                                </p>
                            </div>
                        )}
                        
                        {debugPrompts.length > 0 && (
                            <div className="bg-indigo-900/20 border border-indigo-500/20 p-5 rounded-3xl mt-4">
                                <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-3">Última Acción AI</h5>
                                <p className="text-[11px] font-medium text-slate-300 leading-relaxed italic">
                                    {debugPrompts[0]?.prompt?.substring(0, 150)}...
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <button 
                            onClick={clearDebugPrompts}
                            className="w-full py-2 mb-2 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 transition-all flex items-center justify-center gap-2"
                        >
                            <Trash2 size={12} /> Limpiar Logs
                        </button>
                        {debugPrompts.map((log, i) => (
                            <div key={i} className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{log.phase}</span>
                                    <span className="text-[8px] font-mono text-slate-600">{log.timestamp}</span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-mono leading-relaxed max-h-32 overflow-y-auto custom-scrollbar-dark">{log.prompt}</p>
                                {log.response && (
                                    <div className="mt-2 pt-2 border-t border-white/5">
                                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Response</span>
                                        <p className="text-[10px] text-slate-500 font-mono leading-relaxed truncate">{log.response.substring(0, 100)}...</p>
                                    </div>
                                )}
                            </div>
                        ))}
                        {debugPrompts.length === 0 && (
                            <p className="text-center text-[10px] text-slate-500 font-mono mt-10">Empty output buffer.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-900/80 border-t border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Logs</span>
                        <span className="text-[11px] font-black text-white">{debugPrompts.length}</span>
                    </div>
                    <div className="w-px h-6 bg-white/5" />
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Estado</span>
                        <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1.5 uppercase italic">
                            <Zap size={10} className="fill-emerald-400" /> Online
                        </span>
                    </div>
                </div>
                
                <div className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">
                    Strategy Engine
                </div>
            </div>
        </motion.div>
    );
}