import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, Check, Info, Settings, X, Search } from 'lucide-react';
import { HeliosConfig } from '../types/heliosSchema';

interface ModuleSelectorProps {
    config: HeliosConfig;
    onChange: (config: HeliosConfig) => void;
    availableTasks?: any[];
}

const CATEGORIES = [
    {
        title: "Módulos Esenciales",
        modules: [
            { id: 'executive_summary', label: 'Resumen Ejecutivo', desc: 'Visión general de alto nivel y KPIs críticos.', icon: '📊' },
            { id: 'traffic_anomalies', label: 'Anomalías de Tráfico', desc: 'Detección de picos y caídas inusuales.', icon: '📉' },
            { id: 'task_impact', label: 'Impacto de Tareas', desc: 'Correlación entre tareas completadas y métricas SEO.', icon: '✅', hasSettings: true },
            { id: 'content_performance', label: 'Rendimiento de Contenidos', desc: 'Análisis profundo de URLs ganadoras y perdedoras.', icon: '📑', hasSettings: true },
        ]
    },
    {
        title: "Inteligencia Estratégica",
        modules: [
            { id: 'strategic_overview', label: 'Matriz Estratégica', desc: 'Defender, Atacar, Expandir y Podar.', icon: '⚔️' },
            { id: 'new_keywords', label: 'Nuevas Keywords', desc: 'Descubrimiento de términos entrantes.', icon: '🌱' },
            { id: 'striking_distance', label: 'Oportunidades (Striking)', desc: 'Keywords en posiciones 4-10 con alto potencial.', icon: '🎯' },
            { id: 'ctr_opportunities', label: 'Oportunidades CTR', desc: 'Ghost Keywords y bajo CTR.', icon: '🖱️' },
            { id: 'segment_analysis', label: 'Segmentos de Tráfico', desc: 'Rendimiento por carpetas /blog, /prod, etc.', icon: '📂' },
        ]
    },
    {
        title: "Análisis Forense",
        modules: [
            { id: 'cannibalization', label: 'Canibalización', desc: 'Alertas de conflicto entre URLs.', icon: '🔄' },
            { id: 'keyword_decay', label: 'Decaimiento', desc: 'Pérdida de tracción en keywords clave.', icon: '🥀' },
            { id: 'concentration', label: 'Concentración', desc: 'Riesgo de dependencia en pocas URLs.', icon: '⚖️' },
            { id: 'technical_health', label: 'Salud Técnica (Simulada)', desc: 'Revisión de Core Web Vitals y errores de rastreo.', icon: '🔧' },
        ]
    }
];

const ALL_MODULES = CATEGORIES.flatMap(cat => cat.modules);

export const ModuleSelector: React.FC<ModuleSelectorProps> = ({ config, onChange, availableTasks = [] }) => {
    const [activeSettings, setActiveSettings] = useState<string | null>(null);

    const toggleModule = (id: keyof HeliosConfig['modules']) => {
        onChange({
            ...config,
            modules: {
                ...config.modules,
                [id]: !config.modules[id]
            }
        });
    };

    const toggleTaskSelection = (taskId: number) => {
        const currentSelected = config.taskImpact.selectedTaskIds || [];
        const isSelected = currentSelected.includes(taskId);
        const newSelected = isSelected
            ? currentSelected.filter(id => id !== taskId)
            : [...currentSelected, taskId];

        onChange({
            ...config,
            taskImpact: {
                ...config.taskImpact,
                selectedTaskIds: newSelected
            }
        });
    };

    const toggleContentTaskSelection = (taskId: number) => {
        const currentSelected = config.contentPerformance.selectedTaskIds || [];
        const isSelected = currentSelected.includes(taskId);
        const newSelected = isSelected
            ? currentSelected.filter(id => id !== taskId)
            : [...currentSelected, taskId];

        onChange({
            ...config,
            contentPerformance: {
                ...config.contentPerformance,
                selectedTaskIds: newSelected
            }
        });
    };

    return (
        <div className="space-y-8">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">2</span>
                Selección de Módulos
            </h3>

            {CATEGORIES.map((cat, idx) => (
                <div key={idx} className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider pl-2 border-l-2 border-indigo-200">{cat.title}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cat.modules.map((module) => {
                            const isActive = config.modules[module.id as keyof HeliosConfig['modules']];
                            // @ts-ignore
                            const hasSettings = module.hasSettings;

                            return (
                                <div
                                    key={module.id}
                                    className={`p-4 rounded-xl border transition-all relative overflow-hidden group ${isActive ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleModule(module.id as any)}>
                                            <div className="text-xl">{module.icon}</div>
                                            <span className={`font-bold text-sm ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>{module.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isActive && hasSettings && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setActiveSettings(module.id); }}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                                    title="Configurar detalle"
                                                >
                                                    <Settings size={16} />
                                                </button>
                                            )}
                                            <div
                                                onClick={() => toggleModule(module.id as any)}
                                                className={`cursor-pointer text-indigo-600 transition-transform ${isActive ? 'scale-110' : 'opacity-20'}`}
                                            >
                                                {isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-slate-400" />}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed pl-9 pr-4 cursor-pointer" onClick={() => toggleModule(module.id as any)}>
                                        {module.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* SETTINGS MODAL */}
            {activeSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-[600px] max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Settings size={18} className="text-indigo-600" />
                                Configurar {ALL_MODULES.find(m => m.id === activeSettings)?.label}
                            </h3>
                            <button onClick={() => setActiveSettings(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            {activeSettings === 'task_impact' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-bold text-slate-700">Seleccionar Tareas a Analizar</label>
                                        <span className="text-xs text-slate-500">{config.taskImpact.selectedTaskIds?.length || 0} seleccionadas</span>
                                    </div>
                                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                                        {availableTasks.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400 text-sm">No hay tareas completadas disponibles para este proyecto.</div>
                                        ) : (
                                            availableTasks.map(task => {
                                                const isSelected = config.taskImpact.selectedTaskIds?.includes(task.id);
                                                return (
                                                    <div
                                                        key={task.id}
                                                        onClick={() => toggleTaskSelection(task.id)}
                                                        className={`p-3 border-b last:border-0 border-slate-100 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}
                                                    >
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                                            {isSelected && <Check size={12} className="text-white" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-sm text-slate-800 truncate">{task.title}</div>
                                                            <div className="text-xs text-slate-400 flex items-center gap-2">
                                                                <span>{task.completed_at ? new Date(task.completed_at).toLocaleDateString() : 'Pendiente'}</span>
                                                                {task.gsc_property_url && <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] truncate max-w-[200px]">{task.gsc_property_url}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeSettings === 'content_performance' && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Modo de Análisis</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'top_gainers', label: 'Top Ganadores' },
                                                { id: 'top_losers', label: 'Top Perdedores' },
                                                { id: 'items', label: 'URLs Específicas (Tareas)' }
                                            ].map(mode => (
                                                <button
                                                    key={mode.id}
                                                    onClick={() => onChange({ ...config, contentPerformance: { ...config.contentPerformance, mode: mode.id as any } })}
                                                    className={`p-2 rounded-lg text-sm font-medium border transition-all ${config.contentPerformance.mode === mode.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                                                >
                                                    {mode.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {config.contentPerformance.mode === 'items' && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Seleccionar Contenidos (desde Tareas)</label>
                                            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                                                {availableTasks.filter(t => t.gsc_property_url || t.secondary_url).map(task => {
                                                    const isSelected = config.contentPerformance.selectedTaskIds?.includes(task.id);
                                                    return (
                                                        <div
                                                            key={task.id}
                                                            onClick={() => toggleContentTaskSelection(task.id)}
                                                            className={`p-3 border-b last:border-0 border-slate-100 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}
                                                        >
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                                                {isSelected && <Check size={12} className="text-white" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-medium text-sm text-slate-800 truncate">{task.title}</div>
                                                                <div className="text-xs text-indigo-500 truncate">{task.gsc_property_url || task.secondary_url}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Tráfico Mínimo (Clics)</label>
                                        <input
                                            type="number"
                                            value={config.contentPerformance.min_traffic}
                                            onChange={(e) => onChange({ ...config, contentPerformance: { ...config.contentPerformance, min_traffic: parseInt(e.target.value) } })}
                                            className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setActiveSettings(null)}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors"
                            >
                                Guardar y Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
