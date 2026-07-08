"use client";

import { motion } from "framer-motion";
import { FolderGit2, FileText } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import Link from "next/link";

export function SummaryDashboard() {
    const projects = useProjectStore((state) => state.projects);
    const tasks = useProjectStore((state) => state.tasks);
    
    // Contar proyectos y tareas pendientes (todo lo que no esté publicado)
    const activeProjects = projects.length;
    const pendingContents = tasks.filter(t => t.status !== 'publicado').length;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative"
        >
            <Link 
                href="/contents?tool=dashboard"
                className="block w-[240px] rounded-[24px] bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 transition-all hover:bg-white/80 hover:scale-[1.02] hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] cursor-pointer group"
            >
                <div className="flex flex-col gap-6">
                    {/* Proyectos Activos */}
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <FolderGit2 size={20} strokeWidth={2} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-2xl font-black text-slate-900 leading-none">{activeProjects}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Proyectos Activos</span>
                        </div>
                    </div>

                    <div className="w-full h-[1px] bg-slate-200/50" />

                    {/* Contenidos Pendientes */}
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                            <FileText size={20} strokeWidth={2} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-2xl font-black text-slate-900 leading-none">{pendingContents}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Contenidos Pendientes</span>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
