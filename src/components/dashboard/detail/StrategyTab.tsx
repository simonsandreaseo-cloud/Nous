'use client';

import { Task } from '@/types/project';
import { Sparkles, FileText, List, MessageSquare, ChevronRight, Hash } from 'lucide-react';
import { cn } from '@/utils/cn';

interface StrategyTabProps {
    task: Task;
}

export default function StrategyTab({ task }: StrategyTabProps) {
    const hasOutline = task.outline_structure && Array.isArray(task.outline_structure) && task.outline_structure.length > 0;
    const hasBrief = !!task.brief;

    if (!hasOutline && !hasBrief) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
                    <Sparkles size={32} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Sin Estrategia Definida</h3>
                <p className="text-xs font-bold text-slate-400 mt-2 max-w-sm">
                    Aún no se ha generado un plan de contenidos para este artículo. Usa el Agente Nous para diseñar la estructura perfecta.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Outline Structure */}
            <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <List size={14} className="text-indigo-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Estructura del Artículo (Outline)</h3>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                    {hasOutline ? (
                        <div className="divide-y divide-slate-50">
                            {task.outline_structure.map((item: any, idx: number) => (
                                <div key={idx} className="p-6 hover:bg-slate-50/50 transition-colors group">
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "mt-1 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0",
                                            item.level === 2 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
                                        )}>
                                            H{item.level || 2}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <h4 className={cn(
                                                "font-black tracking-tight leading-tight",
                                                item.level === 2 ? "text-base text-slate-900" : "text-sm text-slate-700"
                                            )}>
                                                {item.text || item.title}
                                            </h4>
                                            {item.instructions && (
                                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 italic">
                                                    {item.instructions}
                                                </p>
                                            )}
                                            {item.keywords && item.keywords.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                    {item.keywords.map((kw: string, kidx: number) => (
                                                        <span key={kidx} className="px-2 py-0.5 bg-white border border-slate-100 rounded-md text-[9px] font-bold text-slate-400 uppercase">
                                                            {kw}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center text-slate-300 italic text-[11px] font-medium">
                            No hay una estructura jerárquica definida.
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Briefing & Context */}
            <div className="lg:col-span-4 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <MessageSquare size={14} className="text-violet-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Briefing & Notas</h3>
                </div>

                <div className="bg-violet-50/50 rounded-[32px] border border-violet-100/50 p-8">
                    {hasBrief ? (
                        <div className="prose prose-slate prose-sm max-w-none">
                            <div className="text-[12px] font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {task.brief}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400 italic text-[11px] font-medium">
                            No hay notas de briefing adjuntas.
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-violet-100/50 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase text-violet-400 tracking-widest">Densidad Objetivo</span>
                            <span className="text-[11px] font-black text-violet-600">1.2%</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase text-violet-400 tracking-widest">Tono de Voz</span>
                            <span className="text-[11px] font-black text-violet-600">Profesional</span>
                        </div>
                    </div>
                </div>

                {/* Quick Info Card */}
                <div className="bg-slate-900 rounded-[32px] p-8 text-white">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Meta para IA</h4>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                                <Hash size={14} className="text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Extensión</p>
                                <p className="text-[13px] font-black leading-none">{task.word_count || 1500} palabras</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
