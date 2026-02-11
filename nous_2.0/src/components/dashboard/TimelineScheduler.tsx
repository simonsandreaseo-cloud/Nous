"use client";

import { useState } from "react";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    Clock,
    Plus
} from "lucide-react";
import Link from "next/link";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/utils/cn";
import { useProjectStore, Task } from "@/store/useProjectStore";

export function TimelineScheduler() {
    const { tasks } = useProjectStore();
    const [currentDate, setCurrentDate] = useState(new Date());
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

    const prevWeek = () => setCurrentDate(addDays(currentDate, -7));
    const nextWeek = () => setCurrentDate(addDays(currentDate, 7));

    return (
        <section className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm flex flex-col h-full min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">Agenda</h3>
                    <p className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Semana</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
                    <button onClick={prevWeek} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all text-slate-400 hover:text-slate-900">
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-widest min-w-[100px] text-center">
                        {format(startDate, 'MMM d', { locale: es })} - {format(addDays(startDate, 6), 'MMM d', { locale: es })}
                    </span>
                    <button onClick={nextWeek} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all text-slate-400 hover:text-slate-900">
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            <div className="flex justify-end mb-4">
                <Link href="/contents/calendar" className="text-[10px] font-bold text-cyan-600 hover:text-cyan-800 uppercase tracking-widest flex items-center gap-1 transition-colors">
                    Ver Mes Completo <CalendarIcon size={12} />
                </Link>
            </div>

            <div className="flex-1 grid grid-cols-7 gap-2">
                {days.map((day, i) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayItems = tasks.filter(task => format(new Date(task.scheduled_date), 'yyyy-MM-dd') === dateStr);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div key={i} className={cn(
                            "flex flex-col border-r border-slate-50 last:border-none min-h-[300px] relative group px-1",
                            isToday ? "bg-cyan-50/20 rounded-xl" : ""
                        )}>
                            <div className="text-center mb-4 py-2 border-b border-slate-50">
                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                    {format(day, 'EEE', { locale: es })}
                                </span>
                                <span className={cn(
                                    "text-lg font-black tracking-tight w-8 h-8 rounded-full flex items-center justify-center mx-auto",
                                    isToday ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30" : "text-slate-700"
                                )}>
                                    {format(day, 'd')}
                                </span>
                            </div>

                            <div className="flex-1 space-y-2 relative">
                                {/* Hover Add Button */}
                                <button className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center z-0 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
                                        <Plus size={16} />
                                    </div>
                                </button>

                                {dayItems.map(item => (
                                    <div
                                        key={item.id}
                                        className="relative z-10 p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group/item"
                                    >
                                        <div className="flex items-center gap-1 mb-1 opacity-60">
                                            <Clock size={10} />
                                            <span className="text-[9px] font-mono">{format(new Date(item.scheduled_date), 'HH:mm')}</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-700 leading-tight mb-2 line-clamp-2">{item.title}</p>

                                        <div className="flex items-center justify-between">
                                            <span className={cn(
                                                "w-2 h-2 rounded-full",
                                                item.status === 'done' ? "bg-emerald-400" :
                                                    item.status === 'in_progress' ? "bg-purple-400" : "bg-slate-200"
                                            )} />
                                            <MoreHorizontal size={12} className="text-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
