"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    TrendingUp,
    ExternalLink,
    ChevronDown,
    MoreHorizontal,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react";
import { cn } from "@/utils/cn";

const mockInsights: any[] = [];

export function InsightsWidget() {
    return (
        <section className="bg-white/70 backdrop-blur-xl border border-white rounded-[32px] p-8 shadow-sm hover:shadow-xl transition-all h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">Top Performance</h3>
                <button className="text-[10px] font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors">
                    Ver Todos
                </button>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-1">
                {mockInsights.length > 0 ? (
                    mockInsights.map((item) => (
                        <div
                            key={item.id}
                            className="group flex items-center justify-between p-4 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-100 hover:shadow-sm cursor-pointer"
                        >
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-sm font-bold text-slate-700 truncate group-hover:text-cyan-600 transition-colors">{item.title}</h4>
                                    <ExternalLink size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">{item.url}</span>
                                    <div className="hidden group-hover:flex items-center gap-2 transition-all">
                                        {item.keywords.map((kw: string, i: number) => (
                                            <span key={i} className="text-[9px] px-2 py-0.5 bg-slate-50 text-slate-500 rounded-full border border-slate-100">
                                                {kw}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 text-right">
                                <div className="flex flex-col items-end">
                                    <span className="text-sm font-black text-slate-900 font-mono">{item.clicks.toLocaleString()}</span>
                                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Clicks</span>
                                </div>

                                <div className={cn(
                                    "flex items-center gap-1 text-[10px] font-black font-mono w-16 justify-end",
                                    item.change > 0 ? "text-emerald-500" : "text-orange-500"
                                )}>
                                    {item.change > 0 ? "+" : ""}{item.change}%
                                    {item.change > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-300 opacity-60">
                        <TrendingUp size={32} className="mb-2 opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Sin datos de rendimiento</span>
                    </div>
                )}
            </div>
        </section>
    );
}
