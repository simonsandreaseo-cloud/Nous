"use client";

import { MOCK_ARTICLES, Article } from "./ArticleCardGrid";
import { cn } from "@/utils/cn";
import { ChevronLeft, ChevronRight, Key } from "lucide-react";
import { useState } from "react";

// Simple monthly calendar view
export function ArticleCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1)); // March 2026

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleString("es", { month: "long", year: "numeric" });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    // Build calendar cells
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let i = 1; i <= daysInMonth; i++) cells.push(i);

    const getArticlesForDay = (day: number) =>
        MOCK_ARTICLES.filter(a => {
            const d = new Date(a.scheduledDate);
            return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
        });

    const STATUS_COLORS: Record<string, string> = {
        planned: "bg-[var(--color-nous-mist)]/20 text-[var(--color-nous-mist)]",
        "in-progress": "bg-[var(--color-nous-lavender)]/20 text-[var(--color-nous-lavender)]",
        ready: "bg-[var(--color-nous-mint)]/20 text-emerald-600",
        published: "bg-slate-100 text-slate-500",
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Month nav */}
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700 capitalize">{monthName}</h2>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1">
                {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(d => (
                    <div key={d} className="text-[9px] font-black tracking-widest uppercase text-slate-300 text-center py-1">{d}</div>
                ))}
                {cells.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} />;
                    const articles = getArticlesForDay(day);
                    const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                    return (
                        <div
                            key={day}
                            className={cn(
                                "min-h-[80px] rounded-xl p-1.5 border transition-colors",
                                isToday ? "border-[var(--color-nous-mist)]/40 bg-[var(--color-nous-mist)]/5" : "border-slate-100 bg-white/40 hover:bg-white/70"
                            )}
                        >
                            <span className={cn(
                                "text-[11px] font-bold block mb-1",
                                isToday ? "text-[var(--color-nous-mist)]" : "text-slate-500"
                            )}>{day}</span>
                            <div className="space-y-1">
                                {articles.slice(0, 2).map(a => (
                                    <div key={a.id} className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate", STATUS_COLORS[a.status])}>
                                        {a.title}
                                    </div>
                                ))}
                                {articles.length > 2 && (
                                    <div className="text-[9px] text-slate-400 font-bold px-1">+{articles.length - 2} más</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
