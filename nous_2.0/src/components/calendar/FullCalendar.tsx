"use client";

import { useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Plus,
    Clock
} from "lucide-react";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";

export function FullCalendar() {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const firstDayOfMonth = startOfMonth(currentMonth);
    const lastDayOfMonth = endOfMonth(currentMonth);
    const startDate = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 });
    const endDate = endOfWeek(lastDayOfMonth, { weekStartsOn: 1 });

    const days = eachDayOfInterval({
        start: startDate,
        end: endDate
    });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    // Colors for different content types
    const typeColors: Record<string, string> = {
        blog: "bg-purple-100 text-purple-700 border-purple-200",
        social: "bg-pink-100 text-pink-700 border-pink-200",
        newsletter: "bg-orange-100 text-orange-700 border-orange-200"
    };

    // Mock data
    const events = [
        { id: 1, date: new Date(2026, 1, 10), title: "Lanzamiento V5", type: "blog" },
        { id: 2, date: new Date(2026, 1, 12), title: "Webinar QA", type: "social" },
        { id: 3, date: new Date(2026, 1, 15), title: "Newsletter #42", type: "newsletter" },
    ];

    return (
        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 capitalize tracking-tight">
                        {format(currentMonth, 'MMMM yyyy', { locale: es })}
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Calendario Editorial
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-md">
                    <button onClick={prevMonth} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all text-slate-400 hover:text-slate-900">
                        <ChevronLeft size={18} />
                    </button>
                    <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white rounded-lg transition-all uppercase tracking-widest">
                        Hoy
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all text-slate-400 hover:text-slate-900">
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Grid Header */}
            <div className="grid grid-cols-7 mb-4">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(day => (
                    <div key={day} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid Body */}
            <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)] gap-1 bg-slate-50 border border-slate-100 rounded-lg overflow-hidden">
                {days.map((day, dayIdx) => {
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const dayEvents = events.filter(e => isSameDay(e.date, day));

                    return (
                        <div
                            key={day.toString()}
                            className={cn(
                                "bg-white p-2 min-h-[120px] relative group transition-colors hover:bg-slate-50/50",
                                !isCurrentMonth && "bg-slate-50/30 text-slate-300"
                            )}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={cn(
                                    "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                                    isToday ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30" : "text-slate-400"
                                )}>
                                    {format(day, 'd')}
                                </span>
                                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded-md text-slate-400 transition-all">
                                    <Plus size={14} />
                                </button>
                            </div>

                            <div className="space-y-1">
                                {dayEvents.map(event => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, y: 2 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={cn(
                                            "text-[10px] font-bold p-1.5 rounded-lg border truncate cursor-pointer hover:scale-[1.02] transition-transform",
                                            typeColors[event.type] || "bg-slate-100 text-slate-600"
                                        )}
                                    >
                                        {event.title}
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
