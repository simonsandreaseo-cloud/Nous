import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionConfig, TaskImpactConfig } from '../types';
import { supabase } from '@/lib/supabase';

interface SectionSelectorProps {
    suggestedSections: string[];
    onConfirm: (sections: SectionConfig[], taskImpact: TaskImpactConfig) => void;
    onCancel: () => void;
    availableTasks: { id: number; title: string; completed_at?: string; gsc_property_url?: string }[];
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

export const SectionSelector: React.FC<SectionSelectorProps> = ({ suggestedSections, onConfirm, onCancel, availableTasks }) => {
    const [selected, setSelected] = useState<SectionConfig[]>([]);
    const [taskImpact, setTaskImpact] = useState<TaskImpactConfig>({
        enabled: false,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        selectedTaskIds: []
    });

    useEffect(() => {
        // Pre-select suggestions
        const initialSelected = ALL_SECTIONS
            .filter(s => suggestedSections.includes(s.id))
            .map(s => ({ id: s.id, caseCount: s.defaultCount }));
        setSelected(initialSelected);
    }, [suggestedSections]);

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

    const filteredTasks = useMemo(() => {
        if (!taskImpact.startDate || !taskImpact.endDate) return [];
        return availableTasks.filter(t => {
            if (!t.completed_at) return false;
            const completedDate = new Date(t.completed_at).toISOString().split('T')[0];
            return completedDate >= taskImpact.startDate && completedDate <= taskImpact.endDate;
        });
    }, [availableTasks, taskImpact.startDate, taskImpact.endDate]);

    // Automatically select tasks in range if enabled
    useEffect(() => {
        if (taskImpact.enabled) {
            setTaskImpact(prev => ({
                ...prev,
                selectedTaskIds: filteredTasks.map(t => t.id)
            }));
        }
    }, [taskImpact.enabled, filteredTasks]);

    return (
        <div className="fixed inset-0 z-50 bg-brand-power/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-brand-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden border border-brand-power/5"
            >
                <div className="p-8 border-b border-brand-power/5 bg-brand-soft/20 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-brand-power mb-1">Personaliza tu Informe</h2>
                        <p className="text-brand-power/60 text-sm">Configura los módulos y el alcance del análisis.</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-brand-white custom-scrollbar">
                    {/* Task Impact Configuration */}
                    <div className="mb-8 p-6 rounded-2xl border-2 border-brand-accent/20 bg-brand-accent/5">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${taskImpact.enabled ? 'bg-brand-power text-brand-white' : 'bg-brand-power/10 text-brand-power/40'}`}>
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-brand-power">Impacto de Tareas</h3>
                                    <p className="text-xs text-brand-power/60">Cruza el historial de tareas con las métricas de GSC.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setTaskImpact(prev => ({ ...prev, enabled: !prev.enabled }))}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${taskImpact.enabled ? 'bg-brand-power text-white shadow-md' : 'bg-brand-power/5 text-brand-power/40 hover:bg-brand-power/10'}`}
                            >
                                {taskImpact.enabled ? 'Activado' : 'Activar'}
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-brand-power/10">
                                        <div className="space-y-4">
                                            <label className="block text-xs font-bold text-brand-power/60 uppercase">Rango de Tareas</label>
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <span className="text-[10px] text-brand-power/40 block mb-1">Desde</span>
                                                    <input
                                                        type="date"
                                                        value={taskImpact.startDate}
                                                        onChange={(e) => setTaskImpact({ ...taskImpact, startDate: e.target.value })}
                                                        className="w-full p-2.5 bg-white border border-brand-power/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-power/20"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <span className="text-[10px] text-brand-power/40 block mb-1">Hasta</span>
                                                    <input
                                                        type="date"
                                                        value={taskImpact.endDate}
                                                        onChange={(e) => setTaskImpact({ ...taskImpact, endDate: e.target.value })}
                                                        className="w-full p-2.5 bg-white border border-brand-power/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-power/20"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-brand-power/50 italic">
                                                Se incluirán métricas de GSC para las URLs asociadas a las tareas en este rango.
                                            </p>
                                        </div>

                                        <div className="bg-white/50 rounded-xl p-4 border border-brand-power/5">
                                            <label className="block text-xs font-bold text-brand-power/60 uppercase mb-3">Tareas a considerar ({filteredTasks.length})</label>
                                            <div className="max-h-32 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                {filteredTasks.length > 0 ? filteredTasks.map(task => (
                                                    <div key={task.id} className="flex flex-col gap-1 p-3 rounded-xl bg-white border border-brand-power/5 text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                            <span className="font-bold text-brand-power/80 truncate">{task.title}</span>
                                                            <span className="ml-auto text-[10px] text-brand-power/40 whitespace-nowrap">
                                                                {new Date(task.completed_at!).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        {task.gsc_property_url && (
                                                            <div className="text-[10px] text-brand-power/40 truncate ml-3.5">
                                                                🔗 {task.gsc_property_url.replace(/https?:\/\//, '')}
                                                            </div>
                                                        )}
                                                    </div>
                                                )) : (
                                                    <div className="text-center py-4 text-brand-power/40 text-xs italic">
                                                        No hay tareas completadas en este rango.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <label className="block text-xs font-bold text-brand-power/60 uppercase mb-4">Módulos de Análisis</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ALL_SECTIONS.filter(s => s.id !== 'ANALISIS_IMPACTO_TAREAS').map((section) => {
                            const config = selected.find(s => s.id === section.id);
                            const isSelected = !!config;
                            const isSuggested = suggestedSections.includes(section.id);

                            return (
                                <div
                                    key={section.id}
                                    className={`
                                        relative p-5 rounded-2xl border-2 transition-all duration-300
                                        ${isSelected
                                            ? 'border-brand-power bg-brand-soft/30 shadow-lg shadow-brand-power/5 scale-[1.02]'
                                            : 'border-brand-power/5 bg-brand-white hover:border-brand-power/20'
                                        }
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div
                                            onClick={() => toggleSection(section.id, section.defaultCount)}
                                            className="cursor-pointer flex-1"
                                        >
                                            {isSuggested && (
                                                <span className="inline-block bg-brand-accent text-brand-power text-[9px] font-bold px-2 py-0.5 rounded-full mb-2 uppercase tracking-wider">
                                                    ✨ Recomendado
                                                </span>
                                            )}
                                            <h3 className={`font-bold text-sm leading-tight ${isSelected ? 'text-brand-power' : 'text-brand-power/70'}`}>{section.label}</h3>
                                        </div>
                                        <div
                                            onClick={() => toggleSection(section.id, section.defaultCount)}
                                            className={`
                                                cursor-pointer w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                                                ${isSelected
                                                    ? 'bg-brand-power border-brand-power text-white'
                                                    : 'border-brand-power/20 bg-transparent text-transparent'
                                                }
                                            `}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    </div>

                                    <p className="text-xs text-brand-power/50 leading-snug mb-4 h-10 overflow-hidden">{section.desc}</p>

                                    {isSelected && (
                                        <div className="pt-4 border-t border-brand-power/10 flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-brand-power/40 uppercase">Casos a mostrar</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => updateCaseCount(section.id, Math.max(1, (config.caseCount || 0) - 1))}
                                                    className="w-6 h-6 rounded-lg bg-brand-white border border-brand-power/10 flex items-center justify-center hover:bg-brand-power hover:text-white transition-colors"
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="number"
                                                    value={config.caseCount}
                                                    onChange={(e) => updateCaseCount(section.id, parseInt(e.target.value) || 1)}
                                                    className="w-10 text-center text-xs font-bold bg-transparent outline-none"
                                                />
                                                <button
                                                    onClick={() => updateCaseCount(section.id, (config.caseCount || 0) + 1)}
                                                    className="w-6 h-6 rounded-lg bg-brand-white border border-brand-power/10 flex items-center justify-center hover:bg-brand-power hover:text-white transition-colors"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-6 border-t border-brand-power/5 bg-brand-white flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-brand-power">
                            {selected.length + (taskImpact.enabled ? 1 : 0)} Módulos Seleccionados
                        </span>
                        <span className="text-[10px] text-brand-power/40 uppercase font-medium">Personalización completa activa</span>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={onCancel}
                            className="text-brand-power/50 hover:text-brand-power font-bold px-6 py-2 text-sm transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => onConfirm(selected, taskImpact)}
                            disabled={selected.length === 0 && !taskImpact.enabled}
                            className={`
                                bg-brand-power text-brand-white px-10 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-brand-power/20
                                ${selected.length === 0 && !taskImpact.enabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 hover:-translate-y-1 active:scale-95'}
                            `}
                        >
                            Generar con IA 🚀
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
