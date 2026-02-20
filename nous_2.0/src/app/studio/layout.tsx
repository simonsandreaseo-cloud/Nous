"use client";

import { useProjectStore } from "@/store/useProjectStore";
import { NavigationHeader } from "@/components/dom/NavigationHeader";
import { NousLogo } from "@/components/dom/NousLogo";
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
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/studio/dashboard', color: 'text-[var(--color-nous-mint)]' },
        { id: 'strategy', label: 'Estrategia', icon: Calendar, path: '/studio/strategy', color: 'text-[var(--color-nous-mist)]' },
        { id: 'writer', label: 'Redactor', icon: Bot, path: '/studio/writer', color: 'text-[var(--color-nous-lavender)]' },
        { id: 'refinery', label: 'Refinería', icon: Wand2, path: '/studio/refinery', color: 'text-[var(--color-nous-lavender)]' },
        { id: 'distribution', label: 'Distribución', icon: Share2, path: '/studio/distribution', color: 'text-[var(--color-nous-mist)]' },
    ];

    return (
        <div className="min-h-screen bg-transparent flex flex-col selection:bg-slate-100 selection:text-slate-900">
            <div className="flex-1 flex max-w-[1920px] mx-auto w-full vacio-pad py-6 h-screen overflow-hidden">
                {/* STUDIO SIDEBAR (Left - Floating Style) */}
                <aside className="w-20 lg:w-72 hidden md:flex flex-col gap-6 h-full mr-6">
                    <div className="glass-panel border-hairline rounded-[40px] p-5 h-full flex flex-col relative overflow-hidden">

                        {/* NOUS LOGO AREA */}
                        <div className="mb-10 px-3 py-2 flex items-center justify-between">
                            <Link href="/" className="select-none inline-block">
                                <NousLogo className="scale-[0.85] origin-left" />
                            </Link>
                            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-white/50 text-[var(--color-nous-mint)] rounded-full border border-hairline">
                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-nous-mint)] animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Live</span>
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
                                                ? "glass-panel text-slate-900 shadow-sm"
                                                : "hover:bg-white/40 text-slate-400 hover:text-slate-800"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-2 rounded-xl transition-all relative z-10",
                                            isActive ? "bg-white/60" : "bg-transparent group-hover:bg-white/50"
                                        )}>
                                            <tab.icon size={18} className={cn("transition-colors", isActive ? tab.color : "text-slate-400 group-hover:text-slate-700")} />
                                        </div>
                                        <span className={cn("text-[10px] font-medium tracking-elegant uppercase relative z-10 hidden lg:block mt-0.5", isActive ? "text-slate-900" : "text-slate-500")}>
                                            {tab.label}
                                        </span>
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
                <main className="flex-1 w-full min-w-0 h-full overflow-hidden flex flex-col glass-panel border-hairline rounded-[40px] shadow-sm">
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
