"use client";

import { useState, useEffect } from "react";
import { 
    Share2, 
    Loader2,
    ArrowUpAz,
    ArrowDownAz,
    PencilLine
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { useProjectStore } from "@/store/useProjectStore";
import { CorrectionMode } from "./distribution/CorrectionMode";
import { PublicationMode } from "./distribution/PublicationMode";

export default function DistributionView() {
    const { tasks, isLoading, activeProjectIds, fetchProjectTasks } = useProjectStore();
    const [viewMode, setViewMode] = useState<"correction" | "distribution">("correction");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // Sync tasks on mount or when active project changes
    useEffect(() => {
        if (activeProjectIds.length > 0) {
            fetchProjectTasks(activeProjectIds[0]);
        }
    }, [activeProjectIds, fetchProjectTasks]);

    if (isLoading && tasks.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white">
                <div className="relative w-24 h-24 mb-8">
                    <div className="absolute inset-0 rounded-[40px] bg-slate-50 animate-pulse border border-slate-100/50"></div>
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin stroke-[2.5px] absolute inset-0 m-auto" />
                </div>
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] mb-1">Cargando Distribución</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse opacity-60">Sincronizando Archivos...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
            {/* Header / Toolbar */}
            <div className="px-8 py-6 border-b border-slate-100 flex flex-col gap-6 bg-white shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                            <Share2 size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-tight">Salida Nous</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", viewMode === 'correction' ? "bg-amber-400" : "bg-emerald-400")} />
                                {viewMode === 'correction' ? "Revisión & Pulido Humano" : "Gestión de Distribución"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-[20px] border border-slate-200/50">
                        <button 
                            onClick={() => setViewMode('correction')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                viewMode === 'correction' ? "bg-white text-indigo-600 shadow-sm border border-slate-200/40" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <PencilLine size={14} className={cn(viewMode === 'correction' ? "text-indigo-500" : "text-slate-300")} />
                            Corrección
                        </button>
                        <button 
                            onClick={() => setViewMode('distribution')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                viewMode === 'distribution' ? "bg-white text-indigo-600 shadow-sm border border-slate-200/40" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <Share2 size={14} className={cn(viewMode === 'distribution' ? "text-emerald-500" : "text-slate-300")} />
                            Distribución
                        </button>
                    </div>

                    <button 
                        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                        className="h-11 px-4 flex items-center gap-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        {sortOrder === "desc" ? <ArrowDownAz size={16} /> : <ArrowUpAz size={16} />}
                        <span className="hidden md:inline">Fecha</span>
                    </button>
                </div>
            </div>

            {/* Content Area Switch */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <AnimatePresence mode="wait">
                    {viewMode === 'correction' ? (
                        <motion.div 
                            key="correction"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex-1 flex overflow-hidden"
                        >
                            <CorrectionMode />
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="distribution"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                            className="flex-1 flex overflow-hidden"
                        >
                            <PublicationMode />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
