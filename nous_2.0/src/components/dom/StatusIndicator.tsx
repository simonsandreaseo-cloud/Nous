"use client";

import { useAppStore } from "@/store/useAppStore";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { useEffect, useState } from "react";

export function StatusIndicator() {
    const { systemStatus, setSystemStatus, activeMode } = useAppStore();
    const [pulse, setPulse] = useState(false);

    // 15.1.4 Loading micro-states: Simulate analysis on section change
    useEffect(() => {
        if (activeMode !== "home") {
            setSystemStatus("analyzing");
            const timer = setTimeout(() => setSystemStatus("nominal"), 1500);
            return () => clearTimeout(timer);
        }
    }, [activeMode, setSystemStatus]);

    useEffect(() => {
        const interval = setInterval(() => setPulse((p) => !p), 2000);
        return () => clearInterval(interval);
    }, []);

    const getStatusConfig = () => {
        switch (systemStatus) {
            case "analyzing":
                return { color: "bg-color-deep-cyan", label: "ANALYZING_DATA", pulse: true };
            case "error":
                return { color: "bg-red-500", label: "SYSTEM_ERROR", pulse: true };
            case "loading":
                return { color: "bg-color-titanium-gray", label: "LOADING_PATHS", pulse: true };
            default:
                return { color: "bg-color-surgical-blue", label: "SYSTEM_NOMINAL", pulse: false };
        }
    };

    const config = getStatusConfig();

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-6 px-8 py-3 rounded-full bg-white/70 text-slate-800 border border-slate-200 shadow-xl backdrop-blur-xl"
        >
            <div className="flex flex-col items-start leading-none gap-1">
                <span className="text-[9px] font-bold tracking-[0.2em] text-slate-900 uppercase">
                    Neural_Link
                </span>
                <span className="text-[8px] font-medium tracking-wider text-slate-500">
                    Connected
                </span>
            </div>

            <div className="w-px h-8 bg-slate-300" />

            <div className="flex items-center gap-3">
                <motion.div
                    animate={config.pulse || systemStatus === "analyzing" ? {
                        opacity: [0.5, 1, 0.5]
                    } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className={cn("w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]", config.color)}
                />
                <div className="flex flex-col items-start leading-none gap-1">
                    <span className={cn(
                        "text-[9px] font-bold tracking-[0.15em] uppercase transition-colors duration-500",
                        systemStatus === "analyzing" ? "text-cyan-600" : "text-slate-700"
                    )}>
                        {config.label}
                    </span>
                    <span className="text-[7px] text-slate-400 uppercase tracking-[0.1em]">
                        {activeMode}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
