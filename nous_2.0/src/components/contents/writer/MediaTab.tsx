'use client';

import { ImagePlus, Info, Rocket, Sparkles } from 'lucide-react';
import { useWriterStore } from '@/store/useWriterStore';
import { SectionLabel } from './SidebarCommon';
import React, { useState } from 'react';
import { Button } from '@/components/dom/Button';

export function MediaTab() {
    const store = useWriterStore();
    const [isGenerating, setIsGenerating] = useState(false);
    const [prompt, setPrompt] = useState(store.keyword || '');

    const handleGenerateImage = async () => {
        setIsGenerating(true);
        store.setStatus('Generando imagen con IA...');
        try {
            // Placeholder for real image generation logic
            await new Promise(resolve => setTimeout(resolve, 2000));
            store.setStatus('✅ Imagen generada (Simulación)');
        } catch (error) {
            console.error(error);
            store.setStatus('❌ Error al generar imagen');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6 pt-2">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <SectionLabel>Media Studio</SectionLabel>
                    <ImagePlus size={12} className="text-indigo-400" />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Prompt para la imagen</label>
                    <textarea
                        className="w-full text-xs p-3.5 bg-white border-2 border-slate-100 rounded-md outline-none focus:border-indigo-400 font-medium min-h-[140px] resize-none transition-all shadow-sm placeholder:text-slate-300"
                        placeholder="Describe la imagen que deseas generar..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                </div>

                <div className="p-4 bg-slate-50/50 rounded-md border border-dashed border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-bold uppercase">Estilo Visual</span>
                        <Info size={12} />
                    </div>
                    <select className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400 font-medium">
                        <option value="photorealistic">Fotorrealista</option>
                        <option value="illustration">Ilustración Vectorial</option>
                        <option value="3d">Render 3D</option>
                        <option value="watercolor">Acuarela</option>
                    </select>
                </div>

                <Button
                    disabled={isGenerating || !prompt}
                    onClick={handleGenerateImage}
                    className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-widest rounded-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                    {isGenerating ? (
                        <>
                            <Sparkles size={14} className="animate-spin" />
                            <span>Generando...</span>
                        </>
                    ) : (
                        <>
                            <Rocket size={14} />
                            <span>Crear Imagen AI</span>
                        </>
                    )}
                </Button>
            </div>

            <div className="p-4 bg-slate-900 rounded-lg text-white space-y-4 shadow-xl shadow-slate-200">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Galería</h4>
                </div>
                <div className="text-center py-6 text-slate-400 text-xs font-medium">
                    No hay imágenes generadas aún.
                </div>
            </div>
        </div>
    );
}
