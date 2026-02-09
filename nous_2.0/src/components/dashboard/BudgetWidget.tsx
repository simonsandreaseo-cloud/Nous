"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Wallet,
    ArrowRight,
    TrendingUp,
    TrendingDown,
    Coins,
    BarChart,
    ChevronRight,
    Target
} from "lucide-react";
import { cn } from "@/utils/cn";

export function BudgetWidget() {
    const [mode, setMode] = useState<"target" | "freestyle">("target");
    const [budgetType, setBudgetType] = useState<"cost" | "volume" | "count">("count");

    // Mock values - should come from props or state later
    const target = 20;
    const current = 8;
    const remaining = target - current;
    const progress = (current / target) * 100;
    const overage = -2; // Surplus or deficit from last month

    return (
        <section className="bg-white/70 backdrop-blur-xl border border-white rounded-[32px] p-8 shadow-sm hover:shadow-xl transition-all h-full flex flex-col">
            <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                        <Wallet size={20} />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">Presupuesto Neural</h3>
                        <p className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">{mode === "target" ? "Modo Objetivo" : "Freestyle"}</p>
                    </div>
                </div>

                <div className="bg-slate-50 p-1 rounded-xl border border-slate-100 flex items-center">
                    <button
                        onClick={() => setMode("target")}
                        className={cn("px-3 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-all", mode === "target" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400")}
                    >
                        Objetivo
                    </button>
                    <button
                        onClick={() => setMode("freestyle")}
                        className={cn("px-3 py-1.5 text-[9px] font-bold uppercase rounded-lg transition-all", mode === "freestyle" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400")}
                    >
                        Libre
                    </button>
                </div>
            </div>

            {mode === "target" ? (
                <div className="space-y-8 flex-1 flex flex-col justify-center">
                    <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Publicado</p>
                            <div className="text-2xl font-black text-slate-800 tracking-tight">{current} <span className="text-xs text-slate-400 uppercase font-mono">docs</span></div>
                        </div>
                        <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                            <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest mb-1">Pendiente</p>
                            <div className="text-2xl font-black text-emerald-700 tracking-tight">{remaining} <span className="text-xs text-emerald-500/60 uppercase font-mono">docs</span></div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl text-white">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                {overage < 0 ? <TrendingDown size={14} className="text-orange-400" /> : <TrendingUp size={14} className="text-emerald-400" />}
                            </div>
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest opacity-50">Balance Mes Anterior</p>
                                <p className="text-xs font-bold font-mono">{overage < 0 ? "Excedido" : "Ahorrado"}: {Math.abs(overage)} contenidos</p>
                            </div>
                        </div>
                        <div className="text-xl font-black italic tracking-tighter">
                            {overage < 0 ? "-" : "+"}{Math.abs(overage)}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-dashed border-slate-200">
                        <Target className="text-slate-300" size={24} />
                    </div>
                    <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                        Navegación libre activada.<br />El sistema optimizará el ritmo según detección de tendencias.
                    </p>
                </div>
            )}

            <button className="mt-8 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-[0.2em] group">
                Configurar Parámetros
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
        </section>
    );
}
