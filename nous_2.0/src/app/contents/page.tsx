"use client";

import { NavigationHeader } from "@/components/dom/NavigationHeader";
import { BudgetWidget } from "@/components/dashboard/BudgetWidget";
import { InsightsWidget } from "@/components/dashboard/InsightsWidget";
import { DiscoveryWidget } from "@/components/dashboard/DiscoveryWidget";
import { UploaderSuite } from "@/components/dashboard/UploaderSuite";
import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import {
    Layers,
    ChevronRight,
    ArrowUpRight,
    Settings
} from "lucide-react";
import { motion } from "framer-motion";

export default function ContentDashboard() {
    return (
        <div className="relative min-h-screen w-full bg-[#F8FAFC] overflow-x-hidden text-slate-900 font-sans">
            {/* Background elements for high-end aesthetic */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
                <div className="absolute top-[5%] left-[-5%] w-[50%] h-[50%] bg-cyan-100/50 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-50 rounded-full blur-[140px]" />
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-[0.02]" />
            </div>

            <NavigationHeader />

            <main className="relative z-10 pt-32 pb-20 px-6 md:px-12 max-w-[1800px] mx-auto">
                {/* Dashboard Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 text-[10px] font-black tracking-[0.3em] text-cyan-600 uppercase font-mono">
                            <Layers size={14} />
                            Sector de Inteligencia
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 uppercase italic leading-none">
                            Neural <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-500">Dashboard</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-white/70 backdrop-blur-md px-6 py-3 rounded-2xl border border-white shadow-sm flex items-center gap-6">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Estado Sistema</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-slate-700 uppercase font-mono">Sincronizado</span>
                                </div>
                            </div>
                            <div className="w-[1px] h-8 bg-slate-200" />
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Proyecto Activo</span>
                                <span className="text-[10px] font-bold text-slate-900 uppercase font-mono">simonsandrea-seo</span>
                            </div>
                        </div>
                        <button className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-slate-800 transition-all">
                            <Settings size={20} />
                        </button>
                    </div>
                </header>

                {/* Main 12-Column Grid */}
                <div className="grid grid-cols-12 gap-8">

                    {/* Left & Center: Production & Planning (8 Columns) */}
                    <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">

                        {/* Top Row: Budget & Calendar Mini */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[450px]">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <BudgetWidget />
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <MiniCalendar />
                            </motion.div>
                        </div>

                        {/* Mid Row: Insights (Full Width of center) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex-1"
                        >
                            <InsightsWidget />
                        </motion.div>
                    </div>

                    {/* Right: Tools & Discovery (4 Columns) */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">

                        {/* Discovery Section */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="h-[480px]"
                        >
                            <DiscoveryWidget />
                        </motion.div>

                        {/* Uploader Section */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                            className="flex-1"
                        >
                            <UploaderSuite />
                        </motion.div>
                    </div>
                </div>

                {/* Footer Insight Stripe */}
                <motion.footer
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-12 p-6 bg-slate-900 rounded-[32px] text-white flex flex-col md:flex-row items-center justify-between gap-6"
                >
                    <div className="flex items-center gap-6">
                        <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <ArrowUpRight size={14} />
                            Tendencia Alcista Detectada
                        </div>
                        <p className="text-sm font-bold tracking-tight text-slate-300">
                            La temática <span className="text-white italic">"Sal Rosa del Himalaya"</span> ha crecido un 45% en volumen de búsqueda este mes.
                            <button className="ml-3 text-cyan-400 hover:text-cyan-300 underline decoration-cyan-400/30 transition-colors">Crear contenido sugerido</button>
                        </p>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                        Versión 2.1.0 Neural Factory
                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                        Latencia: 14ms
                    </div>
                </motion.footer>
            </main>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
