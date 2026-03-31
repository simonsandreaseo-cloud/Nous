"use client";

import { cn } from "@/utils/cn";
import { ChevronLeft, ChevronRight, Key, AlertCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { useWriterStore } from "@/store/useWriterStore";
import { useProjectStore } from "@/store/useProjectStore";

// Simple monthly calendar view
export function ArticleCalendar() {
    const { projectContents } = useWriterStore();
    const { activeProjectIds, projects } = useProjectStore();
    
    // Default to current month
    const [currentDate, setCurrentDate] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleString("es", { month: "long", year: "numeric" });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    // Map content to calendar needs
    const articles = useMemo(() => {
        return projectContents.filter(c => activeProjectIds.includes(c.project_id));
    }, [projectContents, activeProjectIds]);

    const getArticlesForDay = (day: number) =>
        articles.filter(a => {
            const d = new Date(a.created_at); // Using created_at as fallback for scheduledDate
            return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
        });

    // Build calendar cells
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let i = 1; i <= daysInMonth; i++) cells.push(i);

    const STATUS_COLORS: Record<string, string> = {
        drafting: "bg-amber-50 text-amber-600 border-amber-100",
        ready: "bg-emerald-50 text-emerald-600 border-emerald-100",
        published: "bg-slate-100 text-slate-500 border-slate-200",
        archived: "bg-rose-50 text-rose-400 border-rose-100",
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header info */}
            <div className="flex items-center justify-between bg-white/40 backdrop-blur-md p-4 rounded-[24px] border border-slate-100 shadow-sm">
                <div className="flex flex-col">
                    <h2 className="text-lg font-black text-slate-800 capitalize leading-none mb-1">{monthName}</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {articles.length} contenidos programados
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-500 hover:border-indigo-100 transition-all shadow-sm"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-500 hover:border-indigo-100 transition-all shadow-sm"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Grid structure */}
            <div className="bg-white/60 backdrop-blur-xl border border-slate-100 rounded-[32px] overflow-hidden shadow-sm p-4">
                <div className="grid grid-cols-7 gap-2">
                    {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(d => (
                        <div key={d} className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-300 text-center py-3">{d}</div>
                    ))}
                    
                    {cells.map((day, i) => {
                        if (day === null) return <div key={`empty-${i}`} className="min-h-[120px] rounded-2xl bg-slate-50/30 border border-transparent" />;
                        
                        const dayArticles = getArticlesForDay(day);
                        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                        
                        return (
                            <div
                                key={day}
                                className={cn(
                                    "min-h-[120px] rounded-2xl p-2.5 border transition-all relative group",
                                    isToday 
                                        ? "border-indigo-200 bg-indigo-50/30 shadow-sm" 
                                        : "border-slate-100 bg-white/40 hover:bg-white hover:shadow-md hover:border-indigo-100"
                                )}
                            >
                                <span className={cn(
                                    "text-xs font-black mb-2 block",
                                    isToday ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                                )}>{day}</span>
                                
                                <div className="space-y-1.5 overflow-y-auto max-h-[85px] custom-scrollbar">
                                    {dayArticles.map(a => (
                                        <div 
                                            key={a.id} 
                                            className={cn(
                                                "text-[9px] font-bold px-2 py-1 rounded-lg border truncate transition-transform active:scale-95 cursor-pointer shadow-sm", 
                                                STATUS_COLORS[a.status] || STATUS_COLORS.drafting
                                            )}
                                            title={a.title}
                                        >
                                            {a.title}
                                        </div>
                                    ))}
                                </div>

                                {dayArticles.length === 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity">
                                        <div className="w-8 h-8 rounded-full border-2 border-slate-900" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Empty state if month has no articles */}
            {articles.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-slate-300 bg-white/20 rounded-[32px] border-2 border-dashed border-slate-100">
                    <AlertCircle size={48} className="mb-4 opacity-10" />
                    <p className="text-sm font-black uppercase tracking-widest opacity-20">Sin contenidos para este período</p>
                </div>
            )}
        </div>
    );
}
