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
    Clock,
    Globe,
    Database,
    Layers,
    FileText,
    Image as ImageIcon,
    Edit3
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Task } from '@/types/project';
import { NousOrbLite } from '@/components/canvas/NousOrbLite';
import { useAppStore } from '@/store/useAppStore';
import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';

const getIconForPhase = (phase: string) => {
    const p = phase.toLowerCase();
    if (p.includes('serp') || p.includes('búsqueda') || p.includes('exploración')) return <Search size={12} className="text-cyan-500" />;
    if (p.includes('scraping') || p.includes('extrayendo') || p.includes('lectura')) return <Database size={12} className="text-violet-500" />;
    if (p.includes('lsi') || p.includes('keyword') || p.includes('semántica')) return <Layers size={12} className="text-emerald-500" />;
    if (p.includes('metadata') || p.includes('seo')) return <FileText size={12} className="text-amber-500" />;
    if (p.includes('interlinking') || p.includes('enlace')) return <Globe size={12} className="text-indigo-500" />;
    if (p.includes('outline') || p.includes('estructura')) return <Edit3 size={12} className="text-rose-500" />;
    if (p.includes('image') || p.includes('media')) return <ImageIcon size={12} className="text-fuchsia-500" />;
    return <Zap size={12} className="text-slate-400" />;
};

interface NousOrbProps {
    variant?: 'floating' | 'header';
    tasks?: Task[];
    onAction?: (actionType: string, config?: any) => void;
    isProcessing?: boolean;
    processingProgress?: number;
    activeProjectName?: string;
    selectedCount?: number;
    viewMode?: 'planner' | 'writer';
    // Writer specific actions
    onWriterAction?: (actionType: 'seo' | 'outline' | 'generate' | 'refine' | 'humanize') => void;
}

// Force rebuild trigger - Version 1.0.1
export default function NousOrb({ 
    tasks = [], 
    onAction, 
    onWriterAction,
    isProcessing = false, 
    processingProgress = 0,
    activeProjectName = "Sistema Nous",
    selectedCount = 0,
    viewMode = 'planner',
    variant = 'floating'
}: NousOrbProps) {
    const { nousMode, setNousMode } = useAppStore();
    
    // Writer specific states from store
    const { 
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

    const { activeProject } = useProjectStore();
    const i18nLanguages = activeProject?.i18n_settings?.languages || [];


    // Progress logic
    const effectiveProgress = viewMode === 'writer' ? (storeProgress || processingProgress) : processingProgress;
    const effectiveIsProcessing = viewMode === 'writer' ? (isAnalyzingSEO || isPlanningStructure || isGenerating || isHumanizing || isProcessing) : isProcessing;
    const effectiveStatus = viewMode === 'writer' ? (isHumanizing ? humanizerStatus : statusMessage || "Procesando...") : "Investigando...";

    // Detección Inteligente de Procesos
    const stats = useMemo(() => {
        if (viewMode === 'writer') return { ideas: 0, needOutline: 0, needDraft: 0, needHuman: 0 };
        
        // Filter tasks that need research
        const ideas = tasks.filter(t => t.status === 'idea' || !t.research_dossier || Object.keys(t.research_dossier).length === 0);
        
        // Filter tasks that need outlines (have research, no outline structure)
        const needOutline = tasks.filter(t => {
            const hasResearch = t.research_dossier && Object.keys(t.research_dossier).length > 0;
            const hasOutline = (Array.isArray(t.outline_structure) && t.outline_structure.length > 0) || 
                             (t.outline_structure?.headers?.length > 0);
            return hasResearch && !hasOutline;
        });

        // Filter tasks that need drafting (have outline, no content)
        const needDraft = tasks.filter(t => {
            const hasOutline = (Array.isArray(t.outline_structure) && t.outline_structure.length > 0) || 
                             (t.outline_structure?.headers?.length > 0);
            const hasContent = !!(t.content_body && t.content_body.trim() !== '');
            return hasOutline && !hasContent;
        });

        // Filter tasks that need humanization (have content)
        const needHuman = tasks.filter(t => 
            t.content_body && t.content_body.trim() !== '' && 
            (t.status === 'por_corregir' || t.status === 'por_maquetar')
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


    return (
        <div className={cn(
            "z-[300] flex flex-col items-end gap-4",
            variant === 'floating' ? "fixed bottom-10 right-10" : "relative"
        )}>
            {/* Monitor en Vivo Elegante (Reemplaza a la consola oscura) */}
            <AnimatePresence>
                {isConsoleOpen && (
                    <motion.div
                        layoutId="nous-orb-morph"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-[420px] max-h-[600px] bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[32px] shadow-[0_32px_128px_rgba(79,70,229,0.15)] overflow-hidden flex flex-col z-[310] ring-1 ring-black/[0.03]"
                    >
                        {/* Header Elegante */}
                        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-indigo-50/20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10" />
                                    <Sparkles size={20} className="text-indigo-500 relative z-10" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-[0.15em] text-slate-800">Nous Intelligence</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Creación en tiempo real</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button onClick={clearDebugPrompts} className="p-2 text-slate-400 hover:text-slate-600 transition-colors" title="Limpiar Panel">
                                    <Trash2 size={16} />
                                </button>
                                <button onClick={() => setIsConsoleOpen(false)} className="p-2 bg-slate-100/50 hover:bg-slate-200/50 rounded-xl text-slate-500 hover:text-slate-800 transition-all">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Barra de Progreso Elegante */}
                        <AnimatePresence>
                            {effectiveIsProcessing && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-indigo-50/50 border-b border-indigo-100/50 p-6"
                                >
                                    <div className="flex justify-between items-end mb-3">
                                        <div className="flex flex-col min-w-0 pr-4">
                                            <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest truncate">{researchTopic || effectiveStatus}</span>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Sintetizando datos...</span>
                                        </div>
                                        <span className="text-xl font-black text-indigo-600 italic tracking-tighter">{Math.round(effectiveProgress)}%</span>
                                    </div>
                                    <div className="h-2 bg-white rounded-full overflow-hidden p-0.5 shadow-inner border border-slate-100">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${effectiveProgress}%` }}
                                            className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full shadow-sm"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Stream de Logs con Textos de Valor */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30">
                            {debugPrompts.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-16 opacity-40">
                                    <BrainCircuit size={40} className="mb-4 text-indigo-400" />
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] leading-loose text-slate-500">
                                        Nous en Espera<br/>Listo para la creación.
                                    </p>
                                </div>
                            ) : (
                                debugPrompts.map((log, i) => (
                                    <motion.div 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        key={i} 
                                        className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm relative overflow-hidden group"
                                    >
                                        <div className="flex items-start gap-3 relative z-10">
                                            <div className="mt-0.5 w-7 h-7 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                                                {getIconForPhase(log.phase)}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest truncate whitespace-normal leading-tight">{log.prompt}</span>
                                                {log.response && (
                                                    <span className="text-[10px] font-medium text-slate-500 mt-1 leading-relaxed">
                                                        {log.response}
                                                    </span>
                                                )}
                                                <span className="text-[8px] font-bold text-slate-300 mt-2">{log.timestamp}</span>
                                            </div>
                                        </div>
                                        {/* Hover glow */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-50/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
                                    </motion.div>
                                ))
                            )}
                        </div>
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
                    className={cn(
                        "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500",
                        "hover:scale-105 active:scale-95",
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
                </button>
                
                {/* Minimal Notification Badge (Cyan Tech with Number) */}
                {hasActions && !effectiveIsProcessing && (
                    <div className="absolute top-2 right-2 bg-cyan-400 text-indigo-950 text-[10px] font-black rounded-full shadow-[0_0_15px_rgba(34,211,238,0.8)] pointer-events-none h-6 min-w-[24px] flex items-center justify-center px-1.5 ring-2 ring-white/20 z-50 tabular-nums animate-pulse">
                        {effectiveSelectedCount > 0 ? effectiveSelectedCount : (stats.ideas + stats.needOutline + stats.needDraft + stats.needHuman)}
                    </div>
                )}
            </div>
        </div>
    );
}
