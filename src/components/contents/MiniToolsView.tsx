"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, Wand2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { MiniHumanizerModal } from "./tools/MiniHumanizerModal";

export default function MiniToolsView() {
    const [activeTool, setActiveTool] = useState<string | null>(null);

    const tools = [
        {
            id: "humanizer",
            name: "Mini Humanizador",
            description: "Procesa textos cortos (máx 500 palabras) para darles un tono humano y natural en un solo clic.",
            icon: Wand2,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            border: "border-amber-200"
        }
        // Future mini tools can be added here
    ];

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50/50 p-8 overflow-y-auto">
            <div className="max-w-6xl w-full mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                            <Sparkles className="text-sky-500" size={24} />
                        </div>
                        Mini Tools
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        Herramientas rápidas y de un solo propósito para potenciar tu flujo de trabajo.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {tools.map((tool) => (
                        <motion.button
                            key={tool.id}
                            whileHover={{ y: -4, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveTool(tool.id)}
                            className={cn(
                                "flex flex-col text-left p-6 rounded-2xl bg-white border shadow-sm hover:shadow-md transition-all",
                                "group cursor-pointer",
                                tool.border
                            )}
                        >
                            <div className={cn("w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-transform group-hover:scale-110", tool.bg)}>
                                <tool.icon size={24} className={tool.color} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">
                                {tool.name}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-4 flex-1">
                                {tool.description}
                            </p>
                            <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-800 transition-colors">
                                Abrir herramienta
                                <ChevronRight size={14} className="ml-1" />
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {activeTool === "humanizer" && (
                    <MiniHumanizerModal onClose={() => setActiveTool(null)} />
                )}
            </AnimatePresence>
        </div>
    );
}
