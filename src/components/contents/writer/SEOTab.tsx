'use client';

import { Microscope, Search, SearchCode, Database, RefreshCw, BarChart3, LineChart, PieChart } from 'lucide-react';
import { useWriterStore } from '@/store/useWriterStore';
import { SectionLabel } from './SidebarCommon';
import { cn } from '@/utils/cn';
import React from 'react';

export function SEOTab({ onSEO, isAnalyzing }: { onSEO: () => void; isAnalyzing: boolean }) {
    const store = useWriterStore();

    return (
        <div className="space-y-6 pt-2">
            <div className="space-y-4">
                <SectionLabel>Investigación SEO & Competencia</SectionLabel>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Input Principal / Keyword</label>
                    <div className="relative group">
                        <input 
                            type="text" 
                            className="w-full text-xs p-3.5 pl-10 bg-white border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-400 font-bold transition-all shadow-sm placeholder:text-slate-300"
                            placeholder="Keyword o Título del Artículo..."
                            value={store.keyword}
                            onChange={(e) => store.setKeyword(e.target.value)}
                        />
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50/70 border border-slate-100 rounded-xl transition-all hover:bg-white hover:shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <SearchCode size={14} className="text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">PAA (ValueSERP)</p>
                            <p className="text-[10px] font-black text-indigo-900">Activo</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50/70 border border-slate-100 rounded-xl transition-all hover:bg-white hover:shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <Database size={14} className="text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Contexto</p>
                            <p className="text-[10px] font-black text-indigo-900">Supabase RAG</p>
                        </div>
                    </div>
                </div>

                <button
                    disabled={isAnalyzing || !store.keyword}
                    onClick={onSEO}
                    className="group relative w-full h-11 bg-white border-2 border-slate-200 text-slate-700 hover:border-black hover:text-black text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 overflow-hidden disabled:opacity-50"
                >
                    {isAnalyzing ? (
                        <>
                            <Microscope size={14} className="animate-spin text-indigo-600" />
                            <span>Auditando SERP...</span>
                        </>
                    ) : (
                        <>
                            <Microscope size={14} className="group-hover:rotate-12 transition-transform" />
                            <span>Realizar SEO Research</span>
                        </>
                    )}
                </button>
            </div>            {/* Metrics Preview */}
            <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-4 shadow-xl shadow-indigo-900/10">
                <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-80">Métricas Principales</h4>
                    <BarChart3 size={12} className="opacity-80 text-cyan-400" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase opacity-60">Volumen</p>
                        <p className="text-xl font-black leading-none">{store.strategyVolume || "0"}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase opacity-60">Dificultad</p>
                        <div className="flex items-center gap-2">
                            <p className="text-xl font-black leading-none">{store.strategyDifficulty || "N/A"}</p>
                            <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                parseInt(store.strategyDifficulty) < 30 ? "bg-emerald-400" : "bg-amber-400"
                            )}></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* NEW: Metadata Strategy (Ficha de Producto) */}
            <div className="space-y-4 p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
                <SectionLabel>Estrategia de Metadatos</SectionLabel>
                
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">SEO Title</label>
                        <textarea 
                            className="w-full text-xs p-3 bg-slate-50 border-none rounded-xl font-bold text-slate-700 resize-none outline-none focus:ring-2 focus:ring-indigo-100"
                            rows={2}
                            value={store.strategyTitle}
                            onChange={(e) => store.setStrategyTitle(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Slug / URL</label>
                        <input 
                            type="text"
                            className="w-full text-xs p-3 bg-slate-50 border-none rounded-xl font-mono text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-100"
                            value={store.strategySlug}
                            onChange={(e) => store.setStrategySlug(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Meta Description</label>
                        <textarea 
                            className="w-full text-xs p-3 bg-slate-50 border-none rounded-xl font-medium text-slate-600 resize-none outline-none focus:ring-2 focus:ring-indigo-100"
                            rows={3}
                            value={store.strategyDesc}
                            onChange={(e) => store.setStrategyDesc(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Extracto / Resumen</label>
                        <textarea 
                            className="w-full text-xs p-3 bg-slate-50 border-none rounded-xl font-medium text-slate-500 italic resize-none outline-none focus:ring-2 focus:ring-indigo-100"
                            rows={3}
                            value={store.strategyExcerpt}
                            onChange={(e) => store.setStrategyExcerpt(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Neural Refinery */}
            <div className="p-5 bg-indigo-900 rounded-3xl space-y-4 shadow-xl shadow-indigo-100 relative overflow-hidden group">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                        <Microscope size={12} className="text-indigo-200" />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Refinería Neural</h4>
                </div>

                <button 
                    disabled={isAnalyzing}
                    className="w-full py-2.5 bg-white text-indigo-900 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                    <RefreshCw size={12} className={cn(isAnalyzing ? "animate-spin" : "")} />
                    Sincronizar DataForSEO
                </button>

                {store.strategyLSI && store.strategyLSI.length > 0 && (
                    <div className="pt-2">
                        <p className="text-[8px] font-black uppercase text-indigo-300 mb-2 tracking-widest opacity-60">Semántica Detectada</p>
                        <div className="flex flex-wrap gap-1">
                            {store.strategyLSI.slice(0, 10).map((kw: any, i: number) => (
                                <span key={i} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[9px] font-bold text-indigo-100">
                                    {kw.keyword}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
