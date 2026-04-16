'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    Download, 
    Sparkles, 
    Trash2, 
    RefreshCcw, 
    Copy, 
    Check, 
    ChevronDown, 
    ChevronUp,
    Info,
    Image as ImageIcon,
    Anchor
} from 'lucide-react';
import { Dialog, Transition, TransitionChild, DialogPanel } from '@headlessui/react';
import { saveAs } from 'file-saver';
import { cn } from '@/utils/cn';
import { ImageAsset } from '@/types/images';

interface ImageLightboxProps {
    isOpen: boolean;
    onClose: () => void;
    asset?: ImageAsset | null;
    onDelete?: (id: string, storagePath?: string) => void;
    onRegenerate?: (id: string) => Promise<void>;
    isRegenerating?: boolean;
}

export default function ImageLightbox({ 
    isOpen, 
    onClose, 
    asset,
    onDelete,
    onRegenerate,
    isRegenerating
}: ImageLightboxProps) {
    const [showMetadata, setShowMetadata] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [fullUrl, setFullUrl] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && asset?.url) {
            setFullUrl(asset.url);
        } else {
            setFullUrl(null);
            setShowMetadata(false);
        }
    }, [isOpen, asset]);

    if (!asset && isOpen) return null;

    const handleDownload = () => {
        if (asset?.url) {
            saveAs(asset.url, `${asset.title || 'nous-asset'}.jpg`);
        }
    };

    const copyToClipboard = async (text: string, fieldId: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(fieldId);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const handleDelete = () => {
        if (asset && window.confirm("¿Estás seguro de que deseas eliminar este activo permanentemente?")) {
            onDelete?.(asset.id, asset.storagePath);
            onClose();
        }
    };

    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog onClose={onClose} className="relative z-[999]">
                <TransitionChild
                    as={motion.div}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl" 
                />

                <div className="fixed inset-0 overflow-hidden">
                    <div className="flex min-h-full items-center justify-center p-4 md:p-8">
                        <TransitionChild
                            as={DialogPanel}
                            className="w-full max-w-[95vw] lg:max-w-7xl h-auto max-h-[95vh] lg:max-h-[90vh]"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                                className="relative w-full h-full rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-black shadow-2xl border border-white/5 flex flex-col"
                            >
                                {/* TOP PREMIUM BAR */}
                                <div className="absolute top-0 left-0 right-0 p-6 md:p-8 flex items-center justify-between z-40 bg-gradient-to-b from-black/95 to-transparent">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-600/20 backdrop-blur-xl rounded-2xl border border-indigo-500/30 text-indigo-400">
                                            <Sparkles size={20} className={cn(isRegenerating && "animate-spin")} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white uppercase tracking-tighter">
                                                {asset?.role === 'hero' ? 'Portada Magistral' : (asset?.title || 'Activo Editorial')}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-black uppercase text-white/40 tracking-[0.3em]">Master Engine V3</span>
                                                <span className="text-[8px] text-indigo-500/50">|</span>
                                                <span className="text-[8px] font-mono text-indigo-400/60 uppercase">{asset?.id.slice(0, 8)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-2xl border border-white/10">
                                            <button 
                                                onClick={() => asset && onRegenerate?.(asset.id)}
                                                className="p-3 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl transition-all"
                                                title="Regenerar"
                                            >
                                                <RefreshCcw size={18} className={cn(isRegenerating && "animate-spin")} />
                                            </button>
                                            <button onClick={handleDownload} className="p-3 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl transition-all" title="Descargar">
                                                <Download size={18} />
                                            </button>
                                            <button onClick={handleDelete} className="p-3 hover:bg-rose-600 text-rose-500 hover:text-white rounded-xl transition-all" title="Eliminar">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                        <button onClick={onClose} className="p-4 bg-white/10 rounded-2xl text-white hover:bg-white hover:text-black transition-all">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* MAIN VISUAL */}
                                <div className="flex-1 flex items-center justify-center p-8 bg-zinc-950/20">
                                    {fullUrl ? (
                                        <motion.img 
                                            layoutId={`img-${asset?.id}`}
                                            src={fullUrl} 
                                            alt={asset?.alt} 
                                            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                                        />
                                    ) : (
                                        <div className="animate-pulse text-white/20 font-black uppercase text-[10px] tracking-[0.5em]">
                                            Rendering Neural Asset...
                                        </div>
                                    )}
                                </div>

                                {/* METADATA PANEL */}
                                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 pointer-events-none">
                                    <div className="max-w-3xl mx-auto pointer-events-auto">
                                        <div className={cn(
                                            "bg-slate-950/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden transition-all duration-500 shadow-2xl",
                                            showMetadata ? "max-h-[400px]" : "max-h-[60px]"
                                        )}>
                                            <div 
                                                onClick={() => setShowMetadata(!showMetadata)}
                                                className="h-[60px] px-8 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Info size={14} className="text-indigo-400" />
                                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/60">ADN del Activo</span>
                                                </div>
                                                {showMetadata ? <ChevronDown size={14} className="text-white/40" /> : <ChevronUp size={14} className="text-white/40" />}
                                            </div>

                                            <div className="p-8 pt-0 space-y-6 overflow-y-auto max-h-[300px] custom-scrollbar">
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Concepto Semántico</span>
                                                        <button 
                                                            onClick={() => copyToClipboard(asset?.prompt || '', 'prompt')}
                                                            className="text-[8px] font-black uppercase text-white/20 hover:text-white transition-colors"
                                                        >
                                                            {copiedField === 'prompt' ? 'Copiado' : 'Copiar Prompt'}
                                                        </button>
                                                    </div>
                                                    <div className="p-5 bg-black/40 rounded-2xl border border-white/5 text-xs text-white/80 leading-relaxed italic">
                                                        &quot;{asset?.prompt}&quot;
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    {asset?.positioning.semanticAnchor && (
                                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Anchor size={10} className="text-indigo-400" />
                                                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Anclaje</span>
                                                            </div>
                                                            <p className="text-[10px] text-white/70 font-medium italic">&quot;{asset.positioning.semanticAnchor}&quot;</p>
                                                        </div>
                                                    )}
                                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <ImageIcon size={10} className="text-indigo-400" />
                                                            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Resolución</span>
                                                        </div>
                                                        <p className="text-[10px] text-white/70 font-bold">{asset?.design.pixelDimensions?.w || 1024} x {asset?.design.pixelDimensions?.h || 576} px</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
