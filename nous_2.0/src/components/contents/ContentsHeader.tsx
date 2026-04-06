"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { useRouter } from "next/navigation";
import {
    LayoutGrid,
    Columns,
    CalendarDays,
    Table2,
    Plus,
    ChevronDown,
    Send,
    ArrowLeft,
    Search,
    SlidersHorizontal,
} from "lucide-react";
import { CONTENT_TOOLS } from "./ContentsSidebar";
import { useWriterStore } from "@/store/useWriterStore";

type ViewMode = "cards" | "kanban" | "calendar" | "table";

interface ContentsHeaderProps {
    activeTool: string;
    onToolSelect: (toolId: string) => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
}

export function ContentsHeader({ activeTool, onToolSelect, viewMode, onViewModeChange }: ContentsHeaderProps) {
    const router = useRouter();
    const [programarOpen, setProgramarOpen] = useState(false);
    const { setViewMode, resetStrategy } = useWriterStore();
    const isOnDashboard = activeTool === "dashboard";
    const activeName = CONTENT_TOOLS.find(t => t.id === activeTool)?.label ?? "Dashboard";

    const handleNewContent = () => {
        router.push("/contents/planner?action=new-research");
        setProgramarOpen(false);
    };

    return (
        <header className="shrink-0 flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100/80">

            {/* Left: Breadcrumb + back button */}
            <div className="flex items-center gap-3 min-w-0">
                <AnimatePresence>
                    {!isOnDashboard && (
                        <motion.button
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            onClick={() => onToolSelect("dashboard")}
                            className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-700 transition-colors shrink-0"
                        >
                            <ArrowLeft size={12} />
                            Volver
                        </motion.button>
                    )}
                </AnimatePresence>

                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-black tracking-[0.25em] uppercase text-slate-400">Nous</span>
                    <span className="text-slate-200">/</span>
                    <span className={cn(
                        "text-[10px] font-black tracking-[0.25em] uppercase",
                        isOnDashboard ? "text-slate-400" : "text-slate-600"
                    )}>
                        Contenidos
                    </span>
                    {!isOnDashboard && (
                        <>
                            <span className="text-slate-200">/</span>
                            <span className="text-[10px] font-black tracking-[0.25em] uppercase text-slate-900 truncate">
                                {activeName}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Center: View toggle (only on dashboard) */}
            <AnimatePresence>
                {isOnDashboard && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex items-center bg-slate-100/80 rounded-xl p-1 gap-0.5"
                    >
                        {[
                            { id: "cards" as ViewMode, icon: LayoutGrid, label: "Tarjetas" },
                            { id: "kanban" as ViewMode, icon: Columns, label: "Tablero" },
                            { id: "calendar" as ViewMode, icon: CalendarDays, label: "Calendario" },
                            { id: "table" as ViewMode, icon: Table2, label: "Tabla" },
                        ].map(({ id, icon: Icon, label }) => (
                            <button
                                key={id}
                                onClick={() => onViewModeChange(id)}
                                title={label}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all",
                                    viewMode === id
                                        ? "bg-white text-slate-800 shadow-sm"
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <Icon size={13} />
                                <span className="hidden lg:inline">{label}</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Right: Search + actions */}
            <div className="flex items-center gap-2 shrink-0">

                {/* Search */}
                <div className="relative hidden lg:flex items-center">
                    <Search size={13} className="absolute left-3 text-slate-300" />
                    <input
                        type="text"
                        placeholder="Buscar artículo…"
                        className="pl-8 pr-4 py-2 text-[11px] bg-slate-50 border border-slate-100 rounded-lg text-slate-600 placeholder:text-slate-300 focus:outline-none focus:border-slate-200 w-48 transition-all focus:w-56"
                    />
                </div>

                {/* Filters */}
                <button
                    title="Filtros"
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                >
                    <SlidersHorizontal size={15} />
                </button>


                {/* Programar split button */}
                <div className="relative">
                    <div className="flex items-center rounded-lg overflow-hidden border border-slate-900 bg-slate-900">
                        <button 
                            onClick={handleNewContent}
                            className="flex items-center gap-1.5 pl-4 pr-3 py-2 text-[10px] font-black tracking-widest uppercase text-white hover:bg-slate-800 transition-colors"
                        >
                            <Plus size={12} />
                            <span className="hidden sm:inline">Programar</span>
                        </button>
                        <div className="w-px h-5 bg-slate-700" />
                        <button
                            onClick={() => setProgramarOpen(!programarOpen)}
                            className="px-2 py-2 text-white hover:bg-slate-800 transition-colors"
                        >
                            <ChevronDown size={12} className={cn("transition-transform", programarOpen && "rotate-180")} />
                        </button>
                    </div>

                    <AnimatePresence>
                        {programarOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                                className="absolute right-0 top-full mt-2 w-52 bg-white/90 backdrop-blur-xl border border-slate-100 rounded-lg shadow-lg overflow-hidden z-20"
                            >
                                {[
                                    { label: "Programar un Contenido", desc: "Crear pieza individual" },
                                    { label: "Cargar Programación", desc: "Importar CSV / Excel" },
                                    { label: "Programar con IA", desc: "Nous propone piezas" },
                                ].map((item) => (
                                    <button
                                        key={item.label}
                                        onClick={handleNewContent}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0"
                                    >
                                        <p className="text-[11px] font-bold text-slate-700">{item.label}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}
