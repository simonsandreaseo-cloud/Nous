
import React from 'react';
import { Language } from '../types';
import { LayoutDashboard, Zap, FileText, TableProperties } from 'lucide-react';

interface ModeSelectorProps {
    onSelectMode: (mode: 1 | 2 | 3 | 4) => void;
    lang: Language;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ onSelectMode, lang }) => {
    const t = {
        title: lang === 'es' ? 'Selecciona tu Flujo de Trabajo' : 'Select your Workflow',
        expertTitle: lang === 'es' ? 'Modo Experto' : 'Expert Mode',
        expertDesc: lang === 'es' 
            ? 'Panel completo con todos los datos y asistentes de IA. Ideal para análisis granular profundo.'
            : 'Full dashboard with all data and AI assistants. Best for deep granular analysis.',
        autoTitle: lang === 'es' ? 'Modo Automático' : 'Auto-Task Mode',
        autoDesc: lang === 'es'
            ? 'IA Autónoma. Prioriza y diagnostica solo casos críticos automáticamente.'
            : 'Autonomous AI. Prioritizes and diagnoses only critical cases automatically.',
        reportTitle: lang === 'es' ? 'Informe Analítico' : 'Analytic Report',
        reportDesc: lang === 'es'
            ? 'Genera un documento PDF ejecutivo con hallazgos clave y estrategia.'
            : 'Generate an executive PDF document with key findings and strategy.',
        rawTitle: lang === 'es' ? 'Datos Brutos' : 'Raw Data',
        rawDesc: lang === 'es'
            ? 'Visualización pura de datos sin funciones de IA. Rápido y limpio.'
            : 'Pure data visualization without AI features. Fast and clean.',
    };

    const Card = ({ title, desc, icon: Icon, mode, color }: any) => (
        <button 
            onClick={() => onSelectMode(mode)}
            className={`flex flex-col items-center text-center p-8 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl bg-white group h-full ${
                color === 'indigo' ? 'border-indigo-100 hover:border-indigo-500' :
                color === 'violet' ? 'border-violet-100 hover:border-violet-500' :
                color === 'emerald' ? 'border-emerald-100 hover:border-emerald-500' :
                'border-slate-100 hover:border-slate-500'
            }`}
        >
            <div className={`p-4 rounded-full mb-6 transition-colors ${
                color === 'indigo' ? 'bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600' :
                color === 'violet' ? 'bg-violet-50 group-hover:bg-violet-100 text-violet-600' :
                color === 'emerald' ? 'bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600' :
                'bg-slate-100 group-hover:bg-slate-200 text-slate-600'
            }`}>
                <Icon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
        </button>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 animate-in fade-in zoom-in-95 duration-500">
            <h2 className="text-2xl font-bold text-center text-slate-800 mb-12">{t.title}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card 
                    title={t.expertTitle} 
                    desc={t.expertDesc} 
                    icon={LayoutDashboard} 
                    mode={1} 
                    color="indigo" 
                />
                <Card 
                    title={t.autoTitle} 
                    desc={t.autoDesc} 
                    icon={Zap} 
                    mode={2} 
                    color="violet" 
                />
                <Card 
                    title={t.reportTitle} 
                    desc={t.reportDesc} 
                    icon={FileText} 
                    mode={3} 
                    color="emerald" 
                />
                 <Card 
                    title={t.rawTitle} 
                    desc={t.rawDesc} 
                    icon={TableProperties} 
                    mode={4} 
                    color="slate" 
                />
            </div>
        </div>
    );
};

export default ModeSelector;
