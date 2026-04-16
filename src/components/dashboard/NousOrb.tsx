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

    // Pipeline States
    const [pipelineResearch, setPipelineResearch] = useState(true);
    const [pipelineDraft, setPipelineDraft] = useState(true);
    const [pipelineHumanize, setPipelineHumanize] = useState(false);
    const [pipelineTranslate, setPipelineTranslate] = useState(false);
    const [pipelineFinalStatus, setPipelineFinalStatus] = useState<'por_corregir' | 'en_redaccion' | 'por_maquetar' | 'publicado'>('por_corregir');

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

        // Filter tasks that need humanization (have content, not humanized)
        const needHuman = tasks.filter(t => 
            t.content_body && t.content_body.trim() !== '' && 
            (!t.metadata?.is_humanized && !t.metadata?.humanized_at) &&
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
        <div className="fixed bottom-10 right-10 z-[300] flex flex-col items-end gap-4">
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

            {/* Menú del Asistente Nous */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
                        className={cn(
                            "w-[420px] bg-white/80 backdrop-blur-3xl border border-white/20 rounded-[40px] shadow-[0_32px_128px_rgba(0,0,0,0.15)] overflow-hidden",
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

                                    </div>
                                </>
                            )}

                            {/* ACCIONES DEL PLANIFICADOR (CONDICIONAL) */}
                            {viewMode === 'planner' && (
                                <>
                                    <div className="h-2" />
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 block">Acciones Inteligentes</label>
                                    
                                    <div className="bg-white/50 rounded-[24px] p-2 border border-slate-100/50 space-y-2 mt-2">
                                        <div className="px-2 pt-1 pb-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-900 leading-none">Plan de Trabajo Múltiple</p>
                                            <p className="text-[9px] text-slate-500 mt-1 leading-snug">Selecciona las fases a ejecutar para los {effectiveSelectedCount > 0 ? effectiveSelectedCount : (stats.ideas + stats.needOutline + stats.needDraft + stats.needHuman)} artículos detectados.</p>
                                        </div>
                                        
                                        <PipelineToggle 
                                            icon={Search}
                                            title="1. Investigar Ideas"
                                            desc="Extracción de entidades, competidores y estructura SERP."
                                            active={pipelineResearch}
                                            onToggle={() => setPipelineResearch(!pipelineResearch)}
                                            count={effectiveSelectedCount > 0 ? effectiveSelectedCount : stats.ideas}
                                            color="indigo"
                                        />

                                        <PipelineToggle 
                                            icon={Sparkles}
                                            title="2. Redactar Contenido"
                                            desc="Creación de todo el contenido base usando IA Helios."
                                            active={pipelineDraft}
                                            onToggle={() => setPipelineDraft(!pipelineDraft)}
                                            count={effectiveSelectedCount > 0 ? effectiveSelectedCount : stats.needDraft}
                                            color="rose"
                                        />

                                        <PipelineToggle 
                                            icon={Zap}
                                            title="3. Humanizar Textos"
                                            desc="Reescritura semántica para aportar un toque humano y evadir detectores."
                                            active={pipelineHumanize}
                                            onToggle={() => setPipelineHumanize(!pipelineHumanize)}
                                            count={effectiveSelectedCount > 0 ? effectiveSelectedCount : stats.needHuman}
                                            color="emerald"
                                        />

                                        {i18nLanguages.length > 0 && (
                                            <PipelineToggle 
                                                icon={Globe}
                                                title="4. Traducir Contenido"
                                                desc={`Generar versiones en ${i18nLanguages.length} idiomas configurados.`}
                                                active={pipelineTranslate}
                                                onToggle={() => setPipelineTranslate(!pipelineTranslate)}
                                                count={effectiveSelectedCount > 0 ? (effectiveSelectedCount * i18nLanguages.length) : ((stats.ideas + stats.needOutline + stats.needDraft + stats.needHuman) * i18nLanguages.length)}
                                                color="purple"
                                            />
                                        )}

                                        <div className="p-3 bg-slate-100/50 rounded-2xl border border-slate-200/50 mt-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 size={12} className="text-slate-400" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Estatus Final</span>
                                                </div>
                                                <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">Post-proceso</span>
                                            </div>
                                            <div className="relative">
                                                <select 
                                                    value={pipelineFinalStatus}
                                                    onChange={(e) => setPipelineFinalStatus(e.target.value as any)}
                                                    className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                                                >
                                                    <option value="en_redaccion">Mantener en Redacción</option>
                                                    <option value="por_corregir">Pasar a Corrección</option>
                                                    <option value="por_maquetar">Pasar a Por Maquetar</option>
                                                    <option value="publicado">Marcar como Publicado</option>
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                    <ChevronDown size={14} />
                                                </div>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => {
                                                onAction?.('batch_pipeline', {
                                                    research: pipelineResearch,
                                                    draft: pipelineDraft,
                                                    humanize: pipelineHumanize,
                                                    translate: pipelineTranslate,
                                                    finalStatus: pipelineFinalStatus
                                                });
                                                setIsOpen(false);
                                            }}
                                            disabled={effectiveIsProcessing}
                                            className={cn(
                                                "w-full mt-2 py-4 rounded-2xl flex flex-col items-center justify-center transition-all group/cta relative overflow-hidden",
                                                effectiveIsProcessing ? "opacity-50 cursor-not-allowed bg-slate-100 text-slate-400" : "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-[0_4px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_8px_30px_rgba(79,70,229,0.4)] hover:-translate-y-0.5"
                                            )}
                                        >
                                            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
                                            {/* Shine effect */}
                                            <div className="absolute inset-0 -translate-x-[150%] bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover/cta:translate-x-[150%] transition-transform duration-1000 ease-in-out"></div>
                                            
                                            <div className="flex items-center gap-2 relative z-10">
                                                <Zap size={16} className="text-indigo-200 fill-indigo-200" />
                                                <span className="text-[14px] font-black uppercase tracking-[0.2em]">¡A Trabajar!</span>
                                            </div>
                                        </button>
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
                        "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500",
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
                </button>

                {/* Minimal Notification Badge (Cyan Tech with Number) */}
                {!isOpen && hasActions && !effectiveIsProcessing && (
                    <div className="absolute top-2 right-2 bg-cyan-400 text-indigo-950 text-[10px] font-black rounded-full shadow-[0_0_15px_rgba(34,211,238,0.8)] pointer-events-none h-6 min-w-[24px] flex items-center justify-center px-1.5 ring-2 ring-white/20 z-50 tabular-nums animate-pulse">
                        {effectiveSelectedCount > 0 ? effectiveSelectedCount : (stats.ideas + stats.needOutline + stats.needDraft + stats.needHuman)}
                    </div>
                )}
            </div>
        </div>
    );
}

function PipelineToggle({ icon: Icon, title, desc, active, onToggle, count, color }: any) {
    const colors: Record<string, string> = {
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-200 ring-indigo-500/30",
        purple: "bg-purple-50 text-purple-600 border-purple-200 ring-purple-500/30",
        rose: "bg-rose-50 text-rose-600 border-rose-200 ring-rose-500/30",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-200 ring-emerald-500/30",
        slate: "bg-slate-50 text-slate-600 border-slate-200 ring-slate-500/30"
    };

    return (
        <label className={cn(
            "flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden",
            active ? colors[color].split(' ')[0] + " " + colors[color].split(' ')[2] : "bg-white border-slate-100 hover:bg-slate-50/80",
            active && "ring-2 " + colors[color].split(' ')[3]
        )}>
            <div className="flex items-center pt-0.5 z-10">
                <input 
                    type="checkbox" 
                    checked={active} 
                    onChange={onToggle} 
                    className="hidden" 
                />
                <div className={cn(
                    "w-5 h-5 rounded-[6px] flex items-center justify-center border transition-all shadow-sm",
                    active ? "bg-indigo-500 border-indigo-500" : "bg-white border-slate-300"
                )}>
                    {active && <CheckCircle2 size={12} className="text-white" />}
                </div>
            </div>
            
            <div className="flex-1 min-w-0 z-10">
                <div className="flex items-center gap-2 mb-1">
                    <Icon size={12} className={active ? colors[color].split(' ')[1] : "text-slate-400"} />
                    <span className={cn("text-[10px] font-black uppercase tracking-widest leading-none", active ? colors[color].split(' ')[1] : "text-slate-600")}>
                        {title}
                    </span>
                </div>
                <p className="text-[9px] text-slate-500 leading-[1.4] pr-4">{desc}</p>
            </div>

            {count > 0 && (
                <div className={cn(
                    "absolute top-3 right-3 text-[9px] font-black px-1.5 py-0.5 rounded-md tabular-nums border z-10 transition-colors",
                    active ? "bg-white/80 border-transparent text-indigo-700 shadow-sm" : "bg-slate-100 border-slate-200 text-slate-500"
                )}>
                    {count}
                </div>
            )}
        </label>
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
