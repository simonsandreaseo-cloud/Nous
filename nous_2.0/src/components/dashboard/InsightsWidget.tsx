"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LineChart,
    TrendingUp,
    ExternalLink,
    ChevronDown,
    Search,
    MousePointer2,
    Eye,
    Calendar,
    Sparkles,
    MoreHorizontal
} from "lucide-react";
import { cn } from "@/utils/cn";

const mockInsights = [
    {
        id: 1,
        title: "Impacto de IA en Diagnóstico Clínico",
        url: "https://nous.tech/blog/ia-diagnostico",
        clicks: 1240,
        impressions: 45000,
        ctr: "2.7%",
        keywords: ["ia en salud", "diagnóstico digital", "tecnología médica 2026", "seo clínico", "futuro medicina"],
        pubDate: "2026-01-15",
        gain: "+18%"
    },
    {
        id: 2,
        title: "Guía de Optimización Neural",
        url: "https://nous.tech/blog/neural-optimization",
        clicks: 850,
        impressions: 12000,
        ctr: "7.1%",
        keywords: ["neural link b2b", "optimización cognitiva", "equipo eficiente", "seo neural"],
        pubDate: "2026-01-22",
        gain: "+24%"
    }
];

export function InsightsWidget() {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    return (
        <section className="bg-white/70 backdrop-blur-xl border border-white rounded-[32px] p-8 shadow-sm hover:shadow-xl transition-all h-full flex flex-col">
            <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">Neural Insights</h3>
                        <p className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Métricas de Impacto</p>
                    </div>
                </div>

                <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all">
                    <Search size={18} />
                </button>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar">
                {mockInsights.map((item) => (
                    <div
                        key={item.id}
                        className={cn(
                            "p-6 rounded-[24px] border transition-all duration-300 group cursor-pointer",
                            expandedId === item.id ? "bg-white border-blue-100 shadow-md" : "bg-slate-50/50 border-transparent hover:bg-white hover:border-slate-100"
                        )}
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-slate-800 tracking-tight truncate group-hover:text-blue-600 transition-colors">{item.title}</h4>
                                <div className="flex items-center gap-2 mt-1 opacity-50">
                                    <ExternalLink size={10} />
                                    <span className="text-[10px] font-mono truncate">{item.url}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black font-mono border border-emerald-100">
                                <TrendingUp size={12} />
                                {item.gain}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Clicks</span>
                                <span className="text-xs font-black font-mono text-slate-700">{item.clicks}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Impr.</span>
                                <span className="text-xs font-black font-mono text-slate-700">{item.impressions}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">CTR</span>
                                <span className="text-xs font-black font-mono text-slate-700">{item.ctr}</span>
                            </div>
                        </div>

                        <AnimatePresence>
                            {expandedId === item.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="pt-6 mt-6 border-t border-slate-100 overflow-hidden"
                                >
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Sparkles size={12} className="text-blue-500" />
                                        Keywords con Mayor Impacto
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {item.keywords.slice(0, 5).map((kw, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-slate-100/50 border border-slate-200 text-[10px] font-bold text-slate-500 rounded-full hover:bg-white hover:border-blue-200 hover:text-blue-600 transition-all">
                                                {kw}
                                            </span>
                                        ))}
                                        {item.keywords.length > 5 && (
                                            <button className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold rounded-full hover:bg-blue-100 transition-all flex items-center gap-1">
                                                Ver {item.keywords.length - 5} más
                                                <MoreHorizontal size={10} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="mt-6 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase font-mono">
                                            <Calendar size={12} />
                                            Publicado: {item.pubDate}
                                        </div>
                                        <button className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:underline">
                                            VER TODAS LAS KEYWORDS
                                            <ChevronDown size={12} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>

            <button className="mt-8 py-3 w-full bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-bold text-white uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10">
                Ver Reporte Completo
            </button>
        </section>
    );
}
