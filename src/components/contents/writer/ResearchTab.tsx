'use client';

import { 
    Globe, 
    Search, 
    Database, 
    ExternalLink, 
    MessageSquareQuote,
    BarChart3,
    ArrowRight,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { useWriterStore } from '@/store/useWriterStore';
import { SectionLabel } from './SidebarCommon';
import { cn } from '@/utils/cn';
import { useState } from 'react';

export function ResearchTab() {
    const store = useWriterStore();
    const [expandedHeaders, setExpandedHeaders] = useState<Record<string, boolean>>({});
    
    // Use data from the store instead of a missing currentTask
    const dossier = store.rawSeoData || {};
    const competitors = dossier.fullCompetitorAnalysis || dossier.competitors || store.competitorDetails || [];

    const toggleAccordion = (url: string) => {
        setExpandedHeaders(prev => ({
            ...prev,
            [url]: !prev[url]
        }));
    };

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
            {/* Analysis Section */}
            <div className="space-y-4">
                <SectionLabel>Análisis de Competidores (SERP)</SectionLabel>
                <div className="space-y-3">
                    {competitors.map((comp: any, i: number) => {
                        const isExpanded = !!expandedHeaders[comp.url];
                        const displayWordCount = comp.word_count || comp.wordCount || 0;
                        const h2Count = comp.headers?.filter((h:any) => h.tag.toLowerCase() === 'h2').length || 0;
                        
                        return (
                            <div key={i} className="p-0 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                {/* Header Toggle */}
                                <div 
                                    className="p-4 cursor-pointer hover:bg-slate-100 transition-colors flex items-center justify-between"
                                    onClick={() => toggleAccordion(comp.url)}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Globe size={12} className="text-indigo-500 shrink-0" />
                                        <span className="text-[10px] font-bold text-slate-700 truncate">
                                            {comp.title || comp.url}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[8px] font-black uppercase">
                                            {displayWordCount} palabras
                                        </span>
                                        <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[8px] font-black uppercase">
                                            {h2Count} H2s
                                        </span>
                                        {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                    </div>
                                </div>

                                {/* Accordion Content: Headers Structure */}
                                {isExpanded && comp.headers && comp.headers.length > 0 && (
                                    <div className="p-4 pt-2 border-t border-slate-100 bg-white">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-[8px] font-black uppercase text-slate-400">Estructura Extraída (H1-H6)</p>
                                            <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-[8px] text-indigo-500 hover:underline flex items-center gap-1 font-bold uppercase">
                                                Visitar URL <ExternalLink size={10} />
                                            </a>
                                        </div>
                                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                            {comp.headers.map((h: any, idx: number) => {
                                                const tagLevel = parseInt(h.tag.replace('h', '').replace('H', '')) || 2;
                                                const paddingLeft = `${(tagLevel - 1) * 8}px`; // Indent based on H level
                                                return (
                                                    <div 
                                                        key={idx} 
                                                        className="text-[10px] text-slate-600 flex items-start gap-2 hover:text-indigo-600 transition-colors"
                                                        style={{ paddingLeft }}
                                                    >
                                                        <span className={cn(
                                                            "text-[7px] font-black uppercase shrink-0 mt-0.5 w-5",
                                                            tagLevel === 1 ? "text-rose-400" : tagLevel === 2 ? "text-indigo-400" : "text-slate-400"
                                                        )}>{h.tag}</span>
                                                        <span className={cn(
                                                            "leading-relaxed",
                                                            tagLevel === 1 ? "font-bold text-slate-800" : tagLevel === 2 ? "font-semibold" : ""
                                                        )}>{h.text}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Fallback si no hay headers */}
                                {isExpanded && (!comp.headers || comp.headers.length === 0) && (
                                    <div className="p-4 pt-2 border-t border-slate-100 bg-white">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-[8px] font-black uppercase text-slate-400">Contenido Detectado</p>
                                            <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-[8px] text-indigo-500 hover:underline flex items-center gap-1 font-bold uppercase">
                                                Visitar URL <ExternalLink size={10} />
                                            </a>
                                        </div>
                                        <p className="text-[10px] text-slate-500 leading-relaxed italic border-l-2 border-slate-200 pl-3">
                                            No se detectaron etiquetas de encabezado claras. La estructura puede estar generada dinámicamente o bloqueada.
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
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
