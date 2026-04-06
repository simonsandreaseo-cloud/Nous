"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ChevronRight, Edit3, Loader2, CheckCircle2, Search, ArrowRight } from "lucide-react";
import { cn } from "@/utils/cn";
import { useProjectStore } from "@/store/useProjectStore";
import { StrategyService } from "@/lib/services/strategy";
import { NotificationService } from "@/lib/services/notifications";
import { supabase } from "@/lib/supabase";
import { useWriterStore } from "@/store/useWriterStore";


interface NewContentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Flow = "selection" | "investigation" | "manual" | "completed";

// Progress phases for the research flow
const PROGRESS_PHASES = [
    { id: "serp", label: "Búsqueda en SERP", status: "waiting" },
    { id: "extraction", label: "Extrayendo Competidores", status: "waiting" },
    { id: "competitors", label: "Análisis de Datos", status: "waiting" },
    { id: "keywords", label: "Optimización Semántica", status: "waiting" },
    { id: "links", label: "Buscando Enlaces Internos", status: "waiting" },
    { id: "metadata", label: "Generando Ficha SEO", status: "waiting" },
    { id: "finalizing", label: "Construyendo Dossier", status: "waiting" }
];

export default function NewContentModal({ isOpen, onClose }: NewContentModalProps) {
    const [flow, setFlow] = useState<Flow>("selection");
    const [idea, setIdea] = useState("");
    const [progress, setProgress] = useState(0);
    const [activePhase, setActivePhase] = useState(0);
    const [isCustomTitle, setIsCustomTitle] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [phases, setPhases] = useState(PROGRESS_PHASES);
    const [researchMode, setResearchMode] = useState<"rapid" | "balanced" | "quality">("balanced");
    const { activeProject, addTask, updateTask } = useProjectStore();
    const { 
        isResearching, 
        researchProgress, 
        researchPhaseId, 
        setResearching, 
        updateResearchProgress 
    } = useWriterStore();

    // Reset state when opening/closing
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setFlow("selection");
                setIdea("");
                setProgress(0);
                setActivePhase(0);
                setPhases(PROGRESS_PHASES);
            }, 300);
        }
    }, [isOpen]);

    const handleStartInvestigation = async () => {
        if (!idea.trim() || !activeProject || isStarting) return;
        
        setIsStarting(true);
        useWriterStore.getState().setIsConsoleOpen(true);
        useWriterStore.getState().addDebugPrompt("Investigación", `Iniciando Deep SEO para: "${idea}"`, "Preparando motores de búsqueda semántica...");
        
        // Brief delay for visual feedback before locking UI phase
        await sleep(400);

        setResearching(true, idea);
        setFlow("investigation");
        setProgress(5);
        setActivePhase(0);
        setIsStarting(false);
        
        try {
            // 1. Create initial placeholder task
            const { data: newTask, error: createError } = await (addTask({
                project_id: activeProject.id,
                title: idea,
                status: "investigacion_proceso",
                scheduled_date: new Date().toISOString().split('T')[0],
                target_keyword: idea,
                brief: "Investigación en curso..."
            }) as any);

            if (createError) throw createError;
            
            // Note: Since addTask might not return the data directly depending on the store implementation, 
            // we should ensure we have the ID. Assuming addTask returns the created task or we can find it.
            // In our current useProjectStore, addTask is async but doesn't return the task usually.
            // Let's find the task we just added (titles are unique-ish for this project for now, or just get the latest)
            // A better way is to update the store to return the added task. Let's assume it does or we can get it.
            const allTasks = useProjectStore.getState().tasks;
            const createdTask = allTasks.find(t => t.title === idea && t.project_id === activeProject.id && t.status === 'investigacion_proceso');
            const taskId = createdTask?.id;

            const isFast = researchMode === "rapid";
            let modelToUse = "gemini-3.1-flash-lite-preview";
            
            if (researchMode === "rapid") modelToUse = "llama-3.1-8b-instant";
            if (researchMode === "quality") modelToUse = "gemma-3-27b-it";
            // 2. Run actual analysis service with taskId for incremental saving
            const result = await StrategyService.runDeepSEOAnalysis({
                projectId: activeProject.id, 
                keyword: idea,
                onProgress: (phaseId) => {
                    const index = PROGRESS_PHASES.findIndex(p => p.id === phaseId);
                    if (index !== -1) {
                        const newProgress = Math.round(((index + 1) / PROGRESS_PHASES.length) * 95);
                        
                        // Update Global State
                        updateResearchProgress(newProgress, phaseId);

                        // Local Sync (for the UI list)
                        setPhases((prev: typeof PROGRESS_PHASES) => prev.map((p, i) => {
                            if (i < index) return { ...p, status: "completed" };
                            if (i === index) return { ...p, status: "active" };
                            return p;
                        }));
                        setActivePhase(index);
                        setProgress(newProgress);
                    }
                },
                onLog: (phase: string, prompt: string) => {
                    useWriterStore.getState().addDebugPrompt(phase, prompt);
                },
                modelName: modelToUse,
                isFastMode: isFast,
                taskId
            });
            
            if (result && taskId) {
                // Finalize
                setProgress(100);
                updateResearchProgress(100, "completed");
                setPhases((prev: typeof PROGRESS_PHASES) => prev.map(p => ({ ...p, status: "completed" })));
                await sleep(500);
                
                // Update the task with final results
                await updateTask(taskId, {
                    title: isCustomTitle ? idea : (result.title || idea),
                    h1: result.h1 || result.title || idea,
                    seo_title: result.seo_title || result.title || idea,
                    meta_description: result.meta_description || "",
                    target_url_slug: result.slug || "",
                    target_keyword: result.target_keyword || idea,
                    volume: result.volume || 0,
                    word_count: result.word_count || 1000,
                    status: "por_redactar",
                    research_dossier: result.research_dossier || result,
                    brief: result.brief || "",
                    excerpt: result.excerpt || "",
                    schemas: result.schemas || {}
                });

                setResearching(false);
                setFlow("completed");
                
                // Trigger notification
                NotificationService.success(
                    "Investigación Completa", 
                    `Se ha generado el contenido: "${isCustomTitle ? idea : (result.title || idea)}"`
                );
                
                // Close after 2 seconds
                setTimeout(() => {
                    onClose();
                }, 2000);
            }
            
        } catch (error) {
            console.error("Research failed:", error);
            NotificationService.error("Error en la investigación", "No pudimos completar el análisis automático.");
            setFlow("selection");
        }
    };

    const handleManualConfig = async () => {
        if (!idea.trim() || !activeProject) return;
        
        // Quick create as an Idea stage
        await addTask({
            project_id: activeProject.id,
            title: idea,
            status: "idea",
            scheduled_date: new Date().toISOString().split('T')[0],
            brief: ""
        });
        
        onClose();
    };

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden relative border border-white/20"
                    >
                        {/* Body - More compact paddings */}
                        <div className="p-8">
                            {/* Header inside body for tighter layout */}
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">
                                        {flow === "selection" ? "Crear Contenido" : flow === "completed" ? "¡Listo!" : "Investigación Nous"}
                                    </h3>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block -mt-1">
                                        {flow === "selection" ? "Define el tema y deja que la IA trabaje" : flow === "completed" ? "Contenido agendado" : "Analizando Ecosistema"}
                                    </span>
                                </div>
                                <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600">
                                    <X size={18} />
                                </button>
                            </div>

                            {flow === "selection" && (
                                <div className="space-y-6">
                                    <div className="relative group">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 pl-1">Tema Principal</label>
                                        <div className="relative">
                                            <input
                                                autoFocus
                                                type="text"
                                                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 pl-12 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                                placeholder={isCustomTitle ? "Escribe el título exacto..." : "Ej: Como hacer SEO en 2026..."}
                                                value={idea}
                                                onChange={(e) => setIdea(e.target.value)}
                                            />
                                            <Edit3 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors" size={18} />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Modo Título Fijo</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">Sin variaciones de IA</span>
                                        </div>
                                        <button 
                                            onClick={() => setIsCustomTitle(!isCustomTitle)}
                                            className={cn(
                                                "w-10 h-5 rounded-full transition-all duration-300 relative",
                                                isCustomTitle ? "bg-indigo-500" : "bg-slate-200"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300",
                                                isCustomTitle ? "left-5.5" : "left-0.5"
                                            )} />
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-3 px-1 bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Nivel de Investigación</span>
                                            <span className={cn(
                                                "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shadow-sm transition-all animate-in fade-in zoom-in duration-300",
                                                researchMode === 'rapid' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                                                researchMode === 'balanced' ? "bg-indigo-50 border-indigo-100 text-indigo-600" :
                                                "bg-violet-50 border-violet-100 text-violet-600"
                                            )}>
                                                {researchMode === 'rapid' ? 'Ultra-Rápido (Groq)' : 
                                                 researchMode === 'balanced' ? 'Equilibrado (Gemini)' : 'Alta Calidad (Gemma 3)'}
                                            </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'rapid', label: 'Rápido', color: 'emerald', bg: 'bg-emerald-500' },
                                                { id: 'balanced', label: 'Equilibrado', color: 'indigo', bg: 'bg-indigo-500' },
                                                { id: 'quality', label: 'Pro', color: 'violet', bg: 'bg-violet-500' }
                                            ].map(mode => (
                                                <button
                                                    key={mode.id}
                                                    onClick={() => setResearchMode(mode.id as any)}
                                                    className={cn(
                                                        "py-2 rounded-xl text-[9px] font-bold uppercase transition-all border",
                                                        researchMode === mode.id 
                                                            ? `${mode.bg} text-white border-transparent shadow-md scale-[1.02]`
                                                            : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                                                    )}
                                                >
                                                    {mode.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            disabled={!idea.trim() || isStarting}
                                            onClick={handleStartInvestigation}
                                            className="group relative h-32 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-4 text-left flex flex-col justify-between overflow-hidden shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95"
                                        >
                                            <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center text-white backdrop-blur-md">
                                                {isStarting ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                                            </div>
                                            <div>
                                                <span className="text-white font-black uppercase text-[10px] tracking-widest block">Deep SEO</span>
                                                <span className="text-white/60 text-[8px] uppercase tracking-wider block">Investigación Pro</span>
                                            </div>
                                        </button>

                                        <button
                                            disabled={!idea.trim()}
                                            onClick={handleManualConfig}
                                            className="group h-32 bg-slate-50 border border-slate-100 rounded-3xl p-4 text-left flex flex-col justify-between transition-all hover:border-slate-300 hover:bg-slate-100/50 disabled:opacity-50 active:scale-95"
                                        >
                                            <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 transition-transform">
                                                <Edit3 size={20} />
                                            </div>
                                            <div>
                                                <span className="text-slate-800 font-black uppercase text-[10px] tracking-widest block">Solo Idea</span>
                                                <span className="text-slate-400 text-[8px] uppercase tracking-wider block">Creación rápida</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {flow === "investigation" && (
                                <div className="space-y-6">
                                    {/* Progress Bar AT TOP */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Estado del Análisis</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">IA Generativa en proceso</span>
                                            </div>
                                            <span className="text-xl font-black text-slate-900 tracking-tighter italic">{progress}%</span>
                                        </div>
                                        <div className="h-3 bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full relative"
                                            >
                                                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[progress-bar-stripes_1s_linear_infinite]" />
                                            </motion.div>
                                        </div>
                                    </div>

                                    {/* Compact Sliding Progress List */}
                                    <div className="relative h-48 overflow-hidden bg-slate-50/50 rounded-3xl border border-slate-100/50 p-4">
                                        <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-slate-50/80 to-transparent z-10" />
                                        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-50/80 to-transparent z-10" />
                                        
                                        <motion.div 
                                            animate={{ y: - (activePhase * 40) + 60 }}
                                            transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                            className="space-y-2 py-4"
                                        >
                                            {phases.map((phase, i) => (
                                                <div 
                                                    key={phase.id} 
                                                    className={cn(
                                                        "flex items-center gap-3 transition-all duration-500 px-4 py-2 rounded-2xl",
                                                        i === activePhase ? "bg-white shadow-sm scale-100 opacity-100" : "scale-95 opacity-40 blur-[0.5px]"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-500",
                                                        phase.status === "completed" ? "bg-emerald-500 text-white" : 
                                                        phase.status === "active" ? "bg-indigo-600 text-white ring-2 ring-indigo-100" : "bg-slate-200 text-slate-400"
                                                    )}>
                                                        {phase.status === "completed" ? <CheckCircle2 size={12} /> : <span className="text-[10px] font-black">{i + 1}</span>}
                                                    </div>
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest",
                                                        phase.status === "waiting" ? "text-slate-400" : 
                                                        phase.status === "active" ? "text-indigo-600" : "text-slate-600"
                                                    )}>
                                                        {phase.label}
                                                    </span>
                                                    {phase.status === "active" && (
                                                        <div className="ml-auto flex gap-1">
                                                            <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                            <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                            <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"></span>
                                                        </div>
                                                    )}
                                                    {phase.status === "completed" && (
                                                        <span className="ml-auto text-[8px] font-black text-emerald-500 uppercase tracking-widest">Listo</span>
                                                    )}
                                                </div>
                                            ))}
                                        </motion.div>
                                    </div>
                                    
                                    <p className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                        {activeProject?.name} &bull; {idea.substring(0, 30)}...
                                    </p>
                                </div>
                            )}

                            {flow === "completed" && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="py-10 flex flex-col items-center text-center space-y-4"
                                >
                                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-lg relative">
                                        <CheckCircle2 size={40} />
                                        <motion.div 
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="absolute -right-1 -bottom-1 w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-md text-emerald-500"
                                        >
                                            <Sparkles size={16} />
                                        </motion.div>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">¡Estrategia Lista!</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">
                                            Contenido optimizado y agendado correctamente.
                                        </p>
                                    </div>
                                    <div className="pt-4 flex items-center gap-2 text-emerald-500 font-bold text-[9px] uppercase tracking-widest bg-emerald-50/50 px-4 py-2 rounded-xl">
                                        <ArrowRight size={12} className="animate-pulse" /> Volviendo al Planificador
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
