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
import { useProjectStore } from '@/store/useProjectStore';

interface NousAssistantMenuProps {
    viewMode?: 'planner' | 'writer';
    tasks?: Task[];
    onAction?: (actionType: string, config?: any) => void;
    onWriterAction?: (actionType: 'seo' | 'outline' | 'generate' | 'refine' | 'humanize') => void;
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
        isAnalyzingSEO, isPlanningStructure, isGenerating, isHumanizing,
        statusMessage, humanizerStatus,
        researchTopic,
    } = useWriterStore();

    // Pipeline States (Local to the menu)
    const [pipelineResearch, setPipelineResearch] = useState(true);
    const [pipelineDraft, setPipelineDraft] = useState(true);
    const [pipelineHumanize, setPipelineHumanize] = useState(false);
    const [pipelineTranslate, setPipelineTranslate] = useState(false);
    const [pipelineFinalStatus, setPipelineFinalStatus] = useState<'por_corregir' | 'en_redaccion' | 'por_maquetar' | 'publicado'>('por_corregir');

    const { activeProject } = useProjectStore();
    const i18nLanguages = activeProject?.i18n_settings?.languages || [];

    const effectiveProgress = (isAnalyzingSEO || isPlanningStructure || isGenerating || isHumanizing) 
        ? processingProgress 
        : processingProgress; // This is a simplification, the actual logic was in NousOrb
        
    const effectiveIsProcessing = (isAnalyzingSEO || isPlanningStructure || isGenerating || isHumanizing || isProcessing);
    const effectiveStatus = (isHumanizing ? humanizerStatus : statusMessage || "Procesando...");

    const stats = useMemo(() => {
        if (viewMode === 'writer') return { ideas: 0, needOutline: 0, needDraft: 0, needHuman: 0 };
        
        const ideas = tasks.filter(t => t.status === 'idea' || !t.research_dossier || Object.keys(t.research_dossier).length === 0);
        const needOutline = tasks.filter(t => {
            const hasResearch = t.research_dossier && Object.keys(t.research_dossier).length > 0;
            const hasOutline = (Array.isArray(t.outline_structure) && t.outline_structure.length > 0) || 
                              (t.outline_structure?.headers?.length > 0);
            return hasResearch && !hasOutline;
        });
        const needDraft = tasks.filter(t => {
            const hasOutline = (Array.isArray(t.outline_structure) && t.outline_structure.length > 0) || 
                              (t.outline_structure?.headers?.length > 0);
            const hasContent = !!(t.content_body && t.content_body.trim() !== '');
            return hasOutline && !hasContent;
        });
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
                        <ActionButton 
                            icon={Zap} 
                            label="Humanizar" 
                            color="emerald"
                            onClick={() => onWriterAction?.('humanize')}
                            disabled={effectiveIsProcessing}
                        />
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
                            }}
                            disabled={effectiveIsProcessing}
                            className={cn(
                                "w-full mt-2 py-4 rounded-2xl flex flex-col items-center justify-center transition-all group/cta relative overflow-hidden",
                                effectiveIsProcessing ? "opacity-50 cursor-not-allowed bg-slate-100 text-slate-400" : "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-[0_4px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_8px_30px_rgba(79,70,229,0.4)] hover:-translate-y-0.5"
                            )}
                        >
                            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
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
