"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, 
    Search, 
    Layout, 
    FileText, 
    Zap, 
    X, 
    Activity,
    ChevronRight,
    BrainCircuit,
    MoreHorizontal
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Task } from '@/types/project';

interface NousOrbProps {
    tasks: Task[];
    onAction: (actionType: 'sugerir_estrategia' | 'investigar_ideas' | 'generar_outlines' | 'redaccion_masiva' | 'humanizacion_masiva') => void;
    isProcessing?: boolean;
    processingProgress?: number;
    activeProjectName?: string;
}

export default function NousOrb({ 
    tasks, 
    onAction, 
    isProcessing = false, 
    processingProgress = 0,
    activeProjectName = "Proyecto Activo"
}: NousOrbProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Detección Inteligente de Procesos
    const stats = useMemo(() => {
        return {
            ideas: tasks.filter(t => t.status === 'idea' && t.target_keyword).length,
            needOutline: tasks.filter(t => 
                (t.status === 'por_redactar' || t.status === 'en_investigacion' || t.status === 'investigacion_proceso') && 
                t.research_dossier && !t.outline_structure
            ).length,
            needDraft: tasks.filter(t => 
                (t.status === 'por_redactar' || t.status === 'por_corregir' || t.outline_structure) && 
                t.outline_structure && !t.content_body
            ).length,
            needHuman: tasks.filter(t => 
                t.content_body && (!t.metadata?.is_humanized && !t.metadata?.humanized_at)
            ).length
        };
    }, [tasks]);

    const hasActions = stats.ideas > 0 || stats.needOutline > 0 || stats.needDraft > 0 || stats.needHuman > 0;

    return (
        <div className="fixed bottom-10 right-10 z-[200] flex flex-col items-end gap-4">
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
                        <div className="p-6 border-b border-slate-100/50 bg-slate-50/30">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 flex items-center gap-2">
                                    <BrainCircuit size={14} className="text-indigo-600" />
                                    Asistente Nous
                                </h4>
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 hover:bg-slate-200/50 rounded-full transition-colors text-slate-400 hover:text-slate-700"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 lowercase tracking-tight">
                                {activeProjectName} • Inteligencia Editorial
                            </p>
                        </div>

                        <div className="p-5 space-y-2">
                            {/* Acción Permanente: Estrategia */}
                            <button 
                                onClick={() => { onAction('sugerir_estrategia'); setIsOpen(false); }}
                                className="w-full p-4 rounded-3xl bg-slate-900 group/btn transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-between text-white"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center transition-transform group-hover/btn:rotate-12">
                                        <Sparkles size={18} className="text-amber-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Sugerir Estrategia</p>
                                        <p className="text-[9px] text-slate-400 mt-1">Nuevas ideas de contenido</p>
                                    </div>
                                </div>
                                <ChevronRight size={14} className="opacity-40 group-hover/btn:opacity-100" />
                            </button>

                            <div className="h-4" />
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 block mb-3">Acciones Inteligentes en Lote</label>

                            {/* Investigar Ideas */}
                            <ActionButton 
                                icon={Search} 
                                label="Investigar Ideas" 
                                description="Deep SEO para nuevas keywords"
                                count={stats.ideas}
                                color="indigo"
                                onClick={() => { onAction('investigar_ideas'); setIsOpen(false); }}
                                disabled={stats.ideas === 0 || isProcessing}
                            />

                            {/* Generar Outlines */}
                            <ActionButton 
                                icon={Layout} 
                                label="Generar Outlines" 
                                description="Estructurar contenidos investigados"
                                count={stats.needOutline}
                                color="purple"
                                onClick={() => { onAction('generar_outlines'); setIsOpen(false); }}
                                disabled={stats.needOutline === 0 || isProcessing}
                            />

                            {/* Redacción Masiva */}
                            <ActionButton 
                                icon={FileText} 
                                label="Redacción Masiva" 
                                description="Generar borradores con Nous"
                                count={stats.needDraft}
                                color="rose"
                                onClick={() => { onAction('redaccion_masiva'); setIsOpen(false); }}
                                disabled={stats.needDraft === 0 || isProcessing}
                            />

                            {/* Humanización Masiva */}
                            <ActionButton 
                                icon={Zap} 
                                label="Humanización Masiva" 
                                description="Transformar a estilo humano"
                                count={stats.needHuman}
                                color="emerald"
                                onClick={() => { onAction('humanizacion_masiva'); setIsOpen(false); }}
                                disabled={stats.needHuman === 0 || isProcessing}
                            />
                        </div>

                        {/* Estado del Procesador */}
                        <AnimatePresence>
                            {isProcessing && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-indigo-600 px-6 py-4 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3 text-white">
                                        <Activity size={14} className="animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Ejecutando Lote...</span>
                                    </div>
                                    <div className="text-[11px] font-black text-white tabular-nums">
                                        {Math.round(processingProgress)}%
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* El Orbe Nous */}
            <div className="relative">
                {/* Aura Bloom */}
                <div className={cn(
                    "absolute inset-0 rounded-full blur-2xl transition-all duration-700 opacity-30",
                    isProcessing ? "bg-indigo-500 scale-150 animate-pulse" : "bg-indigo-400 group-hover:opacity-50"
                )} />

                {/* Main Button Container */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl overflow-hidden group",
                        isOpen ? "bg-white scale-90 border-slate-200" : "bg-white/90 hover:scale-105 active:scale-95 border-white/20",
                        "border-[6px] backdrop-blur-xl"
                    )}
                >
                    {/* Ring Animated */}
                    {isProcessing && (
                        <svg className="absolute inset-0 w-full h-full -rotate-90 scale-[1.15]">
                            <circle
                                cx="40" cy="40" r="38"
                                fill="none"
                                stroke="url(#nousGradient)"
                                strokeWidth="4"
                                strokeDasharray="239"
                                strokeDashoffset={239 - (239 * (processingProgress / 100))}
                                strokeLinecap="round"
                                className="transition-all duration-500"
                            />
                            <defs>
                                <linearGradient id="nousGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#a855f7" />
                                </linearGradient>
                            </defs>
                        </svg>
                    )}

                    {/* The Inner Orb */}
                    <div className={cn(
                        "relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-700",
                        "bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 shadow-inner",
                        isOpen && "rotate-90 scale-90 grayscale-[0.2]"
                    )}>
                        {/* Shimmer Light */}
                        <div className="absolute inset-0 bg-white/20 w-full h-full animate-[spin_8s_linear_infinite] rounded-full" />
                        
                        {/* Glass Reflection */}
                        <div className="absolute top-1 left-2 w-10 h-8 bg-white/20 rounded-[40%] blur-[2px] -rotate-12" />
                        
                        <span className="text-white font-black text-2xl relative z-10 tracking-tighter drop-shadow-md">
                            {isOpen ? <X size={24} /> : isProcessing ? '...' : 'N'}
                        </span>
                    </div>

                    {/* Stats Notification Badge */}
                    {!isOpen && hasActions && !isProcessing && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                            <span className="text-[8px] font-black text-white">!</span>
                        </div>
                    )}
                </button>
            </div>
        </div>
    );
}

function ActionButton({ icon: Icon, label, description, count, color, onClick, disabled }: any) {
    const colors = {
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
        rose: "bg-rose-50 text-rose-600 border-rose-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100"
    }[color as keyof typeof colors];

    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "w-full group/item p-3 flex items-center gap-4 rounded-2xl border transition-all",
                disabled ? "opacity-30 cursor-not-allowed border-slate-50" : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50 hover:scale-[1.01] active:scale-95"
            )}
        >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover/item:scale-110", colors)}>
                <Icon size={18} />
            </div>
            <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-800 leading-none">{label}</p>
                    {count > 0 && (
                        <span className="text-[9px] font-black bg-indigo-500 text-white px-2 py-0.5 rounded-full tabular-nums">
                            {count}
                        </span>
                    )}
                </div>
                <p className="text-[9px] font-medium text-slate-400 mt-1">{description}</p>
            </div>
        </button>
    );
}
