'use client';

import { 
    Sparkles, Wand2, Calculator, Settings2, Plus, Trash2, 
    ChevronRight, ChevronDown, Rocket, History, Share2, 
    BrainCircuit, Info, LayoutTemplate, MessageSquareMore, 
    FileSearch, Microscope, Search, SearchCode, Database, 
    MonitorSmartphone, ExternalLink, Lightbulb, ImagePlus, 
    FileText, Save, CloudUpload
} from 'lucide-react';
import { useWriterStore } from '@/store/useWriterStore';
import { SectionLabel } from './SidebarCommon';
import React from 'react';

export function GenerateTab({ 
    onGenerate, 
    onHumanize, 
    isLoading 
}: { 
    onGenerate: () => void; 
    onHumanize: () => void; 
    isLoading: boolean;
}) {
    const store = useWriterStore();

    return (
        <div className="space-y-6 pt-2">
            {/* Outline Strategy Section */}
            <div className="space-y-4">
                <SectionLabel>Estrategia de Estructura</SectionLabel>
                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">H1 & Título SEO</label>
                        <input 
                            type="text" 
                            className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400 font-medium"
                            placeholder="Título principal del artículo..."
                            value={store.strategyH1 || store.keyword}
                            onChange={(e) => store.setStrategyH1(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Tono de Voz</label>
                            <select 
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400 font-medium"
                                value={store.strategyTone}
                                onChange={(e) => store.setStrategyTone(e.target.value)}
                            >
                                <option value="Profesional">Profesional</option>
                                <option value="Informativo">Informativo</option>
                                <option value="Persuasivo">Persuasivo</option>
                                <option value="Cercano">Cercano</option>
                                <option value="Crítico">Crítico</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Palabras</label>
                            <select 
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400 font-medium"
                                value={store.strategyWordCount}
                                onChange={(e) => store.setStrategyWordCount(e.target.value)}
                            >
                                <option value="800">~ 800 (Corto)</option>
                                <option value="1500">~ 1500 (E estándar)</option>
                                <option value="2500">~ 2500 (Pilar)</option>
                                <option value="4000">~ 4000 (Mega Guía)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Kreativity Level */}
            <div className="p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-3">
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
                    className="group relative w-full h-11 bg-indigo-600 hover:bg-black text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-lg shadow-indigo-200 hover:shadow-black/20 active:scale-95"
                >
                    <div className="absolute inset-0 flex items-center justify-center gap-2 group-hover:-translate-y-full transition-transform">
                        <Sparkles size={14} className={isLoading ? 'animate-spin' : 'animate-pulse'} />
                        {isLoading ? 'Redactando...' : 'Generar Artículo'}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center gap-2 translate-y-full group-hover:translate-y-0 transition-transform">
                        <Rocket size={14} />
                        Lanzar Redacción
                    </div>
                </button>

                {store.content && !isLoading && (
                    <button
                        disabled={store.isHumanizing}
                        onClick={onHumanize}
                        className="group flex items-center justify-center gap-2 w-full h-11 bg-black hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
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
