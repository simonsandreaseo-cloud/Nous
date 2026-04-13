"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Link as LinkIcon, Target, BarChart3, Plus, ArrowRight, MousePointer2 } from "lucide-react";
import { cn } from "@/utils/cn";

interface WidgetType {
    id: string;
    type: 'nous_extractor' | 'link_patcher' | 'price_monitor' | 'entity_extractor' | 'asset_patcher';
    name: string;
    description: string;
    icon: any;
    color: string;
    isDev?: boolean;
}

const AVAILABLE_WIDGETS: WidgetType[] = [
    { 
        id: "asset_patcher", 
        type: "asset_patcher", 
        name: "Patcher Master", 
        description: "Control supremo sobre URLs, dimensiones y máscaras de activos para cualquier CMS.", 
        icon: MousePointer2, 
        color: "bg-amber-500" 
    },
    { 
        id: "nous_extractor", 
        type: "nous_extractor", 
        name: "Extractor Nous", 
        description: "Inteligencia para extraer RIDs, Metadata técnica y data dinámica de enlaces.", 
        icon: Sparkles, 
        color: "bg-indigo-600" 
    },
    { 
        id: "link_patcher", 
        type: "link_patcher", 
        name: "Link Patcher", 
        description: "Normalización de URLs mediante Regex para un enlazado interno perfecto.", 
        icon: LinkIcon, 
        color: "bg-emerald-600" 
    },
    { 
        id: "entity_extractor", 
        type: "entity_extractor", 
        name: "Entity Extractor", 
        description: "Identifica entidades clave y competidores en cualquier página.", 
        icon: Target, 
        color: "bg-slate-500",
        isDev: true
    },
    { 
        id: "price_monitor", 
        type: "price_monitor", 
        name: "Price Monitor", 
        description: "Captura y formatea precios de productos automáticamente.", 
        icon: BarChart3, 
        color: "bg-slate-500",
        isDev: true
    },
];

interface WidgetGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'nous_extractor' | 'link_patcher' | 'price_monitor' | 'entity_extractor' | 'asset_patcher') => void;
}

export function WidgetGalleryModal({ isOpen, onClose, onSelect }: WidgetGalleryModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border border-white/20"
                    >
                        {/* Header */}
                        <div className="p-8 pb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Galería de Widgets</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Selecciona una herramienta para tu proyecto</p>
                            </div>
                            <button onClick={onClose} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        {/* List */}
                        <div className="p-8 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {AVAILABLE_WIDGETS.map((widget) => (
                                <button
                                    key={widget.id}
                                    disabled={widget.isDev}
                                    onClick={() => onSelect(widget.type as any)}
                                    className={cn(
                                        "group flex flex-col p-6 rounded-[32px] border-2 text-left transition-all relative overflow-hidden",
                                        widget.isDev 
                                            ? "border-slate-50 bg-slate-50/30 opacity-60 grayscale cursor-not-allowed" 
                                            : "border-slate-100 bg-white hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 active:scale-95 cursor-pointer"
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg",
                                        widget.color,
                                        !widget.isDev && "group-hover:scale-110 transition-transform duration-500"
                                    )}>
                                        <widget.icon size={24} />
                                    </div>
                                    
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-2 flex items-center gap-2">
                                        {widget.name}
                                        {widget.isDev && (
                                            <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md">Próximamente</span>
                                        )}
                                    </h3>
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-relaxed">
                                        {widget.description}
                                    </p>

                                    {!widget.isDev && (
                                        <div className="mt-6 flex items-center gap-2 text-indigo-500 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                            Seleccionar <ArrowRight size={14} />
                                        </div>
                                    )}

                                    {/* Decor */}
                                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <widget.icon size={120} />
                                    </div>
                                </button>
                            ))}

                            {/* Suggestion Box */}
                            <div className="col-span-1 md:col-span-2 p-6 rounded-[32px] bg-slate-900 flex items-center justify-between mt-4">
                                <div>
                                    <p className="text-white text-[10px] font-black uppercase tracking-widest">¿Necesitas algo a medida?</p>
                                    <p className="text-white/40 text-[8px] uppercase tracking-[0.2em] mt-1">Sugerir nueva funcionalidad</p>
                                </div>
                                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                    Enviar Feedback
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
