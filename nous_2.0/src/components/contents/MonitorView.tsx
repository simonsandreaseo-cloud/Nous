"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import HeliosConsole from "@/components/dashboard/HeliosConsole";
import ScrapingMonitor from "@/components/dashboard/ScrapingMonitor";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Activity } from "lucide-react";
import { cn } from "@/utils/cn";

export default function MonitorView() {
    const { activeProject } = useProjectStore();
    const [view, setView] = useState<'helios' | 'performance'>('helios');

    return (
        <div className="flex flex-col h-full">
            <div className="flex p-1 bg-slate-100/50 rounded-2xl w-fit mb-8 border border-slate-200/50">
                <button
                    onClick={() => setView('helios')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                        view === 'helios' ? "bg-white text-slate-900 shadow-sm shadow-slate-200" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <Cpu size={14} /> Helios Engine
                </button>
                <button
                    onClick={() => setView('performance')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                        view === 'performance' ? "bg-white text-slate-900 shadow-sm shadow-slate-200" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <Activity size={14} /> Scraping Monitor
                </button>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={view}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1"
                >
                    {view === 'helios' ? <HeliosConsole /> : <ScrapingMonitor />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
