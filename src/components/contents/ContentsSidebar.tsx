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
    Monitor, 
    Building2, 
    CalendarDays, 
    User, 
    ChevronLeft, 
    ChevronRight, 
    LogOut, 
    ChevronDown, 
    Settings,
    Loader2,
    Grid,
    BarChart3,
    Compass,
    FileBarChart2,
    PenLine,
    CheckSquare,
    Square,
    Share2,
    Image as ImageIcon,
    Languages,
    Sliders,
    Settings2,
    ChevronsRight
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";



import { useWriterStore } from "@/store/useWriterStore";
import { useShallow } from "zustand/react/shallow";

const GLOBAL_AREAS = [
    { id: "contenidos", label: "Contenidos", icon: Home, href: "/contents" },
    { id: "informes", label: "Informes", icon: FileBarChart2, href: "/informes" },
    { id: "estrategia", label: "Estrategia", icon: CalendarDays, mockup: true },
    { id: "seo", label: "SEO On Page", icon: Search, mockup: true },
    { id: "monitor", label: "Monitor", icon: Monitor, mockup: true },
    { id: "oficina", label: "Oficina", icon: Building2, mockup: true },
];

                                    onClick={() => setIsCollapsed(false)}
                                    className="p-1 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all shadow-sm border border-indigo-100"
                                    title="Desfijar Panel"
                                >
                                    <ChevronsRight size={12} />
                                </button>
                            )}
                            <button 
                                onClick={() => user ? setShowProfileMenu(!showProfileMenu) : signInWithGoogle()}
                                className="w-10 h-10 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden hover:border-indigo-400 transition-all cursor-pointer"
                            >
                                {mounted && user?.user_metadata?.avatar_url ? (
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
                                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl p-2 z-[110]"
                                    >
                                        <div className="px-3 py-2 mb-1">
                                            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Perfil</p>
                                            <p className="text-xs font-bold text-slate-800 truncate">{user.email}</p>
                                        </div>
                                        <button 
                                            onClick={signOut}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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
                            className="flex-1 h-10 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 border border-transparent transition-all overflow-hidden"
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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (isCollapsed) {
        return (
            <div className="py-4 border-b border-slate-100/60 flex justify-center">
                <div className="relative">
                    {isLoading || !mounted ? (
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
                            <span className="ml-1 text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">{mounted ? activeProjectIds.length : 0}</span>
                        </span>
                        <ChevronDown size={12} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
                    </button>
                    {(isLoading || !mounted) && <Loader2 size={10} className="text-indigo-400 animate-spin" />}
                </div>
                
                <Link 
                    href="/settings" 
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white text-slate-300 hover:text-slate-600 transition-all border border-transparent hover:border-slate-100"
                    title="Configuración de Proyectos"
                >
                    {!isCollapsed && <span className="text-[10px] font-bold uppercase tracking-tight">Configuraciones</span>}
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
                                {mounted && projects.map(p => {
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

