"use client";

import { cn } from "@/utils/cn";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { User, LogOut, Wrench, ChevronDown, ChevronRight, FileText, Bot, LayoutTemplate, Calendar, Search, Activity, Building2, Settings } from "lucide-react";
import { ProjectSelector } from "@/components/dashboard/ProjectSelector";

export function NavigationHeader() {
    const { user, signOut } = useAuthStore();

    return (
        <div className="absolute top-0 left-0 w-full flex justify-between items-center px-6 md:px-12 py-8 pointer-events-none z-50 mix-blend-difference text-white md:mix-blend-normal md:text-inherit">
            {/* Logo */}
            <div className="pointer-events-auto flex items-center gap-8">
                <Link href="/" className="text-2xl font-black tracking-tighter uppercase text-slate-900 cursor-pointer">
                    NOUS
                </Link>
                {/* Project Selector embedded in header */}
                <ProjectSelector />
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
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 transition-all duration-300 ease-out p-2 origin-top-left z-50">

                        {/* Contenidos - Nested Submenu Trigger */}
                        <div className="relative group/nested">
                            <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all">
                                <div className="flex items-center gap-3">
                                    <FileText size={16} className="text-blue-500" />
                                    <span>Contenidos</span>
                                </div>
                                <ChevronRight size={14} className="text-slate-400 group-hover/nested:text-slate-600 group-hover/nested:translate-x-0.5 transition-all" />
                            </button>

                            {/* Second Level Menu */}
                            <div className="absolute left-full top-0 ml-3 w-60 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-2xl opacity-0 invisible group-hover/nested:opacity-100 group-hover/nested:visible translate-x-[-10px] group-hover/nested:translate-x-0 transition-all duration-300 ease-out p-2 origin-top-left">
                                <div className="space-y-1">
                                    <Link href="/contents/writer" className="block px-3 py-2.5 rounded-xl hover:bg-slate-100/80 transition-all group/item">
                                        <div className="flex items-center gap-3 mb-0.5">
                                            <Bot size={16} className="text-purple-500" />
                                            <span className="text-sm font-medium text-slate-700 group-hover/item:text-slate-900">Redactor IA</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium pl-7">Generación de contenido</p>
                                    </Link>
                                    <Link href="/contents" className="block px-3 py-2.5 rounded-xl hover:bg-slate-100/80 transition-all group/item">
                                        <div className="flex items-center gap-3 mb-0.5">
                                            <LayoutTemplate size={16} className="text-indigo-500" />
                                            <span className="text-sm font-medium text-slate-700 group-hover/item:text-slate-900">Maquetadores</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium pl-7">Agentes de diseño</p>
                                    </Link>
                                    <Link href="/contents" className="block px-3 py-2.5 rounded-xl hover:bg-slate-100/80 transition-all group/item">
                                        <div className="flex items-center gap-3 mb-0.5">
                                            <Calendar size={16} className="text-cyan-500" />
                                            <span className="text-sm font-medium text-slate-700 group-hover/item:text-slate-900">Estrategia</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium pl-7">Calendario y Planificación</p>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100 my-1 mx-2"></div>

                        {/* Other Menu Items */}
                        <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all">
                            <Search size={16} className="text-green-500" />
                            <span>SEO On Page</span>
                        </Link>

                        <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all">
                            <Activity size={16} className="text-orange-500" />
                            <span>Monitoreo</span>
                        </Link>

                        <div className="h-px bg-slate-100 my-1 mx-2"></div>

                        <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all">
                            <Building2 size={16} className="text-slate-500" />
                            <span>Oficina</span>
                        </Link>
                    </div>
                </div>

                <Link href="/settings" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                    <Settings size={16} />
                    Configuración
                </Link>
            </nav>

            {/* Right Action Button */}
            <div className="pointer-events-auto flex items-center gap-4">
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
                        className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2"
                    >
                        <User size={14} />
                        Entrar
                    </Link>
                )}
            </div>
        </div>
    );
}
