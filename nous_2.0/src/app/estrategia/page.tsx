"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { NavigationHeader } from "@/components/dom/NavigationHeader";
import { EditorialCalendar } from "@/components/dashboard/EditorialCalendar";
import MetricsDashboard from "@/components/dashboard/MetricsDashboard";
import HeliosConsole from "@/components/dashboard/HeliosConsole";
import CrawlerConsole from "@/components/dashboard/CrawlerConsole";
import DataRefinery from "@/components/dashboard/DataRefinery";
import { QuickActionFab } from "@/components/dashboard/QuickActionFab";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, LayoutDashboard, LineChart, Cpu, Globe, Database } from "lucide-react";
import Link from "next/link";
import { cn } from "@/utils/cn";

export default function StrategyPage() {
    const { activeProject } = useProjectStore();
    const searchParams = useSearchParams();
    const initialView = (searchParams.get('view') as any) || 'planner';
    const [view, setView] = useState<'planner' | 'metrics' | 'helios' | 'crawler' | 'refinery'>(initialView);

    useEffect(() => {
        const v = searchParams.get('view');
        if (v && ['planner', 'metrics', 'helios', 'crawler', 'refinery'].includes(v)) {
            setView(v as any);
        }
    }, [searchParams]);

    return (
        <div className="relative min-h-screen w-full bg-[#f8fafc] overflow-x-hidden text-slate-900 font-sans selection:bg-cyan-100 selection:text-cyan-900">
            <NavigationHeader />

            <div className="flex flex-col min-h-screen pt-32 pb-20 px-6 md:px-12 max-w-[1800px] mx-auto relative z-10">
                {/* Header Section */}
                <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col gap-4"
                    >
                        <Link
                            href="/contents"
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors group"
                        >
                            <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Volver al Dashboard
                        </Link>

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black tracking-[0.3em] text-cyan-500 uppercase font-mono">
                                {view === 'planner' ? 'Planner Estratégico' :
                                    view === 'metrics' ? 'Inteligencia de Datos' :
                                        view === 'helios' ? 'Auditoría Neural' :
                                            view === 'crawler' ? 'Deep Crawler Engine' : 'Refinería Pro'}
                            </span>
                            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 uppercase italic">
                                {view === 'planner' ? (
                                    <>Planificación <span className="text-slate-300">Mensual</span></>
                                ) : view === 'metrics' ? (
                                    <>Métricas <span className="text-slate-300">Clave</span></>
                                ) : view === 'helios' ? (
                                    <>Helios <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">Engine</span></>
                                ) : view === 'crawler' ? (
                                    <>Crawler <span className="text-emerald-500">Pro</span></>
                                ) : (
                                    <>Data <span className="text-cyan-500">Refinery</span></>
                                )}
                            </h1>
                        </div>
                    </motion.div>

                    <div className="flex flex-col items-end gap-4">
                        <div className="flex p-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto max-w-full">
                            <button
                                onClick={() => setView('planner')}
                                className={cn(
                                    "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                                    view === 'planner' ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <LayoutDashboard size={14} /> Planner
                            </button>
                            <button
                                onClick={() => setView('metrics')}
                                className={cn(
                                    "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                                    view === 'metrics' ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <LineChart size={14} /> Métricas
                            </button>
                            <button
                                onClick={() => setView('helios')}
                                className={cn(
                                    "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                                    view === 'helios' ? "bg-purple-600 text-white shadow-md shadow-purple-500/20" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <Cpu size={14} /> Helios
                            </button>
                            <button
                                onClick={() => setView('crawler')}
                                className={cn(
                                    "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                                    view === 'crawler' ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <Globe size={14} /> Crawler
                            </button>
                            <button
                                onClick={() => setView('refinery')}
                                className={cn(
                                    "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                                    view === 'refinery' ? "bg-cyan-600 text-white shadow-md shadow-cyan-500/20" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <Database size={14} /> Refinería
                            </button>
                        </div>
                        <div className="hidden md:flex flex-col items-end gap-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeProject?.name || "Sin Proyecto Seleccionado"}</span>
                            <span className="text-xs font-bold text-slate-500">{activeProject?.domain}</span>
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
                        {view === 'helios' && <HeliosConsole />}
                        {view === 'crawler' && <CrawlerConsole />}
                        {view === 'refinery' && <DataRefinery />}
                    </motion.div>
                </AnimatePresence>
            </div>

            <QuickActionFab />

            {/* Background elements */}
            <div className={cn(
                "fixed top-0 right-0 w-[500px] h-[500px] blur-[120px] rounded-full pointer-events-none opacity-60 z-0 transition-colors duration-700",
                view === 'helios' ? "bg-purple-200/40" : "bg-gradient-to-br from-cyan-100/40 to-blue-100/40"
            )} />
        </div>
    );
}
