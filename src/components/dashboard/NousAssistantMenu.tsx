import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, 
    Sparkles, 
    Zap, 
    Activity,
    Globe,
    CheckCircle2,
    ChevronDown,
    BrainCircuit
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Task } from '@/types/project';
import { useAppStore } from '@/store/useAppStore';
import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore, STATUS_LABELS, STATUS_COLORS } from '@/store/useProjectStore';

interface NousAssistantMenuProps {
    viewMode?: 'planner' | 'writer';
    tasks?: Task[];
    onAction?: (actionType: string, config?: any) => void;
    onWriterAction?: (actionType: 'seo' | 'outline' | 'generate' | 'refine' | 'humanize' | 'clean') => void;
    isProcessing?: boolean;
    processingProgress?: number;
    selectedCount?: number;
}

export default function NousAssistantMenu({ 
    viewMode = 'planner',
    tasks = [], 
    onAction, 
    onWriterAction,
    isProcessing = false, 
    processingProgress = 0,
    selectedCount = 0
}: NousAssistantMenuProps) {
    const { nousMode, setNousMode } = useAppStore();
    
    const { 
        strategyOutline,
        isAnalyzingSEO, isPlanningStructure, isGenerating, isHumanizing, isRefining,
        statusMessage, humanizerStatus,
        researchTopic,
        humanizerConfig,
        updateHumanizerConfig
    } = useWriterStore();

    // Pipeline States (Local to the menu)
    const [pipelineResearch, setPipelineResearch] = useState(true);
    const [pipelineDraft, setPipelineDraft] = useState(true);
    const [pipelineHumanize, setPipelineHumanize] = useState(false);
    const [pipelineClean, setPipelineClean] = useState(false);
    const [pipelineTranslate, setPipelineTranslate] = useState(false);
    const [pipelineFinalStatus, setPipelineFinalStatus] = useState<string>('por_corregir');

    const { activeProject } = useProjectStore();
    const i18nLanguages = activeProject?.i18n_settings?.languages || [];

    const allStatuses = useMemo(() => {
        const custom = activeProject?.settings?.content_preferences?.custom_statuses || [];
        const baseStatuses = Object.keys(STATUS_LABELS);
        
        return Array.from(new Set([...baseStatuses, ...custom]));
    }, [activeProject]);

    const effectiveProgress = (isAnalyzingSEO || isPlanningStructure || isGenerating || isHumanizing || isRefining) 
        ? processingProgress 
        : processingProgress; // This is a simplification, the actual logic was in NousOrb
        
    const effectiveIsProcessing = (isAnalyzingSEO || isPlanningStructure || isGenerating || isHumanizing || isRefining || isProcessing);
    const effectiveStatus = (isHumanizing ? humanizerStatus : statusMessage || "Procesando...");

    // STATUS WORKFLOW: idea -> en_investigacion -> por_redactar -> por_corregir/redactado -> humanizado
    const stats = useMemo(() => {
        if (viewMode === 'writer') return { ideas: 0, needOutline: 0, needDraft: 0, needHuman: 0 };
        
        // Needs research = status is 'idea'
        const ideas = tasks.filter(t => t.status === 'idea');
        // Needs outline = status is 'en_investigacion' (researched but no outline yet)
        const needOutline = tasks.filter(t => t.status === 'en_investigacion');
        // Needs drafting = status is 'por_redactar' (outline done, no content yet)
        const needDraft = tasks.filter(t => t.status === 'por_redactar');
        // Needs humanization = written but not yet humanized
        const needHuman = tasks.filter(t => 
            t.status === 'por_corregir' || t.status === 'redactado'
        );

        return {
            ideas: ideas.length,
            needOutline: needOutline.length,
            needDraft: needDraft.length,
            needHuman: needHuman.length
        };
    }, [tasks, viewMode]);


    const effectiveSelectedCount = selectedCount || 0;

    const [isHumanizerExpanded, setIsHumanizerExpanded] = useState(false);

    return (
        <div className="w-full max-h-[60vh] overflow-y-auto custom-scrollbar p-4 space-y-4">
            {viewMode === 'writer' && (
                <>
                    <div className="h-1" />
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 block">Acciones de Edición</label>
                    <div className="grid grid-cols-1 gap-1.5">
                        <ActionButton 
                            icon={Search} 
                            label="Investigación SEO" 
                            color="indigo"
                            onClick={() => onWriterAction?.('seo')}
                            disabled={effectiveIsProcessing}
                        />
                        {strategyOutline.length > 0 && (
                            <ActionButton 
                                icon={Sparkles} 
                                label="Redactar Contenido" 
                                color="rose"
                                onClick={() => onWriterAction?.('generate')}
                                disabled={effectiveIsProcessing}
                            />
                        )}
                        
                        <div className={cn(
                            "group border rounded-2xl transition-all overflow-hidden",
                            isHumanizerExpanded ? "border-emerald-200 bg-emerald-50/10 shadow-lg shadow-emerald-500/5" : "border-slate-100 bg-white"
                        )}>
                            <div className="flex items-center justify-between p-1">
                                <ActionButton 
                                    icon={Zap} 
                                    label="Humanizar" 
                                    color="emerald"
                                    onClick={() => onWriterAction?.('humanize')}
                                    disabled={effectiveIsProcessing}
                                />
                                <button 
                                    onClick={() => setIsHumanizerExpanded(!isHumanizerExpanded)}
                                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors mr-2"
                                >
                                    {isHumanizerExpanded ? <ChevronDown size={14} className="rotate-180 transition-transform" /> : <ChevronDown size={14} className="transition-transform" />}
                                </button>
                            </div>

                            <AnimatePresence>
                                {isHumanizerExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-emerald-50 bg-white/50"
                                    >
                                        <div className="p-4 space-y-4">
                                            <div className="space-y-2">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 px-1">Modos de Humanización</p>
                                                <div className="grid grid-cols-1 gap-1.5">
                                                    {[
                                                        { id: 'unified', label: 'Pipeline Unificado', desc: 'Chunks + SEO LSI dinámico' },
                                                        { id: 'duplicate_detection', label: 'Detección de Duplicados', desc: 'Chunks -> SEO Global' },
                                                        { id: 'no_chunks', label: 'Sin Chunks', desc: 'Petición única (Cohesión)' },
                                                    ].map((mode) => (
                                                        <button
                                                            key={mode.id}
                                                            onClick={() => updateHumanizerConfig({ mode: mode.id as any })}
                                                            className={cn(
                                                                "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                                                                (humanizerConfig.mode === mode.id || (!humanizerConfig.mode && mode.id === 'unified'))
                                                                    ? "border-emerald-500 bg-emerald-50 shadow-sm"
                                                                    : "border-slate-100 hover:border-slate-200 bg-white"
                                                            )}
                                                        >
                                                            <span className="text-[10px] font-black uppercase tracking-tight text-slate-800">{mode.label}</span>
                                                            <span className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">{mode.desc}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Instrucciones Especiales</label>
                                                <textarea 
                                                    className="w-full text-[10px] p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-400 font-medium min-h-[80px] resize-none transition-all shadow-sm placeholder:text-slate-300"
                                                    placeholder="Ej: Mantén un tono más informal, usa más analogías..."
                                                    value={humanizerConfig.notes || ''}
                                                    onChange={(e) => updateHumanizerConfig({ notes: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                            <ActionButton 
                                icon={BrainCircuit} 
                                label="Refinamiento Inteligente" 
                                color="purple"
                                onClick={() => onWriterAction?.('refine')}
                                disabled={effectiveIsProcessing}
                            />
                        </div>
                        
                        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                            <ActionButton 
                                icon={Sparkles} 
                                label="Limpiar Ruido IA" 
                                color="indigo"
                                onClick={() => onWriterAction?.('clean')}
                                disabled={effectiveIsProcessing}
                            />
                        </div>
                    </div>
                </>
            )}

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

                        <PipelineToggle 
                            icon={Sparkles}
                            title="4. Limpieza Inteligente"
                            desc="Eliminar prefacios, conclusiones robóticas y ruido de IA del HTML."
                            active={pipelineClean}
                            onToggle={() => setPipelineClean(!pipelineClean)}
                            count={effectiveSelectedCount > 0 ? effectiveSelectedCount : stats.needHuman}
                            color="indigo"
                        />

                        {i18nLanguages.length > 0 && (
                            <PipelineToggle 
                                icon={Globe}
                                title="5. Traducir Contenido"
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
                                    onChange={(e) => setPipelineFinalStatus(e.target.value)}
                                    className={cn(
                                        "w-full appearance-none border rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-colors",
                                        STATUS_COLORS[pipelineFinalStatus]?.bg || 'bg-white',
                                        STATUS_COLORS[pipelineFinalStatus]?.text || 'text-slate-700',
                                        STATUS_COLORS[pipelineFinalStatus]?.border || 'border-slate-200'
                                    )}
                                >
                                    {allStatuses.map(status => {
                                        const label = STATUS_LABELS[status] || (status.includes('_') ? status.replace(/_/g, ' ').toUpperCase() : status.toUpperCase());
                                        return (
                                            <option key={status} value={status}>
                                                {label}
                                            </option>
                                        );
                                    })}
                                </select>
                                <div className={cn(
                                    "absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors",
                                    STATUS_COLORS[pipelineFinalStatus]?.text || 'text-slate-400'
                                )}>
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
                                    clean: pipelineClean,
                                    translate: pipelineTranslate,
                                    finalStatus: pipelineFinalStatus
                                });
                            }}
                            disabled={effectiveIsProcessing}
                            className={cn(
                                "w-full mt-2 py-4 rounded-2xl flex flex-col items-center justify-center transition-all group/cta relative overflow-hidden",
                                effectiveIsProcessing ? "opacity-50 cursor-not-allowed bg-slate-100 text-slate-400" : "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-[0_4px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_8px_30px_rgba(79,70,229,0.4)] hover:-translate-y-0.5"
                            )}
                        >
                            <div className="absolute inset-0 bg-[url(&quot;data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E&quot;)] opacity-10 mix-blend-overlay"></div>
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
