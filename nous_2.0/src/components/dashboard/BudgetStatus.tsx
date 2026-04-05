"use client";

import { useProjectStore } from "@/store/useProjectStore";
import { motion } from "framer-motion";
import { Wallet, Target } from "lucide-react";
import { cn } from "@/utils/cn";

export function BudgetStatus() {
    const { activeProject } = useProjectStore();

    if (!activeProject) return null;

    const { budget_settings } = activeProject;
    const budgetMode = budget_settings.mode;

    // Mock calculations
    const target = budget_settings.target;
    const current = budget_settings.current;
    const progress = Math.min((current / target) * 100, 100);

    return (
        <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex items-center justify-between gap-6 relative overflow-hidden group h-full">
            <div className="flex items-center gap-4 z-10">
                <div className={cn(
                    "p-3 rounded-lg border transition-colors",
                    budgetMode === 'target' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-purple-50 text-purple-600 border-purple-100"
                )}>
                    {budgetMode === 'target' ? <Wallet size={20} /> : <Target size={20} />}
                </div>
                <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono mb-1">Presupuesto</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900 tracking-tighter">{current} <span className="text-sm font-normal text-slate-400">/ {target}</span></span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">En Rango</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-[200px] flex flex-col items-end gap-2 z-10">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{progress.toFixed(0)}% Utilizado</span>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={cn(
                            "h-full rounded-full",
                            budgetMode === 'target' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.3)]"
                        )}
                    />
                </div>
            </div>

            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity transform rotate-12 pointer-events-none">
                {budgetMode === 'target' ? <Wallet size={120} /> : <Target size={120} />}
            </div>
        </div>
    );
}
