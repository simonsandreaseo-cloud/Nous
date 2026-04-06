import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, 
    Search, 
    Layout, 
    Zap, 
    X, 
    Activity,
    ChevronRight,
    BrainCircuit,
    Terminal,
    Trash2,
    Copy,
    ChevronDown,
    ChevronUp,
    Cpu,
    Bot,
    AlertTriangle,
    MessageSquare,
    CheckCircle2,
    Clock
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Task } from '@/types/project';
import { NousOrbLite } from '@/components/canvas/NousOrbLite';
import { useAppStore } from '@/store/useAppStore';
import { useWriterStore } from '@/store/useWriterStore';

interface NousOrbProps {
    tasks?: Task[];
    onAction?: (actionType: 'sugerir_estrategia' | 'investigar_ideas' | 'generar_outlines' | 'redaccion_masiva' | 'humanizacion_masiva') => void;
    isProcessing?: boolean;
    processingProgress?: number;
    activeProjectName?: string;
    selectedCount?: number;
    viewMode?: 'planner' | 'writer';
    // Writer specific actions
    onWriterAction?: (actionType: 'seo' | 'outline' | 'generate' | 'refine' | 'humanize') => void;
}

export default function NousOrb({ 
    tasks = [], 
    onAction, 
    onWriterAction,
    isProcessing = false, 
    processingProgress = 0,
    activeProjectName = "Sistema Nous",
    selectedCount = 0,
    viewMode = 'planner'
}: NousOrbProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { nousMode, setNousMode } = useAppStore();
    
    // Writer specific states from store
    const { 
        creativityLevel, setCreativityLevel,
        researchMode, setResearchMode,
        isConsoleOpen, setIsConsoleOpen,
        debugPrompts, clearDebugPrompts,
        strategyOutline, researchProgress: storeProgress,
        isAnalyzingSEO, isPlanningStructure, isGenerating, isHumanizing,
        statusMessage, humanizerStatus,
        strategyCannibalization,
        researchTopic,
        researchPhaseId
    } = useWriterStore();

    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
    const [logViewMode, setLogViewMode] = useState<'prompt' | 'response'>('prompt');

    // Progress logic
    const effectiveProgress = viewMode === 'writer' ? (storeProgress || processingProgress) : processingProgress;
    const effectiveIsProcessing = viewMode === 'writer' ? (isAnalyzingSEO || isPlanningStructure || isGenerating || isHumanizing || isProcessing) : isProcessing;
    const effectiveStatus = viewMode === 'writer' ? (isHumanizing ? humanizerStatus : statusMessage || "Procesando...") : "Investigando...";

    // Detección Inteligente de Procesos
    const stats = useMemo(() => {
        if (viewMode === 'writer') return { ideas: 0, needOutline: 0, needDraft: 0, needHuman: 0 };
        
        // Filter tasks that need research
        const ideas = tasks.filter(t => t.status === 'idea' || !t.research_dossier);
        
        // Filter tasks that need outlines (have research, no outline structure)
        const needOutline = tasks.filter(t => 
            (t.status === 'por_redactar' || t.status === 'en_investigacion' || t.status === 'investigacion_proceso' || t.status === 'idea') && 
            t.research_dossier && (!t.outline_structure || !t.outline_structure.headers || t.outline_structure.headers.length === 0)
        );

        // Filter tasks that need drafting (have outline, no content)
        const needDraft = tasks.filter(t => 
            t.outline_structure?.headers?.length > 0 && !t.content_body
        );

        // Filter tasks that need humanization (have content, not humanized)
        const needHuman = tasks.filter(t => 
            t.content_body && (!t.metadata?.is_humanized && !t.metadata?.humanized_at)
        );

        return {
            ideas: ideas.length,
            needOutline: needOutline.length,
            needDraft: needDraft.length,
            needHuman: needHuman.length
        };
    }, [tasks, viewMode]);

    const effectiveSelectedCount = selectedCount || 0;
    const hasActions = viewMode === 'planner' && (stats.ideas > 0 || stats.needOutline > 0 || stats.needHuman > 0 || stats.needDraft > 0 || effectiveSelectedCount > 0);

    const modes = [
        { id: 'alta_calidad', label: 'Alta Calidad' },
        { id: 'equilibrado', label: 'Equilibrado' },
        { id: 'rapido', label: 'Rápido' },
    ];

    return (
        <div className="fixed bottom-10 right-10 z-[300] flex flex-col items-end gap-4">
            {/* Monitor AI (Neural Prompt Console) - Ported from WriterEditor */}
            <AnimatePresence>
                {isConsoleOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="w-[500px] max-h-[600px] bg-slate-950 border border-white/10 rounded-[32px] shadow-[0_32px_128px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col z-[310] backdrop-blur-2xl ring-1 ring-white/10"
                    >
                        {/* Header */}
                        <div className="p-5 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                    <Terminal size={16} className="text-emerald-400" />
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400">Neural Monitor</h4>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Helios Engine Live Stream</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => {
                                        const allText = debugPrompts.map(p => `--- PHASE: ${p.phase} ---\nPROMPT:\n${p.prompt}\n\nRESPONSE:\n${p.response || 'No response'}\n`).join('\n\n');
                                        navigator.clipboard.writeText(allText);
                                    }}
                                    className="p-2 text-slate-500 hover:text-white transition-colors"
                                    title="Copiar Todo"
                                >
                                    <Copy size={14} />
                                </button>
                                <button 
                                    onClick={clearDebugPrompts}
                                    className="p-2 text-slate-500 hover:text-white transition-colors"
                                    title="Limpiar Consola"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <button onClick={() => setIsConsoleOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Progress Monitor (Active only during research) */}
                        <AnimatePresence>
                            {effectiveIsProcessing && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-indigo-600/10 border-b border-indigo-500/20 p-4"
                                >
                                    <div className="flex justify-between items-end mb-3">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest truncate">{researchTopic || effectiveStatus}</span>
                                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Analizando en segundo plano</span>
                                        </div>
                                        <span className="text-sm font-black text-white italic tracking-tighter">{effectiveProgress}%</span>
                                    </div>
                                    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${effectiveProgress}%` }}
                                            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Logs List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {/* Cannibalization Alert */}
                            {strategyCannibalization && strategyCannibalization.length > 0 && (
                                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl relative overflow-hidden">
                                     <div className="flex items-center gap-3 mb-2">
                                        <AlertTriangle className="text-rose-500" size={14} />
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500">Canibalización Detectada</h4>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mb-3">
                                        Se han encontrado {strategyCannibalization.length} URLs de tu proyecto en el SERP.
                                    </p>
                                    <div className="max-h-24 overflow-y-auto custom-scrollbar pr-2 space-y-1">
                                        {strategyCannibalization.map((url: string, idx: number) => (
                                            <div key={idx} className="p-2 bg-black/40 rounded-lg text-[8px] font-mono text-slate-500 truncate">
                                                {url}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {debugPrompts.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-20">
                                    <Cpu size={32} className="mb-4 text-emerald-400" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] leading-loose">
                                        Sistema Ready<br/>Capturando señales...
                                    </p>
                                </div>
                            ) : (
                                debugPrompts.map((log, i) => (
                                    <div 
                                        key={i} 
                                        className={cn(
                                            "border rounded-2xl transition-all overflow-hidden",
                                            expandedIndex === i ? "bg-white/5 border-emerald-500/30" : "bg-black/20 border-white/5"
                                        )}
                                    >
                                        <div 
                                            onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                                            className="p-3 cursor-pointer flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", log.response ? "bg-emerald-500" : "bg-amber-500 animate-pulse")} />
                                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest truncate">{log.phase}</span>
                                            </div>
                                            {expandedIndex === i ? <ChevronUp size={12} className="text-slate-600" /> : <ChevronDown size={12} className="text-slate-600" />}
                                        </div>

                                        <AnimatePresence>
                                            {expandedIndex === i && (
                                                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="border-t border-white/5 overflow-hidden">
                                                    <div className="flex bg-black/40 p-1 gap-1">
                                                        <button onClick={() => setLogViewMode('prompt')} className={cn("flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all", logViewMode === 'prompt' ? "bg-slate-800 text-white" : "text-slate-600")}>Prompt</button>
                                                        <button onClick={() => setLogViewMode('response')} className={cn("flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all", logViewMode === 'response' ? "bg-slate-800 text-white" : "text-slate-600", !log.response && "opacity-20")}>Response</button>
                                                    </div>
                                                    <div className="p-3 relative">
                                                        <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                                                            {logViewMode === 'prompt' ? log.prompt : (log.response || "Esperando respuesta...")}
                                                        </pre>
                                                        <button onClick={() => navigator.clipboard.writeText(logViewMode === 'prompt' ? log.prompt : (log.response || ""))} className="absolute top-2 right-2 p-1.5 bg-white/5 rounded-lg text-slate-500 hover:text-white">
                                                            <Copy size={10} />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        {/* Footer */}
                        <div className="p-3 bg-slate-900 border-t border-white/5 flex items-center justify-between text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">
                            <span>Helios v2.0 Monitoring</span>
                            <div className="flex items-center gap-2">
                                <Activity size={10} className="text-emerald-500" />
                                <span className="text-emerald-500">Live</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Menú del Asistente Nous */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
                        className={cn(
                            "w-[340px] bg-white/80 backdrop-blur-3xl border border-white/20 rounded-[40px] shadow-[0_32px_128px_rgba(0,0,0,0.15)] overflow-hidden",
                            "ring-1 ring-black/[0.05]"
                        )}
                    >
                        <div className="p-4 border-b border-slate-100/30 bg-slate-50/20 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BrainCircuit size={14} className="text-indigo-500" />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800">
                                    Nous {viewMode === 'writer' ? "Editor" : "Global"}
                                </h4>
                            </div>
                            <div className="flex items-center gap-2">
                                {viewMode === 'writer' && (
                                    <button 
                                        onClick={() => { setIsConsoleOpen(!isConsoleOpen); setIsOpen(false); }}
                                        className={cn(
                                            "p-1.5 rounded-xl transition-all border",
                                            isConsoleOpen ? "bg-cyan-50 border-cyan-100 text-cyan-600" : "hover:bg-slate-100 border-transparent text-slate-400"
                                        )}
                                        title="Monitor AI"
                                    >
                                        <Activity size={12} />
                                    </button>
                                )}
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 hover:bg-slate-200/50 rounded-xl transition-colors text-slate-400"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {/* SECCIÓN DE MODOS (HORIZONTAL SWITCH) */}
                            <div className="space-y-3">
                                <div className="relative p-1 bg-slate-100/50 rounded-2xl border border-slate-200/30 flex items-center h-10 overflow-hidden">
                                    {/* Sliding Background */}
                                    <motion.div
                                        className="absolute h-8 bg-slate-900 rounded-xl shadow-lg z-0"
                                        initial={false}
                                        animate={{
                                            width: 'calc(33.33% - 6px)',
                                            x: nousMode === 'alta_calidad' ? 0 : nousMode === 'equilibrado' ? '100%' : '200%'
                                        }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        style={{
                                            left: 4
                                        }}
                                    />
                                    {modes.map((m) => (
                                        <button
                                            key={m.id}
                                            onClick={() => setNousMode(m.id as any)}
                                            className={cn(
                                                "relative z-10 flex-1 h-full text-[9px] font-black uppercase tracking-[0.1em] transition-colors duration-300",
                                                nousMode === m.id ? "text-white" : "text-slate-400 hover:text-slate-600"
                                            )}
                                        >
                                            {m.label.includes('Calidad') ? 'Calidad' : m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* CREATIVITY SELECTOR (Writer specific) */}
                            {viewMode === 'writer' && strategyOutline.length > 0 && (
                                <div className="px-1 py-1 bg-indigo-50/30 rounded-[24px] border border-indigo-100/50">
                                    <div className="flex items-center justify-between mb-3 px-3 pt-2">
                                        <label className="text-[9px] font-black uppercase underline decoration-indigo-200 underline-offset-4 decoration-2 tracking-widest text-slate-400">Nivel de Creatividad</label>
                                        <div className="text-[9px] font-black text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                            {creativityLevel === 'low' ? 'Baja' : creativityLevel === 'medium' ? 'Equilibrada' : 'Alta'}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1.5 p-1">
                                        {(['low', 'medium', 'high'] as const).map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => setCreativityLevel(level)}
                                                className={cn(
                                                    "py-2 text-[9px] font-black uppercase rounded-xl transition-all border-2",
                                                    creativityLevel === level 
                                                        ? "bg-white border-indigo-500 text-indigo-600 shadow-sm" 
                                                        : "bg-transparent border-transparent text-slate-400 hover:text-slate-600"
                                                )}
                                            >
                                                {level === 'low' ? 'Min' : level === 'medium' ? 'Equi' : 'Max'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ACCIONES DEL REDACTOR (SINGLE ITEM) */}
                            {viewMode === 'writer' && (
                                <>
                                    <div className="h-1" />
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 block">Acciones de Edición</label>
                                    <div className="grid grid-cols-1 gap-1.5">
                                        <ActionButton 
                                            icon={Search} 
                                            label="Investigación SEO" 
                                            color="indigo"
                                            onClick={() => { onWriterAction?.('seo'); setIsOpen(false); }}
                                            disabled={effectiveIsProcessing}
                                        />
                                        <ActionButton 
                                            icon={Layout} 
                                            label={strategyOutline.length > 0 ? "Regenerar Outline" : "Generar Outline"} 
                                            color="purple"
                                            onClick={() => { onWriterAction?.('outline'); setIsOpen(false); }}
                                            disabled={effectiveIsProcessing}
                                        />
                                        {strategyOutline.length > 0 && (
                                            <ActionButton 
                                                icon={Sparkles} 
                                                label="Redactar Contenido" 
                                                color="rose"
                                                onClick={() => { onWriterAction?.('generate'); setIsOpen(false); }}
                                                disabled={effectiveIsProcessing}
                                            />
                                        )}
                                        <ActionButton 
                                            icon={Zap} 
                                            label="Humanizar" 
                                            color="emerald"
                                            onClick={() => { onWriterAction?.('humanize'); setIsOpen(false); }}
                                            disabled={effectiveIsProcessing}
                                        />
                                        <ActionButton 
                                            icon={Activity} 
                                            label="Refinar" 
                                            color="slate"
                                            onClick={() => { onWriterAction?.('refine'); }}
                                            disabled={effectiveIsProcessing}
                                        />
                                    </div>
                                </>
                            )}

                            {/* ACCIONES DEL PLANIFICADOR (CONDICIONAL) */}
                            {viewMode === 'planner' && (
                                <>
                                    <div className="h-2" />
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 block">Acciones Inteligentes</label>
                                    
                                    <button 
                                        onClick={() => { onAction?.('sugerir_estrategia'); setIsOpen(false); }}
                                        className="w-full p-4 rounded-3xl bg-indigo-50 border border-indigo-100 group/btn transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-between text-indigo-900"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-white/50 flex items-center justify-center transition-transform group-hover/btn:rotate-12 border border-indigo-200">
                                                <Sparkles size={18} className="text-indigo-600" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] font-black uppercase tracking-widest leading-none">Sugerir estrategia</p>
                                                <p className="text-[9px] text-indigo-500 mt-1">Nuevas ideas de contenido</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className="opacity-40 group-hover/btn:opacity-100" />
                                    </button>

                                    <div className="grid grid-cols-1 gap-1.5">
                                        <ActionButton 
                                            icon={Search} 
                                            label="Investigación" 
                                            count={effectiveSelectedCount > 0 ? effectiveSelectedCount : stats.ideas}
                                            color="indigo"
                                            onClick={() => { onAction?.('investigar_ideas'); setIsOpen(false); }}
                                            disabled={(effectiveSelectedCount === 0 && stats.ideas === 0) || effectiveIsProcessing}
                                        />
                                        <ActionButton 
                                            icon={Layout} 
                                            label="Outlines" 
                                            count={effectiveSelectedCount > 0 ? effectiveSelectedCount : stats.needOutline}
                                            color="purple"
                                            onClick={() => { onAction?.('generar_outlines'); setIsOpen(false); }}
                                            disabled={(effectiveSelectedCount === 0 && stats.needOutline === 0) || effectiveIsProcessing}
                                        />
                                        <ActionButton 
                                            icon={Sparkles} 
                                            label="Redacción" 
                                            count={effectiveSelectedCount > 0 ? effectiveSelectedCount : stats.needDraft}
                                            color="rose"
                                            onClick={() => { onAction?.('redaccion_masiva'); setIsOpen(false); }}
                                            disabled={(effectiveSelectedCount === 0 && stats.needDraft === 0) || effectiveIsProcessing}
                                        />
                                        <ActionButton 
                                            icon={Zap} 
                                            label="Humanización" 
                                            count={effectiveSelectedCount > 0 ? effectiveSelectedCount : stats.needHuman}
                                            color="emerald"
                                            onClick={() => { onAction?.('humanizacion_masiva'); setIsOpen(false); }}
                                            disabled={(effectiveSelectedCount === 0 && stats.needHuman === 0) || effectiveIsProcessing}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Estado del Procesador */}
                        <AnimatePresence>
                            {effectiveIsProcessing && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-indigo-600 px-5 py-3 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2 text-white">
                                        <Activity size={12} className="animate-pulse" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">{effectiveStatus}</span>
                                    </div>
                                    <div className="text-[10px] font-black text-white tabular-nums">
                                        {Math.round(effectiveProgress)}%
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* El Orbe Nous Unificado (Minimalista) */}
            <div className="relative group p-4 mr-[-16px] mb-[-16px]">
                <div className={cn(
                    "absolute inset-0 rounded-full blur-3xl transition-all duration-1000 opacity-30",
                    effectiveIsProcessing ? "bg-indigo-500 scale-125 animate-pulse" : "bg-slate-300 group-hover:bg-indigo-400 group-hover:opacity-40"
                )} />

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 overflow-hidden",
                        isOpen ? "scale-90" : "hover:scale-105 active:scale-95",
                        "bg-transparent"
                    )}
                >
                    {/* Subtle Processing Ring */}
                    {effectiveIsProcessing && (
                        <svg className="absolute inset-0 w-full h-full -rotate-90 scale-[1.05]">
                            <circle
                                cx="48" cy="48" r="46"
                                fill="none"
                                stroke="#6366f1"
                                strokeWidth="1"
                                strokeDasharray="289"
                                strokeDashoffset={289 - (289 * (effectiveProgress / 100))}
                                strokeLinecap="round"
                                className="transition-all duration-700 opacity-60"
                            />
                        </svg>
                    )}

                    <div className="w-full h-full absolute inset-0">
                        <NousOrbLite isProcessing={effectiveIsProcessing} />
                    </div>

                    {/* Minimal Notification Badge (Cyan Tech) */}
                    {!isOpen && hasActions && !effectiveIsProcessing && (
                        <div className="absolute top-4 right-4 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)] pointer-events-none ring-2 ring-white/50 animate-pulse" />
                    )}
                </button>
            </div>
        </div>
    );
}

function ActionButton({ icon: Icon, label, count, color, onClick, disabled }: any) {
    const colors: Record<string, string> = {
        indigo: "bg-indigo-50 text-indigo-600",
        purple: "bg-purple-50 text-purple-600",
        rose: "bg-rose-50 text-rose-600",
        emerald: "bg-emerald-50 text-emerald-600",
        slate: "bg-slate-50 text-slate-600"
    };

    const colorClasses = colors[color] || colors.indigo;

    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "w-full group/item px-3 py-2 flex items-center justify-between rounded-xl transition-all",
                disabled ? "opacity-30 cursor-not-allowed" : "bg-transparent hover:bg-slate-50"
            )}
        >
            <div className="flex items-center gap-3">
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover/item:scale-110", colorClasses)}>
                    <Icon size={14} />
                </div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-700 leading-none">{label}</p>
            </div>
            {count > 0 && (
                <span className="text-[8px] font-black bg-indigo-500/10 text-indigo-600 px-1.5 py-0.5 rounded-full tabular-nums">
                    {count}
                </span>
            )}
        </button>
    );
}
