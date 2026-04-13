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
    Image as ImageIcon
} from 'lucide-react';
import { Dialog, Transition, TransitionChild, DialogPanel } from '@headlessui/react';
import { saveAs } from 'file-saver';
import { cn } from '@/utils/cn';

interface ImageLightboxProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    title?: string;
    alt?: string;
    prompt?: string;
    assetId?: string;
    onDelete?: () => void;
    onRegenerate?: (e: any) => Promise<void>;
    isRegenerating?: boolean;
}

export default function ImageLightbox({ 
    isOpen, 
    onClose, 
    url, 
    title, 
    alt, 
    prompt, 
    assetId,
    onDelete,
    onRegenerate,
    isRegenerating
}: ImageLightboxProps) {
    const [showMetadata, setShowMetadata] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [fullUrl, setFullUrl] = useState<string | null>(null);

    // Memory optimization: Load full URL only when open and clear when closed
    useEffect(() => {
        if (isOpen) {
            setFullUrl(url);
        } else {
            setFullUrl(null);
            setShowMetadata(false);
        }
    }, [isOpen, url]);

    const handleDownload = () => {
        saveAs(url, `${title || 'nous-asset'}.jpg`);
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
        if (window.confirm("¿Estás seguro de que deseas eliminar este activo permanentemente?")) {
            onDelete?.();
            onClose();
        }
    };

    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog 
                onClose={onClose} 
                className="relative z-[999]"
            >
                {/* BACKDROP */}
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
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="relative w-full h-full rounded-[1.5rem] md:rounded-[3rem] overflow-hidden bg-black shadow-[0_0_120px_rgba(0,0,0,0.8)] border border-white/5 flex flex-col"
                            >
                                {/* HEADER - PREMIUM BAR */}
                                <div className="absolute top-0 left-0 right-0 p-4 md:p-8 flex items-center justify-between z-40 bg-gradient-to-b from-black/95 via-black/60 to-transparent">
                                    <div className="flex items-center gap-5">
                                        <div className="p-3.5 bg-indigo-600/20 backdrop-blur-xl rounded-2xl border border-indigo-500/30 text-indigo-400 shadow-lg shadow-indigo-500/10">
                                            <Sparkles size={22} className={cn(isRegenerating && "animate-spin")} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white tracking-tight leading-none mb-1.5">{title || 'Nous Asset Engine'}</h3>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] uppercase font-black tracking-[0.25em] text-white/40">Master Render</span>
                                                <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                                                <span className="text-[9px] font-black uppercase text-indigo-400/60 tracking-widest">{assetId?.split('_')[0] || 'Original'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MAIN ACTIONS */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 p-1.5 bg-white/5 backdrop-blur-3xl rounded-2xl border border-white/10 mr-4">
                                            <button 
                                                onClick={(e) => onRegenerate?.(e)}
                                                disabled={isRegenerating}
                                                className={cn(
                                                    "p-3 rounded-xl transition-all hover:scale-105 active:scale-95 group",
                                                    isRegenerating ? "bg-indigo-600 text-white animate-pulse" : "bg-white/5 text-indigo-400 hover:bg-indigo-600 hover:text-white"
                                                )}
                                                title="Regenerar con IA"
                                            >
                                                <RefreshCcw size={18} className={cn(isRegenerating && "animate-spin")} />
                                            </button>
                                            <button 
                                                onClick={handleDownload}
                                                className="p-3 bg-white/5 text-emerald-400 rounded-xl border border-transparent hover:bg-emerald-600 hover:text-white hover:scale-105 active:scale-95 transition-all"
                                                title="Descargar Alta Resolución"
                                            >
                                                <Download size={18} />
                                            </button>
                                            <button 
                                                onClick={handleDelete}
                                                className="p-3 bg-white/5 text-rose-500 rounded-xl border border-transparent hover:bg-rose-600 hover:text-white hover:scale-105 active:scale-95 transition-all"
                                                title="Eliminar Activo"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        <button 
                                            onClick={onClose}
                                            className="p-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 text-white hover:bg-white hover:text-black transition-all hover:rotate-90"
                                        >
                                            <X size={22} />
                                        </button>
                                    </div>
                                </div>

                                {/* CENTER - IMAGE AREA */}
                                <div className="flex-1 w-full h-full flex items-center justify-center p-4 md:p-12 overflow-hidden bg-zinc-950/20">
                                    {fullUrl ? (
                                        <motion.img 
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                            src={fullUrl} 
                                            alt={alt || 'Nous Asset Preview'} 
                                            className="max-w-full max-h-full object-contain rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.9)]"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 text-white/20">
                                            <RefreshCcw size={48} className="animate-spin" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.5em]">Loading Neural Asset...</span>
                                        </div>
                                    )}
                                </div>

                                {/* BOTTOM - METADATA & PROMPT SECTION */}
                                <div className="absolute bottom-0 left-0 right-0 z-50 pointer-events-none p-4 md:p-8">
                                    <div className="max-w-4xl mx-auto pointer-events-auto">
                                        <div className={cn(
                                            "w-full bg-slate-950/90 backdrop-blur-3xl border border-white/10 rounded-2xl md:rounded-[2rem] overflow-hidden transition-all duration-500 shadow-2xl",
                                            showMetadata ? "max-h-[500px]" : "max-h-[52px] md:max-h-[68px]"
                                        )}>
                                            {/* Expand Toggle Bar */}
                                            <div 
                                                onClick={() => setShowMetadata(!showMetadata)}
                                                className="h-[52px] md:h-[68px] px-6 md:px-8 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 md:p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                                        <Info size={14} className="md:w-4 md:h-4" />
                                                    </div>
                                                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-white/60 group-hover:text-white transition-colors">
                                                        Meta datos
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {!showMetadata && prompt && (
                                                        <span className="hidden md:block text-[10px] text-white/20 italic truncate max-w-[300px] font-medium">
                                                            "{prompt}"
                                                        </span>
                                                    )}
                                                    <div className="p-1.5 md:p-2 rounded-xl bg-white/5 text-white/40 group-hover:text-white group-hover:bg-white/10 transition-all">
                                                        {showMetadata ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Body */}
                                            <div className="p-8 pt-0 space-y-8 scroll-auto overflow-y-auto max-h-[350px]">
                                                {/* PROMPT FIELD */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                                                            <div className="w-1 h-1 rounded-full bg-indigo-400" />
                                                            Prompt Original
                                                        </div>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); copyToClipboard(prompt || '', 'prompt'); }}
                                                            className={cn(
                                                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all",
                                                                copiedField === 'prompt' ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                                                            )}
                                                        >
                                                            {copiedField === 'prompt' ? (
                                                                <><Check size={12} /> Copiado</>
                                                            ) : (
                                                                <><Copy size={12} /> Copiar Prompt</>
                                                            )}
                                                        </button>
                                                    </div>
                                                    <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                                                        <p className="text-white/80 text-sm leading-relaxed italic font-medium">
                                                            "{prompt}"
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* GRID INFO */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">ID Activo</p>
                                                            <p className="text-[10px] font-bold text-white/70 font-mono">{assetId}</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => copyToClipboard(assetId || '', 'id')}
                                                            className="p-2 hover:bg-white/10 rounded-lg text-white/20 hover:text-white transition-all"
                                                        >
                                                            {copiedField === 'id' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                                        </button>
                                                    </div>
                                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Tipo de Activo</p>
                                                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                                                                {title || 'Contextual Suggestion'}
                                                            </p>
                                                        </div>
                                                        <div className="p-2 text-white/10">
                                                            <ImageIcon size={14} />
                                                        </div>
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
