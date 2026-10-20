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
    onRegenerateOutline,
    onHumanize, 
    isLoading,
    isPlanning
}: { 
    onGenerate: () => void; 
    onRegenerateOutline: () => void;
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
                    onClick={onRegenerateOutline}
                    className="group relative w-full h-11 bg-indigo-600 hover:bg-black text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-lg shadow-indigo-200 hover:shadow-black/20 active:scale-95"
                >

                    <div className="absolute inset-0 flex items-center justify-center gap-2 group-hover:-translate-y-full transition-transform">
                        {isPlanning ? (
                            <RefreshCw size={14} className="animate-spin" />
                        ) : (
                            <Sparkles size={14} className="animate-pulse" />
                        )}
                        {isPlanning ? 'Planificando...' : 'Planificar Estructura'}
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





            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                <button
                    disabled={isLoading || store.isHumanizing}
                    onClick={onGenerate}
                    className="group relative w-full h-11 bg-indigo-600 hover:bg-black text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-lg shadow-indigo-200 hover:shadow-black/20 active:scale-95"
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
                    <div className="space-y-3 pt-3 mt-1 border-t border-slate-100/80">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Forma de Humanización
                            </label>

                            {/* Selector Principal: Tradicional vs Gramatical vs Uniprompt */}
                            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => store.updateHumanizerConfig({ humanizerType: 'tradicional' })}
                                    className={`py-2 px-1.5 rounded-lg text-center font-bold text-[9px] uppercase tracking-wider transition-all ${
                                        (store.humanizerConfig.humanizerType || 'tradicional') === 'tradicional'
                                            ? 'bg-white text-indigo-700 shadow-sm shadow-slate-200'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Tradicional
                                </button>
                                <button
                                    type="button"
                                    onClick={() => store.updateHumanizerConfig({ humanizerType: 'gramatical' })}
                                    className={`py-2 px-1.5 rounded-lg text-center font-bold text-[9px] uppercase tracking-wider transition-all ${
                                        store.humanizerConfig.humanizerType === 'gramatical'
                                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-200'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Gramatical
                                </button>
                                <button
                                    type="button"
                                    onClick={() => store.updateHumanizerConfig({ humanizerType: 'uniprompt' })}
                                    className={`py-2 px-1.5 rounded-lg text-center font-bold text-[9px] uppercase tracking-wider transition-all ${
                                        store.humanizerConfig.humanizerType === 'uniprompt'
                                            ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-sm shadow-amber-200'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Uniprompt
                                </button>
                            </div>

                            {/* Configuración según la forma seleccionada */}
                            {(store.humanizerConfig.humanizerType || 'tradicional') === 'tradicional' ? (
                                <div className="space-y-2">
                                    <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                                        Modo Tradicional (NOUS Engine)
                                    </span>
                                    <div className="grid grid-cols-1 gap-2">
                                        {/* Modo Pipeline Unificado */}
                                        <button
                                            type="button"
                                            onClick={() => store.updateHumanizerConfig({ mode: 'unified' })}
                                            className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 active:scale-[0.99] ${
                                                store.humanizerConfig.mode === 'unified' || !store.humanizerConfig.mode
                                                    ? 'border-indigo-600 bg-indigo-50/40 shadow-sm shadow-indigo-100/30'
                                                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${(store.humanizerConfig.mode === 'unified' || !store.humanizerConfig.mode) ? 'bg-indigo-600 animate-pulse' : 'bg-slate-400'}`} />
                                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-wide">Pipeline Unificado (Chunks)</span>
                                            </div>
                                            <p className="text-[9.5px] text-slate-400 font-medium mt-1 leading-relaxed">
                                                Procesa por bloques combinando humanización y SEO LSI de forma dinámica.
                                            </p>
                                        </button>

                                        {/* Modo Detección de Duplicados */}
                                        <button
                                            type="button"
                                            onClick={() => store.updateHumanizerConfig({ mode: 'duplicate_detection' })}
                                            className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 active:scale-[0.99] ${
                                                store.humanizerConfig.mode === 'duplicate_detection'
                                                    ? 'border-indigo-600 bg-indigo-50/40 shadow-sm shadow-indigo-100/30'
                                                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${store.humanizerConfig.mode === 'duplicate_detection' ? 'bg-indigo-600 animate-pulse' : 'bg-slate-400'}`} />
                                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-wide">Detección de Duplicados</span>
                                            </div>
                                            <p className="text-[9.5px] text-slate-400 font-medium mt-1 leading-relaxed">
                                                Humaniza en bloques primero. Luego aplica optimización SEO de forma global.
                                            </p>
                                        </button>

                                        {/* Modo Sin Chunks */}
                                        <button
                                            type="button"
                                            onClick={() => store.updateHumanizerConfig({ mode: 'no_chunks' })}
                                            className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 active:scale-[0.99] ${
                                                store.humanizerConfig.mode === 'no_chunks'
                                                    ? 'border-indigo-600 bg-indigo-50/40 shadow-sm shadow-indigo-100/30'
                                                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${store.humanizerConfig.mode === 'no_chunks' ? 'bg-indigo-600 animate-pulse' : 'bg-slate-400'}`} />
                                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-wide">Sin Chunks (Petición Única)</span>
                                            </div>
                                            <p className="text-[9.5px] text-slate-400 font-medium mt-1 leading-relaxed">
                                                Procesa el contenido entero de una sola vez. Cohesión absoluta en todo el texto.
                                            </p>
                                        </button>
                                    </div>
                                </div>
                            ) : store.humanizerConfig.humanizerType === 'uniprompt' ? (
                                <div className="space-y-2 p-3 bg-amber-50/70 rounded-xl border border-amber-200/80">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                                            <Sparkles size={12} className="text-amber-600" />
                                            Humanización Uniprompt
                                        </span>
                                        <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                            1 Sola Petición
                                        </span>
                                    </div>
                                    <p className="text-[9.5px] text-amber-950/80 leading-relaxed">
                                        Aplica simultáneamente las 4 leyes morfosintácticas en una sola pasada (hasta 2500 palabras por chunk):
                                    </p>
                                    <div className="space-y-1.5 pt-1">
                                        <div className="flex items-center justify-between text-[9px] bg-white/80 px-2 py-1.5 rounded-lg border border-amber-100">
                                            <span className="font-semibold text-slate-700">Ley 1: Vocabulario Llano + Lista Blanca</span>
                                            <span className="font-mono font-bold text-amber-600">85% Verbos</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[9px] bg-white/80 px-2 py-1.5 rounded-lg border border-amber-100">
                                            <span className="font-semibold text-slate-700">Ley 2: Inicios Alternos + Cercanía (0% Tú)</span>
                                            <span className="font-mono font-bold text-amber-600">40% 2.ª Pers.</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[9px] bg-white/80 px-2 py-1.5 rounded-lg border border-amber-100">
                                            <span className="font-semibold text-slate-700">Ley 3: Moldes Asimétricos (Cero Tricolon)</span>
                                            <span className="font-mono font-bold text-amber-600">Ritmo Libre</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[9px] bg-white/80 px-2 py-1.5 rounded-lg border border-amber-100">
                                            <span className="font-semibold text-slate-700">Ley 4: Comma Splice + Silepsis Plural</span>
                                            <span className="font-mono font-bold text-amber-600">0% IA</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/70">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                                            <Sparkles size={12} className="text-emerald-600" />
                                            Pipeline Gramatical
                                        </span>
                                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                                            Orden Invertido
                                        </span>
                                    </div>
                                    <p className="text-[9.5px] text-emerald-900/80 leading-relaxed">
                                        Pasa el texto completo a través de capas morfosintácticas secuenciales:
                                    </p>
                                    <div className="space-y-1.5 pt-1">
                                        <div className="flex items-center justify-between text-[9px] bg-white/80 px-2 py-1.5 rounded-lg border border-emerald-100">
                                            <span className="font-semibold text-slate-700">1. Estructurador de Oraciones y Sujetos</span>
                                            <span className="font-mono font-bold text-emerald-600">33%</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[9px] bg-white/80 px-2 py-1.5 rounded-lg border border-emerald-100">
                                            <span className="font-semibold text-slate-700">2. Aplanador Radical (Lista Blanca)</span>
                                            <span className="font-mono font-bold text-emerald-600">66%</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[9px] bg-white/80 px-2 py-1.5 rounded-lg border border-emerald-100">
                                            <span className="font-semibold text-slate-700">3. Costura de Puntuación Anti-Detector</span>
                                            <span className="font-mono font-bold text-emerald-600">100%</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            disabled={store.isHumanizing}
                            onClick={onHumanize}
                            className={`group flex items-center justify-center gap-2 w-full h-11 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 mt-2 ${
                                store.humanizerConfig.humanizerType === 'uniprompt'
                                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                                    : store.humanizerConfig.humanizerType === 'gramatical'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                                    : 'bg-black hover:bg-slate-800 shadow-slate-200'
                            }`}
                        >
                            {store.isHumanizing ? (
                                <>
                                    <Wand2 size={14} className="animate-pulse text-indigo-300" />
                                    <span>
                                        {store.humanizerConfig.humanizerType === 'uniprompt' ? 'Humanizando (Uniprompt)...' :
                                            store.humanizerConfig.humanizerType === 'gramatical' ? 'Humanizando (Gramatical)...' : 'Humanizando (Tradicional)...'}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Wand2 size={14} className="group-hover:rotate-12 transition-transform" />
                                    <span>
                                        {store.humanizerConfig.humanizerType === 'uniprompt' ? 'Humanización Uniprompt' :
                                            store.humanizerConfig.humanizerType === 'gramatical' ? 'Humanización Gramatical' : 'Humanización Tradicional'}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
