"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/utils/cn";
import { NousLogo } from "@/components/dom/NousLogo";
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
} from "lucide-react";

// ── Global areas (navigate to other sections of Nous) ──────────────────────
const GLOBAL_AREAS = [
    { id: "contenidos", label: "Contenidos", icon: Home, href: "/contents" },
    { id: "seo", label: "SEO On Page", icon: Search, href: "/seo" },
    { id: "estrategia", label: "Estrategia", icon: BarChart2, href: "/estrategia" },
    { id: "monitor", label: "Monitor", icon: Monitor, href: "/studio/monitor" },
    { id: "oficina", label: "Oficina", icon: Building2, href: "/office" },
];

// ── Content tools (render inside contents without full page reload) ─────────
export const CONTENT_TOOLS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-[var(--color-nous-mint)]" },
    { id: "planner", label: "Planificador", icon: CalendarDays, color: "text-[var(--color-nous-mist)]" },
    { id: "refinery", label: "Refinería", icon: FlaskConical, color: "text-amber-400" },
    { id: "briefings", label: "Briefings", icon: FileText, color: "text-[var(--color-nous-mist)]" },
    { id: "writer", label: "Redactor", icon: PenLine, color: "text-[var(--color-nous-lavender)]" },
    { id: "humanizer", label: "Humanizador", icon: Sparkles, color: "text-pink-400" },
    { id: "images", label: "Imágenes", icon: ImageIcon, color: "text-emerald-400" },
    { id: "interlinking", label: "Interlinking", icon: Link2, color: "text-[var(--color-nous-mist)]" },
    { id: "publisher", label: "Maquetador", icon: LayoutTemplate, color: "text-indigo-400" },
];

interface ContentsSidebarProps {
    activeTool: string;
    onToolSelect: (toolId: string) => void;
}

export function ContentsSidebar({ activeTool, onToolSelect }: ContentsSidebarProps) {
    const pathname = usePathname();

    return (
        <aside className="w-[72px] shrink-0 h-full flex flex-col glass-panel border-hairline rounded-[28px] overflow-hidden overflow-x-hidden">
            {/* Logo */}
            <div className="p-3 flex justify-center items-center border-b border-slate-100/60 h-16 shrink-0">
                <Link href="/" className="flex items-center justify-center">
                    <NousLogo showText={false} className="scale-75 origin-center" />
                </Link>
            </div>

            {/* Global Areas */}
            <nav className="flex flex-col items-center gap-1 py-3 border-b border-slate-100/60 px-2">
                {GLOBAL_AREAS.map((area) => {
                    const isActive = area.id === "contenidos"
                        ? pathname?.startsWith("/contents")
                        : pathname?.startsWith(area.href);
                    return (
                        <Link
                            key={area.id}
                            href={area.href}
                            title={area.label}
                            className={cn(
                                "w-11 h-11 flex items-center justify-center rounded-2xl transition-all group relative",
                                isActive
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-400 hover:text-slate-700 hover:bg-white/60"
                            )}
                        >
                            <area.icon size={18} />
                            {/* Tooltip */}
                            <span className="absolute left-full ml-3 px-2 py-1 text-[10px] font-bold tracking-widest uppercase bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                                {area.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {/* Content Tools (Toolkit) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar py-3 px-2 flex flex-col gap-1">
                <span className="text-[8px] font-black tracking-[0.2em] text-slate-300 uppercase text-center block mb-1">
                    KIT
                </span>
                {CONTENT_TOOLS.map((tool) => {
                    const isActive = activeTool === tool.id;
                    return (
                        <button
                            key={tool.id}
                            title={tool.label}
                            onClick={() => onToolSelect(tool.id)}
                            className={cn(
                                "w-11 h-11 flex items-center justify-center rounded-2xl transition-all group relative mx-auto",
                                isActive
                                    ? "bg-white shadow-sm border border-slate-200"
                                    : "text-slate-400 hover:text-slate-700 hover:bg-white/60"
                            )}
                        >
                            <tool.icon
                                size={16}
                                className={cn(
                                    "transition-colors",
                                    isActive ? tool.color : "text-slate-400 group-hover:text-slate-600"
                                )}
                            />
                            {/* Active indicator dot */}
                            {isActive && (
                                <span className="absolute right-1.5 top-1.5 w-1 h-1 rounded-full bg-[var(--color-nous-mint)]" />
                            )}
                            {/* Tooltip */}
                            <span className="absolute left-full ml-3 px-2 py-1 text-[10px] font-bold tracking-widest uppercase bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                                {tool.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
