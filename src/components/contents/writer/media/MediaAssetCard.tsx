import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, Sparkles, Zap, Download, Trash2, Maximize2, X, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { ImageRowConfig, GeneratedImage } from '@/types/images';
import { AddAssetPlaceholder } from './AddAssetPlaceholder';

interface MediaAssetCardProps {
    row: ImageRowConfig;
    index: number;
    activeImage?: GeneratedImage; // If an image for this slot exists
    isGenerating: boolean;
    availableModels: { id: string, label: string }[];
    ratios: { id: string, label: string }[];
    onUpdateRow: (index: number, updates: Partial<ImageRowConfig>) => void;
    onGenerate: (index: number) => void;
    onEnhance: (index: number) => void;
    onDeleteImage: (index: number) => void;
    onDeleteRow?: (index: number) => void; // Optional for Portada
    onDownload: (url: string, title?: string) => void;
    onFullscreen: (img: GeneratedImage) => void;
    onDropUpload: (file: File, type: 'featured' | 'inline') => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'featured' | 'inline') => void;
}

export function MediaAssetCard({
    row, index, activeImage, isGenerating, 
    availableModels, ratios,
    onUpdateRow, onGenerate, onEnhance, onDeleteImage, onDeleteRow, onDownload, onFullscreen,
    onDropUpload, onFileUpload
}: MediaAssetCardProps) {
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    // Lite thumbnail for UI performance
    const getThumbUrl = (url?: string) => {
        if (!url) return undefined;
        return url.includes('pollinations.ai') 
            ? `${url}${url.includes('?') ? '&' : '?'}width=500&height=500&nologo=true`
            : url;
    };

    const hasImage = !!activeImage?.url || !!row.url;
    const displayUrl = getThumbUrl(activeImage?.url || row.url);
    const dbType = row.type === 'portada' ? 'featured' : 'inline';

    return (
        <div className="flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
            {/* Visual Header / Image Container */}
            <div className="relative aspect-video bg-slate-50 border-b border-slate-100 flex-shrink-0">
                {/* Badge */}
                <div className="absolute top-3 left-3 z-20">
                    <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
                        row.type === 'portada' 
                            ? "bg-slate-900 text-white" 
                            : "bg-emerald-100 text-emerald-800"
                    )}>
                        {row.type === 'portada' ? 'Portada' : 'Cuerpo'}
                    </span>
                </div>

                {hasImage ? (
                    <>
                        <img 
                            src={displayUrl} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            alt="Asset preview"
                            loading="lazy"
                        />
                        {/* Hover Overlay Actions */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px] z-10 gap-2">
                            <button 
                                onClick={() => activeImage && onFullscreen(activeImage)}
                                className="p-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 transition-all shadow-lg hover:scale-110"
                                title="Pantalla Completa"
                            >
                                <Maximize2 size={16} />
                            </button>
                            <button 
                                onClick={() => activeImage && onDownload(activeImage.url, activeImage.title)}
                                className="p-2.5 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-all hover:scale-110"
                                title="Descargar"
                            >
                                <Download size={16} />
                            </button>
                            <button 
                                onClick={() => onDeleteImage(index)}
                                className="p-2.5 rounded-xl bg-rose-500/80 text-white hover:bg-rose-600 transition-all shadow-lg hover:scale-110"
                                title="Eliminar Imagen"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </>
                ) : (
                    <AddAssetPlaceholder 
                        type={dbType} 
                        className="w-full h-full border-none rounded-none" 
                        onDropUpload={onDropUpload}
                        onFileUpload={onFileUpload}
                    />
                )}
            </div>

            {/* Content & Actions */}
            <div className="p-4 flex flex-col gap-4 flex-1">
                {/* Generation Primary Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={() => onGenerate(index)}
                        disabled={isGenerating}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        <Sparkles size={14} /> Generar
                    </button>
                    {hasImage && (
                        <button
                            onClick={() => onEnhance(index)}
                            disabled={isGenerating}
                            className="flex-1 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                            <Zap size={14} /> Mejorar
                        </button>
                    )}
                </div>

                <hr className="border-slate-100" />

                {/* Direct Mini-Prompt */}
                <div className="relative">
                    <input 
                        type="text"
                        value={row.miniPrompt || ''}
                        onChange={(e) => onUpdateRow(index, { miniPrompt: e.target.value })}
                        placeholder="Contexto específico (opcional)..."
                        className="w-full text-xs py-2 bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none text-slate-700 transition-colors"
                    />
                </div>

                <div className="flex items-center justify-between mt-auto pt-2">
                    <button
                        onClick={() => setIsConfigOpen(!isConfigOpen)}
                        className={cn(
                            "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-colors",
                            isConfigOpen ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <Settings2 size={14} />
                        Configurar
                    </button>

                    {row.type === 'cuerpo' && onDeleteRow && (
                        <button
                            onClick={() => onDeleteRow(index)}
                            className="text-slate-300 hover:text-rose-500 transition-colors"
                            title="Eliminar Slot"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Advanced Configuration Panel */}
            <AnimatePresence>
                {isConfigOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-slate-50 border-t border-slate-100 overflow-hidden"
                    >
                        <div className="p-4 grid grid-cols-2 gap-3">
                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Modelo</label>
                                <select 
                                    value={row.model}
                                    onChange={(e) => onUpdateRow(index, { model: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium outline-none focus:border-indigo-500"
                                >
                                    {availableModels.map(m => (
                                        <option key={m.id} value={m.id}>{m.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Ratio</label>
                                <select 
                                    value={row.ratio}
                                    onChange={(e) => onUpdateRow(index, { ratio: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium outline-none focus:border-indigo-500"
                                >
                                    {ratios.map(r => (
                                        <option key={r.id} value={r.id}>{r.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Resolución (px)</label>
                                <div className="flex items-center gap-1">
                                    <input 
                                        type="number"
                                        value={row.width}
                                        onChange={(e) => onUpdateRow(index, { width: parseInt(e.target.value) || 256 })}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs mt-0 text-center flex-1 outline-none focus:border-indigo-500"
                                    />
                                    <span className="text-slate-400 text-xs text-center flex-shrink-0 w-3">x</span>
                                    <input 
                                        type="number"
                                        value={row.height}
                                        onChange={(e) => onUpdateRow(index, { height: parseInt(e.target.value) || 256 })}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs mt-0 text-center flex-1 outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
