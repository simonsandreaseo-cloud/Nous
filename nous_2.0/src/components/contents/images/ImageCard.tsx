"use client";

import React, { useState } from 'react';
import { Download, RefreshCw, X, Check, MessageSquarePlus } from 'lucide-react';
import { GeneratedImage } from '@/types/images';
import saveAs from 'file-saver';

interface ImageCardProps {
    image: GeneratedImage;
    className?: string;
    onRegenerate?: (image: GeneratedImage, refinement?: string) => void;
    isRegenerating?: boolean;
    labels?: {
        regenerate: string;
        download: string;
        refinePlaceholder: string;
        cancel: string;
        submit: string;
    };
}

export const ImageCard: React.FC<ImageCardProps> = ({
    image,
    className = "",
    onRegenerate,
    isRegenerating,
    labels = {
        regenerate: "Regenerar",
        download: "Descargar",
        refinePlaceholder: "Instrucciones opcionales (ej., 'Hazlo azul')...",
        cancel: "Cancelar",
        submit: "Ir"
    }
}) => {
    const [showRefine, setShowRefine] = useState(false);
    const [refinement, setRefinement] = useState("");

    const handleDownload = () => {
        saveAs(image.url, image.filename);
    };

    const handleRegenerateClick = () => {
        setShowRefine(!showRefine);
    };

    const handleSubmitRegeneration = () => {
        if (onRegenerate) {
            onRegenerate(image, refinement);
            setShowRefine(false);
            setRefinement("");
        }
    };

    return (
        <div className={`group relative rounded-2xl overflow-hidden shadow-xl border border-slate-200/60 bg-white transition-all hover:shadow-2xl hover:border-emerald-500/30 ${className}`}>
            <div className="relative aspect-video lg:aspect-auto overflow-hidden bg-slate-100">
                <img
                    src={image.url}
                    alt={image.altText}
                    title={image.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Refinement Overlay */}
                {showRefine && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-20 p-6 flex flex-col justify-center animate-in fade-in zoom-in-95 duration-300">
                        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <MessageSquarePlus size={16} className="text-emerald-500" />
                            {labels.regenerate}
                        </h4>
                        <textarea
                            value={refinement}
                            onChange={(e) => setRefinement(e.target.value)}
                            placeholder={labels.refinePlaceholder}
                            className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 h-24 resize-none focus:ring-2 focus:ring-emerald-500 outline-none mb-4 text-slate-700 bg-slate-50/50"
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setShowRefine(false)}
                                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                {labels.cancel}
                            </button>
                            <button
                                onClick={handleSubmitRegeneration}
                                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg transition-all shadow-lg flex items-center gap-2"
                            >
                                {labels.submit} <Check size={12} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Action Overlay (Hidden when refining) */}
                {!showRefine && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-4">
                        <div className="flex justify-between items-start">
                            <div className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg">
                                {image.type === 'featured' ? 'Portada' : 'Imagen'}
                            </div>

                            {onRegenerate && (
                                <button
                                    onClick={handleRegenerateClick}
                                    disabled={isRegenerating}
                                    className="p-2.5 bg-white/90 text-emerald-600 rounded-xl hover:bg-white transition-all shadow-xl disabled:opacity-50 active:scale-95"
                                    title={labels.regenerate}
                                >
                                    <RefreshCw size={18} className={isRegenerating ? "animate-spin" : ""} />
                                </button>
                            )}
                        </div>

                        <div className="flex items-end justify-between gap-3">
                            <p className="text-white text-[10px] font-medium leading-relaxed line-clamp-2 flex-1 opacity-90 italic">
                                {image.prompt}
                            </p>
                            <button
                                onClick={handleDownload}
                                className="p-2.5 bg-white text-emerald-600 rounded-xl hover:bg-emerald-50 transition-all shadow-xl active:scale-95 text-xs font-bold"
                                title={labels.download}
                            >
                                <Download size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* SEO Info Footer */}
            <div className="p-4 bg-white border-t border-slate-100 space-y-2">
                <div className="flex items-start gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Título</span>
                    <span className="text-xs font-bold text-slate-700 line-clamp-1">{image.title}</span>
                </div>
                <div className="flex items-start gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Alt</span>
                    <span className="text-xs font-medium text-slate-600 line-clamp-1">{image.altText}</span>
                </div>
                <div className="flex items-start gap-3 pt-1 border-t border-slate-50">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Archivo</span>
                    <span className="text-[10px] font-mono text-emerald-600 font-bold truncate">{image.filename}</span>
                </div>
            </div>
        </div>
    );
};
