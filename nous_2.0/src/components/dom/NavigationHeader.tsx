"use client";

import { cn } from "@/utils/cn";
import { Link } from "lucide-react"; // Using Link as placeholder if needed, or just text

export function NavigationHeader() {
    return (
        <div className="absolute top-0 left-0 w-full flex justify-between items-center px-6 md:px-12 py-8 pointer-events-none z-50 mix-blend-difference text-white md:mix-blend-normal md:text-inherit">
            {/* Logo */}
            <div className="pointer-events-auto">
                <span className="text-2xl font-black tracking-tighter uppercase text-slate-900">
                    NOUS
                </span>
            </div>

            {/* Centered Navigation */}
            <nav className="pointer-events-auto hidden md:flex items-center gap-12">
                {[
                    { label: 'Contenidos', href: '/contents' },
                    { label: 'Careers', href: '#' },
                    { label: 'Contact', href: '#' }
                ].map((item) => (
                    <a
                        key={item.label}
                        href={item.href}
                        className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        {item.label}
                    </a>
                ))}
            </nav>

            {/* Right Action Button */}
            <div className="pointer-events-auto">
                <button className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg">
                    Download App
                </button>
            </div>
        </div>
    );
}
