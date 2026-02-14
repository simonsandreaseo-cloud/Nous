"use client";

import { useProjectStore } from "@/store/useProjectStore";
import { NavigationHeader } from "@/components/dom/NavigationHeader";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/utils/cn";
import {
    LayoutDashboard,
    Calendar,
    Bot,
    Wand2,
    Share2,
    ChevronRight,
    Settings
} from "lucide-react";

export default function StudioLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { activeProject } = useProjectStore();

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/studio/dashboard', color: 'text-slate-500' },
        { id: 'strategy', label: 'Estrategia', icon: Calendar, path: '/studio/strategy', color: 'text-cyan-500' },
        { id: 'writer', label: 'Redactor', icon: Bot, path: '/studio/writer', color: 'text-purple-500' },
        { id: 'refinery', label: 'Refineria', icon: Wand2, path: '/studio/refinery', color: 'text-pink-500' },
        { id: 'distribution', label: 'Distribución', icon: Share2, path: '/studio/distribution', color: 'text-indigo-500' },
    ];

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col">
            <NavigationHeader />

            <div className="flex-1 flex pt-24 max-w-[1920px] mx-auto w-full px-4 md:px-8 gap-6">
                {/* STUDIO SIDEBAR (Left) */}
                <aside className="w-20 lg:w-64 hidden md:flex flex-col gap-6 sticky top-24 h-[calc(100vh-8rem)]">
                    <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 h-full flex flex-col">

                        {/* Context Header */}
                        <div className="mb-8 px-2 hidden lg:block">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                Workspace
                            </span>
                            <h2 className="text-xl font-black text-slate-900 truncate" title={activeProject?.name}>
                                {activeProject?.name || "Sin Proyecto"}
                            </h2>
                            <span className="text-xs font-mono text-slate-400 truncate block">
                                {activeProject?.domain || "seleccionar..."}
                            </span>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 space-y-2">
                            {tabs.map((tab) => {
                                const isActive = pathname?.startsWith(tab.path);
                                return (
                                    <Link
                                        key={tab.id}
                                        href={tab.path}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl transition-all group relative overflow-hidden",
                                            isActive ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" : "hover:bg-slate-50 text-slate-500 hover:text-slate-900"
                                        )}
                                    >
                                        <tab.icon size={20} className={cn("relative z-10 transition-colors", isActive ? "text-white" : tab.color)} />
                                        <span className={cn("text-sm font-bold relative z-10 hidden lg:block", isActive ? "text-white" : "text-slate-600")}>
                                            {tab.label}
                                        </span>
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTabIndicator"
                                                className="absolute inset-0 bg-slate-900 rounded-xl"
                                                initial={false}
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Footer Config */}
                        <div className="mt-auto border-t border-slate-50 pt-4">
                            <Link href="/settings" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
                                <Settings size={20} />
                                <span className="text-sm font-bold hidden lg:block">Ajustes Globales</span>
                            </Link>
                        </div>
                    </div>
                </aside>

                {/* MAIN CONTENT AREA */}
                <main className="flex-1 w-full min-w-0 pb-10">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="h-full"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
