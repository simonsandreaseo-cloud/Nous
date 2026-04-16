'use client';

import React, { useState, memo, useCallback } from 'react';
import { 
    Sparkles, 
    Trash2, 
    Maximize2, 
    ChevronDown, 
    ChevronUp, 
    Plus, 
    Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { ImageAsset } from '@/types/images';
import { AVAILABLE_MODELS, RATIOS } from './constants';
import { getThumbnailUrl } from '@/utils/images';

interface AssetCardProps {
    asset: ImageAsset;
    isSelected: boolean;
    onSelect: () => void;
    onUpdate: (id: string, updates: Partial<ImageAsset>) => void;
    onGenerate: (id: string) => Promise<void>;
    onUpload: (id: string, file: File) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onFullscreen: (img: any) => void;
    onDownload: (url: string, title?: string) => void;
}

export const AssetCard = memo(({ 
    asset, 
    isSelected,
    onSelect,
    onUpdate, 
    onGenerate, 
    onUpload, 
    onDelete, 
    onFullscreen, 
    onDownload 
}: AssetCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isOver, setIsOver] = useState(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onUpload(asset.id, file);
    };

    return (
        <motion.div 
            layout
            onClick={onSelect}
            className={cn(
                "group relative flex flex-col rounded-2xl border transition-all duration-200 cursor-pointer",
                asset.role === 'hero' ? "bg-indigo-50/30 border-indigo-200" : "bg-white border-slate-200",
                isSelected ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-md" : "hover:border-indigo-300 shadow-sm"
            )}
        >
            {/* ROW COMPACTO: CONTENIDO PRINCIPAL */}
            <div className="p-2 flex items-center gap-3">
                {/* Miniatura */}
                <div 
                    className={cn(
                        "relative rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 transition-all duration-300 w-12 h-12",
                        isOver && "ring-2 ring-indigo-500 scale-105"
                    )}
                    onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
                    onDragLeave={() => setIsOver(false)}
                    onDrop={handleDrop}
                >
                    {asset.url ? (
                        <>
                            <img 
                                src={getThumbnailUrl(asset.url, 100)} 
                                className="w-full h-full object-cover" 
                                alt="Asset preview" 
                            />
                            <button 
                                onClick={(e) => { e.stopPropagation(); onFullscreen(asset); }}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                            >
                                <Maximize2 size={12} />
                            </button>
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                            {asset.status === 'pending' ? <Sparkles size={14} className="animate-pulse" /> : <Plus size={14} />}
                        </div>
                    )}
                </div>

                {/* Info & Prompt */}
                <div className="flex-1 flex flex-col min-w-0 gap-1">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <span className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] font-black uppercase border",
                                asset.role === 'hero' ? "bg-indigo-600 text-white border-indigo-500" : "bg-slate-100 text-slate-500 border-slate-200"
                            )}>
                                {asset.role}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 truncate uppercase tracking-tighter">
                                {asset.title || `Activo ${asset.id.slice(-4)}`}
                            </span>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onGenerate(asset.id); }}
                            className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all shadow-sm"
                        >
                            <Zap size={12} />
                        </button>
                    </div>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={asset.prompt} 
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => onUpdate(asset.id, { prompt: e.target.value })}
                            placeholder="Prompt rápido..."
                            className="w-full bg-transparent border-b border-slate-100 py-0 text-[11px] font-medium text-slate-600 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300"
                        />
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 shrink-0">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className={cn("p-1.5 rounded-lg transition-all", isExpanded ? "bg-indigo-100 text-indigo-600" : "text-slate-400 hover:bg-slate-100")}
                    >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* PANEL DE ADN - Expandido */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-3 grid grid-cols-2 gap-3 bg-slate-50/50 rounded-b-2xl">
                            {/* Alineación */}
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase">Alineación</label>
                                <select 
                                    value={asset.design.align}
                                    onChange={(e) => onUpdate(asset.id, { design: { ...asset.design, align: e.target.value as any } })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 outline-none"
                                >
                                    <option value="left">Izquierda</option>
                                    <option value="center">Centro</option>
                                    <option value="right">Derecha</option>
                                    <option value="full">Total</option>
                                </select>
                            </div>

                            {/* Wrapping */}
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase">Ajuste de Texto</label>
                                <select 
                                    value={asset.design.wrapping}
                                    onChange={(e) => onUpdate(asset.id, { design: { ...asset.design, wrapping: e.target.value as any } })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 outline-none"
                                >
                                    <option value="break">Separar</option>
                                    <option value="wrap">Envolver</option>
                                    <option value="inline">Intercalar</option>
                                </select>
                            </div>

                             {/* Ancho */}
                            <div className="space-y-1 col-span-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase">Ancho Tiptap</label>
                                <input 
                                    type="text" 
                                    value={asset.design.width} 
                                    onChange={(e) => onUpdate(asset.id, { design: { ...asset.design, width: e.target.value } })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 outline-none"
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});

AssetCard.displayName = 'AssetCard';
