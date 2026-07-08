"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, Wand2, Edit3, LayoutGrid } from "lucide-react";
import { cn } from "@/utils/cn";
import { MiniHumanizerModal } from "./tools/MiniHumanizerModal";
import { MiniEditorModal } from "./tools/MiniEditorModal";

export default function MiniToolsView() {
    const [activeTool, setActiveTool] = useState<string | null>(null);

    const tools = [
        {
            id: "humanizer",
            name: "Mini Humanizador",
            description: "Procesa textos cortos (máx 500 palabras) para darles un tono humano y natural en un solo clic.",
            icon: Wand2,
            color: "text-amber-500",
            bg: "bg-gradient-to-br from-amber-400 to-orange-500",
            border: "border-amber-200/50 hover:border-amber-400",
            glow: "group-hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.4)]"
        },
        {
            id: "editor",
            name: "Mini Editor Libre",
            description: "Un lienzo en blanco con formato rico para notas rápidas, borradores o limpieza de texto.",
            icon: Edit3,
            color: "text-indigo-500",
            bg: "bg-gradient-to-br from-indigo-400 to-violet-600",
            border: "border-indigo-200/50 hover:border-indigo-400",
            glow: "group-hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.4)]"
        }
        // Future mini tools can be added here
    ];

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-950 p-8 overflow-y-auto relative">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-6xl w-full mx-auto relative z-10">
                <div className="mb-12">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-sm font-medium mb-6"
                    >
                        <LayoutGrid size={16} className="text-indigo-400" />
                        <span>Colección de Utilidades</span>
                    </motion.div>
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight flex items-center gap-4 mb-4"
                    >
                        Mini Tools
                        <Sparkles className="text-amber-400 w-8 h-8 md:w-12 md:h-12 animate-pulse" />
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-slate-400 md:text-xl max-w-2xl font-medium leading-relaxed"
                    >
                        Herramientas rápidas, de un solo propósito y ultra optimizadas para potenciar tu flujo de trabajo sin distracciones.
                    </motion.p>
                </div>

                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                    {tools.map((tool, index) => (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, delay: 0.1 * index }}
                            key={tool.id}
                            whileHover={{ y: -8, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveTool(tool.id)}
                            className={cn(
                                "flex flex-col text-left p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 transition-all duration-300 relative overflow-hidden",
                                "group cursor-pointer",
                                tool.border,
                                tool.glow
                            )}
                        >
                            {/* Card Hover Gradient Background */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            
                            <div className={cn("w-14 h-14 rounded-2xl mb-6 flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 relative z-10", tool.bg)}>
                                <tool.icon size={28} className="text-white" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-3 tracking-tight relative z-10">
                                {tool.name}
                            </h3>
                            <p className="text-sm text-slate-400 font-medium leading-relaxed mb-6 flex-1 relative z-10">
                                {tool.description}
                            </p>
                            <div className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-white transition-colors relative z-10 mt-auto">
                                Lanzar ahora
                                <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </motion.button>
                    ))}
                </motion.div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {activeTool === "humanizer" && (
                    <MiniHumanizerModal onClose={() => setActiveTool(null)} />
                )}
                {activeTool === "editor" && (
                    <MiniEditorModal onClose={() => setActiveTool(null)} />
                )}
            </AnimatePresence>
        </div>
    );
}
