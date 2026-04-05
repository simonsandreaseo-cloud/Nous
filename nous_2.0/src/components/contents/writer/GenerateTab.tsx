'use client';

import { 
    Sparkles, Wand2, Calculator, 
    Rocket, BrainCircuit, Lightbulb, RefreshCw, Info
} from 'lucide-react';
import { useWriterStore } from '@/store/useWriterStore';
import { SectionLabel } from './SidebarCommon';
import React from 'react';

export function GenerateTab({ 
    onGenerate, 
    onPlanStructure,
    onHumanize, 
    isLoading,
    isPlanning
}: { 
    onGenerate: () => void; 
    onPlanStructure: () => void;
    onHumanize: () => void; 
    isLoading: boolean;
    isPlanning: boolean;
}) {
    const store = useWriterStore();
    const hasOutline = store.strategyOutline && store.strategyOutline.length > 0;

    // ── SI NO HAY OUTLINE: solo mostrar el botón de generar outline ─────────
    if (!hasOutline) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-6 pt-4">
                {/* Ilustración de estado vacío */}
                <div className="relative flex items-center justify-center">
                    <div className="absolute w-24 h-24 rounded-full bg-indigo-100/60 animate-ping" style={{ animationDuration: '2.5s' }} />
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-200">
                        <Sparkles size={32} className="text-white" />
                    </div>
                </div>

                <div className="text-center space-y-1.5 px-4">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-800">
                        Sin Outline Estratégico
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 leading-relaxed">
                        Genera el outline con Nous para definir la estructura de secciones antes de redactar.
                    </p>
                    {!store.rawSeoData && (
                        <p className="text-[10px] font-bold text-amber-500 mt-2">
                            ⚠ Realiza la investigación SEO primero (tab SEO)
                        </p>
                    )}
                </div>

                {/* Botón principal con el mismo estilo que "Generar Artículo" */}
                <button
                    disabled={isPlanning || !store.rawSeoData}
                    onClick={onPlanStructure}
                    className="group relative w-full h-11 bg-indigo-600 hover:bg-black text-white text-xs font-black uppercase tracking-widest rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-lg shadow-indigo-200 hover:shadow-black/20 active:scale-95"
                >
                    <div className="absolute inset-0 flex items-center justify-center gap-2 group-hover:-translate-y-full transition-transform">
                        {isPlanning ? (
                            <RefreshCw size={14} className="animate-spin" />
                        ) : (
                            <Sparkles size={14} className="animate-pulse" />
                        )}
                        {isPlanning ? 'Diseñando Outline...' : 'Generar Outline con Nous'}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center gap-2 translate-y-full group-hover:translate-y-0 transition-transform">
                        <Lightbulb size={14} />
                        Activar Estrategia SEO
                    </div>
                </button>
            </div>
        );
    }

    // ── HAY OUTLINE: mostrar configuración completa y botón de redactar ──────
    return (
        <div className="space-y-6 pt-2">
            {/* H1 */}
            <div className="space-y-4">
                <SectionLabel>Estrategia de Estructura</SectionLabel>
                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">H1 &amp; Título SEO</label>
                        <input 
                            type="text" 
                            className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400 font-medium"
                            placeholder="Título principal del artículo..."
                            value={store.strategyH1 || store.keyword}
                            onChange={(e) => store.setStrategyH1(e.target.value)}
                        />
                    </div>
                </div>
            </div>



            {/* Nivel de Creatividad */}
            <div className="p-4 bg-slate-50/50 rounded-md border border-dashed border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                    <SectionLabel>Nivel de Creatividad</SectionLabel>
                    <Info size={12} className="text-slate-400" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                        <button
                            key={level}
                            onClick={() => store.setCreativityLevel(level)}
                            className={`p-2 text-[10px] font-bold uppercase rounded-lg border-2 transition-all ${
                                store.creativityLevel === level 
                                    ? 'bg-white border-indigo-500 text-indigo-600 shadow-sm' 
                                    : 'bg-transparent border-transparent text-slate-400 grayscale'
                            }`}
                        >
                            {level === 'low' ? 'Mín' : level === 'medium' ? 'Equi' : 'Max'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4">
                <button
                    disabled={isLoading || store.isHumanizing}
                    onClick={onGenerate}
                    className="group relative w-full h-11 bg-indigo-600 hover:bg-black text-white text-xs font-black uppercase tracking-widest rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-lg shadow-indigo-200 hover:shadow-black/20 active:scale-95"
                >
                    <div className="absolute inset-0 flex items-center justify-center gap-2 group-hover:-translate-y-full transition-transform">
                        <Sparkles size={14} className={isLoading ? 'animate-spin' : 'animate-pulse'} />
                        {isLoading ? 'Redactando...' : 'Redactar con Nous'}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center gap-2 translate-y-full group-hover:translate-y-0 transition-transform">
                        <Rocket size={14} />
                        Iniciar Redactor con Nous
                    </div>
                </button>

                {store.content && !isLoading && (
                    <button
                        disabled={store.isHumanizing}
                        onClick={onHumanize}
                        className="group flex items-center justify-center gap-2 w-full h-11 bg-black hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest rounded-md transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                        {store.isHumanizing ? (
                            <>
                                <Wand2 size={14} className="animate-pulse text-indigo-400" />
                                <span>Humanizando...</span>
                            </>
                        ) : (
                            <>
                                <Wand2 size={14} className="group-hover:rotate-12 transition-transform" />
                                <span>Humanizar IA Content</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
