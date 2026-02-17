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
    Settings,
    LogOut,
    User,
    Monitor,
    Cpu as EngineIcon
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { ProjectSelector } from "@/components/dashboard/ProjectSelector";

export default function StudioLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { activeProject } = useProjectStore();
    const { user, signOut } = useAuthStore();

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/studio/dashboard', color: 'text-slate-500' },
        { id: 'strategy', label: 'Estrategia', icon: Calendar, path: '/studio/strategy', color: 'text-cyan-500' },
        { id: 'writer', label: 'Redactor', icon: Bot, path: '/studio/writer', color: 'text-purple-500' },
        { id: 'refinery', label: 'Refinería', icon: Wand2, path: '/studio/refinery', color: 'text-pink-500' },
        { id: 'distribution', label: 'Distribución', icon: Share2, path: '/studio/distribution', color: 'text-indigo-500' },
    ];

    return (
        <div className="min-h-screen bg-[#fcfdfe] flex flex-col selection:bg-slate-900 selection:text-white">
            <div className="flex-1 flex max-w-[1920px] mx-auto w-full px-4 md:px-6 lg:px-8 gap-6 py-6 h-screen overflow-hidden">
                {/* STUDIO SIDEBAR (Left - Floating Style) */}
                <aside className="w-20 lg:w-72 hidden md:flex flex-col gap-6 h-full">
                    <div className="bg-white rounded-[40px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 h-full flex flex-col relative overflow-hidden">

                        {/* NOUS LOGO AREA */}
                        <div className="mb-10 px-3 py-2 flex items-center justify-between">
                            <Link href="/" className="text-2xl font-black italic tracking-tighter text-slate-900 select-none">
                                NOUS
                            </Link>
                            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Live</span>
                            </div>
                        </div>

                        {/* Workspace / Project Selector */}
                        <div className="mb-8 px-2 hidden lg:block">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3 ml-1">
                                Workspace
                            </span>
                            <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-2xl mb-4">
                                <ProjectSelector />
                            </div>
                        </div>

                        {/* Main Navigation */}
                        <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar -mx-2 px-2">
                            {tabs.map((tab) => {
                                const isActive = pathname?.startsWith(tab.path);
                                return (
                                    <Link
                                        key={tab.id}
                                        href={tab.path}
                                        className={cn(
                                            "flex items-center gap-3 p-3.5 rounded-[20px] transition-all group relative overflow-hidden",
                                            isActive
                                                ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20 active:scale-95"
                                                : "hover:bg-slate-50 text-slate-500 hover:text-slate-900 translate-x-0 hover:translate-x-1"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-2 rounded-xl transition-all relative z-10",
                                            isActive ? "bg-white/10" : "bg-transparent group-hover:bg-white"
                                        )}>
                                            <tab.icon size={18} className={cn("transition-colors", isActive ? "text-white" : tab.color)} />
                                        </div>
                                        <span className={cn("text-xs font-black uppercase tracking-widest relative z-10 hidden lg:block mt-0.5", isActive ? "text-white" : "text-slate-500")}>
                                            {tab.label}
                                        </span>
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTabIndicator"
                                                className="absolute inset-0 bg-slate-900"
                                                initial={false}
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Footer Config & User */}
                        <div className="mt-auto space-y-3 pt-6 border-t border-slate-50">
                            <Link href="/auth/desktop-launch" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-all border border-transparent hover:border-slate-100 group">
                                <EngineIcon size={18} className="text-purple-400 group-hover:rotate-12 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Motor Helios</span>
                            </Link>

                            <Link href="/settings" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-all border border-transparent hover:border-slate-100 group">
                                <Settings size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Ajustes</span>
                            </Link>

                            <div className="h-px bg-slate-50 my-2" />

                            {/* User Profile Area */}
                            <div className="flex items-center gap-3 p-1.5 bg-slate-50 border border-slate-100 rounded-2xl">
                                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-inner shrink-0 leading-none">
                                    {user?.email?.[0].toUpperCase()}
                                </div>
                                <div className="hidden lg:block flex-1 min-w-0">
                                    <p className="text-[9px] font-black text-slate-900 truncate uppercase tracking-widest leading-none mb-1">
                                        {user?.email?.split('@')[0]}
                                    </p>
                                    <button
                                        onClick={() => signOut()}
                                        className="text-[8px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors uppercase tracking-widest"
                                    >
                                        <LogOut size={8} /> Desconectar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* MAIN CONTENT AREA */}
                <main className="flex-1 w-full min-w-0 h-full overflow-hidden flex flex-col bg-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/50">
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={pathname}
                                initial={{ opacity: 0, scale: 0.99 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.01 }}
                                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                                className="h-full"
                            >
                                {children}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
}
