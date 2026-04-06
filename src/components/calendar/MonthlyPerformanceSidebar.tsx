"use client";

import { motion } from "framer-motion";
import { TrendingUp, FileText, ArrowUp } from "lucide-react";

export function MonthlyPerformanceSidebar() {
    const months = [
        { name: "Enero 2026", clicks: "12.5k", impressions: "450k", growth: "+15%" },
        { name: "Diciembre 2025", clicks: "10.8k", impressions: "380k", growth: "+8%" },
        { name: "Noviembre 2025", clicks: "9.2k", impressions: "310k", growth: "+12%" },
    ];

    return (
        <aside className="space-y-6">
            <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Rendimiento Mensual</h3>

                <div className="space-y-4">
                    {months.map((month, idx) => (
                        <div key={idx} className="group cursor-pointer">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-slate-700 group-hover:text-cyan-600 transition-colors">{month.name}</span>
                                <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                    <ArrowUp size={8} /> {month.growth}
                                </span>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest">Clics</span>
                                    <span className="text-sm font-black text-slate-900">{month.clicks}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest">Impr.</span>
                                    <span className="text-sm font-black text-slate-900">{month.impressions}</span>
                                </div>
                            </div>
                            {idx < months.length - 1 && <div className="h-px bg-slate-50 mt-4" />}
                        </div>
                    ))}
                </div>

                <button className="w-full mt-6 py-3 rounded-xl border border-dashed border-slate-200 text-xs font-bold text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all uppercase tracking-widest">
                    Ver Histórico Completo
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <TrendingUp size={16} className="text-cyan-500 mb-2" />
                    <span className="text-2xl font-black text-slate-900">85%</span>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Eficiencia</span>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <FileText size={16} className="text-purple-500 mb-2" />
                    <span className="text-2xl font-black text-slate-900">12</span>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Publicados</span>
                </div>
            </div>
        </aside>
    );
}
