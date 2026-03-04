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
        <section className="glass-panel border-hairline rounded-[24px] p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
            <div className="flex items-center gap-6 z-10">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-nous-mint)]/20 text-[var(--color-nous-mint)] flex items-center justify-center border border-[var(--color-nous-mint)]/40 shadow-sm">
                    <Activity size={28} />
                </div>
                <div>
                    <h2 className="text-[10px] font-medium text-slate-400 uppercase tracking-elegant mb-1">Estado</h2>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-light text-slate-800 tracking-elegant">Analizando...</span>
                        <span className="text-[9px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-elegant">
                            Standby
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full md:w-auto grid grid-cols-3 gap-4 border-l border-slate-100 ml-6 pl-6 z-10">
                <div className="flex flex-col">
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-elegant mb-1">Ritmo</span>
                    <div className="flex items-center gap-2">
                        <Zap size={14} className="text-slate-300 fill-slate-100" />
                        <span className="text-lg font-light text-slate-800">-- <span className="text-[10px] text-slate-400 font-light">posts/sem</span></span>
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-elegant mb-1">Próximo Hueco</span>
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-slate-200" />
                        <span className="text-lg font-light text-slate-800">TBD <span className="text-[10px] text-slate-400 font-light">--</span></span>
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-elegant mb-1">Calidad SEO</span>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-slate-200" />
                        <span className="text-lg font-light text-slate-800">-- <span className="text-[10px] text-slate-400 font-light">avg</span></span>
                    </div>
                </div>
            </div>

            <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-[var(--color-nous-mint)]/10 to-transparent pointer-events-none" />
        </section>
    );
}
