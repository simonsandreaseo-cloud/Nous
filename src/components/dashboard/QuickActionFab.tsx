"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FileText, Upload, Sparkles, X, Activity, Database, Search } from "lucide-react";
import Link from "next/link";

export function QuickActionFab() {
    const [isOpen, setIsOpen] = useState(false);

    const actions = [
        { label: "Nuevo Artículo AI", icon: Sparkles, color: "bg-cyan-500", href: "/writer" },
        { label: "Cargar para Humanizar", icon: FileText, color: "bg-indigo-500", href: "/writer?mode=humanize" },
        { label: "Deep Audit (Helios)", icon: Activity, color: "bg-rose-500", href: "/estrategia?view=helios" },
        { label: "Refinería de Datos", icon: Database, color: "bg-emerald-500", href: "/estrategia?view=refinery" },
        { label: "Deep Crawler", icon: Search, color: "bg-slate-800", href: "/estrategia?view=crawler" },
    ];

    return (
        <div className="fixed bottom-8 right-8 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute bottom-20 right-0 flex flex-col gap-3 items-end mb-4"
                    >
                        {actions.map((action, i) => (
                            <Link
                                key={i}
                                href={action.href}
                                className="flex items-center gap-4 group no-underline"
                            >
                                <span className="px-3 py-1.5 bg-white text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-md border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {action.label}
                                </span>
                                <div className={`w-12 h-12 rounded-full ${action.color} text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform`}>
                                    <action.icon size={20} />
                                </div>
                            </Link>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all ${isOpen ? "bg-slate-900 rotate-45" : "bg-black hover:scale-105"
                    } text-white`}
            >
                <Plus size={28} />
            </button>
        </div>
    );
}
