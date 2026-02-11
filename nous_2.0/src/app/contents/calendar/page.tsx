"use client";

import { useProjectStore } from "@/store/useProjectStore";
import { NavigationHeader } from "@/components/dom/NavigationHeader";
import { EditorialCalendar } from "@/components/dashboard/EditorialCalendar";
import { QuickActionFab } from "@/components/dashboard/QuickActionFab";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function CalendarPage() {
    const { activeProject } = useProjectStore();

    return (
        <div className="relative min-h-screen w-full bg-[#f8fafc] overflow-x-hidden text-slate-900 font-sans selection:bg-cyan-100 selection:text-cyan-900">
            <NavigationHeader />

            <div className="flex flex-col min-h-screen pt-32 pb-20 px-6 md:px-12 max-w-[1800px] mx-auto relative z-10">
                {/* Header Section */}
                <header className="mb-10 flex items-end justify-between">
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
                                Planner Estratégico
                            </span>
                            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 uppercase italic">
                                Planificación <span className="text-slate-300">Mensual</span>
                            </h1>
                        </div>
                    </motion.div>

                    <div className="hidden md:flex flex-col items-end gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeProject?.name || "Sin Proyecto Seleccionado"}</span>
                        <span className="text-xs font-bold text-slate-500">{activeProject?.domain}</span>
                    </div>
                </header>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex-1 min-h-[800px]"
                >
                    <EditorialCalendar />
                </motion.div>
            </div>

            <QuickActionFab />

            {/* Background elements */}
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-cyan-100/40 to-blue-100/40 blur-[120px] rounded-full pointer-events-none opacity-60 z-0" />
        </div>
    );
}
