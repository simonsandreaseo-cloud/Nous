'use client';

import React, { useState, memo, useCallback } from 'react';
import { 
    Sparkles, 
    Download, 
    Trash2, 
    Maximize2, 
    ChevronDown, 
    ChevronUp, 
    Plus, 
    Zap,
    Settings2,
    Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { ImageRowConfig } from '@/types/images';
import { AVAILABLE_MODELS, RATIOS } from './constants';

interface AssetCardProps {
    row: ImageRowConfig;
    index: number;
    onUpdate: (index: number, updates: Partial<ImageRowConfig>) => void;
    onGenerate: (index: number) => Promise<void>;
    onUpload: (index: number, file: File) => Promise<void>;
    onDelete: (index: number) => Promise<void>;
    onEnhance: (index: number) => Promise<void>;
    onFullscreen: (img: any) => void;
    onDownload: (url: string, title?: string) => void;
}

export const AssetCard = memo(({ 
    row, 
    index, 
    onUpdate, 
    onGenerate, 
    onUpload, 
    onDelete, 
    onEnhance, 
    onFullscreen, 
    onDownload 
}: AssetCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isOver, setIsOver] = useState(false);

    const handleDimensionChange = useCallback((field: 'width' | 'height', value: number) => {
        const updates: Partial<ImageRowConfig> = { [field]: value };
        if (row.ratio !== 'custom' && row.ratio !== 'auto') {
            const [w, h] = row.ratio.split(':').map(Number);
            if (field === 'width') updates.height = Math.round((value * h) / w);
            else updates.width = Math.round((value * w) / h);
        }
        onUpdate(index, updates);
    }, [row.ratio, index, onUpdate]);

    const handleRatioChange = useCallback((newRatio: string) => {
        const updates: Partial<ImageRowConfig> = { ratio: newRatio as any };
        if (newRatio !== 'custom' && newRatio !== 'auto') {
            const [w, h] = newRatio.split(':').map(Number);
            updates.height = Math.round((row.width * h) / w);
        }
        onUpdate(index, updates);
    }, [row.width, index, onUpdate]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onUpload(index, file);
    };

    return (
        <motion.div 
            layout
            className={cn(
                "group relative flex flex-col rounded-2xl border transition-all duration-200",
                row.type === 'portada' ? "bg-indigo-50/30 border-indigo-200" : "bg-white border-slate-200",
                "hover:border-indigo-300 shadow-sm"
            )}
        >
            {/* Slim Row: Main Content */}
            <div className="p-2 flex items-center gap-3">
                {/* Mini Thumbnail */}
                <div 
                    className={cn(
                        "relative rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 transition-all duration-300",
                        row.type === 'portada' ? "w-12 h-12" : "w-12 h-8",
                        isOver && "ring-2 ring-indigo-500 scale-105"
                    )}
                    draggable
                    onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
                    onDragLeave={() => setIsOver(false)}
                    onDrop={handleDrop}
                >
                    {row.url ? (
                        <>
                            <img src={row.url} className="w-full h-full object-cover" alt="Asset preview" />
                            <button 
                                onClick={() => onFullscreen({ url: row.url })}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                title="Ver completa"
                            >
                                <Maximize2 size={12} />
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e: any) => { if (e.target.files?.[0]) onUpload(index, e.target.files[0]); };
                                input.click();
                            }}
                            className="w-full h-full flex items-center justify-center text-slate-400 hover:text-indigo-500"
                        >
                            <Plus size={14} />
                        </button>
                    )}
                </div>

                {/* Info & Fast Edit */}
                <div className="flex-1 flex flex-col min-w-0 gap-1">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <span className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] font-black uppercase border",
                                row.type === 'portada' ? "bg-indigo-600 text-white border-indigo-500" : "bg-slate-100 text-slate-500 border-slate-200"
                            )}>
                                {row.type === 'portada' ? 'Hero' : 'Body'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 truncate uppercase tracking-tighter">
                                {row.type === 'portada' ? 'Imagen Principal' : `Activo ${index}`}
                            </span>
                        </div>
                        <button 
                            onClick={() => onGenerate(index)}
                            className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all shadow-sm"
                            title="Generar"
                        >
                            <Zap size={12} />
                        </button>
                    </div>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={row.miniPrompt} 
                            onChange={(e) => onUpdate(index, { miniPrompt: e.target.value })}
                            placeholder="Prompt rápido..."
                            className="w-full bg-transparent border-b border-slate-100 py-0 text-[11px] font-medium text-slate-600 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300"
                        />
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-1 shrink-0">
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={cn("p-1.5 rounded-lg transition-all", isExpanded ? "bg-indigo-100 text-indigo-600" : "text-slate-400 hover:bg-slate-100")}
                    >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button 
                        onClick={() => onDelete(index)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        title="Eliminar"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* DNA Panel - Compact Expanded Row */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-slate-100"
                    >
                        <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/50 rounded-b-2xl">
                            {/* Modelo */}
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase">Modelo</label>
                                <select 
                                    value={row.model} 
                                    onChange={(e) => onUpdate(index, { model: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:ring-1 ring-indigo-500"
                                >
                                    {AVAILABLE_MODELS.map(m => (
                                        <option key={m.id} value={m.id}>{m.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Ratio */}
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase">Proporción</label>
                                <select 
                                    value={row.ratio} 
                                    onChange={(e) => handleRatioChange(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:ring-1 ring-indigo-500"
                                >
                                    {RATIOS.map(r => (
                                        <option key={r.id} value={r.id}>{r.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Width */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-[8px] font-black text-slate-400 uppercase">W</label>
                                    {row.ratio !== 'custom' && row.ratio !== 'auto' && <Lock size={8} className="text-slate-300" />}
                                </div>
                                <input 
                                    type="number" 
                                    value={row.width} 
                                    onChange={(e) => handleDimensionChange('width', parseInt(e.target.value) || 0)}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:ring-1 ring-indigo-500"
                                />
                            </div>

                            {/* Height */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-[8px] font-black text-slate-400 uppercase">H</label>
                                    {row.ratio !== 'custom' && row.ratio !== 'auto' && <Lock size={8} className="text-slate-300" />}
                                </div>
                                <input 
                                    type="number" 
                                    value={row.height} 
                                    onChange={(e) => handleDimensionChange('height', parseInt(e.target.value) || 0)}
                                    className={cn(
                                        "w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:ring-1 ring-indigo-500",
                                        row.ratio !== 'custom' && row.ratio !== 'auto' && "bg-slate-50 text-slate-400 cursor-not-allowed"
                                    )}
                                    disabled={row.ratio !== 'custom' && row.ratio !== 'auto'}
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
