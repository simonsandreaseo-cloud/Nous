"use client";

import { useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Clock,
    Dot
} from "lucide-react";
import { cn } from "@/utils/cn";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";

export function MiniCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const today = new Date();

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Mock scheduled days
    const scheduledDays = [
        new Date(2026, 1, 12),
        new Date(2026, 1, 15),
        new Date(2026, 1, 18),
        new Date(2026, 1, 20),
    ];

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    return (
        <section className="bg-white/70 backdrop-blur-xl border border-white rounded-[40px] p-8 shadow-sm hover:shadow-xl transition-all h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 text-slate-800 rounded-2xl border border-slate-200">
                        <CalendarIcon size={20} />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">Neural Timeline</h3>
                        <p className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">{format(currentDate, 'MMMM yyyy')}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1">
                <div className="grid grid-cols-7 mb-4">
                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day) => (
                        <div key={day} className="text-[9px] font-black text-slate-300 text-center uppercase tracking-widest">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                    {/* Padding for first day of month */}
                    {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                        <div key={`pad-${i}`} />
                    ))}

                    {days.map((day) => {
                        const isToday = isSameDay(day, today);
                        const isScheduled = scheduledDays.some(d => isSameDay(d, day));

                        return (
                            <div
                                key={day.toString()}
                                className={cn(
                                    "aspect-square flex flex-col items-center justify-center rounded-2xl border transition-all cursor-pointer relative group",
                                    isToday ? "bg-slate-900 text-white border-slate-900 shadow-lg scale-110 z-10" :
                                        "bg-slate-50/50 border-transparent hover:bg-white hover:border-slate-100 text-slate-600"
                                )}
                            >
                                <span className="text-[10px] font-black font-mono">{format(day, 'd')}</span>
                                {isScheduled && !isToday && (
                                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] group-hover:scale-150 transition-transform" />
                                )}
                                {isToday && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 border border-slate-900" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600">
                        <Clock size={14} />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Próxima Salida</p>
                        <p className="text-[10px] font-black text-slate-700 font-mono tracking-tighter">MAÑANA, 09:00 AM</p>
                    </div>
                </div>
                <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200" />
                    ))}
                </div>
            </div>
        </section>
    );
}
