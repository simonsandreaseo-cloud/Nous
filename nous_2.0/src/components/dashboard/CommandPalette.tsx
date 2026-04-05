"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Zap,
    Activity,
    FileText,
    Calendar,
    Settings,
    Command as CommandIcon,
    ArrowRight,
    Search as SearchIcon,
    Sparkles,
    Database,
    Home,
    Info
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/useProjectStore";
import { cn } from "@/utils/cn";

export function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();
    const { projects, setActiveProject } = useProjectStore();

    const staticActions = [
        { id: 'home', title: 'Dashboard Principal', icon: Home, shortcut: 'G H', href: '/dashboard' },
        { id: 'helios', title: 'Helios Audit Engine', icon: Activity, shortcut: 'G A', href: '/dashboard/helios' },
        { id: 'writer', title: 'Redactor IA Pro', icon: Sparkles, shortcut: 'G W', href: '/writer' },
        { id: 'strategy', title: 'Calendario Estratégico', icon: Calendar, shortcut: 'G S', href: '/estrategia' },
        { id: 'refinery', title: 'Refinería de Datos', icon: Database, shortcut: 'G R', href: '/estrategia?view=refinery' },
    ];

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.domain.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);

    const filteredActions = staticActions.filter(a =>
        a.title.toLowerCase().includes(query.toLowerCase())
    );

    const results = [
        ...filteredActions.map(a => ({ ...a, type: 'action' })),
        ...filteredProjects.map(p => ({ id: p.id, title: p.name, subtitle: p.domain, icon: SearchIcon, type: 'project', href: `/dashboard` }))
    ];

    const handleSelect = useCallback((item: any) => {
        if (item.type === 'project') {
            setActiveProject(item.id);
        }
        router.push(item.href);
        setIsOpen(false);
        setQuery("");
    }, [router, setActiveProject]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === "Escape") setIsOpen(false);

            if (isOpen) {
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev + 1) % results.length);
                }
                if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
                }
                if (e.key === "Enter" && results[selectedIndex]) {
                    e.preventDefault();
                    handleSelect(results[selectedIndex]);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, results, selectedIndex, handleSelect]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4 bg-slate-950/20 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="w-full max-w-2xl bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
                    >
                        {/* Search Input */}
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-4 relative">
                            <Search className="text-slate-400" size={20} />
                            <input
                                autoFocus
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setSelectedIndex(0);
                                }}
                                placeholder="Escribe un comando o busca un proyecto..."
                                className="flex-1 bg-transparent border-none outline-none text-lg font-bold text-slate-800 placeholder:text-slate-300"
                            />
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400">ESC</span>
                            </div>
                        </div>

                        {/* Results Body */}
                        <div className="flex-1 max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
                            {results.length > 0 ? (
                                <div className="space-y-6 p-2">
                                    {/* Actions Group */}
                                    {filteredActions.length > 0 && (
                                        <div className="space-y-1">
                                            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Accesos Directos</p>
                                            {filteredActions.map((action, i) => {
                                                const globalIdx = i;
                                                return (
                                                    <div
                                                        key={action.id}
                                                        onClick={() => handleSelect(action)}
                                                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                                                        className={cn(
                                                            "flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all",
                                                            selectedIndex === globalIdx ? "bg-slate-50 border-l-4 border-indigo-500" : "bg-transparent border-l-4 border-transparent"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={cn(
                                                                "p-2 rounded-md transition-colors",
                                                                selectedIndex === globalIdx ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-400"
                                                            )}>
                                                                <action.icon size={18} />
                                                            </div>
                                                            <span className={cn(
                                                                "text-sm font-black tracking-tight",
                                                                selectedIndex === globalIdx ? "text-slate-900" : "text-slate-600"
                                                            )}>{action.title}</span>
                                                        </div>
                                                        {action.shortcut && (
                                                            <span className="text-[10px] font-mono font-bold text-slate-300 uppercase letter-spacing-1">{action.shortcut}</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Projects Group */}
                                    {filteredProjects.length > 0 && (
                                        <div className="space-y-1">
                                            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Proyectos Activos</p>
                                            {filteredProjects.map((project, i) => {
                                                const globalIdx = filteredActions.length + i;
                                                return (
                                                    <div
                                                        key={project.id}
                                                        onClick={() => handleSelect({ ...project, type: 'project', href: '/dashboard' })}
                                                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                                                        className={cn(
                                                            "flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all",
                                                            selectedIndex === globalIdx ? "bg-slate-50 border-l-4 border-emerald-500" : "bg-transparent border-l-4 border-transparent"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={cn(
                                                                "p-2 rounded-md transition-colors",
                                                                selectedIndex === globalIdx ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                                                            )}>
                                                                <SearchIcon size={18} />
                                                            </div>
                                                            <div>
                                                                <span className={cn(
                                                                    "text-sm font-black tracking-tight block",
                                                                    selectedIndex === globalIdx ? "text-slate-900" : "text-slate-600"
                                                                )}>{project.name}</span>
                                                                <span className="text-[10px] font-bold text-slate-400">{project.domain}</span>
                                                            </div>
                                                        </div>
                                                        <ArrowRight size={14} className={cn(
                                                            "transition-all",
                                                            selectedIndex === globalIdx ? "text-emerald-500 opacity-100 translate-x-0" : "text-slate-200 opacity-0 -translate-x-2"
                                                        )} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-20 text-center">
                                    <div className="p-4 bg-slate-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                                        <Info className="text-slate-300" size={20} />
                                    </div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No hay resultados neurales para "{query}"</p>
                                </div>
                            )}
                        </div>

                        {/* Footer Tips */}
                        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <ArrowRight size={12} className="text-slate-400" />
                                    <span className="text-[10px] font-semibold text-slate-500">Navegar</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Zap size={12} className="text-slate-400" />
                                    <span className="text-[10px] font-semibold text-slate-500">Ejecutar</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-50">
                                <CommandIcon size={12} className="text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Neural Link Enabled</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
