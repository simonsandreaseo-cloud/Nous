"use client";

import { useState } from "react";
import {
    Plus,
    MoreHorizontal,
    Lightbulb,
    FileText,
    PenTool,
    CheckCircle,
    GripVertical
} from "lucide-react";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";

const mockQueue = [
    { id: 1, title: "Los 5 Pilares de SEO Neural", status: "idea" },
    { id: 2, title: "Casos de éxito: Clínica B2B", status: "briefing" },
    { id: 3, title: "Podcast: Futuro Médico", status: "drafting" },
    { id: 4, title: "Review: Herramientas 2026", status: "review" },
];

const statusConfig = {
    idea: { icon: Lightbulb, color: "text-amber-500", label: "Ideas" },
    briefing: { icon: FileText, color: "text-blue-500", label: "Briefs" },
    drafting: { icon: PenTool, color: "text-purple-500", label: "En Redacción" },
    review: { icon: CheckCircle, color: "text-emerald-500", label: "Revisión" },
};

export function ColaDeContenidos() {
    return (
        <section className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm flex flex-col h-full min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">Producción</h3>
                    <p className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Cola de Trabajo</p>
                </div>
                <button className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-700 transition-colors shadow-lg shadow-slate-900/10">
                    <Plus size={16} />
                </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(statusConfig).map(([key, config]) => {
                    const items = mockQueue.filter(i => i.status === key);
                    return (
                        <div key={key}>
                            <div className="flex items-center gap-2 mb-3">
                                <config.icon size={14} className={config.color} />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{config.label}</span>
                                <span className="text-[9px] font-mono text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded-md">{items.length}</span>
                            </div>

                            <div className="space-y-2">
                                {items.length > 0 ? (
                                    items.map(item => (
                                        <motion.div
                                            key={item.id}
                                            whileHover={{ scale: 1.02 }}
                                            className="p-4 bg-slate-50 hover:bg-white border border-slate-100 rounded-xl group cursor-pointer shadow-sm hover:shadow-md transition-all flex items-center gap-3"
                                        >
                                            <GripVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab" />
                                            <span className="text-sm font-bold text-slate-700 flex-1 truncate">{item.title}</span>
                                            <button className="p-1 text-slate-300 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                                                <MoreHorizontal size={14} />
                                            </button>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="border-2 border-dashed border-slate-100 rounded-xl p-4 text-center">
                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sin tareas activas</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </section>
    );
}
