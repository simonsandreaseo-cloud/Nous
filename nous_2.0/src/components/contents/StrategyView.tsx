"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import MetricsDashboard from "@/components/dashboard/MetricsDashboard";
import CrawlerConsole from "@/components/dashboard/CrawlerConsole";
import DataRefinery from "@/components/dashboard/DataRefinery";
import StrategyGrid from "@/components/dashboard/StrategyGrid";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, LineChart, Globe, Database } from "lucide-react";
import { cn } from "@/utils/cn";

export default function StrategyView() {
    const { activeProject } = useProjectStore();
    const [view, setView] = useState<'planner' | 'metrics' | 'crawler' | 'refinery'>('planner');

    return (
        <div className="flex flex-col h-full">
            <div className="flex p-1 bg-slate-100/50 rounded-2xl w-fit mb-8 border border-slate-200/50 max-w-full overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setView('planner')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                        view === 'planner' ? "bg-white text-slate-900 shadow-sm shadow-slate-200" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <LayoutDashboard size={14} /> Planificación
                </button>
                <button
                    onClick={() => setView('metrics')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                        view === 'metrics' ? "bg-white text-slate-900 shadow-sm shadow-slate-200" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <LineChart size={14} /> Métricas
                </button>
                <button
                    onClick={() => setView('crawler')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                        view === 'crawler' ? "bg-white text-slate-900 shadow-sm shadow-slate-200" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <Globe size={14} /> Crawler
                </button>
                <button
                    onClick={() => setView('refinery')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                        view === 'refinery' ? "bg-white text-slate-900 shadow-sm shadow-slate-200" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <Database size={14} /> Refinería
                </button>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={view}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1"
                >
                    {view === 'planner' && <StrategyGrid />}
                    {view === 'metrics' && <MetricsDashboard />}
                    {view === 'crawler' && <CrawlerConsole />}
                    {view === 'refinery' && <DataRefinery />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
