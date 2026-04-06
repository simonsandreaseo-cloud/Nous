"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Activity, 
    TrendingUp, 
    BarChart3, 
    Zap, 
    Search, 
    Target, 
    ChevronRight,
    Loader2,
    Sparkles,
    MousePointerClick,
    Eye
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { useNodeStore } from "@/store/useNodeStore";
import { MetricsService } from "@/lib/services/metrics";
import { GscDailyMetric, MetricSummary } from "@/types/metrics";
import { cn } from "@/utils/cn";
// import { MetricsChart } from "@/components/dashboard/MetricsChart";
import Link from "next/link";

export function SummaryDashboard() {
    const { activeProject } = useProjectStore();
    const { flux } = useNodeStore();
    const [metrics, setMetrics] = useState<GscDailyMetric[]>([]);
    const [summary, setSummary] = useState<MetricSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (activeProject) {
            loadMetrics(activeProject.id);
        }
    }, [activeProject]);

    const loadMetrics = async (projectId: string) => {
        setIsLoading(true);
        try {
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const data = await MetricsService.getDailyMetrics(projectId, startDate, endDate);
            setMetrics(data);
            const sum = MetricsService.calculateSummary(data);
            setSummary(sum);
        } catch (e) {
            console.error("Error loading metrics for summary dashboard:", e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative w-[450px]"
        >
            {/* Brackets visually frames the panel */}
            <svg className="absolute top-0 left-0 w-[150px] h-[150px] pointer-events-none" viewBox="0 0 150 150" fill="none">
                <path d="M 150 0 H 32 Q 0 0 0 32 V 120" stroke="currentColor" strokeWidth="1" className="text-slate-300" />
            </svg>
            <svg className="absolute bottom-0 right-0 w-[150px] h-[150px] pointer-events-none" viewBox="0 0 150 150" fill="none">
                <path d="M 0 150 H 118 Q 150 150 150 118 V 30" stroke="currentColor" strokeWidth="1" className="text-slate-300" />
            </svg>

            <div className="relative w-full rounded-[32px] bg-white/70 backdrop-blur-md border border-white/40 shadow-2xl p-8 min-h-[500px] flex flex-col overflow-hidden">
                
                {/* Decoration Gradient */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />

                {/* Header */}
                <div className="flex justify-between items-start mb-8 relative z-10">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
                            DASHBOARD <span className="text-cyan-500 font-medium text-xs tracking-widest border border-cyan-500/30 px-2 py-0.5 rounded-full bg-cyan-500/5">GENERAL</span>
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Visión de Alto Rendimiento</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                        <Activity size={18} strokeWidth={1.5} />
                    </div>
                </div>

                {!activeProject ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                            <Target size={32} className="opacity-20" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-center max-w-[200px]">Selecciona un proyecto para activar el Dashboard Neural</p>
                    </div>
                ) : isLoading ? (
                    <div className="flex-1 flex items-center justify-center text-cyan-500">
                        <Loader2 className="animate-spin" size={32} />
                    </div>
                ) : (
                    <div className="space-y-6 flex-1 flex flex-col">
                        
                        {/* Neural Status Ring */}
                        <div className="p-5 rounded-2xl bg-slate-900 text-white relative overflow-hidden group border border-white/10">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Zap size={80} />
                            </div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Sparkles size={12} className="text-cyan-400" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estado de Alineación</span>
                                    </div>
                                    <h3 className="text-2xl font-black tracking-tighter uppercase italic text-cyan-400">Excelente</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-[18px] font-black text-white leading-none">92%</p>
                                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">Neural Score</p>
                                </div>
                            </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/50 border border-slate-100 rounded-2xl p-4 flex flex-col group hover:border-cyan-200 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <MousePointerClick size={14} className="text-cyan-500" />
                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Clicks</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-500">+12%</span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <div className="text-2xl font-black text-slate-900 leading-none">
                                        {summary?.totalClicks.toLocaleString() || '0'}
                                    </div>
                                    <div className="w-16 h-8 opacity-20 flex items-end gap-0.5">
                                        <div className="w-1.5 h-3 bg-cyan-400 rounded-full" />
                                        <div className="w-1.5 h-6 bg-cyan-400 rounded-full" />
                                        <div className="w-1.5 h-4 bg-cyan-400 rounded-full" />
                                        <div className="w-1.5 h-8 bg-cyan-400 rounded-full" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/50 border border-slate-100 rounded-2xl p-4 flex flex-col group hover:border-indigo-200 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Activity size={14} className="text-indigo-500" />
                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">CTR Prom.</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400">---</span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <div className="text-2xl font-black text-slate-900 leading-none">
                                        {summary?.avgCtr || 0}%
                                    </div>
                                    <div className="w-16 h-8 opacity-20 flex items-end gap-0.5">
                                        <div className="w-1.5 h-4 bg-indigo-400 rounded-full" />
                                        <div className="w-1.5 h-3 bg-indigo-400 rounded-full" />
                                        <div className="w-1.5 h-6 bg-indigo-400 rounded-full" />
                                        <div className="w-1.5 h-5 bg-indigo-400 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Small Chart Section */}
                        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Eye size={14} className="text-slate-400" />
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Impresiones (30d)</span>
                                </div>
                                <span className="text-sm font-black text-slate-700">{summary?.totalImpressions.toLocaleString() || '0'}</span>
                            </div>
                            <div className="h-[60px] flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                <Activity size={16} className="text-slate-300" />
                            </div>
                        </div>

                        {/* Recent Activity / Active Flow */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-4 px-1">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Flujo de Tareas Reciente</h3>
                                <Link href="/contents?tool=dashboard" className="text-[10px] font-black text-cyan-600 hover:text-cyan-700 uppercase tracking-widest flex items-center gap-1">
                                    Ver Todo <ChevronRight size={12} />
                                </Link>
                            </div>
                            <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar pointer-events-auto">
                                {flux.tasks.length > 0 ? (
                                    flux.tasks.slice(0, 3).map((task) => (
                                        <div key={task.id} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                                <span className="text-xs font-bold text-slate-700 truncate">{task.title}</span>
                                            </div>
                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{task.status}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-6 text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest border border-dashed rounded-xl">
                                        Sin actividad reciente
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CTA Footer */}
                        <Link
                            href="/contents?tool=writer"
                            className="bg-slate-900 text-white w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-cyan-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-900/10 group pointer-events-auto"
                        >
                            <Sparkles size={14} className="text-cyan-400 group-hover:rotate-12 transition-transform" />
                            Lanzar Redactor IA
                        </Link>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
