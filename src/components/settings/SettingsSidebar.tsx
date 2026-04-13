"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import { useAuthStore } from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Globe, 
    Shield, 
    Zap, 
    Database, 
    Sliders, 
    Wallet, 
    ChevronLeft, 
    ChevronRight, 
    LogOut, 
    User,
    Settings,
    Home,
    Palette
} from "lucide-react";
import { NousLogo } from "@/components/dom/NousLogo";
import { ProjectSelector } from "@/components/dashboard/ProjectSelector";
import { useProjectStore } from "@/store/useProjectStore";

export const AGENCY_SECTIONS = [
    { id: "profile", label: "Mi Perfil", icon: User, href: "/settings/agency/profile" },
    { id: "connections", label: "Bóveda", icon: Zap, href: "/settings/agency/connections" },
    { id: "teams", label: "Equipos", icon: Shield, href: "/settings/agency/teams" },
    { id: "projects", label: "Proyectos", icon: Database, href: "/settings/agency/projects" },
];

export const PROJECT_SECTIONS = [
    { id: "general", label: "Identidad", icon: Globe, href: "/general" },
    { id: "connectivity", label: "Conectividad", icon: Zap, href: "/connectivity" },
    { id: "inventory", label: "Inventario", icon: Database, href: "/inventory" },
    { id: "preferences", label: "Preferencias", icon: Settings, href: "/preferences" },
    { id: "images", label: "Imágenes", icon: Palette, href: "/images" },
    { id: "i18n", label: "I18n & Audit", icon: Globe, href: "/i18n" },
    { id: "tools", label: "Herramientas", icon: Sliders, href: "/tools" },
    { id: "budget", label: "Presupuesto", icon: Wallet, href: "/budget" },
];

export function SettingsSidebar() {
    const pathname = usePathname();
    const { user, signOut } = useAuthStore();
    const { activeProject } = useProjectStore();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const isProjectContext = pathname.includes("/settings/projects/");
    const projectId = isProjectContext ? pathname.split("/")[3] : activeProject?.id;

    // Stable section mapping
    const sections = isProjectContext ? PROJECT_SECTIONS : AGENCY_SECTIONS;
    const contextKey = isProjectContext ? `project-${projectId}` : "agency";

    return (
        <motion.aside 
            animate={{ width: isCollapsed ? 72 : 240 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="shrink-0 h-full flex flex-col bg-white border-r border-slate-100/80 shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative z-50"
        >
            {/* Header: Minimalist Logo */}
            <div className="h-20 shrink-0 flex items-center px-6 mb-4">
                <Link href="/" className="flex items-center gap-3 px-2 py-1 group transition-all">
                    <NousLogo isProcessing={false} />
                </Link>
            </div>

            {/* Project Selector Section */}
            {!isCollapsed && (
                <div className="px-4 mb-6 animate-in fade-in duration-500">
                    <ProjectSelector />
                </div>
            )}

            {/* Menu Sections */}
            <div key={contextKey} className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1">
                {isProjectContext && !isCollapsed && (
                    <Link 
                        href="/settings/agency/projects"
                        className="flex items-center gap-2 px-4 py-2 mb-4 text-[9px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest transition-colors group/back"
                    >
                        <ChevronLeft size={12} className="group-hover/back:-translate-x-1 transition-transform" />
                        Volver a Agencia
                    </Link>
                )}

                {!isCollapsed && (
                    <p key={`header-${contextKey}`} className="px-4 py-2 text-[8px] font-black text-slate-300 uppercase tracking-widest mb-2">
                        {isProjectContext ? `Configuración: ${activeProject?.name || 'Proyecto'}` : 'Gestión Agencia'}
                    </p>
                )}
                
                {sections.map((section) => {
                    const fullHref = isProjectContext 
                        ? `/settings/projects/${projectId}${section.href}`
                        : section.href;
                    
                    const isActive = pathname === fullHref;
                    
                    return (
                        <Link
                            key={section.id}
                            href={fullHref}
                            className={cn(
                                "h-11 flex items-center rounded-xl transition-all group relative overflow-hidden",
                                isCollapsed ? "justify-center px-0" : "px-4",
                                isActive
                                    ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10"
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                            )}
                        >
                            <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                <section.icon
                                    size={18}
                                    className={cn(
                                        "transition-transform group-hover:scale-110",
                                        isActive ? "text-indigo-400" : "opacity-70 group-hover:opacity-100"
                                    )}
                                />
                            </div>

                            {!isCollapsed && (
                                <span className="ml-3 text-[11px] font-bold uppercase tracking-tight">
                                    {section.label}
                                </span>
                            )}

                            {isActive && !isCollapsed && (
                                <motion.div 
                                    layoutId="active-pill"
                                    className="ml-auto w-1 h-4 bg-indigo-500 rounded-full"
                                />
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* Sub-actions: Back to Dashboard */}
            <div className="px-3 mb-4">
                <Link
                    href="/contents"
                    className={cn(
                        "h-10 flex items-center rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all",
                        isCollapsed ? "justify-center px-0" : "px-4"
                    )}
                >
                    <Home size={16} />
                    {!isCollapsed && <span className="ml-3 text-[10px] font-black uppercase tracking-widest">Dashboard</span>}
                </Link>
            </div>

            {/* Footer: User Profile & Collapse */}
            <div className="p-4 border-t border-slate-100/60 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="relative group/profile shrink-0">
                        <button 
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden hover:border-indigo-400 transition-all cursor-pointer"
                        >
                            {user?.user_metadata?.avatar_url ? (
                                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User size={18} className="text-slate-400" />
                            )}
                        </button>
                        
                        {showProfileMenu && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="absolute bottom-full left-0 mb-3 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-[110]"
                            >
                                <div className="px-3 py-2 mb-2 border-b border-slate-50">
                                    <p className="text-[9px] font-black tracking-widest text-slate-300 uppercase">Sesión Iniciada</p>
                                    <p className="text-[11px] font-bold text-slate-800 truncate">{user?.email}</p>
                                </div>
                                <button 
                                    onClick={signOut}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <LogOut size={16} />
                                    Cerrar Sesión
                                </button>
                            </motion.div>
                        )}
                    </div>

                    {!isCollapsed && (
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black text-slate-900 truncate uppercase tracking-tight">{user?.email?.split('@')[0]}</p>
                            <p className="text-[9px] font-bold text-slate-400 truncate uppercase mt-0.5">Administrador</p>
                        </div>
                    )}

                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={cn(
                            "w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-slate-300 hover:text-slate-600 transition-all border border-transparent hover:border-slate-100",
                            isCollapsed && "mx-auto"
                        )}
                    >
                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>
            </div>
        </motion.aside>
    );
}
