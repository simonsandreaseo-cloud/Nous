'use client';

import { Wand2, Calculator, Settings2, Trash2, BrainCircuit, Share2, Save, CloudUpload } from 'lucide-react';
import { useWriterStore } from '@/store/useWriterStore';
import { SectionLabel } from './SidebarCommon';
import React from 'react';

export function AssistantTab({ onRefine, isRefining }: { onRefine: () => void; isRefining: boolean }) {
    const store = useWriterStore();

    return (
        <div className="space-y-6 pt-2">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <SectionLabel>Editor Inteligente</SectionLabel>
                    <BrainCircuit size={12} className="text-indigo-400" />
                </div>
                
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Instrucciones de Refinamiento</label>
                    <textarea 
                        className="w-full text-xs p-3.5 bg-white border-2 border-slate-100 rounded-md outline-none focus:border-indigo-400 font-medium min-h-[140px] resize-none transition-all shadow-sm placeholder:text-slate-300"
                        placeholder="Ej: Haz el texto más persuasivo, añade una tabla comparativa de beneficios o resume el primer párrafo..."
                        value={store.refinementInstructions}
                        onChange={(e) => store.setRefinementInstructions(e.target.value)}
                    />
                </div>

                <button
                    disabled={isRefining || !store.refinementInstructions}
                    onClick={onRefine}
                    className="group relative w-full h-11 bg-white border-2 border-black text-black hover:bg-black hover:text-white text-[11px] font-black uppercase tracking-widest rounded-md transition-all flex items-center justify-center gap-2 overflow-hidden active:scale-95 disabled:opacity-50"
                >
                    {isRefining ? (
                        <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>Editando...</span>
                        </>
                    ) : (
                        <>
                            <Wand2 size={14} className="group-hover:rotate-12 transition-transform" />
                            <span>Aplicar Refinamiento AI</span>
                        </>
                    )}
                </button>
            </div>
            {/* Quick Actions Card */}
            <div className="p-4 bg-slate-900 rounded-lg text-white space-y-4 shadow-xl shadow-slate-200">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Acciones Pro</h4>
                    <Settings2 size={12} className="opacity-60" />
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-1">
                    <button 
                        onClick={() => store.setContent('')}
                        className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-md transition-colors border border-white/5 active:scale-95"
                    >
                        <Trash2 size={14} className="text-rose-400" />
                        <span className="text-[9px] font-bold uppercase">Limpiar</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-md transition-colors border border-white/5 active:scale-95">
                        <Calculator size={14} className="text-indigo-400" />
                        <span className="text-[9px] font-bold uppercase">Métricas</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-md transition-colors border border-white/5 active:scale-95">
                        <Share2 size={14} className="text-amber-400" />
                        <span className="text-[9px] font-bold uppercase">Compartir</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 p-3 bg-indigo-500 hover:bg-indigo-600 rounded-md transition-colors border border-white/10 active:scale-95 shadow-lg shadow-indigo-900/40">
                        <CloudUpload size={14} className="text-white" />
                        <span className="text-[9px] font-bold uppercase">Borrador</span>
                    </button>
                </div>
            </div>

            {/* AI Engine Configuration */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between px-1">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Motor de Inteligencia</span>
                        <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest transition-all",
                            store.researchMode === 'rapid' ? "text-emerald-600" : "text-indigo-600"
                        )}>
                            {store.researchMode === 'rapid' ? '⚡ Rápido (Gemini 3.1)' : '💎 Alta Calidad (Gemma 3)'}
                        </span>
                    </div>
                    <button 
                        onClick={() => store.setResearchMode(store.researchMode === 'rapid' ? 'quality' : 'rapid')}
                        className={cn(
                            "w-10 h-5 rounded-full transition-all duration-300 relative shrink-0",
                            store.researchMode === 'quality' ? "bg-indigo-500" : "bg-emerald-500"
                        )}
                    >
                        <div className={cn(
                            "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                            store.researchMode === 'quality' ? "left-5.5" : "left-0.5"
                        )} />
                    </button>
                </div>
                <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                    Aplicado a redacción, outlines y humanización. Rotación automática y respaldo 2.5 Flash.
                </p>
            </div>
        </div>
    );
}

import { cn } from '@/utils/cn';
import { RefreshCw } from 'lucide-react';
