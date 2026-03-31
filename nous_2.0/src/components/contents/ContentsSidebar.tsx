"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import { useAuthStore } from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import {
    Home,
    Search,
    BarChart2,
    Monitor,
    Building2,
    LayoutDashboard,
    CalendarDays,
    FlaskConical,
    FileText,
    PenLine,
    Sparkles,
    ImageIcon,
    Link2,
    LayoutTemplate,
    User,
    ChevronLeft,
    ChevronRight,
    LogOut,
    ChevronDown,
    Settings,
    CheckSquare,
    Square,
    Loader2,
    RefreshCw
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";

// ── Global areas (navigate to other sections of Nous) ──────────────────────
const GLOBAL_AREAS = [
    { id: "contenidos", label: "Contenidos", icon: Home, href: "/contents" },
    { id: "seo", label: "SEO On Page", icon: Search, href: "/studio/seo" },
    { id: "estrategia", label: "Estrategia", icon: BarChart2, href: "/estrategia" },
    { id: "monitor", label: "Monitor", icon: Monitor, href: "/studio/monitor" },
    { id: "oficina", label: "Oficina", icon: Building2, href: "/office" },
];

// ── Content tools (render inside contents without full page reload) ─────────
export const CONTENT_TOOLS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-[var(--color-nous-mint)]" },
    { id: "planner", label: "Planificador", icon: CalendarDays, color: "text-[var(--color-nous-mist)]" },
    { id: "refinery", label: "Refinería", icon: FlaskConical, color: "text-amber-400" },
    { id: "briefings", label: "Briefings", icon: FileText, color: "text-[var(--color-nous-mist)]" },
    { id: "writer", label: "Redactor", icon: PenLine, color: "text-[var(--color-nous-lavender)]" },
    { id: "humanizer", label: "Humanizador", icon: Sparkles, color: "text-pink-400" },
    { id: "interlinking", label: "Interlinking", icon: Link2, color: "text-[var(--color-nous-mist)]" },
    { id: "publisher", label: "Maquetador", icon: LayoutTemplate, color: "text-indigo-400" },
];

interface ContentsSidebarProps {
    activeTool: string;
    onToolSelect: (toolId: string) => void;
}

export function ContentsSidebar({ activeTool, onToolSelect }: ContentsSidebarProps) {
    const pathname = usePathname();
    const { user, signInWithGoogle, signOut, initialize } = useAuthStore();
    const { teams, fetchTeams, isLoading: isStoreLoading } = useProjectStore();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    useEffect(() => {
        const cleanup = initialize();
        
        // Auto-fetch projects if empty
        if (user && teams.length === 0 && !isStoreLoading) {
            console.log("[ContentsSidebar] Triggering auto-fetch for teams/projects...");
            fetchTeams();
        }

        return cleanup;
    }, [initialize, user, teams.length, fetchTeams, isStoreLoading]);

    return (
        <motion.aside 
            animate={{ width: isCollapsed ? 72 : 240 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="shrink-0 h-full flex flex-col glass-panel border-hairline rounded-[28px] overflow-hidden shadow-sm relative z-50 bg-white/60 backdrop-blur-xl"
        >
            {/* Header: User Profile / Logo */}
            <div className="h-16 shrink-0 flex items-center px-3 gap-3 border-b border-slate-100/60 overflow-hidden bg-white/40">
                <div className="relative group/profile shrink-0">
                    <button 
                        onClick={() => user ? setShowProfileMenu(!showProfileMenu) : signInWithGoogle()}
                        className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden hover:border-indigo-400 hover:shadow-indigo-500/10 transition-all cursor-pointer bg-gradient-to-br from-indigo-50 to-white"
                    >
                        {user?.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User size={18} className="text-slate-400 group-hover/profile:text-indigo-500 transition-colors" />
                        )}
                    </button>
                    
                    {/* Tiny dropdown if user is logged in */}
                    {user && showProfileMenu && (
                        <div className="absolute left-full top-0 ml-3 w-48 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl p-2 z-[100] animate-in slide-in-from-left-4 fade-in duration-200">
                            <div className="px-3 py-2 mb-1">
                                <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Usuario</p>
                                <p className="text-xs font-bold text-slate-800 truncate">{user.email}</p>
                            </div>
                            <button 
                                onClick={signOut}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                                <LogOut size={14} />
                                Cerrar Sesión
                            </button>
                        </div>
                    )}
                </div>

                {!isCollapsed && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="min-w-0"
                    >
                        <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase leading-none mb-1">Nous</p>
                        <h2 className="text-xs font-bold text-slate-800 truncate">{user ? user.user_metadata.full_name || "Mi Cuenta" : "Invitado"}</h2>
                    </motion.div>
                )}
            </div>

            {/* Project Selector Mini-Module */}
            <ProjectSelector isCollapsed={isCollapsed} />

            {/* Global Areas */}
            <nav className="flex flex-col items-center gap-1 py-3 border-b border-slate-100/60 px-2 overflow-hidden">
                {GLOBAL_AREAS.map((area) => {
                    const isActive = area.id === "contenidos"
                        ? pathname?.startsWith("/contents")
                        : pathname?.startsWith(area.href);
                    return (
                        <Link
                            key={area.id}
                            href={area.href}
                            title={isCollapsed ? area.label : undefined}
                            className={cn(
                                "w-full h-11 flex items-center px-3 rounded-2xl transition-all group relative overflow-hidden shrink-0",
                                isActive
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-400 hover:text-slate-700 hover:bg-white/60"
                            )}
                        >
                            <div className="w-5 h-5 flex items-center justify-center shrink-0 mx-auto lg:mx-0">
                                <area.icon size={18} />
                            </div>
                            
                            {!isCollapsed && (
                                <motion.span 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="ml-3 text-xs font-bold whitespace-nowrap"
                                >
                                    {area.label}
                                </motion.span>
                            )}

                            {isCollapsed && (
                                <span className="absolute left-full ml-3 px-2 py-1 text-[10px] font-bold tracking-widest uppercase bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                                    {area.label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Content Tools (Toolkit) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar py-3 px-2 flex flex-col gap-1 overflow-x-hidden">
                {!isCollapsed && (
                    <span className="text-[8px] font-black tracking-[0.2em] text-slate-300 uppercase pl-3 mb-2 block animate-in fade-in slide-in-from-left-2 duration-300">
                        KIT DE HERRAMIENTAS
                    </span>
                )}
                
                {CONTENT_TOOLS.map((tool) => {
                    const isActive = activeTool === tool.id;
                    return (
                        <button
                            key={tool.id}
                            title={isCollapsed ? tool.label : undefined}
                            onClick={() => onToolSelect(tool.id)}
                            className={cn(
                                "w-full h-11 flex items-center px-3 rounded-2xl transition-all group relative overflow-hidden shrink-0",
                                isActive
                                    ? "bg-white shadow-sm border border-slate-200"
                                    : "text-slate-400 hover:text-slate-700 hover:bg-white/60 mx-auto"
                            )}
                        >
                            <div className="w-5 h-5 flex items-center justify-center shrink-0 mx-auto lg:mx-0">
                                <tool.icon
                                    size={16}
                                    className={cn(
                                        "transition-colors",
                                        isActive ? tool.color : "text-slate-400 group-hover:text-slate-600"
                                    )}
                                />
                            </div>

                            {!isCollapsed && (
                                <motion.span 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={cn(
                                        "ml-3 text-xs font-bold whitespace-nowrap transition-colors",
                                        isActive ? "text-slate-800" : "text-slate-500"
                                    )}
                                >
                                    {tool.label}
                                </motion.span>
                            )}

                            {/* Active indicator dot only in collapsed */}
                            {isActive && isCollapsed && (
                                <span className="absolute right-1.5 top-1.5 w-1 h-1 rounded-full bg-[var(--color-nous-mint)]" />
                            )}
                            
                            {/* Tooltip only in collapsed */}
                            {isCollapsed && (
                                <span className="absolute left-full ml-3 px-2 py-1 text-[10px] font-bold tracking-widest uppercase bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                                    {tool.label}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Footer: Collapse Toggle */}
            <div className="p-3 border-t border-slate-100/60 h-16 shrink-0 flex items-center justify-center">
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 hover:border-indigo-100 border border-transparent transition-all overflow-hidden"
                >
                    {isCollapsed ? <ChevronRight size={18} /> : (
                        <div className="flex items-center gap-2 px-2 w-full">
                            <ChevronLeft size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest truncate">Contraer</span>
                        </div>
                    )}
                </button>
            </div>
        </motion.aside>
    );
}

function ProjectSelector({ isCollapsed }: { isCollapsed: boolean }) {
    const { projects, activeProjectIds, toggleProjectActive, setAllProjectsActive, isLoading } = useProjectStore();
    const [isOpen, setIsOpen] = useState(false);

    if (isCollapsed) {
        return (
            <div className="py-4 border-b border-slate-100/60 flex justify-center">
                <div className="relative">
                    {isLoading ? (
                        <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <Loader2 size={14} className="text-indigo-400 animate-spin" />
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-600">
                            {activeProjectIds.length}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="px-3 py-4 border-b border-slate-100/60 bg-white/30 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-2 group cursor-pointer transition-all"
                    >
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600">
                            Proyectos Activos 
                            <span className="ml-1 text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">{activeProjectIds.length}</span>
                        </span>
                        <ChevronDown size={12} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
                    </button>
                    {isLoading && <Loader2 size={10} className="text-indigo-400 animate-spin" />}
                </div>
                
                <Link 
                    href="/settings" 
                    className="p-1.5 rounded-lg hover:bg-white text-slate-300 hover:text-slate-600 transition-all border border-transparent hover:border-slate-100"
                    title="Configuración de Proyectos"
                >
                    <Settings size={14} />
                </Link>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-2 space-y-1">
                            <div className="flex items-center justify-between px-2 py-1 mb-2 bg-slate-50 rounded-xl">
                                <button 
                                    onClick={() => setAllProjectsActive(true)}
                                    className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-500"
                                >
                                    Todos
                                </button>
                                <button 
                                    onClick={() => setAllProjectsActive(false)}
                                    className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500"
                                >
                                    Ninguno
                                </button>
                            </div>

                            <div className="max-h-[160px] overflow-y-auto custom-scrollbar pr-1 space-y-1">
                                {projects.map(p => {
                                    const isActive = activeProjectIds.includes(p.id);
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => toggleProjectActive(p.id)}
                                            className={cn(
                                                "w-full flex items-center gap-2 p-2 rounded-xl transition-all border group",
                                                isActive 
                                                    ? "bg-white border-slate-100 shadow-sm" 
                                                    : "bg-transparent border-transparent hover:bg-white/40"
                                            )}
                                        >
                                            <div className="shrink-0 transition-colors">
                                                {isActive ? (
                                                    <CheckSquare size={14} className="text-indigo-500" />
                                                ) : (
                                                    <Square size={14} className="text-slate-200 group-hover:text-slate-300" />
                                                )}
                                            </div>
                                            <span className={cn(
                                                "text-[11px] font-bold truncate transition-colors",
                                                isActive ? "text-slate-700" : "text-slate-400 group-hover:text-slate-500"
                                            )}>
                                                {p.name}
                                            </span>
                                            <div 
                                                className="ml-auto w-1.5 h-1.5 rounded-full" 
                                                style={{ backgroundColor: p.color || '#ccc' }}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

