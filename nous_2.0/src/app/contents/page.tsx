"use client";

import { useProjectStore } from "@/store/useProjectStore";
import { NavigationHeader } from "@/components/dom/NavigationHeader";
import { EditorialPulse } from "@/components/dashboard/EditorialPulse";
import { ContentQueue } from "@/components/dashboard/ContentQueue";
import { TimelineScheduler } from "@/components/dashboard/TimelineScheduler";
import { BudgetStatus } from "@/components/dashboard/BudgetStatus";
import { InsightsWidget } from "@/components/dashboard/InsightsWidget";
import { QuickActionFab } from "@/components/dashboard/QuickActionFab";
import { motion } from "framer-motion";

export default function ContentDashboard() {
    const { activeProject } = useProjectStore();

    return (
        <div className="relative min-h-screen w-full bg-[#f8fafc] overflow-x-hidden text-slate-900 font-sans selection:bg-cyan-100 selection:text-cyan-900">
            <NavigationHeader />

            <div className="flex flex-col min-h-screen pt-32 pb-20 px-6 md:px-12 max-w-[1800px] mx-auto relative z-10">
                {/* Minimalist Header */}
                <header className="mb-8 flex items-end justify-between">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex flex-col gap-1"
                    >
                        <span className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase font-mono">
                            {activeProject?.domain || "NOUS FRAMEWORK"}
                        </span>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase italic">
                            Neural <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-500">Workspace</span>
                        </h1>
                    </motion.div>
                </header>

                {/* BENTO GRID LAYOUT */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(180px,auto)]">

                    {/* 1. Hero Pulse (Full Width) */}
                    <motion.div className="md:col-span-12" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <EditorialPulse />
                    </motion.div>

                    {/* 2. Content Queue (Left/Center - Tall) */}
                    <motion.div className="md:col-span-4 md:row-span-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <ContentQueue />
                    </motion.div>

                    {/* 3. Scheduler (Center/Right - Tall) */}
                    <motion.div className="md:col-span-5 md:row-span-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <TimelineScheduler />
                    </motion.div>

                    {/* 4. Insights (Right - Compact) */}
                    <motion.div className="md:col-span-3 md:row-span-1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <div className="h-full">
                            <InsightsWidget />
                        </div>
                    </motion.div>

                    {/* 5. Budget Status (Right - Compact) */}
                    <motion.div className="md:col-span-3 md:row-span-1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                        <BudgetStatus />
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
