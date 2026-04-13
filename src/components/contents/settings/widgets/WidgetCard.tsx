"use client";

import { Zap, Target, BarChart3, Settings2, Trash2, Power, Link as LinkIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";

const WIDGET_ICONS = {
    nous_extractor: Zap,
    link_patcher: LinkIcon,
    entity_extractor: Target,
    price_monitor: BarChart3
};

const WIDGET_COLORS = {
    nous_extractor: "text-indigo-500 bg-indigo-50",
    link_patcher: "text-emerald-500 bg-emerald-50",
    entity_extractor: "text-slate-500 bg-slate-50",
    price_monitor: "text-slate-500 bg-slate-50"
};

interface WidgetCardProps {
    widget: any;
    onEdit: () => void;
    onDelete: () => void;
    onToggle: () => void;
}

export function WidgetCard({ widget, onEdit, onDelete, onToggle }: WidgetCardProps) {
    const Icon = (WIDGET_ICONS as any)[widget.type] || Zap;
    const colorClass = (WIDGET_COLORS as any)[widget.type] || "text-slate-500 bg-slate-50";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "group relative bg-white rounded-[32px] border transition-all p-5 flex flex-col gap-4",
                widget.is_active ? "border-slate-100 shadow-sm" : "border-slate-50 opacity-60 grayscale"
            )}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm", colorClass)}>
                        <Icon size={20} />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-tight">{widget.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", widget.is_active ? "bg-emerald-500 animate-pulse" : "bg-slate-300")}></div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                {widget.is_active ? "Activo" : "Pausado"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button 
                        onClick={onToggle}
                        className={cn(
                            "p-2 rounded-xl transition-all",
                            widget.is_active ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                        )}
                        title={widget.is_active ? "Pausar Widget" : "Activar Widget"}
                    >
                        <Power size={14} />
                    </button>
                    <button 
                        onClick={onEdit}
                        className="p-2 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all border border-transparent hover:border-slate-800"
                        title="Configurar Widget"
                    >
                        <Settings2 size={14} />
                    </button>
                    <button 
                        onClick={onDelete}
                        className="p-2 bg-white text-slate-300 hover:text-rose-500 rounded-xl transition-all border border-transparent hover:border-rose-100 hover:bg-rose-50"
                        title="Eliminar Widget"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div className="bg-slate-50/50 rounded-2xl p-3">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                    {(widget.type === 'nous_extractor')
                        ? `${widget.config?.rules?.length || 0} reglas de extracción configuradas.`
                        : widget.type === 'link_patcher'
                        ? `${widget.config?.rules?.length || 0} reglas de normalización.`
                        : "Sin datos de configuración."}
                </p>
            </div>

            {/* Hover Indicator */}
            <div className="absolute inset-x-0 -bottom-px h-1 bg-indigo-500 rounded-b-[32px] scale-x-0 group-hover:scale-x-50 transition-transform origin-center"></div>
        </motion.div>
    );
}
