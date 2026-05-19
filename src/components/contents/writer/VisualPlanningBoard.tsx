'use client';

import React, { useState } from 'react';
import { useWriterStore } from '@/store/useWriterStore';
import { useShallow } from 'zustand/react/shallow';
import { 
    ImageIcon, 
    Maximize, 
    RefreshCcw, 
    Target, 
    Info, 
    Palette, 
    Layers,
    CheckCircle2,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/dom/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageAsset } from '@/types/images';
import { generateVisualPlanAction } from '@/lib/actions/imageActions';

interface VisualPlanningBoardProps {
    onRegenerate?: (assetId: string) => Promise<void>;
}

export default function VisualPlanningBoard({ onRegenerate }: VisualPlanningBoardProps) {
    const { 
        visualBlueprint, 
        projectId, 
        content,
        currentLanguage,
    } = useWriterStore(useShallow(state => ({
        visualBlueprint: state.visualBlueprint,
        projectId: state.projectId,
        content: state.content,
        currentLanguage: state.currentLanguage,
    })));

    const [isPlanning, setIsPlanning] = useState(false);

    const updateBlueprint = (updatedPlan: any) => {
        useWriterStore.getState().setVisualBlueprint?.(updatedPlan);
    };


    const updateBlueprint = (updatedPlan: any) => {
        (useWriterStore.getState() as any).setVisualBlueprint(updatedPlan);
    };


    if (!visualBlueprint) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4">
                <div className="p-6 rounded-full bg-slate-100 text-slate-400">
                    <ImageIcon size={48} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Sin Estrategia Visual</h3>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto">
                        El Director de Arte aún no ha planificado los activos para este artículo.
                    </p>
                </div>
                <Button 
                    variant="outline" 
                    className="rounded-xl font-black uppercase text-[10px] tracking-widest"
                    onClick={handleGeneratePlan}
                    disabled={isPlanning}
                >
                    {isPlanning ? (
                        <><Loader2 size={12} className="mr-2 animate-spin" /> Planificando...</>
                    ) : (
                        "Generar Plan Visual"
                    )}
                </Button>
            </div>
        );
    }

    const { featuredImage = {}, inlineImages = [] } = visualBlueprint || {};

    return (
        <div className="h-full flex flex-col gap-8 p-6 overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between shrink-to-0">
                <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Visual Blueprint</h2>
                    <p className="text-xs text-slate-500 font-medium">Estrategia de activos editoriales y conversión</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                        <Layers size={12} /> High Fidelity
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400">
                    <Maximize size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Activo Principal (Hero)</span>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm ring-1 ring-slate-100">
                    <div className="lg:col-span-5 relative aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 group">
                        {featuredImage?.url ? (
                            <img src={featuredImage.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Hero" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                                <ImageIcon size={32} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Esperando Generación</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
                             <Button 
                                variant="ghost" 
                                size="sm" 
                                className="bg-white text-slate-900 rounded-full shadow-xl hover:bg-indigo-50 transition-all"
                                onClick={() => onRegenerate?.(featuredImage?.id || 'hero')}
                            >
                                <RefreshCcw size={14} className="mr-2" /> Regenerar
                            </Button>
                        </div>
                    </div>
                    
                    <div className="lg:col-span-7 flex flex-col gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Target size={10} /> Prompt Estratégico
                            </label>
                            <textarea 
                                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none"
                                rows={3}
                                value={featuredImage?.prompt || ''}
                                onChange={(e) => {
                                    const newPlan = { ...visualBlueprint, featuredImage: { ...featuredImage, prompt: e.target.value } };
                                    updateBlueprint(newPlan);
                                }}
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Info size={10} /> Ancla Semántica
                                </label>
                                <input 
                                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium outline-none"
                                    value={featuredImage?.semanticAnchor || ''}
                                    onChange={(e) => {
                                        const newPlan = { ...visualBlueprint, featuredImage: { ...featuredImage, semanticAnchor: e.target.value } };
                                        updateBlueprint(newPlan);
                                    }}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Palette size={10} /> Rol Visual
                                </label>
                                <select 
                                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium outline-none"
                                    value={featuredImage?.role || 'hero'}
                                    onChange={(e) => {
                                        const newPlan = { ...visualBlueprint, featuredImage: { ...featuredImage, role: e.target.value } };
                                        updateBlueprint(newPlan);
                                    }}
                                >
                                    <option value="hero">Hero / Portada</option>
                                    <option value="product_showcase">Product Showcase</option>
                                    <option value="trust_signal">Trust Signal</option>
                                    <option value="feature_highlight">Feature Highlight</option>
                                    <option value="cta_background">CTA Background</option>
                                    <option value="info">Info / Icon</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* Body Assets */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400">
                    <Layers size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Activos de Cuerpo (Inline)</span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <AnimatePresence>
                        {inlineImages.map((img, idx) => (
                            <motion.div 
                                key={img.id || idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group p-4 rounded-2xl bg-white border border-slate-200 shadow-sm ring-1 ring-slate-100 flex flex-col md:flex-row gap-6 items-start"
                            >
                                <div className="w-full md:w-32 aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative group">
                                    {img.url ? (
                                        <img src={img.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Body Asset" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <ImageIcon size={24} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="bg-white text-slate-900 rounded-full shadow-xl"
                                            onClick={() => onRegenerate?.(img.id || `${idx}`)}
                                        >
                                            <RefreshCcw size={12} className="mr-1" /> Regen
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                            <Target size={10} /> Prompt
                                        </label>
                                        <input 
                                            className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium outline-none"
                                            value={img.prompt}
                                            onChange={(e) => {
                                                const newImages = [...inlineImages];
                                                newImages[idx] = { ...newImages[idx], prompt: e.target.value };
                                                const newPlan = { ...visualBlueprint, inlineImages: newImages };
                                                updateBlueprint(newPlan);
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                            <Info size={10} /> Ancla Semántica
                                        </label>
                                        <input 
                                            className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium outline-none"
                                            value={img.semanticAnchor}
                                            onChange={(e) => {
                                                const newImages = [...inlineImages];
                                                newImages[idx] = { ...newImages[idx], semanticAnchor: e.target.value };
                                                const newPlan = { ...visualBlueprint, inlineImages: newImages };
                                                updateBlueprint(newPlan);
                                            }}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </section>
        </div>
    );
}
