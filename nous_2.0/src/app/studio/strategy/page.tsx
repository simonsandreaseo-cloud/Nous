"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { EditorialCalendar } from "@/components/dashboard/EditorialCalendar";
import MetricsDashboard from "@/components/dashboard/MetricsDashboard";
import CrawlerConsole from "@/components/dashboard/CrawlerConsole";
import DataRefinery from "@/components/dashboard/DataRefinery";
import { QuickActionFab } from "@/components/dashboard/QuickActionFab";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, LayoutDashboard, LineChart, Globe, Database } from "lucide-react";
import Link from "next/link";
import { cn } from "@/utils/cn";
import { Suspense } from "react";

function StrategyContent() {
    const { activeProject } = useProjectStore();
    const searchParams = useSearchParams();
    const initialView = (searchParams.get('view') as any) || 'planner';
    const [view, setView] = useState<'planner' | 'metrics' | 'crawler' | 'refinery'>(initialView);

    useEffect(() => {
        const v = searchParams.get('view');
        if (v && ['planner', 'metrics', 'crawler', 'refinery'].includes(v)) {
            setView(v as any);
        }
    }, [searchParams]);

    return (
        <div className="relative w-full bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
            <div className="flex flex-col py-8 px-6 md:px-10 max-w-[1600px] mx-auto relative z-10 h-full">
                {/* Header Section */}
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col gap-1"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-0.5 bg-[var(--color-nous-mint)]/20 text-[var(--color-nous-mint)] rounded text-[9px] font-medium uppercase tracking-elegant border border-[var(--color-nous-mint)]/30">
                                {view === 'planner' ? 'Estrategia' :
                                    view === 'metrics' ? 'Auditoría' :
                                        view === 'crawler' ? 'Crawler' : 'Refinería'}
                            </span>
                        </div>
                        <h1 className="text-3xl font-light tracking-elegant text-slate-800 uppercase leading-tight">
                            {view === 'planner' ? (
                                <>Planificación <span className="text-slate-400">Mensual</span></>
                            ) : view === 'metrics' ? (
                                <>Métricas <span className="text-[var(--color-nous-mist)]">Clave</span></>
                            ) : view === 'crawler' ? (
                                <>Deep Crawler <span className="text-[var(--color-nous-mint)]">Pro</span></>
                            ) : (
                                <>Data <span className="text-[var(--color-nous-mist)]">Refinery</span></>
                            )}
                        </h1>
                    </motion.div>

                    <div className="flex flex-col items-end gap-4">
                        <div className="flex p-1 glass-panel border border-hairline rounded-2xl shadow-sm overflow-x-auto max-w-full no-scrollbar">
                            <button
                                onClick={() => setView('planner')}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-elegant transition-all flex items-center gap-2 whitespace-nowrap",
                                    view === 'planner' ? "bg-white text-slate-900 shadow-sm border border-hairline" : "text-slate-400 hover:text-slate-600 glass-panel-hover"
                                )}
                            >
                                <LayoutDashboard size={14} /> Planner
                            </button>
                            <button
                                onClick={() => setView('metrics')}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-elegant transition-all flex items-center gap-2 whitespace-nowrap",
                                    view === 'metrics' ? "bg-white text-slate-900 shadow-sm border border-hairline" : "text-slate-400 hover:text-slate-600 glass-panel-hover"
                                )}
                            >
                                <LineChart size={14} /> Métricas
                            </button>
                            <button
                                onClick={() => setView('crawler')}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-elegant transition-all flex items-center gap-2 whitespace-nowrap",
                                    view === 'crawler' ? "bg-white text-slate-900 shadow-sm border border-hairline" : "text-slate-400 hover:text-slate-600 glass-panel-hover"
                                )}
                            >
                                <Globe size={14} /> Crawler
                            </button>
                            <button
                                onClick={() => setView('refinery')}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-elegant transition-all flex items-center gap-2 whitespace-nowrap",
                                    view === 'refinery' ? "bg-white text-slate-900 shadow-sm border border-hairline" : "text-slate-400 hover:text-slate-600 glass-panel-hover"
                                )}
                            >
                                <Database size={14} /> Refinería
                            </button>
                        </div>
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={view}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 min-h-[800px]"
                    >
                        {view === 'planner' && <EditorialCalendar />}
                        {view === 'metrics' && <MetricsDashboard />}
                        {view === 'crawler' && <CrawlerConsole />}
                        {view === 'refinery' && <DataRefinery />}
                    </motion.div>
                </AnimatePresence>
            </div>

            <QuickActionFab />

            {/* Background elements */}
            <div className={cn(
                "fixed top-0 right-0 w-[500px] h-[500px] blur-[120px] rounded-full pointer-events-none opacity-60 z-0 transition-colors duration-700",
                "bg-gradient-to-br from-cyan-100/40 to-blue-100/40"
            )} />
        </div>
    );
}

export default function StrategyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Iniciando Estrategia Neural...</p>
                </div>
            </div>
        }>
            <StrategyContent />
        </Suspense>
    );
}
