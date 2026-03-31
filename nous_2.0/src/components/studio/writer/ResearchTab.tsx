'use client';

import { 
    FileSearch, Search, Database, ExternalLink, Lightbulb, 
    Trash2, Plus, Info, LayoutTemplate, MessageSquareMore 
} from 'lucide-react';
import { useWriterStore } from '@/store/useWriterStore';
import { SectionLabel } from './SidebarCommon';
import React from 'react';

export function ResearchTab({ onPlanStructure, isPlanning }: { onPlanStructure: () => void; isPlanning: boolean }) {
    const store = useWriterStore();

    return (
        <div className="space-y-6 pt-2 h-full overflow-y-auto pr-2 custom-scrollbar pb-32">
            {/* Outline Card */}
            <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                    <SectionLabel>Estructura de Encabezados</SectionLabel>
                    <Info size={12} className="text-slate-400" />
                </div>
                
                {store.strategyOutline.length > 0 ? (
                    <div className="space-y-3">
                        {store.strategyOutline.map((h, i) => (
                            <div key={i} className="flex gap-3 group animate-in fade-in slide-in-from-left-2 transition-all">
                                <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 font-black text-[10px] text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                                    {h.type}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <input 
                                        type="text" 
                                        className="w-full text-xs font-bold text-slate-700 bg-transparent outline-none focus:text-indigo-600 transition-colors truncate"
                                        value={h.text}
                                        onChange={(e) => {
                                            const newOutline = [...store.strategyOutline];
                                            newOutline[i].text = e.target.value;
                                            store.setStrategyOutline(newOutline);
                                        }}
                                    />
                                    <p className="text-[9px] font-medium text-slate-400 mt-0.5">Objetivo: {h.wordCount} palabras</p>
                                </div>
                                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-50 rounded-lg">
                                    <Trash2 size={12} className="text-rose-400" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center space-y-3 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                        <LayoutTemplate size={24} className="mx-auto text-slate-300" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 leading-relaxed">Genera un análisis SEO primero para proponer una estrategia</p>
                    </div>
                )}

                <button
                    disabled={isPlanning || !store.rawSeoData}
                    onClick={onPlanStructure}
                    className="group relative w-full h-11 bg-white border-2 border-black text-black hover:bg-black hover:text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 overflow-hidden active:scale-95 disabled:opacity-50"
                >
                    {isPlanning ? (
                        <>
                            <Lightbulb size={14} className="animate-bounce" />
                            <span>Diseñando Estrategia...</span>
                        </>
                    ) : (
                        <>
                            <Lightbulb size={14} className="group-hover:rotate-12 transition-transform" />
                            <span>Planificar Estrategia</span>
                        </>
                    )}
                </button>
            </div>

            {/* Context Intelligence */}
            <div className="space-y-4 pt-2">
                <SectionLabel>Notas de Contexto SERP</SectionLabel>
                <div className="relative">
                    <textarea 
                        className="w-full text-xs p-4 bg-slate-900 border-none rounded-3xl text-indigo-100 font-medium min-h-[240px] resize-none transition-all shadow-xl shadow-slate-200 outline-none focus:ring-4 focus:ring-indigo-100 placeholder:text-indigo-900"
                        placeholder="Insights extraídos de competidores y briefing automático..."
                        value={store.strategyNotes}
                        onChange={(e) => store.setStrategyNotes(e.target.value)}
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    </div>
                </div>
            </div>
            
            {/* LSI/Long Tail Tags */}
            <div className="space-y-3">
                <SectionLabel>Keywords & Semántica</SectionLabel>
                <div className="flex flex-wrap gap-2">
                    {store.strategyLSI.slice(0, 15).map((lsi, i) => (
                        <div key={i} className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg group hover:bg-indigo-100 transition-colors cursor-default">
                            <span className="text-[10px] font-black text-indigo-700">{lsi.keyword}</span>
                            <span className="ml-2 text-[8px] font-bold text-indigo-300 opacity-60">{lsi.count}</span>
                        </div>
                    ))}
                    <button className="px-3 py-1.5 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all font-black text-[10px] uppercase">
                        + Añadir
                    </button>
                </div>
            </div>
        </div>
    );
}
