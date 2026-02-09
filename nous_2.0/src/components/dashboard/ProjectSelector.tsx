"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { ChevronDown, Plus, Check, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import Link from "next/link";

export function ProjectSelector() {
    const { projects, activeProject, setActiveProject } = useProjectStore();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 pl-1 pr-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-all group backdrop-blur-md"
            >
                <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                    <Briefcase size={12} />
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-0.5">Proyecto Activo</span>
                    <span className="text-xs font-bold text-slate-800 leading-none truncate max-w-[120px]">{activeProject?.name || "Seleccionar"}</span>
                </div>
                <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-300", isOpen ? "rotate-180" : "rotate-0")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 p-2"
                        >
                            <div className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">
                                Mis Proyectos
                            </div>

                            <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {projects.map((project) => {
                                    const progress = Math.min((project.budget_settings.current / project.budget_settings.target) * 100, 100);

                                    return (
                                        <button
                                            key={project.id}
                                            onClick={() => {
                                                setActiveProject(project.id);
                                                setIsOpen(false);
                                            }}
                                            className={cn(
                                                "w-full p-2.5 rounded-xl text-left transition-all group border border-transparent",
                                                activeProject?.id === project.id ? "bg-slate-50 border-slate-100" : "hover:bg-slate-50 hover:border-slate-50"
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        activeProject?.id === project.id ? "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" : "bg-slate-300"
                                                    )} />
                                                    <span className={cn(
                                                        "text-xs font-bold truncate",
                                                        activeProject?.id === project.id ? "text-slate-900" : "text-slate-500"
                                                    )}>{project.name}</span>
                                                </div>
                                                {activeProject?.id === project.id && <Check size={14} className="text-cyan-500" />}
                                            </div>

                                            {/* Mini Progress Bar */}
                                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-500",
                                                        activeProject?.id === project.id ? "bg-cyan-500" : "bg-slate-300"
                                                    )}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-1">
                                                <span className="text-[9px] text-slate-400 font-mono">{project.domain}</span>
                                                <span className="text-[9px] text-slate-400 font-bold">{project.budget_settings.current}/{project.budget_settings.target}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-2 pt-2 border-t border-slate-50">
                                <Link
                                    href="/settings"
                                    onClick={() => setIsOpen(false)}
                                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-slate-200 text-[10px] font-bold text-slate-400 hover:text-cyan-600 hover:border-cyan-200 transition-all uppercase tracking-widest bg-slate-50/50 hover:bg-white"
                                >
                                    <Plus size={14} />
                                    Gestionar Proyectos
                                </Link>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
