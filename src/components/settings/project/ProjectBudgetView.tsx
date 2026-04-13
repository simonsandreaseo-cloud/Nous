"use client";
import { useState, useEffect, useMemo } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { 
    Wallet, 
    Calendar, 
    RefreshCw, 
    TrendingUp, 
    FileText, 
    CheckCircle2,
    Layout,
    AlertCircle,
    Check,
    DollarSign,
    Target
} from "lucide-react";
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";

export default function ProjectBudgetView() {
    const { activeProject, tasks, updateProject, fetchProjectTasks } = useProjectStore();
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Config Mode
    const [configMode, setConfigMode] = useState<'content' | 'financial'>(activeProject?.budget_settings?.mode || 'content');

    // Form states - Content Mode
    const [wordBudget, setWordBudget] = useState(activeProject?.budget_settings?.monthly_word_budget || 0);
    const [layoutBudget, setLayoutBudget] = useState(activeProject?.budget_settings?.monthly_layout_budget || 0);
    
    // Form states - Financial Mode
    const [wordPrice, setWordPrice] = useState(activeProject?.budget_settings?.word_price_usd || 0);
    const [layoutPrice, setLayoutPrice] = useState(activeProject?.budget_settings?.layout_price_usd || 0);
    const [wordBudgetUsd, setWordBudgetUsd] = useState(activeProject?.budget_settings?.word_budget_usd || 0);
    const [layoutBudgetUsd, setLayoutBudgetUsd] = useState(activeProject?.budget_settings?.layout_budget_usd || 0);
    const [totalFinancialBudget, setTotalFinancialBudget] = useState(activeProject?.budget_settings?.total_financial_budget || activeProject?.budget_settings?.total_budget || 0);

    const [sprintStart, setSprintStart] = useState(activeProject?.current_sprint_start || "");
    const [sprintEnd, setSprintEnd] = useState(activeProject?.current_sprint_end || "");

    useEffect(() => {
        if (activeProject) {
            setConfigMode(activeProject.budget_settings?.mode || 'content');
            setWordBudget(activeProject.budget_settings?.monthly_word_budget || 0);
            setLayoutBudget(activeProject.budget_settings?.monthly_layout_budget || 0);
            
            setWordPrice(activeProject.budget_settings?.word_price_usd || 0);
            setLayoutPrice(activeProject.budget_settings?.layout_price_usd || 0);
            setWordBudgetUsd(activeProject.budget_settings?.word_budget_usd || 0);
            setLayoutBudgetUsd(activeProject.budget_settings?.layout_budget_usd || 0);
            setTotalFinancialBudget(activeProject.budget_settings?.total_financial_budget || activeProject.budget_settings?.total_budget || 0);

            setSprintStart(activeProject.current_sprint_start || "");
            setSprintEnd(activeProject.current_sprint_end || "");
        }
    }, [activeProject]);

    const handleSaveSettings = async (overrides = {}) => {
        if (!activeProject) return;
        
        // Prepare current state for saving
        const settingsToSave = {
            ...activeProject.budget_settings,
            mode: configMode,
            monthly_word_budget: Number(wordBudget),
            monthly_layout_budget: Number(layoutBudget),
            word_price_usd: Number(wordPrice),
            layout_price_usd: Number(layoutPrice),
            word_budget_usd: Number(wordBudgetUsd),
            layout_budget_usd: Number(layoutBudgetUsd),
            total_financial_budget: Number(totalFinancialBudget),
            ...overrides
        };

        await updateProject(activeProject.id, {
            budget_settings: settingsToSave,
            current_sprint_start: sprintStart,
            current_sprint_end: sprintEnd
        });
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchProjectTasks(activeProject?.id);
        } finally {
            setTimeout(() => setIsRefreshing(false), 1000);
        }
    };

    // Performance Calculations
    const sprintTasks = useMemo(() => tasks.filter(t => {
        if (!sprintStart || !sprintEnd) return true;
        const taskDate = new Date(t.scheduled_date);
        return taskDate >= new Date(sprintStart) && taskDate <= new Date(sprintEnd);
    }), [tasks, sprintStart, sprintEnd]);

    // Content Metrics
    const programmedWords = sprintTasks.reduce((sum, t) => sum + (t.target_word_count || 0), 0);
    const executedWords = sprintTasks.reduce((sum, t) => {
        if (t.status === 'publicado') return sum + (t.word_count_real || 0);
        return sum;
    }, 0);
    const executedLayouts = sprintTasks.filter(t => t.layout_status === true).length;
    const programmedArticles = sprintTasks.length;
    const executedArticles = sprintTasks.filter(t => t.status === 'publicado').length;

    // Financial Metrics
    const programmedWordSpend = programmedWords * wordPrice;
    const executedWordSpend = executedWords * wordPrice;
    const programmedLayoutSpend = programmedArticles * layoutPrice;
    const executedLayoutSpend = executedLayouts * layoutPrice;

    const totalProgrammedSpend = programmedWordSpend + programmedLayoutSpend;
    const totalExecutedSpend = executedWordSpend + executedLayoutSpend;

    // Display Values based on mode
    const isFinancial = configMode === 'financial';
    
    const programmedDisplayValue = isFinancial ? `$${totalProgrammedSpend.toLocaleString()}` : programmedWords.toLocaleString();
    const executedDisplayValue = isFinancial ? `$${totalExecutedSpend.toLocaleString()}` : executedWords.toLocaleString();
    
    const programmedTarget = isFinancial ? totalFinancialBudget : wordBudget;
    const programmedPercentage = programmedTarget > 0 ? (isFinancial ? totalProgrammedSpend / totalFinancialBudget : programmedWords / wordBudget) * 100 : 0;
    
    const executedPercentage = programmedTarget > 0 ? (isFinancial ? totalExecutedSpend / totalFinancialBudget : executedWords / wordBudget) * 100 : 0;
    
    const layoutTarget = isFinancial ? layoutBudgetUsd : layoutBudget;
    const layoutValue = isFinancial ? executedLayoutSpend : executedLayouts;
    const layoutPercentage = layoutTarget > 0 ? (layoutValue / layoutTarget) * 100 : 0;

    const missingAmount = isFinancial ? totalFinancialBudget - totalExecutedSpend : 0;

    if (!activeProject) return null;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Presupuesto & Cumplimiento</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Monitoreo de recursos y KPIs del proyecto</p>
                </div>
                <button 
                    onClick={handleRefresh}
                    className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
                >
                    <RefreshCw size={20} className={cn(isRefreshing && "animate-spin")} />
                </button>
            </header>

            {/* Manual Sprint Configuration */}
            <section className="bg-white rounded-xl border border-slate-100 p-8 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-slate-900 uppercase">Periodo del Sprint Manual</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Define el rango de tiempo para este presupuesto</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Inicio del Periodo</label>
                        <input 
                            type="date"
                            value={sprintStart}
                            onChange={(e) => setSprintStart(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fin del Periodo</label>
                        <input 
                            type="date"
                            value={sprintEnd}
                            onChange={(e) => setSprintEnd(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                    </div>
                    <div className="flex items-end">
                        <button 
                            onClick={() => handleSaveSettings()}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                        >
                            Actualizar Periodo
                        </button>
                    </div>
                </div>
            </section>

            {/* Goals Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="bg-white rounded-xl border border-slate-100 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Configuración de Objetivos</h3>
                        
                        {/* Mode Switcher */}
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button 
                                onClick={() => { setConfigMode('content'); handleSaveSettings({ mode: 'content' }); }}
                                className={cn(
                                    "px-3 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all",
                                    configMode === 'content' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                Volumen
                            </button>
                            <button 
                                onClick={() => { setConfigMode('financial'); handleSaveSettings({ mode: 'financial' }); }}
                                className={cn(
                                    "px-3 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all",
                                    configMode === 'financial' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                Inversión
                            </button>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {configMode === 'content' ? (
                            <motion.div 
                                key="content-form"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                                            <FileText size={16} />
                                        </div>
                                        <span className="text-xs font-bold text-slate-600">Palabras / Mes</span>
                                    </div>
                                    <input 
                                        type="number"
                                        value={wordBudget}
                                        onChange={(e) => setWordBudget(Number(e.target.value))}
                                        onBlur={() => handleSaveSettings()}
                                        className="w-28 bg-white border border-slate-200 rounded-xl px-3 py-2 text-right text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-500">
                                            <Layout size={16} />
                                        </div>
                                        <span className="text-xs font-bold text-slate-600">Maquetaciones / Mes</span>
                                    </div>
                                    <input 
                                        type="number"
                                        value={layoutBudget}
                                        onChange={(e) => setLayoutBudget(Number(e.target.value))}
                                        onBlur={() => handleSaveSettings()}
                                        className="w-28 bg-white border border-slate-200 rounded-xl px-3 py-2 text-right text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                    />
                                </div>
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                                    <AlertCircle className="text-amber-500 shrink-0" size={16} />
                                    <p className="text-[10px] font-medium text-amber-700 leading-tight">
                                        Este modo mide el éxito basado únicamente en el volumen de contenido producido.
                                    </p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="financial-form"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Presupuesto Palabras ($)</label>
                                        <div className="relative">
                                            <DollarSign size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                type="number"
                                                value={wordBudgetUsd}
                                                onChange={(e) => setWordBudgetUsd(Number(e.target.value))}
                                                onBlur={() => handleSaveSettings()}
                                                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Presupuesto Maq ($)</label>
                                        <div className="relative">
                                            <DollarSign size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                type="number"
                                                value={layoutBudgetUsd}
                                                onChange={(e) => setLayoutBudgetUsd(Number(e.target.value))}
                                                onBlur={() => handleSaveSettings()}
                                                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500/20"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-inner">
                                    <label className="text-[9px] font-black text-indigo-300 uppercase tracking-widest block ml-1">Presupuesto General del Proyecto ($)</label>
                                    <div className="relative">
                                        <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
                                        <input 
                                            type="number"
                                            value={totalFinancialBudget}
                                            onChange={(e) => setTotalFinancialBudget(Number(e.target.value))}
                                            onBlur={() => handleSaveSettings()}
                                            className="w-full bg-slate-800 border-none rounded-xl pl-8 pr-3 py-3 text-sm font-black text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                        />
                                    </div>
                                </div>

                                <div className="p-5 border border-dashed border-slate-200 rounded-2xl space-y-4">
                                     <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Target size={12} /> Configuración de Costos Unitarios
                                     </h4>
                                     <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-bold text-slate-500 uppercase ml-1">Costo por Palabra</label>
                                            <input 
                                                type="number" 
                                                step="0.001"
                                                value={wordPrice}
                                                onChange={(e) => setWordPrice(Number(e.target.value))}
                                                onBlur={() => handleSaveSettings()}
                                                className="w-full text-[10px] font-black bg-slate-50 border-none rounded-lg px-2 py-1.5"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-bold text-slate-500 uppercase ml-1">Costo por Maquetación</label>
                                            <input 
                                                type="number"
                                                value={layoutPrice}
                                                onChange={(e) => setLayoutPrice(Number(e.target.value))}
                                                onBlur={() => handleSaveSettings()}
                                                className="w-full text-[10px] font-black bg-slate-50 border-none rounded-lg px-2 py-1.5"
                                            />
                                        </div>
                                     </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* Progress Visualizer */}
                <section className="bg-slate-900 rounded-xl p-8 text-white relative overflow-hidden flex flex-col justify-between">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado de Cumplimiento</h3>
                            {isFinancial && (
                                <div className="px-2 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-lg">
                                    <p className="text-[8px] font-black text-indigo-400 uppercase">Faltante: ${missingAmount.toLocaleString()}</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="space-y-8">
                            {/* Programmed (Analytical Success) */}
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Éxito Analítico (Programado)</p>
                                        <h4 className="text-xl font-black italic">{programmedDisplayValue} <span className="text-[10px] text-slate-500 not-italic uppercase ml-1">{isFinancial ? 'USD' : 'Palabras'}</span></h4>
                                    </div>
                                    <span className="text-xs font-black">{programmedPercentage.toFixed(1)}%</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(programmedPercentage, 100)}%` }}
                                        className="h-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                                    />
                                </div>
                            </div>

                            {/* Executed (Implementation Success) */}
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Éxito Ejecutivo (Publicado)</p>
                                        <h4 className="text-xl font-black italic">{executedDisplayValue} <span className="text-[10px] text-slate-500 not-italic uppercase ml-1">{isFinancial ? 'Invertidos' : 'Palabras Reales'}</span></h4>
                                    </div>
                                    <span className="text-xs font-black">{executedPercentage.toFixed(1)}%</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(executedPercentage, 100)}%` }}
                                        className="h-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                                    />
                                </div>
                            </div>

                            {/* Layout Success */}
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Carga y Maquetación</p>
                                        <h4 className="text-md font-black italic">
                                            {isFinancial ? `$${executedLayoutSpend.toLocaleString()}` : executedLayouts}
                                            <span className="text-[10px] text-slate-500 not-italic uppercase ml-1">{isFinancial ? 'USD' : 'Maquetados'}</span>
                                        </h4>
                                    </div>
                                    <span className="text-xs font-black">{layoutPercentage.toFixed(1)}%</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(layoutPercentage, 100)}%` }}
                                        className="h-full bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.5)]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Visual context */}
                    <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between opacity-50">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[8px] font-bold uppercase tracking-widest">Monitoreo en Tiempo Real</span>
                        </div>
                        <CheckCircle2 size={16} className="text-slate-600" />
                    </div>

                    <TrendingUp className="absolute -right-10 -top-10 w-48 h-48 text-white/5 pointer-events-none" />
                </section>
            </div>

            {/* Article Tracker Table (Mini) */}
            <section className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Resumen de Contenidos del Sprint</h3>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            <span className="text-[10px] font-bold text-slate-600">{executedArticles} / {programmedArticles} Completos</span>
                        </div>
                    </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    {sprintTasks.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                           <AlertCircle size={24} className="mx-auto mb-2 opacity-20" />
                           <p className="text-[10px] font-bold uppercase tracking-widest">No hay tareas programadas en este periodo</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 sticky top-0 z-10 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Contenido</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Palabras (Plan)</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Palabras (Real)</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Maquetado</th>
                                    {isFinancial && <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Inversión aprox.</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {sprintTasks.map(task => (
                                    <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-bold text-slate-800 truncate max-w-xs">{task.title}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                                                task.status === 'publicado' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                                            )}>
                                                {task.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-mono text-slate-400">{task.target_word_count || 0}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-xs font-black italic",
                                                    task.status === 'publicado' ? "text-slate-900" : "text-slate-300"
                                                )}>
                                                    {task.word_count_real || 0}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <div className={cn(
                                                    "w-5 h-5 rounded-lg flex items-center justify-center border transition-all",
                                                    task.layout_status ? "bg-cyan-500 border-cyan-500 text-white shadow-lg shadow-cyan-500/20" : "border-slate-200 text-slate-200"
                                                )}>
                                                    {task.layout_status && <Check size={12} strokeWidth={4} />}
                                                </div>
                                            </div>
                                        </td>
                                        {isFinancial && (
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-[10px] font-black text-slate-900">
                                                    ${((task.status === 'publicado' ? (task.word_count_real || 0) : (task.target_word_count || 0)) * wordPrice + (task.layout_status ? layoutPrice : 0)).toLocaleString()}
                                                </span>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>
        </div>
    );
}
