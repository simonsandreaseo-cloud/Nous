"use client";

import { useProjectStore } from "@/store/useProjectStore";
import { NavigationHeader } from "@/components/dom/NavigationHeader";
import { BudgetWidget } from "@/components/dashboard/BudgetWidget";
import { InsightsWidget } from "@/components/dashboard/InsightsWidget";
import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import { QuickActionFab } from "@/components/dashboard/QuickActionFab";
import { Layers } from "lucide-react";
import { motion } from "framer-motion";

export default function ContentDashboard() {
    const { activeProject } = useProjectStore();

    return (
        <div className="relative min-h-screen w-full bg-[#f8fafc] overflow-x-hidden text-slate-900 font-sans selection:bg-cyan-100 selection:text-cyan-900">
            <NavigationHeader />

            <div className="flex flex-col min-h-screen pt-32 pb-20 px-6 md:px-12 max-w-[1600px] mx-auto relative z-10">
                {/* Minimalist Header */}
                <header className="mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex flex-col gap-1"
                    >
                        <span className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase font-mono">
                            {activeProject?.domain || "NOUS FRAMEWORK"}
                        </span>
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 uppercase italic heading-gradient">
                            Dashboard <span className="text-slate-300">Overview</span>
                        </h1>
                    </motion.div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
                    {/* Primary Column: Budget & Strategy */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-1 h-full min-h-[400px]"
                    >
                        <BudgetWidget />
                    </motion.div>

                    {/* Secondary Column: Insights Feed */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="lg:col-span-1 h-full min-h-[400px]"
                    >
                        <InsightsWidget />
                    </motion.div>

                    {/* Tertiary Column: Timeline */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="lg:col-span-1 h-full min-h-[400px]"
                    >
                        <MiniCalendar />
                    </motion.div>
                </div>
            </div>

            <QuickActionFab />

            {/* Subtle background blob */}
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-cyan-100/40 to-blue-100/40 blur-[120px] rounded-full pointer-events-none opacity-60 z-0" />
            <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-slate-100 to-white blur-[100px] rounded-full pointer-events-none opacity-80 z-0" />
        </div>
    );
}
