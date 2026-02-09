"use client";

import { useState } from "react";
import { NavigationHeader } from "@/components/dom/NavigationHeader";
import { FullCalendar } from "@/components/calendar/FullCalendar";
import { MonthlyPerformanceSidebar } from "@/components/calendar/MonthlyPerformanceSidebar";
import { BulkUploadModal } from "@/components/calendar/BulkUploadModal";
import { motion } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import { ArrowLeft, Calendar, Upload } from "lucide-react";
import Link from "next/link";

export default function CalendarPage() {
    const { activeProject } = useProjectStore();
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    return (
        <div className="relative min-h-screen w-full bg-[#f8fafc] text-slate-900 font-sans">
            <NavigationHeader />
            <BulkUploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />

            <main className="relative z-10 pt-32 pb-20 px-6 md:px-12 max-w-[1600px] mx-auto">
                {/* Header */}
                <header className="mb-8 flex items-end justify-between">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-1"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Link href="/contents" className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1 uppercase tracking-widest">
                                <ArrowLeft size={12} /> Volver al Dashboard
                            </Link>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase italic flex items-center gap-4">
                            Agenda <span className="text-slate-300">Mensual</span>
                        </h1>
                    </motion.div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setIsUploadOpen(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <Upload size={16} />
                            Subir Programación (CSV)
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Calendar Area */}
                    <div className="lg:col-span-9 space-y-8">
                        <FullCalendar />

                        {/* Upcoming List Section (Simulated below calendar) */}
                        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6">Próximos Artículos</h3>
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group cursor-pointer">
                                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center font-black text-slate-300">
                                            {i}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-800 text-sm group-hover:text-cyan-600 transition-colors">
                                                Estrategias de Contenido para 2026: Una Guía Completa {i}
                                            </h4>
                                            <div className="flex gap-3 mt-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Feb {10 + i}</span>
                                                <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">Blog Post</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:opacity-100 opacity-0 transition-opacity">Editar</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-3">
                        <MonthlyPerformanceSidebar />
                    </div>
                </div>
            </main>
        </div>
    );
}
