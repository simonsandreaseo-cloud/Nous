import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionConfig, TaskImpactConfig, ContentAnalysisConfig } from '../types';

interface SectionSelectorProps {
    suggestedSections: string[];
    onConfirm: (sections: SectionConfig[], taskImpact: TaskImpactConfig, contentAnalysis: ContentAnalysisConfig) => void;
    onCancel: () => void;
    availableTasks: {
        id: number;
        title: string;
        completed_at?: string;
        created_at: string;
        updated_at?: string;
        gsc_property_url?: string
    }[];
    projects?: { id: number; name: string }[];
    selectedProjectId?: number | null;
    onProjectChange?: (id: number) => void;
}

const ALL_SECTIONS = [
    { id: 'ANALISIS_ESTRATEGICO', label: 'Análisis Estratégico', desc: 'Matriz de Ataque/Defensa y visión general.', defaultCount: 10 },
    { id: 'ANALISIS_CONCENTRACION', label: 'Riesgo de Concentración', desc: 'Dependencia del tráfico en pocas URLs.', defaultCount: 5 },
    { id: 'ANALISIS_CAUSAS_CAIDA', label: 'Diagnóstico de Caídas', desc: 'Análisis forense de pérdida de tráfico.', defaultCount: 15 },
    { id: 'OPORTUNIDADES_CONTENIDO_CLUSTERS', label: 'Oportunidades de Contenido', desc: 'Clusters temáticos para expandir.', defaultCount: 8 },
    { id: 'ALERTA_CANIBALIZACION', label: 'Canibalización SEO', desc: 'Páginas compitiendo por la misma keyword.', defaultCount: 10 },
    { id: 'OPORTUNIDAD_STRIKING_DISTANCE', label: 'Striking Distance', desc: 'Keywords en poisición 4-20 fáciles de subir.', defaultCount: 12 },
    { id: 'OPORTUNIDAD_NUEVAS_KEYWORDS', label: 'Nuevas Keywords', desc: 'Términos donde has empezado a rankear.', defaultCount: 10 },
    { id: 'ANALISIS_CTR', label: 'Análisis de CTR', desc: 'Páginas con CTR bajo sospechoso.', defaultCount: 10 },
    { id: 'ANALISIS_SEGMENTOS', label: 'Segmentos de URL', desc: 'Rendimiento por directorios (/blog, /tienda).', defaultCount: 5 },
    { id: 'ANALISIS_IMPACTO_TAREAS', label: 'Impacto de Tareas', desc: 'Analiza cómo han afectado las tareas completadas al tráfico.', defaultCount: 0 }
];

export const SectionSelector: React.FC<SectionSelectorProps> = ({
    suggestedSections,
    onConfirm,
    onCancel,
    availableTasks,
    projects = [],
    selectedProjectId,
    onProjectChange
}) => {
    const [selected, setSelected] = useState<SectionConfig[]>([]);
    const [useDateFilter, setUseDateFilter] = useState(false);

    const [taskImpact, setTaskImpact] = useState<TaskImpactConfig>({
        enabled: false,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        selectedTaskIds: [],
        measurementMode: 'completion',
        customDate: '',
        projectId: selectedProjectId || undefined
    });

    // Content Analysis Config
    const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysisConfig>({
        enabled: false,
        mode: 'month',
        selectedMonth: new Date().toISOString().slice(0, 7),
        selectedTaskIds: []
    });

    useEffect(() => {
        const initialSelected = ALL_SECTIONS
            .filter(s => suggestedSections.includes(s.id))
            .map(s => ({ id: s.id, caseCount: s.defaultCount }));
        setSelected(initialSelected);
    }, [suggestedSections]);

    useEffect(() => {
        if (selectedProjectId) {
            setTaskImpact(prev => ({ ...prev, projectId: selectedProjectId }));
        }
    }, [selectedProjectId]);

    const toggleSection = (id: string, defaultCount: number) => {
        if (id === 'ANALISIS_IMPACTO_TAREAS') {
            setTaskImpact(prev => ({ ...prev, enabled: !prev.enabled }));
            return;
        }

        const existing = selected.find(s => s.id === id);
        if (existing) {
            setSelected(selected.filter(s => s.id !== id));
        } else {
            setSelected([...selected, { id, caseCount: defaultCount }]);
        }
    };

    const updateCaseCount = (id: string, count: number) => {
        setSelected(selected.map(s => s.id === id ? { ...s, caseCount: count } : s));
    };

    const visibleTasks = useMemo(() => {
        let tasks = [...availableTasks];
        tasks.sort((a, b) => {
            try {
                const dateA = new Date(a.updated_at || a.created_at).getTime();
                const dateB = new Date(b.updated_at || b.created_at).getTime();
                if (isNaN(dateA)) return 1;
                if (isNaN(dateB)) return -1;
                return dateB - dateA;
            } catch (e) {
                return 0;
            }
        });

        if (useDateFilter && taskImpact.startDate && taskImpact.endDate) {
            tasks = tasks.filter(t => {
                try {
                    const dateToCheck = taskImpact.measurementMode === 'start' ? t.created_at : (t.completed_at || t.updated_at);
                    if (!dateToCheck) return false;
                    const d = new Date(dateToCheck);
                    if (isNaN(d.getTime())) return false;
                    const dStr = d.toISOString().split('T')[0];
                    return dStr >= taskImpact.startDate && dStr <= taskImpact.endDate;
                } catch (e) {
                    return false;
                }
            });
        }
        return tasks;
    }, [availableTasks, taskImpact.startDate, taskImpact.endDate, useDateFilter, taskImpact.measurementMode]);

    const toggleTaskSelection = (taskId: number) => {
        setTaskImpact(prev => {
            const current = prev.selectedTaskIds;
            if (current.includes(taskId)) {
                return { ...prev, selectedTaskIds: current.filter(id => id !== taskId) };
            } else {
                return { ...prev, selectedTaskIds: [...current, taskId] };
            }
        });
    };

    const toggleAllTasks = () => {
        if (taskImpact.selectedTaskIds.length === visibleTasks.length) {
            setTaskImpact(prev => ({ ...prev, selectedTaskIds: [] }));
        } else {
            setTaskImpact(prev => ({ ...prev, selectedTaskIds: visibleTasks.map(t => t.id) }));
        }
    };

    // Helper for Content Analysis Task Selection
    const toggleContentTask = (taskId: number) => {
        setContentAnalysis(prev => {
            const current = prev.selectedTaskIds;
            if (current.includes(taskId)) {
                return { ...prev, selectedTaskIds: current.filter(id => id !== taskId) };
            } else {
                return { ...prev, selectedTaskIds: [...current, taskId] };
            }
        });
    };

    const toggleAllContentTasks = () => {
        if (contentAnalysis.selectedTaskIds.length === visibleTasks.length) {
            setContentAnalysis(prev => ({ ...prev, selectedTaskIds: [] }));
        } else {
            setContentAnalysis(prev => ({ ...prev, selectedTaskIds: visibleTasks.map(t => t.id) }));
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-white/20"
            >
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Configurar Informe</h2>
                        <p className="text-slate-500 font-medium text-sm">Escoge los módulos tácticos que quieres que la IA procese.</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 bg-white custom-scrollbar space-y-10">
                    {/* Task Impact Configuration */}
                    <div className="p-8 rounded-3xl border border-indigo-100 bg-indigo-50/30 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></svg>
                        </div>

                        <div className="flex items-start justify-between mb-8 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${taskImpact.enabled ? 'bg-indigo-600 text-white rotate-3' : 'bg-slate-200 text-slate-400'}`}>
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-lg">Inteligencia de Tareas</h3>
                                    <p className="text-xs text-slate-500 font-medium">Cruza tus tareas completadas con el impacto real en GSC.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setTaskImpact(prev => ({ ...prev, enabled: !prev.enabled }))}
                                className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${taskImpact.enabled ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600'}`}
                            >
                                {taskImpact.enabled ? 'Activado' : 'Configurar'}
                            </button>
                        </div>

                        <AnimatePresence>
                            {taskImpact.enabled && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-8 border-t border-indigo-100/50 space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Proyecto de Referencia</label>
                                                <select
                                                    value={selectedProjectId || ''}
                                                    onChange={(e) => onProjectChange?.(parseInt(e.target.value))}
                                                    className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                                >
                                                    <option value="" disabled>Seleccionar Proyecto...</option>
                                                    {projects.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Punto de Medición</label>
                                                <div className="flex gap-2 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                                    {['start', 'completion', 'custom'].map((mode) => (
                                                        <button
                                                            key={mode}
                                                            onClick={() => setTaskImpact(prev => ({ ...prev, measurementMode: mode as any }))}
                                                            className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all
                                                                ${taskImpact.measurementMode === mode
                                                                    ? 'bg-indigo-600 text-white shadow-md'
                                                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                                                }
                                                            `}
                                                        >
                                                            {mode === 'start' ? 'Inicio' : mode === 'completion' ? 'Fin' : 'Fecha'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col md:flex-row gap-8">
                                            <div className="md:w-1/3 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtros</label>
                                                    <button
                                                        onClick={() => setUseDateFilter(!useDateFilter)}
                                                        className={`w-10 h-5 rounded-full p-1 transition-colors ${useDateFilter ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                                    >
                                                        <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${useDateFilter ? 'translate-x-5' : ''}`} />
                                                    </button>
                                                </div>

                                                {useDateFilter && (
                                                    <div className="grid grid-cols-2 gap-2 animate-fade-in-down">
                                                        <input type="date" value={taskImpact.startDate} onChange={(e) => setTaskImpact({ ...taskImpact, startDate: e.target.value })} className="p-2 border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-100" />
                                                        <input type="date" value={taskImpact.endDate} onChange={(e) => setTaskImpact({ ...taskImpact, endDate: e.target.value })} className="p-2 border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-100" />
                                                    </div>
                                                )}

                                                <button onClick={toggleAllTasks} className="w-full py-3 text-xs font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 transition-all">
                                                    {taskImpact.selectedTaskIds.length === visibleTasks.length ? 'Limpiar Todo' : 'Check All'}
                                                </button>
                                            </div>

                                            <div className="md:w-2/3 bg-white rounded-[2rem] p-6 border border-slate-100 shadow-inner flex flex-col h-[300px]">
                                                <div className="overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                    {visibleTasks.length > 0 ? visibleTasks.map(task => (
                                                        <label key={task.id} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${taskImpact.selectedTaskIds.includes(task.id) ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-slate-50/50 border-transparent hover:bg-white hover:border-slate-200'}`}>
                                                            <div className={`mt-1 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${taskImpact.selectedTaskIds.includes(task.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                            </div>
                                                            <input type="checkbox" checked={taskImpact.selectedTaskIds.includes(task.id)} onChange={() => toggleTaskSelection(task.id)} className="hidden" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start gap-4 mb-1">
                                                                    <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors uppercase leading-tight">{task.title}</span>
                                                                    <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                                                                        {(() => {
                                                                            try {
                                                                                const d = new Date(task.updated_at || task.created_at);
                                                                                return isNaN(d.getTime()) ? 'S/F' : d.toLocaleDateString();
                                                                            } catch (e) { return 'S/F'; }
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                                {task.gsc_property_url && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate block">{task.gsc_property_url.replace(/https?:\/\//, '')}</span>}
                                                            </div>
                                                        </label>
                                                    )) : <div className="text-center py-20 text-slate-300 font-bold uppercase text-[10px] tracking-[0.2em] italic">No hay tareas encontradas</div>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Content Analysis Configuration */}
                    <div className="p-8 rounded-3xl border border-emerald-100 bg-emerald-50/30 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></svg>
                        </div>

                        <div className="flex items-start justify-between mb-8 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${contentAnalysis.enabled ? 'bg-emerald-600 text-white rotate-3' : 'bg-slate-200 text-slate-400'}`}>
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-lg">Análisis de Contenidos</h3>
                                    <p className="text-xs text-slate-500 font-medium">Evalúa grupos de contenidos por mes o selección.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setContentAnalysis(prev => ({ ...prev, enabled: !prev.enabled }))}
                                className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${contentAnalysis.enabled ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200' : 'bg-white border border-slate-200 text-slate-400 hover:border-emerald-400 hover:text-emerald-600'}`}
                            >
                                {contentAnalysis.enabled ? 'Activado' : 'Configurar'}
                            </button>
                        </div>

                        <AnimatePresence>
                            {contentAnalysis.enabled && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-8 border-t border-emerald-100/50 space-y-8">
                                        <div className="flex gap-4 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm w-fit">
                                            <button
                                                onClick={() => setContentAnalysis(prev => ({ ...prev, mode: 'month' }))}
                                                className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${contentAnalysis.mode === 'month' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Por Mes
                                            </button>
                                            <button
                                                onClick={() => setContentAnalysis(prev => ({ ...prev, mode: 'items' }))}
                                                className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${contentAnalysis.mode === 'items' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Selección
                                            </button>
                                        </div>

                                        {contentAnalysis.mode === 'month' ? (
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Mes a Analizar</label>
                                                <input
                                                    type="month"
                                                    value={contentAnalysis.selectedMonth}
                                                    onChange={(e) => setContentAnalysis(prev => ({ ...prev, selectedMonth: e.target.value }))}
                                                    className="p-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex flex-col md:flex-row gap-8">
                                                <div className="md:w-1/3 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seleccionar Contenidos</label>
                                                        <button onClick={toggleAllContentTasks} className="text-[10px] text-emerald-600 font-bold hover:underline">
                                                            {contentAnalysis.selectedTaskIds.length === visibleTasks.length ? 'Desmarcar Todo' : 'Marcar Todo'}
                                                        </button>
                                                    </div>
                                                    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-inner flex flex-col h-[300px]">
                                                        <div className="overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                            {visibleTasks.length > 0 ? visibleTasks.map(task => (
                                                                <label key={task.id} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${contentAnalysis.selectedTaskIds.includes(task.id) ? 'bg-emerald-50/50 border-emerald-200 shadow-sm' : 'bg-slate-50/50 border-transparent hover:bg-white hover:border-slate-200'}`}>
                                                                    <div className={`mt-1 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${contentAnalysis.selectedTaskIds.includes(task.id) ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'}`}>
                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                                    </div>
                                                                    <input type="checkbox" checked={contentAnalysis.selectedTaskIds.includes(task.id)} onChange={() => toggleContentTask(task.id)} className="hidden" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex justify-between items-start gap-4 mb-1">
                                                                            <span className="font-bold text-xs text-slate-900 group-hover:text-emerald-600 transition-colors uppercase leading-tight">{task.title}</span>
                                                                        </div>
                                                                        {task.gsc_property_url && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate block">{task.gsc_property_url.replace(/https?:\/\//, '')}</span>}
                                                                    </div>
                                                                </label>
                                                            )) : <div className="text-center py-20 text-slate-300 font-bold uppercase text-[10px] tracking-[0.2em] italic">No hay contenidos</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="space-y-6">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Módulos de Datos Disponibles</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {ALL_SECTIONS.filter(s => s.id !== 'ANALISIS_IMPACTO_TAREAS').map((section) => {
                                const config = selected.find(s => s.id === section.id);
                                const isSelected = !!config;
                                const isSuggested = suggestedSections.includes(section.id);

                                return (
                                    <div key={section.id} className={`p-6 rounded-3xl border-2 transition-all duration-500 cursor-pointer flex flex-col ${isSelected ? 'border-indigo-600 bg-indigo-50/20 shadow-xl shadow-indigo-100' : 'border-slate-100 bg-white hover:border-indigo-200'}`} onClick={() => toggleSection(section.id, section.defaultCount)}>
                                        <div className="flex justify-between mb-4">
                                            {isSuggested && <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">AI Pick ✨</span>}
                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white scale-110' : 'border-slate-200 bg-white'}`}>
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                        </div>
                                        <h3 className="font-black text-slate-900 text-sm uppercase leading-tight mb-2">{section.label}</h3>
                                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-6 line-clamp-2">{section.desc}</p>

                                        {isSelected && (
                                            <div className="mt-auto pt-4 border-t border-indigo-100 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                                                <span className="text-[9px] font-black text-indigo-400 uppercase">Profundidad</span>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => updateCaseCount(section.id, Math.max(1, (config.caseCount || 0) - 1))} className="w-6 h-6 rounded-lg bg-white border border-slate-200 font-bold text-slate-400 hover:text-indigo-600 transition-colors">-</button>
                                                    <span className="text-sm font-black text-slate-800 font-mono">{config.caseCount}</span>
                                                    <button onClick={() => updateCaseCount(section.id, (config.caseCount || 0) + 1)} className="w-6 h-6 rounded-lg bg-white border border-slate-200 font-bold text-slate-400 hover:text-indigo-600 transition-colors">+</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-8 border-t border-slate-100 bg-white flex justify-between items-center">
                    <div className="flex gap-4">
                        <button onClick={onCancel} className="text-slate-400 hover:text-slate-900 font-black uppercase text-[10px] tracking-widest transition-colors px-6">Ignorar</button>
                    </div>
                    <button
                        onClick={() => onConfirm(selected, taskImpact, contentAnalysis)}
                        disabled={selected.length === 0 && !taskImpact.enabled && !contentAnalysis.enabled}
                        className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-black text-lg hover:bg-indigo-600 shadow-2xl shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-20 flex items-center gap-4"
                    >
                        Generar con Neuro-IA 🪄
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
