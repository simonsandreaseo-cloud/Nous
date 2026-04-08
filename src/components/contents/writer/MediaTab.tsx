
'use client';

import { ImagePlus, Info, Rocket, Sparkles, LayoutPanelLeft, Plus, Trash2, Wand2 } from 'lucide-react';
import { useWriterStore } from '@/store/useWriterStore';
import { SectionLabel } from './SidebarCommon';
import React, { useState } from 'react';
import { Button } from '@/components/dom/Button';
import { motion, AnimatePresence } from 'framer-motion';

export function MediaTab() {
    const store = useWriterStore();
    const [isGenerating, setIsGenerating] = useState(false);
    const [prompt, setPrompt] = useState(store.keyword || '');

    const handleGenerateImage = async () => {
        // This is a direct shortcut to ImageGenerator/Imagenesia logic if we want,
        // but for now let's keep it simple as a reminder that Imagenesia is available.
        window.alert("Usa el módulo de Imagenesia para generar lotes inteligentes de alta calidad. Esta pestaña pronto permitirá generación rápida individual.");
    };

    const handleInsertImage = (url: string, alt: string) => {
        if (!store.editor) return;
        store.editor.chain().focus().setImage({ src: url, alt }).run();
    };

    const handleAutoLayout = () => {
        if (!store.editor || store.taskImages.length === 0) return;

        const inlineImages = store.taskImages.filter(img => img.type === 'inline' && img.paragraph_index !== null);
        
        // Sort by paragraph index
        const sortedImages = [...inlineImages].sort((a, b) => a.paragraph_index - b.paragraph_index);

        // This is complex because inserting content changes indices.
        // We'll insert from bottom to top or use a better strategy.
        // For simplicity, let's just append or insert at approximate positions.
        
        store.setStatus("Maquetando imágenes automáticamente...");
        
        // Better strategy: Insert one by one
        // We can find all top-level nodes (paragraphs) and insert after the matching index
        const { state } = store.editor;
        let imagesInserted = 0;

        sortedImages.forEach(img => {
            // Find the nth paragraph
            let count = 0;
            let posToInsert = -1;
            
            state.doc.descendants((node, pos) => {
                if (node.type.name === 'paragraph') {
                    if (count === img.paragraph_index) {
                        posToInsert = pos + node.nodeSize;
                        return false; // stop iteration
                    }
                    count++;
                }
                return true;
            });

            if (posToInsert !== -1) {
                store.editor.commands.insertContentAt(posToInsert, {
                    type: 'image',
                    attrs: { src: img.url, alt: img.alt_text || '' }
                });
                imagesInserted++;
            }
        });

        store.setStatus(`✅ ${imagesInserted} imágenes maquetadas.`);
    };

    return (
        <div className="space-y-6 pt-2">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <SectionLabel>Media Studio</SectionLabel>
                    <ImagePlus size={12} className="text-indigo-400" />
                </div>

                {store.taskImages.length > 0 && (
                    <Button
                        onClick={handleAutoLayout}
                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                    >
                        <Wand2 size={14} />
                        <span>Auto-Maquetar Artículo</span>
                    </Button>
                )}

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Generador Rápido</label>
                    <textarea
                        className="w-full text-xs p-3.5 bg-white border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-400 font-medium min-h-[100px] resize-none transition-all shadow-sm placeholder:text-slate-300"
                        placeholder="Usa Imagenesia para lotes completos..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                </div>

                <Button
                    disabled={true} // Disabled to encourage Imagenesia use for now
                    onClick={handleGenerateImage}
                    className="w-full h-11 bg-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-xl cursor-not-allowed"
                >
                    <Sparkles size={14} />
                    <span>Usar Imagenesia Module</span>
                </Button>
            </div>

            <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-4 shadow-xl shadow-slate-200">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                        <LayoutPanelLeft size={12} />
                        Galería del Proyecto
                    </h4>
                    <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded-full font-bold">{store.taskImages.length}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[400px] custom-scrollbar pr-1">
                    <AnimatePresence>
                        {store.taskImages.map((img) => (
                            <motion.div 
                                key={img.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="group relative aspect-square rounded-xl overflow-hidden bg-slate-800 border border-white/5"
                            >
                                <img 
                                    src={img.url} 
                                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                    alt={img.alt_text}
                                />
                                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                    <button 
                                        onClick={() => handleInsertImage(img.url, img.alt_text)}
                                        className="p-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
                                        title="Insertar en editor"
                                    >
                                        <Plus size={16} />
                                    </button>
                                    <button className="p-2 bg-rose-600 rounded-lg hover:bg-rose-500 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="absolute bottom-1 right-1">
                                    <span className="text-[7px] font-black uppercase px-1 bg-black/60 rounded backdrop-blur-sm">
                                        {img.type === 'featured' ? 'Portada' : `P. ${img.paragraph_index}`}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {store.taskImages.length === 0 && (
                    <div className="text-center py-6 text-slate-500 text-xs font-medium">
                        No hay imágenes generadas aún.<br/>
                        Genera algunas en Imagenesia.
                    </div>
                )}
            </div>
        </div>
    );
}
