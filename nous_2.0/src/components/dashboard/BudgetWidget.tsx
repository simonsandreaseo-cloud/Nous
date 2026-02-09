"use client";

import { useProjectStore } from "@/store/useProjectStore";
import { motion } from "framer-motion";
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    Target,
    ArrowUpRight
} from "lucide-react";
import { cn } from "@/utils/cn";

export function BudgetWidget() {
    const { activeProject } = useProjectStore();

    if (!activeProject) return null;

    const { budgetMode, budgetSettings } = activeProject;

    // Mock calculations based on project settings
    const target = budgetSettings.target;
    const current = budgetSettings.current;
    const remaining = target - current;
    const progress = Math.min((current / target) * 100, 100);
    const overage = -2; // Surplus or deficit

    return (
        <section className="bg-white/70 backdrop-blur-xl border border-white rounded-[32px] p-8 shadow-sm hover:shadow-xl transition-all h-full flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                {budgetMode === 'target' ? <Wallet size={120} /> : <Target size={120} />}
            </div>

            <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "p-3 rounded-2xl border transition-colors",
                        budgetMode === 'target' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-purple-50 text-purple-600 border-purple-100"
                    )}>
                        {budgetMode === 'target' ? <Wallet size={20} /> : <Target size={20} />}
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">Presupuesto Neural</h3>
                        <p className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">
                            Modo {budgetMode === "target" ? "Objetivo" : "Libre"}
                        </p>
                    </div>
                </div>
            </div>

            {budgetMode === "target" ? (
                <div className="space-y-8 flex-1 flex flex-col justify-center relative z-10">
                    <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Publicado</p>
                            <div className="text-3xl font-black text-slate-900 tracking-tighter">{current} <span className="text-xs text-slate-400 uppercase font-mono">docs</span></div>
                        </div>
                        <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-inner">
                            <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest mb-1">Pendiente</p>
                            <div className="text-3xl font-black text-emerald-700 tracking-tighter">{remaining} <span className="text-xs text-emerald-500/60 uppercase font-mono">docs</span></div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-5 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-900/10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/5">
                                {overage < 0 ? <TrendingDown size={18} className="text-orange-400" /> : <TrendingUp size={18} className="text-emerald-400" />}
                            </div>
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest opacity-50 font-mono">Balance Mes Anterior</p>
                                <p className="text-sm font-bold opacity-90">{overage < 0 ? "Excedido" : "Ahorrado"}: {Math.abs(overage)} contenidos</p>
                            </div>
                        </div>
                        <div className="text-2xl font-black italic tracking-tighter">
                            {overage}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 relative z-10">
                    <div className="w-24 h-24 rounded-full bg-purple-50 flex items-center justify-center border border-dashed border-purple-200 animate-pulse-slow">
                        <Target className="text-purple-400" size={48} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">Optimización Autónoma Activa</p>
                        <p className="text-xs font-mono font-medium text-slate-400 uppercase tracking-widest leading-relaxed max-w-[240px] mx-auto">
                            El sistema decidirá el ritmo de publicación basado en tendencias y oportunidades SEO.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-purple-100 shadow-sm text-purple-600 text-[10px] font-black uppercase tracking-widest">
                        <ArrowUpRight size={14} />
                        Tendencia Detectada
                    </div>
                </div>
            )}
        </section>
    );
}
