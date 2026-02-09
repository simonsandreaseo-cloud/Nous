"use client";

import { motion } from "framer-motion";
import {
    Activity,
    Zap,
    AlertTriangle,
    CheckCircle2,
    ArrowUpRight
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";

export function EditorialPulse() {
    const { activeProject } = useProjectStore();

    if (!activeProject) return null;

    return (
        <section className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
            <div className="flex items-center gap-6 z-10">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
                    <Activity size={28} className="text-cyan-400" />
                </div>
                <div>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Estado</h2>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900 tracking-tighter">Salud Óptima</span>
                        <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-widest">
                            98% Uptime
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full md:w-auto grid grid-cols-3 gap-4 border-l border-slate-100 ml-6 pl-6 z-10">
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ritmo</span>
                    <div className="flex items-center gap-2">
                        <Zap size={14} className="text-amber-500 fill-amber-500" />
                        <span className="text-lg font-black text-slate-800">4.2 <span className="text-[10px] text-slate-400 font-normal">posts/sem</span></span>
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Próximo Hueco</span>
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-slate-300" />
                        <span className="text-lg font-black text-slate-800">Feb 18 <span className="text-[10px] text-slate-400 font-normal">2d libres</span></span>
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Calidad SEO</span>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span className="text-lg font-black text-slate-800">A+ <span className="text-[10px] text-slate-400 font-normal">avg</span></span>
                    </div>
                </div>
            </div>

            <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-cyan-50/50 to-transparent pointer-events-none" />
        </section>
    );
}
