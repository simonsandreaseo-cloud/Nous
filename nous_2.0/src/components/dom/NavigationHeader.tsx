"use client";

import { cn } from "@/utils/cn";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, LogOut, Wrench, ChevronDown, ChevronRight, FileText, Bot, LayoutTemplate, Calendar, Search, Activity, Building2, Settings, Wand2, Monitor, Cpu } from "lucide-react";
import { ProjectSelector } from "@/components/dashboard/ProjectSelector";
import { NeuralLinkStatus } from "@/components/dashboard/NeuralLinkStatus";
import { NousLogo } from "@/components/dom/NousLogo";

export function NavigationHeader() {
    const { user, signOut } = useAuthStore();
    const pathname = usePathname();

    const getSectionLabel = () => {
        if (pathname?.includes('/seo')) return "SEO On Page";
        if (pathname?.includes('/monitor')) return "Monitor";
        if (pathname?.includes('/estrategia')) return "Estrategia";
        if (pathname?.includes('/office')) return "Oficina";
        return "Contenidos";
    };

    return (
        <div className="absolute top-0 left-0 w-full flex justify-between items-center px-8 md:px-12 py-6 pointer-events-none z-40 transition-all duration-300">
            {/* Logo */}
            <div className="pointer-events-auto flex items-center gap-6">
                <Link href="/" className="cursor-pointer flex items-center gap-3">
                    <NousLogo />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mt-1">{getSectionLabel()}</span>
                </Link>
                <div className="h-4 w-px bg-slate-200" />
                {/* Project Selector embedded in header */}
                <ProjectSelector />
                <div className="h-4 w-px bg-slate-200" />
                <NeuralLinkStatus />
            </div>

            {/* Centered Navigation */}
            <nav className="pointer-events-auto hidden md:flex items-center gap-8">
                {/* Tools Dropdown */}
                <div className="relative group">
                    <button className="flex items-center gap-2 text-sm font-medium text-slate-500 group-hover:text-slate-900 transition-colors py-2 outline-none">
                        <Wrench size={16} />
                        Herramientas
                        <ChevronDown size={14} className="transition-transform group-hover:rotate-180 duration-300" />
                    </button>

                    {/* First Level Menu */}
                    <div className="absolute top-full left-0 mt-2 w-64 glass-panel rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 transition-all duration-300 ease-out p-2 origin-top-left z-50">

                        {/* Contenidos - Nested Submenu Trigger */}
                        <div className="relative group/nested">
                            <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all">
                                <div className="flex items-center gap-3">
                                    <FileText size={16} className="text-blue-500" />
                                    <span>Contenidos</span>
                                </div>
                                <ChevronRight size={14} className="text-slate-400 group-hover/nested:text-slate-600 group-hover/nested:translate-x-0.5 transition-all" />
                            </button>

                            {/* Second Level Menu */}
                            <div className="absolute left-full top-0 ml-3 w-60 glass-panel rounded-lg opacity-0 invisible group-hover/nested:opacity-100 group-hover/nested:visible translate-x-[-10px] group-hover/nested:translate-x-0 transition-all duration-300 ease-out p-2 origin-top-left">
                                <div className="space-y-1">
                                    <Link href="/contents" className="block px-3 py-2.5 rounded-md hover:bg-slate-100/80 transition-all group/item">
                                        <div className="flex items-center gap-3 mb-0.5">
                                            <FileText size={16} className="text-blue-500" />
                                            <span className="text-sm font-medium text-slate-700 group-hover/item:text-slate-900">Dashboard</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium pl-7">Vista general</p>
                                    </Link>
                                    <Link href="/contents/writer" className="block px-3 py-2.5 rounded-md hover:bg-slate-100/80 transition-all group/item">
                                        <div className="flex items-center gap-3 mb-0.5">
                                            <Bot size={16} className="text-purple-500" />
                                            <span className="text-sm font-medium text-slate-700 group-hover/item:text-slate-900">Redactor IA</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium pl-7">Generación de contenido</p>
                                    </Link>
                                    <Link href="/studio/distribution" className="block px-3 py-2.5 rounded-md hover:bg-slate-100/80 transition-all group/item">
                                        <div className="flex items-center gap-3 mb-0.5">
                                            <LayoutTemplate size={16} className="text-indigo-500" />
                                            <span className="text-sm font-medium text-slate-700 group-hover/item:text-slate-900">Distribución</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium pl-7">Nous Bridge WP</p>
                                    </Link>
                                    <Link href="/contents/refinery" className="block px-3 py-2.5 rounded-md hover:bg-slate-100/80 transition-all group/item">
                                        <div className="flex items-center gap-3 mb-0.5">
                                            <Wand2 size={16} className="text-pink-500" />
                                            <span className="text-sm font-medium text-slate-700 group-hover/item:text-slate-900">Refinería</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium pl-7">Humanizador 0%</p>
                                    </Link>
                                    <Link href="/contents/images" className="block px-3 py-2.5 rounded-md hover:bg-slate-100/80 transition-all group/item">
                                        <div className="flex items-center gap-3 mb-0.5">
                                            <Wand2 size={16} className="text-emerald-500" />
                                            <span className="text-sm font-medium text-slate-700 group-hover/item:text-slate-900">Imagenes</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium pl-7">BlogViz AI</p>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <Link href="/estrategia" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all">
                            <Calendar size={16} className="text-cyan-500" />
                            <span>Estrategia</span>
                        </Link>

                        <Link href="/seo" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all">
                            <Search size={16} className="text-green-500" />
                            <span>SEO On Page</span>
                        </Link>

                        {/* Monitor - Nested Submenu Trigger */}
                        <div className="relative group/nested">
                            <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all">
                                <div className="flex items-center gap-3">
                                    <Activity size={16} className="text-orange-500" />
                                    <span>Monitor</span>
                                </div>
                                <ChevronRight size={14} className="text-slate-400 group-hover/nested:text-slate-600 group-hover/nested:translate-x-0.5 transition-all" />
                            </button>

                            {/* Second Level Menu */}
                            <div className="absolute left-full top-0 ml-3 w-60 glass-panel rounded-lg opacity-0 invisible group-hover/nested:opacity-100 group-hover/nested:visible translate-x-[-10px] group-hover/nested:translate-x-0 transition-all duration-300 ease-out p-2 origin-top-left">
                                <div className="space-y-1">
                                    <Link href="/monitor" className="block px-3 py-2.5 rounded-md hover:bg-slate-100/80 transition-all group/item">
                                        <div className="flex items-center gap-3 mb-0.5">
                                            <Cpu size={16} className="text-purple-500" />
                                            <span className="text-sm font-medium text-slate-700 group-hover/item:text-slate-900">Helios IA</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium pl-7">Auditoría Neural & Errores</p>
                                    </Link>
                                    <Link href="/herramientas/generador-informes" className="block px-3 py-2.5 rounded-md hover:bg-slate-100/80 transition-all group/item">
                                        <div className="flex items-center gap-3 mb-0.5">
                                            <FileText size={16} className="text-purple-500" />
                                            <span className="text-sm font-medium text-slate-700 group-hover/item:text-slate-900">Informes IA</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium pl-7">Deep Report Generator</p>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100 my-1 mx-2"></div>

                        <Link href="/office" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all">
                            <Building2 size={16} className="text-slate-500" />
                            <span>Oficina</span>
                        </Link>
                    </div>
                </div>

            </nav>

            {/* Right Action Button Cluster */}
            <div className="pointer-events-auto flex items-center gap-6">
                {/* Utilities moved here from center nav */}
                <div className="hidden lg:flex items-center gap-6 border-r border-slate-100 pr-6">
                    <Link href="/auth/desktop-launch" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-all group">
                        <Monitor size={16} className="text-slate-400 group-hover:text-cyan-500 transition-colors" />
                        <span className="hidden xl:inline uppercase tracking-widest text-[10px]">Lanzar Motor</span>
                    </Link>

                    <Link href="/settings" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-all group">
                        <Settings size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        <span className="hidden xl:inline uppercase tracking-widest text-[10px]">Configuración</span>
                    </Link>
                </div>

                {user ? (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/50 border border-slate-200">
                            <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] text-white font-bold">
                                {user.email?.[0].toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-slate-600 truncate max-w-[100px]">
                                {user.email?.split('@')[0]}
                            </span>
                        </div>
                        <button
                            onClick={() => signOut()}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                            title="Desconectarse"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                ) : (
                        <Link
                            href="/auth"
                            className="bg-slate-900 text-white px-7 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-cyan-600 transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2"
                        >
                            <User size={14} />
                            Entrar
                        </Link>
                )}
            </div>
        </div>
    );
}
