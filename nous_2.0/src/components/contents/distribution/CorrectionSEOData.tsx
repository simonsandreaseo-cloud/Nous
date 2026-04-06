"use client";

import { 
    Globe, 
    Link, 
    MessageSquareQuote,
    BarChart3, 
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    Hash,
    Sparkles,
    Search,
    Target,
    Layout,
    ExternalLink,
    Circle
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/utils/cn";
import { Task } from "@/store/useProjectStore";
import { motion, AnimatePresence } from "framer-motion";

interface CorrectionSEODataProps {
    task: Task;
}

export function CorrectionSEOData({ task }: CorrectionSEODataProps) {
    const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
        metadata: true,
        lsi: false,
        links: false,
        questions: false,
    });

    const toggleAccordion = (key: string) => {
        setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const currentContent = task.content_body || "";
    
    // SEO Utility Functions (Mirrored from SEODataTab)
    const getWordCount = (text: string) => {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    };

    const countOccurrences = (text: string, searchStr: string) => {
        if (!searchStr) return 0;
        const cleanText = text.replace(/<[^>]*>?/gm, ' '); // Strip HTML for counting
        const regex = new RegExp(searchStr.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
        return (cleanText.match(regex) || []).length;
    };

    const calculateDensity = (text: string, searchStr: string) => {
        if (!searchStr || !text) return 0;
        const occurrences = countOccurrences(text, searchStr);
        const searchWords = getWordCount(searchStr);
        const totalWords = getWordCount(text);
        if (totalWords === 0) return 0;
        return ((occurrences * searchWords) / totalWords) * 100;
    };

    const wordCount = getWordCount(currentContent);
    const primaryDensity = calculateDensity(currentContent, task.target_keyword || '');
    
    const lsiKeywords = task.research_dossier?.lsiKeywords || [];
    const frequentQuestions = task.research_dossier?.frequentQuestions || [];
    const suggestedLinks = task.research_dossier?.suggestedInternalLinks || task.research_dossier?.suggested_links || [];

    const usedLSI = lsiKeywords.filter((k: any) => {
        const kw = typeof k === 'string' ? k : k?.keyword;
        if (!kw) return false;
        return currentContent.toLowerCase().includes(kw.toLowerCase());
    });
    
    // Simple health score logic
    const healthScore = useMemo(() => {
        let score = 0;
        if (task.seo_title) score += 20;
        if (task.meta_description) score += 20;
        if (task.target_url_slug) score += 20;
        if (primaryDensity > 0.5 && primaryDensity < 2.5) score += 20;
        if (usedLSI.length > 0) score += 20;
        return score;
    }, [task, primaryDensity, usedLSI]);

    return (
        <div className="h-full flex flex-col bg-white border-l border-slate-100 overflow-y-auto custom-scrollbar p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={16} className="text-indigo-600" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800">Data SEO & Auditoría</h3>
            </div>

            {/* Metrics Grid (Same as SEODataTab) */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-[20px] text-center">
                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Densidad KW</p>
                    <p className={cn("text-sm font-black italic", primaryDensity > 0 && primaryDensity <= 2.5 ? "text-emerald-500" : "text-amber-500")}>
                        {primaryDensity.toFixed(2)}%
                    </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-[20px] text-center">
                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Palabras</p>
                    <p className="text-sm font-black text-slate-800 italic">
                        {wordCount}
                    </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-[20px] text-center">
                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">LSI Usadas</p>
                    <p className="text-sm font-black text-indigo-500 italic">
                        {usedLSI.length}/{lsiKeywords.length}
                    </p>
                </div>
                <div className="p-4 bg-slate-900 rounded-[20px] text-center text-white">
                    <p className="text-[8px] font-black uppercase text-white/40 mb-1 tracking-widest">SEO Health</p>
                    <p className="text-sm font-black italic">
                        {healthScore}%
                    </p>
                </div>
            </div>

            {/* Target Keyword Card */}
            <div className="bg-indigo-600 rounded-[24px] p-5 text-white shadow-lg shadow-indigo-100">
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Main Goal</span>
                <p className="text-lg font-black italic tracking-tighter mt-1">{task.target_keyword || "Sin Keyword"}</p>
            </div>

            {/* ACCORDIONS (Styled like SEODataTab) */}
            <div className="space-y-4">
                
                {/* METADATA PREVIEW ACCORDION */}
                <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
                    <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => toggleAccordion('metadata')}
                    >
                        <div className="flex items-center gap-3">
                            <Target size={16} className="text-indigo-500" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Metadatos & Snippet</h4>
                        </div>
                        <ChevronDown size={14} className={cn("text-slate-400 transition-transform", openAccordions.metadata && "rotate-180")} />
                    </div>
                    {openAccordions.metadata && (
                        <div className="p-4 border-t border-slate-100 bg-slate-50/30 space-y-4">
                            {/* Google Preview (Exact style) */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Google Snippet</p>
                                <div className="font-sans">
                                    <div className="text-[10px] text-slate-600 truncate mb-0.5">
                                        https://tusitio.com/{task.target_url_slug || '...'}
                                    </div>
                                    <div className="text-[14px] text-[#1a0dab] hover:underline cursor-pointer mb-0.5 truncate font-medium">
                                        {task.seo_title || 'Título SEO no definido'}
                                    </div>
                                    <div className="text-[11px] text-[#4d5156] line-clamp-2 leading-relaxed">
                                        {task.meta_description || 'La meta descripción no se ha definido aún.'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* LSI ACCORDION */}
                <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
                    <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => toggleAccordion('lsi')}
                    >
                        <div className="flex items-center gap-3">
                            <Hash size={16} className="text-emerald-500" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-700">LSI Keywords</h4>
                        </div>
                        <ChevronDown size={14} className={cn("text-slate-400 transition-transform", openAccordions.lsi && "rotate-180")} />
                    </div>
                    {openAccordions.lsi && (
                        <div className="p-4 border-t border-slate-100 bg-slate-50/30">
                            <div className="flex flex-wrap gap-2">
                                {lsiKeywords.length > 0 ? lsiKeywords.map((k: any, i: number) => {
                                    const kw = typeof k === 'string' ? k : k?.keyword;
                                    if (!kw) return null;
                                    const used = currentContent.toLowerCase().includes(kw.toLowerCase());
                                    return (
                                        <div key={i} className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all",
                                            used ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-white border-slate-200 text-slate-400"
                                        )}>
                                            <div className={cn("w-1.5 h-1.5 rounded-full", used ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                                            {kw}
                                        </div>
                                    );
                                }) : (
                                    <p className="text-[10px] text-slate-400 italic">No hay LSI disponibles.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* LINKS ACCORDION */}
                <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
                    <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => toggleAccordion('links')}
                    >
                        <div className="flex items-center gap-3">
                            <Sparkles size={16} className="text-amber-500" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Enlaces & Briefing</h4>
                        </div>
                        <ChevronDown size={14} className={cn("text-slate-400 transition-transform", openAccordions.links && "rotate-180")} />
                    </div>
                    {openAccordions.links && (
                        <div className="p-4 border-t border-slate-100 bg-slate-50/30 space-y-4">
                            <div className="space-y-2">
                                {suggestedLinks.map((link: any, i: number) => {
                                    const url = typeof link === 'string' ? link : link.url;
                                    const title = typeof link === 'string' ? link : link.title;
                                    const isUsed = currentContent.includes(url);
                                    return (
                                        <div key={i} className={cn(
                                            "flex items-center justify-between p-3 border rounded-xl shadow-sm text-[10px] font-bold",
                                            isUsed ? "bg-indigo-50 border-indigo-100 text-indigo-700" : "bg-white border-slate-200 text-slate-600"
                                        )}>
                                            <span className="truncate pr-4">{title}</span>
                                            {isUsed && <CheckCircle2 size={12} className="text-indigo-500 shrink-0" />}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <span className="text-[8px] font-black uppercase text-slate-300 block mb-2">Resumen Estratégico</span>
                                <div className="text-[10px] font-medium text-slate-600 leading-relaxed italic line-clamp-6">
                                    {task.research_dossier?.briefing || "Sin briefing detallado."}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
