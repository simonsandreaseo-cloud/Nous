"use client";

import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { NousLogo } from "@/components/dom/NousLogo";

export function NavigationHeader() {
    return (
        <div className="absolute top-0 left-0 w-full flex justify-between items-center px-8 md:px-12 py-8 pointer-events-none z-40 transition-all duration-300">
            {/* Logo Section Only */}
            <div className="pointer-events-auto flex items-center gap-6">
                <Link href="/contents" className="cursor-pointer flex items-center gap-2 group">
                    <NousLogo />
                    <span className="text-sm font-black tracking-tighter text-slate-900 group-hover:text-indigo-600 transition-colors uppercase">Nous</span>
                </Link>
            </div>

            {/* Version Badge - Minimalist */}
            <div className="hidden lg:block pointer-events-auto">
                <div className="px-4 py-2 bg-white/40 backdrop-blur-md rounded-full border border-slate-100/50 shadow-sm shadow-slate-950/5">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Clinical Intelligence v2.0</span>
                </div>
            </div>
        </div>
    );
}
