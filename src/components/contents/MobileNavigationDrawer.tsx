'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    CalendarDays, 
    PenLine, 
    Sliders, 
    Terminal, 
    Settings, 
    ChevronDown, 
    CheckSquare, 
    Square, 
    User, 
    LogOut, 
    Loader2 
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useProjectStore } from '@/store/useProjectStore';
import { NousLogo } from '@/components/dom/NousLogo';

interface MobileNavigationDrawerProps {
    activeTool: string;
    onToolSelect: (toolId: string) => void;
}

export const MOBILE_NAV_TOOLS = [
    { id: 'writer', label: 'Studio', icon: PenLine, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'planner', label: 'Planificador', icon: CalendarDays, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: 'mini_tools', label: 'Mini Tools', icon: Sliders, color: 'text-sky-500', bg: 'bg-sky-50' },
    { id: 'nous', label: 'Consola', icon: Terminal, color: 'text-violet-500', bg: 'bg-violet-50' },
];

export function MobileNavigationDrawer({ activeTool, onToolSelect }: MobileNavigationDrawerProps) {
    const { isMobileMenuOpen, setIsMobileMenuOpen } = useAppStore();
    const { user, signInWithGoogle, signOut } = useAuthStore();
    const { projects, activeProjectIds, toggleProjectActive, setAllProjectsActive, isLoading } = useProjectStore();
    const [isProjectsExpanded, setIsProjectsExpanded] = useState(false);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close drawer when route changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname, setIsMobileMenuOpen]);

    const handleSelect = (toolId: string) => {
        onToolSelect(toolId);
        setIsMobileMenuOpen(false);
    };

    return (
        <AnimatePresence>
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
                    />

                    {/* Drawer Panel */}
                    <motion.aside
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                        className="relative w-[82%] max-w-[320px] h-full bg-white flex flex-col z-10 shadow-2xl border-r border-slate-200/80 overflow-hidden"
                    >
                        {/* Header: Logo and Close */}
                        <div className="h-16 shrink-0 flex items-center justify-between px-5 border-b border-slate-100 bg-white">
                            <div className="flex items-center gap-2.5">
                                <NousLogo showText={false} className="scale-75" />
                                <span className="font-extrabold text-slate-800 text-sm tracking-tight">
                                    NOUS
                                </span>
                            </div>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors active:scale-95"
                                aria-label="Cerrar menú"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar py-4 px-3 space-y-5">
                            {/* Proyectos Activos Section */}
                            <div className="bg-slate-50/80 rounded-2xl border border-slate-100/80 p-3">
                                <button
                                    onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
                                    className="w-full flex items-center justify-between text-left group"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            Proyectos Activos
                                        </span>
                                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md">
                                            {mounted ? activeProjectIds.length : 0}
                                        </span>
                                        {(isLoading || !mounted) && (
                                            <Loader2 size={12} className="text-indigo-400 animate-spin" />
                                        )}
                                    </div>
                                    <ChevronDown
                                        size={14}
                                        className={cn(
                                            'text-slate-400 transition-transform duration-200',
                                            isProjectsExpanded && 'rotate-180'
                                        )}
                                    />
                                </button>

                                <AnimatePresence>
                                    {isProjectsExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden pt-3 space-y-2"
                                        >
                                            <div className="flex items-center justify-between px-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                <button
                                                    onClick={() => setAllProjectsActive(true)}
                                                    className="hover:text-indigo-600 transition-colors"
                                                >
                                                    Todos
                                                </button>
                                                <span>•</span>
                                                <button
                                                    onClick={() => setAllProjectsActive(false)}
                                                    className="hover:text-rose-600 transition-colors"
                                                >
                                                    Ninguno
                                                </button>
                                            </div>

                                            <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                                {mounted && projects.map((p) => {
                                                    const isActive = activeProjectIds.includes(p.id);
                                                    return (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => toggleProjectActive(p.id)}
                                                            className={cn(
                                                                'w-full flex items-center gap-2 p-2 rounded-xl text-left transition-all text-xs font-semibold',
                                                                isActive
                                                                    ? 'bg-white text-slate-800 shadow-xs border border-slate-100'
                                                                    : 'text-slate-400 hover:bg-white/60'
                                                            )}
                                                        >
                                                            {isActive ? (
                                                                <CheckSquare size={14} className="text-indigo-500 shrink-0" />
                                                            ) : (
                                                                <Square size={14} className="text-slate-300 shrink-0" />
                                                            )}
                                                            <span className="truncate flex-1">{p.name}</span>
                                                            <div
                                                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                                                style={{ backgroundColor: p.color || '#6366f1' }}
                                                            />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Core Navigation Tools */}
                            <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 px-3 mb-1 block">
                                    Herramientas Principales
                                </span>

                                {MOBILE_NAV_TOOLS.map((tool) => {
                                    const isActive = activeTool === tool.id;
                                    const Icon = tool.icon;
                                    return (
                                        <button
                                            key={tool.id}
                                            onClick={() => handleSelect(tool.id)}
                                            className={cn(
                                                'w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all text-left group',
                                                isActive
                                                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                                                    : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                                                    isActive ? 'bg-white/10 text-white' : cn(tool.bg, tool.color)
                                                )}
                                            >
                                                <Icon size={16} />
                                            </div>
                                            <span className="uppercase tracking-tight font-extrabold text-[11px]">
                                                {tool.label}
                                            </span>
                                            {isActive && (
                                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                            )}
                                        </button>
                                    );
                                })}

                                {/* Configuraciones Link */}
                                <Link
                                    href="/settings"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 transition-all text-left"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                                        <Settings size={16} />
                                    </div>
                                    <span className="uppercase tracking-tight font-extrabold text-[11px]">
                                        Configuraciones
                                    </span>
                                </Link>
                            </div>
                        </div>

                        {/* Footer: User Profile */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                            {user ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                            {user?.user_metadata?.avatar_url ? (
                                                <img
                                                    src={user.user_metadata.avatar_url}
                                                    alt="Avatar"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <User size={16} className="text-slate-400" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-extrabold text-slate-800 truncate">
                                                {user.user_metadata?.full_name || 'Usuario Nous'}
                                            </p>
                                            <p className="text-[9px] text-slate-400 truncate">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={signOut}
                                        title="Cerrar sesión"
                                        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                    >
                                        <LogOut size={16} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={signInWithGoogle}
                                    className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-indigo-500 transition-colors text-center"
                                >
                                    Iniciar Sesión
                                </button>
                            )}
                        </div>
                    </motion.aside>
                </div>
            )}
        </AnimatePresence>
    );
}
