'use client';
import { useState } from 'react';
import { useWriterStore } from '@/store/useWriterStore';
import { 
    ChevronLeft, ChevronRight, Globe, ExternalLink, 
    Lightbulb, ChevronDown, ChevronUp, AlignLeft, 
    Layers, Search
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

export default function CompetitorPanel() {
    const { competitorDetails, rawSeoData, researchDossier } = useWriterStore();
    const [activeIdx, setActiveIdx] = useState(0);
    const [expandedHeaders, setExpandedHeaders] = useState<Record<string, boolean>>({});

    // Prioritize deep analysis from Jina/Dossier
    const dossier = researchDossier || rawSeoData || {};
    const competitors = competitorDetails.length > 0 
        ? competitorDetails 
        : (dossier.fullCompetitorAnalysis || dossier.competitors || []);

    const currentComp = competitors[activeIdx];

    const toggleHeader = (id: string) => {
        setExpandedHeaders(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const nextComp = () => setActiveIdx(prev => Math.min(competitors.length - 1, prev + 1));
    const prevComp = () => setActiveIdx(prev => Math.max(0, prev - 1));

    if (competitors.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                <Search size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-300">Esperando Competidores</p>
                <p className="text-[11px] font-bold mt-2 text-center opacity-60">
                    Ejecuta una investigación SEO para poblar esta sección con la data de los top competidores.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">

            {/* Header / Navigation Controls */}
            <div className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-20 flex items-center justify-between shadow-sm">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <Layers size={14} className="text-indigo-500" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800">
                            Competidor {activeIdx + 1}
                        </h3>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                        <button 
                            disabled={activeIdx === 0}
                            onClick={prevComp}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm disabled:opacity-20 transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-[10px] font-extrabold text-slate-400 px-2 min-w-[45px] text-center">
                            {activeIdx + 1} / {competitors.length}
                        </span>
                        <button 
                            disabled={activeIdx === competitors.length - 1}
                            onClick={nextComp}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm disabled:opacity-20 transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Slider Dots */}
            {competitors.length > 1 && (
                <div className="flex items-center justify-center gap-2 py-3 bg-white/40 border-b border-slate-100">
                    {competitors.map((_: any, idx: number) => (
                        <button
                            key={idx}
                            onClick={() => setActiveIdx(idx)}
                            className={cn(
                                "rounded-full transition-all duration-500",
                                idx === activeIdx
                                    ? "w-8 h-1.5 bg-indigo-500 shadow-md shadow-indigo-100"
                                    : "w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400"
                            )}
                        />
                    ))}
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeIdx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="space-y-6"
                    >
                        {/* URL Card - Lighter Design */}
                        <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <Globe size={14} className="text-indigo-500" />
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">URL Competidor</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <a 
                                    href={currentComp.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex-1 text-[11px] font-bold text-slate-700 truncate hover:text-indigo-600 transition-colors"
                                >
                                    {currentComp.url}
                                </a>
                                <ExternalLink size={14} className="text-slate-300 shrink-0" />
                            </div>
                        </div>

                        {/* Quick Metrics */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { 
                                    label: 'Palabras', 
                                    value: currentComp.word_count ?? currentComp.wordCount ?? 
                                           (currentComp.summary ? currentComp.summary.split(/\s+/).length : '—') 
                                },
                                { 
                                    label: 'H2s', 
                                    value: currentComp.h2_count ?? currentComp.h2Count ?? 
                                           (currentComp.headers?.filter?.((h: any) => h.tag === 'h2').length ?? '—')
                                },
                                { 
                                    label: 'Dominio', 
                                    value: currentComp.domain_authority ? `DA${currentComp.domain_authority}` : 
                                           (currentComp.url ? new URL(currentComp.url).hostname.replace('www.', '') : '—')
                                },
                            ].map(m => (
                                <div key={m.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{m.label}</span>
                                    <span className="text-sm font-black text-slate-700">{m.value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Hierarchy View */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2">
                                <AlignLeft size={16} className="text-indigo-500" />
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Estructura Detallada</h4>
                            </div>

                            <div className="space-y-2">
                                {(() => {
                                    // 1. Prioritize pre-structured headers from Research/Helios
                                    let displayHeaders = currentComp.headers || [];
                                    
                                    // 2. HTML Rescue logic: if no headers, try to parse them from the HTML content
                                    if (displayHeaders.length === 0 && currentComp.content) {
                                        // Match both Markdown and HTML headers for maximum compatibility
                                        const htmlTags = currentComp.content.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi);
                                        if (htmlTags) {
                                            displayHeaders = htmlTags.map((tag: string) => {
                                                const level = tag.substring(2, 3);
                                                return {
                                                    tag: `h${level}`,
                                                    text: tag.replace(/<[^>]+>/g, '').trim()
                                                };
                                            });
                                        } else {
                                            // Fallback to Markdown regex if no HTML tags found
                                            const mdHeaders = currentComp.content.match(/#{1,4}\s+[^|#\n]+/g);
                                            if (mdHeaders) {
                                                displayHeaders = mdHeaders.map((h: string) => ({
                                                    tag: h.startsWith('###') ? 'h3' : h.startsWith('##') ? 'h2' : 'h1',
                                                    text: h.replace(/^#+\s+/, '').trim()
                                                }));
                                            }
                                        }
                                    }

                                    return displayHeaders.length > 0 ? (
                                        displayHeaders.map((h: any, i: number) => {
                                            const headerId = `comp-${activeIdx}-h-${i}`;
                                            const isExpanded = expandedHeaders[headerId];
                                            const indent = h.tag === 'h1' || h.tag === 'H1' ? 'ml-0' : 
                                                          h.tag === 'h2' || h.tag === 'H2' ? 'ml-6' : 'ml-12';
                                        
                                        return (
                                            <div key={headerId} className={cn("transition-all", indent)}>
                                                 <div 
                                                     onClick={() => toggleHeader(headerId)}
                                                     className={cn(
                                                         "group flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none",
                                                         (h.tag === 'h1' || h.tag === 'H1') ? "bg-indigo-50 border-indigo-100 text-indigo-900" :
                                                         (h.tag === 'h2' || h.tag === 'H2') ? "bg-white border-slate-200 text-slate-700 hover:border-indigo-200" :
                                                         "bg-white border-slate-100 text-slate-500 hover:border-indigo-100"
                                                     )}
                                                 >
                                                    <span className={cn(
                                                        "text-[9px] font-black uppercase w-6 shrink-0",
                                                        (h.tag === 'h1' || h.tag === 'H1') ? "text-indigo-400" : "text-slate-300"
                                                    )}>
                                                        {h.tag}
                                                    </span>
                                                    <span className="flex-1 text-[11px] font-bold truncate leading-relaxed">
                                                        {h.text}
                                                    </span>
                                                    <div className="shrink-0 opacity-40 group-hover:opacity-100">
                                                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                    </div>
                                                </div>
                                                
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="pt-2 pb-1 pl-4">
                                                                <div className="p-4 bg-slate-50 border border-slate-200 border-dashed rounded-2xl mb-2">
                                                                    <div 
                                                                        className="text-[10px] text-slate-600 font-medium leading-relaxed prose prose-sm max-w-none"
                                                                        dangerouslySetInnerHTML={{
                                                                            __html: (() => {
                                                                                const content = currentComp.content || "";
                                                                                if (!content) return "No hay contenido disponible para esta sección.";
                                                                                
                                                                                // Clean header text for matching
                                                                                const cleanSearch = h.text.trim();
                                                                                const escapedSearch = cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                                                                
                                                                                // 1. Try HTML Match
                                                                                const htmlRegex = new RegExp(`<h[1-5][^>]*>\\s*${escapedSearch}\\s*</h[1-5]>`, 'i');
                                                                                const htmlMatch = content.match(htmlRegex);
                                                                                
                                                                                if (htmlMatch) {
                                                                                    const startIdx = htmlMatch.index! + htmlMatch[0].length;
                                                                                    const rest = content.substring(startIdx);
                                                                                    const nextHeaderMatch = rest.match(/<h[1-5][^>]*>/i);
                                                                                    return (nextHeaderMatch ? rest.substring(0, nextHeaderMatch.index) : rest).trim() || "Sección sin contenido inmediato.";
                                                                                }

                                                                                // 2. Fallback to Markdown Match
                                                                                const mdRegex = new RegExp(`#{1,5}\\s+${escapedSearch}`, 'i');
                                                                                const mdMatch = content.match(mdRegex);
                                                                                
                                                                                if (mdMatch) {
                                                                                    const startIdx = mdMatch.index! + mdMatch[0].length;
                                                                                    const rest = content.substring(startIdx);
                                                                                    const nextHeaderMatch = rest.match(/\n#{1,5}\s+/);
                                                                                    const segment = nextHeaderMatch ? rest.substring(0, nextHeaderMatch.index) : rest;
                                                                                    return segment.trim().replace(/\n/g, '<br/>') || "Sección sin texto descriptivo.";
                                                                                }

                                                                                // 3. Simple Text Fallback
                                                                                const simpleIndex = content.toLowerCase().indexOf(cleanSearch.toLowerCase());
                                                                                if (simpleIndex !== -1) {
                                                                                    const startIdx = simpleIndex + cleanSearch.length;
                                                                                    const rest = content.substring(startIdx);
                                                                                    const nextTagMatch = rest.match(/<h[1-5]|#{1,5}\s+/i);
                                                                                    return (nextTagMatch ? rest.substring(0, nextTagMatch.index) : rest).trim() || "Contenido no segmentable.";
                                                                                }

                                                                                return "Contenido no indexado para este encabezado específico.";
                                                                            })()
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-12 flex flex-col items-center justify-center bg-white rounded-[32px] border-2 border-dashed border-slate-100 text-slate-300">
                                        <AlignLeft size={32} className="opacity-10 mb-2" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Sin estructura extraíble</p>
                                    </div>
                                );
                                })() }
                            </div>
                        </section>

                        {/* Bottom AI Note - Matches Dashboard Summary */}
                        {currentComp.summary && (
                            <div className="bg-indigo-600 rounded-[28px] p-6 shadow-xl shadow-indigo-200 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:rotate-0 transition-transform">
                                    <Lightbulb size={60} className="text-white" />
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Lightbulb size={14} className="text-indigo-300" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Visión de Nous</span>
                                </div>
                                <p className="text-xs text-white leading-relaxed font-medium relative z-10">
                                    {currentComp.summary}
                                </p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
