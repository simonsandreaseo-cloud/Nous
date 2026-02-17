"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import HeliosConsole from "@/components/dashboard/HeliosConsole";
import { QuickActionFab } from "@/components/dashboard/QuickActionFab";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Cpu, Activity } from "lucide-react";
import Link from "next/link";
import { cn } from "@/utils/cn";
import { Suspense } from "react";

function MonitorContent() {
    const { activeProject } = useProjectStore();
    const searchParams = useSearchParams();
    const initialView = (searchParams.get('view') as any) || 'helios';
    const [view, setView] = useState<'helios' | 'performance'>(initialView);

    useEffect(() => {
        const v = searchParams.get('view');
        if (v && ['helios', 'performance'].includes(v)) {
            setView(v as any);
        }
    }, [searchParams]);

    return (
        <div className="relative w-full bg-[#f8fafc] overflow-x-hidden text-slate-900 font-sans selection:bg-cyan-100 selection:text-cyan-900">

            <div className="flex flex-col pb-20 px-6 md:px-12 max-w-[1800px] mx-auto relative z-10">
                {/* Header Section */}
                <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col gap-4"
                    >
                        <Link
                            href="/studio/dashboard"
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors group"
                        >
                            <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Volver al Dashboard
                        </Link>

                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold tracking-widest text-orange-600 uppercase font-mono">
                                {view === 'helios' ? 'Auditoría Neural Helios' : 'Monitoreo de Rendimiento'}
                            </span>
                            <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic">
                                {view === 'helios' ? (
                                    <>Helios <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">Engine</span></>
                                ) : (
                                    <>Performance <span className="text-orange-500">Monitor</span></>
                                )}
                            </h1>
                        </div>
                    </motion.div>

                    <div className="flex flex-col items-end gap-4">
                        <div className="flex p-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto max-w-full">
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
                                onClick={() => setView('performance')}
                                className={cn(
                                    "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                                    view === 'performance' ? "bg-orange-600 text-white shadow-md shadow-orange-500/20" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <Activity size={14} /> Performance
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
                        {view === 'helios' && <HeliosConsole />}
                        {view === 'performance' && (
                            <div className="flex flex-col items-center justify-center h-[600px] text-slate-300">
                                <Activity size={48} className="mb-4 opacity-20" />
                                <p className="text-xs font-black uppercase tracking-widest">Sistema de Monitoreo en Desarrollo</p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            <QuickActionFab />

            {/* Background elements */}
            <div className={cn(
                "fixed top-0 right-0 w-[500px] h-[500px] blur-[120px] rounded-full pointer-events-none opacity-60 z-0 transition-colors duration-700",
                view === 'helios' ? "bg-purple-200/40" : "bg-orange-100/40"
            )} />
        </div>
    );
}

export default function MonitorPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Iniciando Monitor de Datos...</p>
                </div>
            </div>
        }>
            <MonitorContent />
        </Suspense>
    );
}
