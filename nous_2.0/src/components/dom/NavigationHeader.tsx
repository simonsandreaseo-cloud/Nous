"use client";

import { cn } from "@/utils/cn";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { User, LogOut } from "lucide-react";
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
            <nav className="pointer-events-auto hidden md:flex items-center gap-12">
                {[
                    { label: 'Contenidos', href: '/contents' },
                    { label: 'Configuración', href: '/settings' }
                ].map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        {item.label}
                    </Link>
                ))}
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
