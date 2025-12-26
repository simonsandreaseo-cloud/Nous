import React from 'react';
import { ToggleLeft, ToggleRight, Check, Info } from 'lucide-react';
import { HeliosConfig } from '../types/heliosSchema';

interface ModuleSelectorProps {
    config: HeliosConfig;
    onChange: (config: HeliosConfig) => void;
}

const MODULES_INFO = [
    { id: 'executive_summary', label: 'Resumen Ejecutivo', desc: 'Visión general de alto nivel y KPIs críticos.', icon: '📊' },
    { id: 'traffic_anomalies', label: 'Anomalías de Tráfico', desc: 'Detección de picos y caídas inusuales.', icon: '📉' },
    { id: 'striking_distance', label: 'Oportunidades (Striking Distance)', desc: 'Keywords en posiciones 4-10 con alto potencial.', icon: '🎯' },
    { id: 'task_impact', label: 'Impacto de Tareas', desc: 'Correlación entre tareas completadas y métricas SEO.', icon: '✅' },
    { id: 'content_performance', label: 'Rendimiento de Contenidos', desc: 'Análisis profundo de URLs ganadoras y perdedoras.', icon: '📑' },
    { id: 'technical_health', label: 'Salud Técnica (Simulada)', desc: 'Revisión de Core Web Vitals y errores de rastreo.', icon: '🔧' },
];

export const ModuleSelector: React.FC<ModuleSelectorProps> = ({ config, onChange }) => {

    const toggleModule = (id: keyof HeliosConfig['modules']) => {
        onChange({
            ...config,
            modules: {
                ...config.modules,
                [id]: !config.modules[id]
            }
        });
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">2</span>
                Selección de Módulos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MODULES_INFO.map((module) => {
                    const isActive = config.modules[module.id as keyof HeliosConfig['modules']];
                    return (
                        <div
                            key={module.id}
                            onClick={() => toggleModule(module.id as any)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all relative overflow-hidden group ${isActive ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="text-xl">{module.icon}</div>
                                    <span className={`font-bold text-sm ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>{module.label}</span>
                                </div>
                                <div className={`text-indigo-600 transition-transform ${isActive ? 'scale-110' : 'opacity-20'}`}>
                                    {isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-slate-400" />}
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed pl-9 pr-4">
                                {module.desc}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
