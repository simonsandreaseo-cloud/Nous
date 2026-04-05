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
    RefreshCw,
    Menu,
    Grid
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";

// ── Global areas (navigate to other sections of Nous) ──────────────────────
const GLOBAL_AREAS = [
    { id: "contenidos", label: "Contenidos", icon: Home, href: "/contents" },
    { id: "estrategia", label: "Estrategia", icon: CalendarDays, href: "/estrategia" },
    { id: "seo", label: "SEO On Page", icon: Search, href: "/seo" },
    { id: "monitor", label: "Monitor", icon: Monitor, href: "/monitor" },
    { id: "oficina", label: "Oficina", icon: Building2, href: "/office" },
];

// ── Content tools (render inside contents without full page reload) ─────────
export const CONTENT_TOOLS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-[var(--color-nous-mint)]" },
    { id: "planner", label: "Planificador", icon: CalendarDays, color: "text-[var(--color-nous-mist)]" },
    { id: "writer", label: "Redactor", icon: PenLine, color: "text-[var(--color-nous-lavender)]" },
    { id: "publisher", label: "Distribución", icon: LayoutTemplate, color: "text-indigo-400" },
    { id: "tests", label: "Pruebas", icon: FlaskConical, color: "text-amber-500" },
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
    const [sectionMenuOpen, setSectionMenuOpen] = useState(false);

    // Identify current core section
    const currentGlobalArea = GLOBAL_AREAS.find(a => a.id === activeTool) || GLOBAL_AREAS[0];

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
            className="shrink-0 h-full flex flex-col bg-[#0A0D14] border-hairline rounded-lg overflow-hidden shadow-sm relative z-50 bg-white/60 backdrop-blur-xl"
        >
            {/* Section Switcher (Canva Style) */}
            <div className="h-16 shrink-0 flex items-center px-3 border-b border-slate-100/60 relative ">
                <button 
                    onClick={() => setSectionMenuOpen(!sectionMenuOpen)}
                    className={cn(
                        "w-full h-11 flex items-center px-3 rounded-lg transition-all group relative overflow-hidden",
                        sectionMenuOpen ? "bg-slate-900 text-white" : "hover:bg-slate-50 text-slate-700"
                    )}
                >
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <Grid size={16} className={cn(sectionMenuOpen ? "text-white" : "text-indigo-600")} />
                    </div>
                    
                    {!isCollapsed && (
                        <div className="ml-3 flex-1 flex items-center justify-between overflow-hidden">
                            <span className="text-xs font-black uppercase tracking-widest truncate">{currentGlobalArea.label}</span>
                            <ChevronDown size={14} className={cn("transition-transform ml-2", sectionMenuOpen && "rotate-180")} />
                        </div>
                    )}
                </button>

                {/* Dropdown Menu for Global Areas */}
                <AnimatePresence>
                    {sectionMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute top-full left-3 right-3 mt-1 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-lg shadow-xl p-2 z-[100] animate-in slide-in-from-top-4"
                        >
                            <p className="px-3 py-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Cambiar Sección</p>
                            {GLOBAL_AREAS.filter(area => area.id !== currentGlobalArea.id).map((area) => (
                                <Link
                                    key={area.id}
                                    href={area.href}
                                    onClick={() => setSectionMenuOpen(false)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-bold text-slate-600 hover:bg-slate-900 hover:text-white transition-all group"
                                >
                                    <area.icon size={16} className="text-slate-400 group-hover:text-white/70" />
                                    {area.label}
                                </Link>
                            ))}
                            <div className="h-px bg-slate-100 my-1 mx-2" />
                            <Link
                                href="/office"
                                onClick={() => setSectionMenuOpen(false)}
                                className="w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                                <Settings size={14} />
                                Configuración
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Project Selector Mini-Module */}
            <ProjectSelector isCollapsed={isCollapsed} />



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
                                "w-full h-11 flex items-center px-3 rounded-lg transition-all group relative overflow-hidden shrink-0",
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

            {/* Footer: User Profile + Collapse Toggle */}
            <div className="p-3 border-t border-slate-100/60 shrink-0 ">
                <div className="flex items-center gap-2">
                    {/* User Profile Hook */}
                    <div className="relative group/profile shrink-0">
                        <button 
                            onClick={() => user ? setShowProfileMenu(!showProfileMenu) : signInWithGoogle()}
                            className="w-10 h-10 rounded-md bg-white shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden hover:border-indigo-400 transition-all cursor-pointer"
                        >
                            {user?.user_metadata?.avatar_url ? (
                                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User size={16} className="text-slate-400" />
                            )}
                        </button>
                        
                        {/* Dropdown if user is logged in (Bottom-up menu) */}
                        <AnimatePresence>
                            {user && showProfileMenu && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                    className="absolute bottom-full left-0 mb-3 w-48 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-lg shadow-xl p-2 z-[110]"
                                >
                                    <div className="px-3 py-2 mb-1">
                                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Perfil</p>
                                        <p className="text-xs font-bold text-slate-800 truncate">{user.email}</p>
                                    </div>
                                    <button 
                                        onClick={signOut}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                    >
                                        <LogOut size={14} />
                                        Cerrar Sesión
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Collapse Button */}
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="flex-1 h-10 flex items-center justify-center rounded-md bg-slate-50 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 border border-transparent transition-all overflow-hidden"
                    >
                        {isCollapsed ? <ChevronRight size={18} /> : (
                            <div className="flex items-center gap-2 px-2 w-full">
                                <ChevronLeft size={18} />
                                <span className="text-[9px] font-black uppercase tracking-widest truncate">Fijar Panel</span>
                            </div>
                        )}
                    </button>
                </div>
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
                        <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <Loader2 size={14} className="text-indigo-400 animate-spin" />
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-600">
                            {activeProjectIds.length}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="px-3 py-4 border-b border-slate-100/60  backdrop-blur-sm">
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
                            <div className="flex items-center justify-between px-2 py-1 mb-2 bg-slate-50 rounded-md">
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
                                                "w-full flex items-center gap-2 p-2 rounded-md transition-all border group",
                                                isActive 
                                                    ? "bg-white border-slate-100 shadow-sm" 
                                                    : "bg-transparent border-transparent hover:"
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

