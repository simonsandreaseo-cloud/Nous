'use client';

import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { MetricsService } from '@/lib/services/metrics';
import { analyzeWithHelios } from '@/lib/services/helios';
import { HeliosConfig } from '@/types/helios'; // We need to define this type or import if exists
import { Loader2, Sparkles, AlertTriangle, CheckCircle, FileText, TrendingUp } from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationService } from '@/lib/services/notifications';
import { LocalNodeBridge } from '@/lib/local-node/bridge';
import { useAppStore } from '@/store/useAppStore';
import { PlusCircle, Info, Zap } from 'lucide-react';

// Mock Config if types not available yet
interface HeliosModuleConfig {
    traffic_anomalies: boolean;
    cannibalization: boolean;
    content_performance: boolean;
    technical_health: boolean;
}

export default function HeliosConsole() {
    const { activeProject, addTask } = useProjectStore();
    const { neuralLinkStatus } = useAppStore();
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<any>(null);
    const [model, setModel] = useState('gemini-2.0-pro-exp-02-05');
    const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
    const [isSavingTasks, setIsSavingTasks] = useState(false);
    const [config, setConfig] = useState<any>({
        traffic_anomalies: true,
        cannibalization: true,
        content_performance: true,
        strategic_overview: true,
        ctr_opportunities: true,
        technical_health: false
    });

    const runAnalysis = async () => {
        if (!activeProject) return;
        setLoading(true);
        setReport(null);

        try {
            // 1. Fetch Data (Last 30 Days for now)
            // In a real scenario, we'd fetch granular query/page data.
            // For now, we reuse Daily Metrics + maybe top queries if available in the DB
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const metrics = await MetricsService.getDailyMetrics(activeProject.id, startDate, endDate);

            // Construct payload
            const payload = {
                project: activeProject,
                dailyMetrics: metrics,
                // We fake 'cannibalization' raw data structure for now, 
                // essentially passing the metrics and letting AI hallucinate/infer if it can't find specific keys.
                // ideally we pass raw GSC query dump here. 
                searchAnalytics: metrics // Placeholder
            };

            const heliosConfig: any = { // Cast to any to match HeliosConfig type
                modules: config,
                reportType: 'standard'
            };

            const result = await analyzeWithHelios(
                payload,
                heliosConfig,
                model,
                []
            );

            setReport(result);
            setSelectedTasks(result.suggestedTasks ? result.suggestedTasks.map((_: any, i: number) => i) : []);
            NotificationService.notify("Auditoría Helios Completada", `Se han detectado ${result.sections?.length || 0} áreas críticas y ${result.suggestedTasks?.length || 0} tareas sugeridas.`);

        } catch (e: any) {
            console.error("Helios Error:", e);
            NotificationService.notify("Fallo en Sistema Helios", e.message || "Ocurrió un error inesperado.");
        } finally {
            setLoading(false);
        }
    };

    const handleSyncTasks = async () => {
        if (!activeProject || !report?.suggestedTasks) return;
        setIsSavingTasks(true);
        try {
            const tasksToAdd = report.suggestedTasks.filter((_: any, i: number) => selectedTasks.includes(i));
            for (const task of tasksToAdd) {
                await addTask({
                    project_id: activeProject.id,
                    title: task.title,
                    target_keyword: task.target_keyword,
                    brief: task.brief,
                    status: 'todo',
                    scheduled_date: new Date().toISOString().split('T')[0]
                });
            }
            NotificationService.notify("Estrategia Sincronizada", `Se han añadido ${tasksToAdd.length} tareas al calendario editorial.`);
            setReport((prev: any) => ({ ...prev, suggestedTasks: prev.suggestedTasks.filter((_: any, i: number) => !selectedTasks.includes(i)) }));
            setSelectedTasks([]);
        } catch (e) {
            console.error("Error syncing tasks:", e);
        } finally {
            setIsSavingTasks(false);
        }
    };

    return (
        <div className="w-full h-full p-8 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 mb-2">
                        Helios <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600">Intelligence</span>
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                        AI Audits • Anomaly Detection • Strategic Insights
                    </p>
                </div>
            </div>

            {/* CONFIGURATION PANEL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="p-6 bg-white/60 backdrop-blur-md rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Neural Configuration</h3>
                        <div className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2",
                            neuralLinkStatus === 'connected' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                        )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", neuralLinkStatus === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                            {neuralLinkStatus === 'connected' ? "Deep Context Link Active" : "Web Proxy Mode"}
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">AI Auditor Model</label>
                        <select
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500/20"
                        >
                            <option value="gemini-2.0-pro-exp-02-05">Gemini 2.0 Pro Exp (Expert)</option>
                            <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Fast)</option>
                            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                            <option value="gpt-4o">GPT-4o (Architect)</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(config).map(([key, value]) => (
                            <label key={key} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/40 cursor-pointer transition-colors group">
                                <div className={cn(
                                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                    value ? "bg-purple-500 border-purple-500 shadow-lg shadow-purple-500/20" : "border-slate-300 group-hover:border-purple-300"
                                )}>
                                    {!!value && <CheckCircle size={12} className="text-white" />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={value as boolean}
                                    onChange={() => setConfig((prev: any) => ({ ...prev, [key]: !value }))}
                                />
                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide truncate">
                                    {key.replace(/_/g, ' ')}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col justify-end">
                    <button
                        onClick={runAnalysis}
                        disabled={loading || !activeProject}
                        className="w-full py-6 bg-slate-900 hover:bg-slate-800 text-white rounded-3xl font-black text-xl uppercase tracking-widest transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 group"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin text-purple-400" />
                                Analyzing Neural Patterns...
                            </>
                        ) : (
                            <>
                                <Sparkles className="text-purple-400 group-hover:rotate-12 transition-transform" />
                                Initiate Audit
                            </>
                        )}
                    </button>
                    {activeProject && (
                        <p className="text-center mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Target: {activeProject.domain}
                        </p>
                    )}
                </div>
            </div>

            {/* REPORT VIEW */}
            <AnimatePresence mode="wait">
                {report && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-8"
                    >
                        {/* Executive Summary */}
                        <div className="p-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-[40px] border border-indigo-100/50">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                    <FileText size={20} />
                                </div>
                                <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest">Executive Summary</h3>
                            </div>
                            <p className="text-lg text-slate-700 leading-relaxed font-medium">
                                {report.executiveSummary}
                            </p>
                        </div>

                        {/* Sections */}
                        {report.sections?.map((section: any, idx: number) => (
                            <div key={idx} className="p-8 bg-white rounded-[40px] shadow-sm border border-slate-100">
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">{section.title}</h3>
                                <p className="text-slate-500 mb-8">{section.summary}</p>

                                {/* Charts/Tables */}
                                <div className="space-y-8">
                                    {section.charts?.map((chart: any) => (
                                        <div key={chart.id} className="p-6 bg-slate-50 rounded-3xl">
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{chart.title}</h4>

                                            {/* Dynamic Renderer based on type */}
                                            {chart.type === 'table' && (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-sm">
                                                        <thead>
                                                            <tr className="border-b border-slate-200">
                                                                {chart.tableColumns.map((col: any) => (
                                                                    <th key={col.key} className="pb-3 text-xs font-bold text-slate-500 uppercase">{col.label}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {chart.data.map((row: any, rIdx: number) => (
                                                                <tr key={rIdx}>
                                                                    {chart.tableColumns.map((col: any) => (
                                                                        <td key={col.key} className="py-3 font-medium text-slate-700">
                                                                            {/* Simple format handling */}
                                                                            {col.format === 'trend' ? (
                                                                                <span className={cn(
                                                                                    "px-2 py-1 rounded-full text-xs font-bold",
                                                                                    row[col.trendKey] > 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                                                                                )}>
                                                                                    {row[col.key]}%
                                                                                </span>
                                                                            ) : (
                                                                                row[col.key]
                                                                            )}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            {/* Fallback for other types */}
                                            {chart.type !== 'table' && (
                                                <div className="h-40 flex items-center justify-center text-slate-400 text-xs uppercase tracking-widest">
                                                    Visualizer for {chart.type} not ready
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Suggested Tasks Section */}
                        {report.suggestedTasks && report.suggestedTasks.length > 0 && (
                            <div className="p-8 bg-slate-900 text-white rounded-[40px] shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 blur-[100px] rounded-full pointer-events-none" />

                                <div className="flex justify-between items-center mb-8 relative z-10">
                                    <div>
                                        <h3 className="text-2xl font-black uppercase tracking-tight italic">Acciones Neurales Sugeridas</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sincronización directa con Calendario Editorial</p>
                                    </div>
                                    <button
                                        onClick={handleSyncTasks}
                                        disabled={selectedTasks.length === 0 || isSavingTasks}
                                        className="px-8 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2 group"
                                    >
                                        {isSavingTasks ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} className="group-hover:scale-110 transition-transform" />}
                                        Sincronizar {selectedTasks.length} Tareas
                                    </button>
                                </div>

                                <div className="space-y-3 relative z-10">
                                    {report.suggestedTasks.map((task: any, idx: number) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                if (selectedTasks.includes(idx)) {
                                                    setSelectedTasks(prev => prev.filter(i => i !== idx));
                                                } else {
                                                    setSelectedTasks(prev => [...prev, idx]);
                                                }
                                            }}
                                            className={cn(
                                                "p-5 rounded-3xl border transition-all cursor-pointer group",
                                                selectedTasks.includes(idx)
                                                    ? "bg-white/10 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                                                    : "bg-white/5 border-white/10 hover:border-white/20"
                                            )}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                                            task.priority === 'high' ? "bg-rose-500 text-white" : "bg-slate-700 text-slate-300"
                                                        )}>
                                                            {task.priority || 'medium'}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                                                            {task.target_keyword}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-sm font-black tracking-tight mb-2 group-hover:text-purple-300 transition-colors">
                                                        {task.title}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-2xl">
                                                        {task.brief}
                                                    </p>
                                                </div>
                                                <div className={cn(
                                                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                    selectedTasks.includes(idx) ? "bg-purple-500 border-purple-500 text-white" : "border-white/20 text-transparent"
                                                )}>
                                                    <CheckCircle2 size={14} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
