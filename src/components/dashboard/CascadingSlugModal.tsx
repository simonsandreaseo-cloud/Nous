"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Link as LinkIcon, RotateCcw } from "lucide-react";
import { cn } from "@/utils/cn";

interface CascadingSlugModalProps {
    isOpen: boolean;
    oldSlug: string;
    newSlug: string;
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function CascadingSlugModal({
    isOpen,
    oldSlug,
    newSlug,
    isLoading = false,
    onConfirm,
    onCancel,
}: CascadingSlugModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[400]"
                        onClick={onCancel}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: 16 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="fixed inset-0 flex items-center justify-center z-[401] p-4 pointer-events-none"
                    >
                        <div className="pointer-events-auto w-full max-w-[480px] bg-white/95 backdrop-blur-2xl border border-white/60 rounded-[32px] shadow-[0_32px_80px_rgba(79,70,229,0.18)] overflow-hidden">
                            {/* Header */}
                            <div className="px-7 pt-7 pb-5 border-b border-slate-100 flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100 shrink-0">
                                        <AlertTriangle size={20} className="text-amber-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-900 leading-tight">
                                            Reemplazo en Cascada
                                        </h2>
                                        <p className="text-[10px] font-medium text-slate-400 mt-1 leading-relaxed">
                                            Modificación de slug detectada.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onCancel}
                                    className="p-2 rounded-xl bg-slate-100/70 hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 transition-all shrink-0"
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="px-7 py-5 space-y-5">
                                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                    Has modificado el slug de este artículo. Si este contenido o los que lo enlazan ya estaban publicados en tu sitio web, 
                                    <span className="text-amber-600 font-bold bg-amber-50 px-1 rounded mx-1">
                                        deberás realizar una redirección 301
                                    </span> 
                                    por tu cuenta.
                                </p>
                                
                                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                    ¿Deseas que Nous busque y reescriba los enlaces internos que apuntan a este viejo slug en todos los contenidos del proyecto?
                                </p>

                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <LinkIcon size={14} className="text-slate-400 shrink-0" />
                                        <span className="text-xs text-slate-500 line-through truncate">
                                            /{oldSlug}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                        </div>
                                        <span className="text-xs text-emerald-700 font-bold truncate">
                                            /{newSlug}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-7 pb-7 flex flex-col gap-3">
                                <button
                                    onClick={onConfirm}
                                    disabled={isLoading}
                                    className={cn(
                                        "w-full py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all relative overflow-hidden flex items-center justify-center gap-2",
                                        !isLoading
                                            ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_28px_rgba(245,158,11,0.45)] hover:-translate-y-0.5"
                                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    )}
                                >
                                    {isLoading ? (
                                        <div className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                                    ) : (
                                        <RotateCcw size={14} className="relative z-10" />
                                    )}
                                    <span className="relative z-10">
                                        {isLoading ? "Procesando cascada..." : "Guardar y Actualizar Enlaces"}
                                    </span>
                                </button>
                                <button
                                    onClick={onCancel}
                                    disabled={isLoading}
                                    className="w-full py-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-black uppercase tracking-widest transition-all"
                                >
                                    No, solo cambiar el slug
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
