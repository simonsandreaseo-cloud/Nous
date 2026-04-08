'use client';

import { 
    Globe, 
    Search, 
    Database, 
    ExternalLink, 
    MessageSquareQuote,
    BarChart3,
    ArrowRight
} from 'lucide-react';
import { useWriterStore } from '@/store/useWriterStore';
import { SectionLabel } from './SidebarCommon';
import { cn } from '@/utils/cn';

export function ResearchTab() {
    const store = useWriterStore();
    
    // Use data from the store instead of a missing currentTask
    const dossier = store.rawSeoData || {};
    const competitors = dossier.fullCompetitorAnalysis || dossier.competitors || store.competitorDetails || [];

    if (competitors.length === 0 && !store.strategyNotes) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <Search size={40} className="mb-4 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Sin datos de investigación</p>
                <p className="text-[9px] mt-2 leading-relaxed">Ejecuta el SEO Research para ver el análisis de la competencia.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pt-2 overflow-y-auto max-h-screen custom-scrollbar pb-20">
            {/* Jina Analysis Section */}
            <div className="space-y-4">
                <SectionLabel>Análisis de Referencias (Jina Reader)</SectionLabel>
                <div className="space-y-3">
                    {competitors.map((comp: any, i: number) => (
                        <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Globe size={12} className="text-indigo-500 shrink-0" />
                                    <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-slate-700 truncate hover:text-indigo-600 transition-colors">
                                        {comp.title || comp.url}
                                    </a>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[8px] font-black uppercase">
                                        {comp.word_count || comp.wordCount || 0} palabras
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[8px] font-black uppercase">
                                        {comp.h2_count || comp.h2Count || 0} H2s
                                    </span>
                                </div>
                            </div>

                            {comp.summary ? (
                                <p className="text-[10px] text-slate-500 leading-relaxed italic border-l-2 border-indigo-200 pl-3">
                                    {comp.summary}
                                </p>
                            ) : (
                                <p className="text-[10px] text-slate-300 italic">Contenido extraído de la referencia para inspirar la redacción...</p>
                            )}

                            {comp.headers && comp.headers.length > 0 && (
                                <div className="pt-2 border-t border-slate-100">
                                    <p className="text-[8px] font-black uppercase text-slate-400 mb-2">Estructura detectada</p>
                                    <div className="space-y-1">
                                        {comp.headers.slice(0, 8).map((h: any, idx: number) => (
                                            <div key={idx} className="text-[9px] text-slate-500 truncate flex items-center gap-2">
                                                <span className="text-[7px] font-black text-indigo-300 uppercase w-4 shrink-0">{h.tag}</span>
                                                <span className="truncate">{h.text}</span>
                                            </div>
                                        ))}
                                        {comp.headers.length > 8 && (
                                            <p className="text-[8px] text-indigo-400 font-bold mt-1">+{comp.headers.length - 8} encabezados más...</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Notes / Briefing Section */}
            {store.strategyNotes && (
                <div className="p-5 bg-slate-900 rounded-[32px] text-white shadow-xl">
                    <div className="flex items-center gap-2 mb-3">
                        <MessageSquareQuote size={14} className="text-indigo-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/70">Notas de Estrategia</h4>
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed italic">
                        {store.strategyNotes}
                    </p>
                </div>
            )}
        </div>
    );
}
