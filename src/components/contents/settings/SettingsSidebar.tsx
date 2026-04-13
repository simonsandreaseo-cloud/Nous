"use client";

import { Sliders, Settings2, ShieldCheck, Database, LayoutGrid } from "lucide-react";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";

const SETTINGS_PAGES = [
    { id: "custom-tools", label: "Custom Tools", icon: Sliders },
    { id: "entities", label: "Entidades", icon: Database, dev: true },
    { id: "workflow", label: "Workflow", icon: Settings2, dev: true },
    { id: "security", label: "Seguridad", icon: ShieldCheck, dev: true },
];

interface SettingsSidebarProps {
    activeTool: string;
    onSelect: (id: string) => void;
}

export function SettingsSidebar({ activeTool, onSelect }: SettingsSidebarProps) {
    return (
        <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            className="h-full bg-slate-50 border-r border-slate-100/80 flex flex-col p-4 gap-6 shrink-0"
        >
            <div className="px-3 pt-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Configuración</span>
            </div>

            <div className="flex flex-col gap-1">
                {SETTINGS_PAGES.map((page) => {
                    const isActive = activeTool === page.id;
                    return (
                        <button
                            key={page.id}
                            disabled={page.dev}
                            onClick={() => onSelect(page.id)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                                isActive 
                                    ? "bg-white shadow-sm border border-slate-100 text-slate-900" 
                                    : "text-slate-500 hover:text-slate-800",
                                page.dev && "opacity-30 cursor-not-allowed"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                isActive ? "bg-indigo-50 text-indigo-600" : "bg-transparent group-hover:bg-slate-100"
                            )}>
                                <page.icon size={16} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-tight">{page.label}</span>
                            {page.dev && (
                                <span className="ml-auto text-[8px] font-black uppercase text-slate-300 border border-slate-200 px-1.5 py-0.5 rounded-md">V2.1</span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="mt-auto p-4 rounded-2xl bg-indigo-50 border border-indigo-100/50">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-relaxed">
                    Estas configuraciones afectan a nivel de proyecto y equipo.
                </p>
            </div>
        </motion.div>
    );
}
