"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause, ChevronDown, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TimeEntry } from "@/types/time_tracking";
import { Task } from "@/types/project";

export function TopBar() {
    const [timerActive, setTimerActive] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Initialize: Get User & Active Entry
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                fetchActiveEntry(user.id);
                fetchTasks(user.id);
            }
        };
        init();

        // Subscribe to realtime changes for sync with Desktop App
        const channel = supabase
            .channel('time_entries_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'time_entries' },
                (payload) => {
                    if (userId) fetchActiveEntry(userId);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const fetchActiveEntry = async (uid: string) => {
        // Check for an entry where end_time is NULL
        const { data } = await supabase
            .from('time_entries')
            .select('*, task:content_tasks(id, title)')
            .eq('user_id', uid)
            .is('end_time', null)
            .maybeSingle();

        if (data) {
            setTimerActive(true);
            setActiveEntryId(data.id);

            const startTime = new Date(data.start_time).getTime();
            const now = new Date().getTime();
            setSeconds(Math.floor((now - startTime) / 1000));

            if (data.task) {
                // data.task is an object or array depending on query, here it should be single object
                // We cast it to Task roughly
                const t = data.task as any;
                setSelectedTask({ id: t.id, title: t.title } as Task);
            }
        } else {
            setTimerActive(false);
            setActiveEntryId(null);
            setSeconds(0);
        }
    };

    const fetchTasks = async (uid: string) => {
        const { data } = await supabase
            .from('content_tasks')
            .select('*')
            .in('status', ['todo', 'in_progress']) // Only active tasks
            .order('created_at', { ascending: false })
            .limit(10);

        if (data) setTasks(data as unknown as Task[]);
    };

    // Timer Tick
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timerActive) {
            interval = setInterval(() => {
                setSeconds((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timerActive]);

    const handleStartTimer = async () => {
        if (!userId) return;

        if (!timerActive) {
            // START TIMER
            setTimerActive(true);
            const startTime = new Date().toISOString();

            const { data, error } = await supabase
                .from('time_entries')
                .insert({
                    user_id: userId,
                    task_id: selectedTask?.id || null,
                    start_time: startTime,
                    is_manual: false
                })
                .select()
                .single();

            if (data) {
                setActiveEntryId(data.id);
                setSeconds(0);
            } else {
                console.error("Error starting timer:", error);
                setTimerActive(false);
            }
        } else {
            // STOP TIMER
            if (!activeEntryId) return;

            setTimerActive(false);
            const { error } = await supabase
                .from('time_entries')
                .update({ end_time: new Date().toISOString() })
                .eq('id', activeEntryId);

            if (error) {
                console.error("Error stopping timer:", error);
                setTimerActive(true);
            } else {
                setActiveEntryId(null);
            }
        }
    };

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="h-16 w-full flex items-center justify-between px-6 border-b border-hairline bg-white/50 backdrop-blur-md sticky top-0 z-50">
            <div className="flex items-center space-x-4">
                <h1 className="text-lg font-light tracking-elegant uppercase text-slate-800">
                    NOUS<span className="text-[var(--color-nous-mist)] font-medium">OFFICE</span>
                </h1>
            </div>

            <div className="flex items-center space-x-4 bg-white/40 rounded-full px-4 py-2 border border-hairline shadow-sm">
                <div className={`font-mono text-xl tracking-wider w-28 text-center transition-colors ${timerActive ? 'text-[var(--color-nous-mist)]' : 'text-slate-400'}`}>
                    {formatTime(seconds)}
                </div>

                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center space-x-2 text-sm text-slate-500 hover:text-slate-700 transition-colors px-3 py-1 rounded-md hover:bg-white/50"
                        disabled={timerActive}
                    >
                        <span className="truncate max-w-[200px] font-light">{selectedTask?.title || "Select a task..."}</span>
                        <ChevronDown size={14} />
                    </button>

                    {dropdownOpen && (
                        <div className="absolute top-10 left-0 w-80 glass-panel border border-hairline rounded-lg shadow-xl overflow-hidden z-50">
                            <div className="p-2 text-[10px] text-slate-400 uppercase tracking-elegant bg-white/40">Recent Tasks</div>
                            {tasks.length > 0 ? tasks.map((task) => (
                                <button
                                    key={task.id}
                                    onClick={() => {
                                        setSelectedTask(task);
                                        setDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-white/60 hover:text-slate-900 transition-colors border-b border-hairline last:border-0"
                                >
                                    <div className="font-light truncate">{task.title}</div>
                                </button>
                            )) : (
                                <div className="p-4 text-center text-slate-400 text-sm font-light">No active tasks found.</div>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleStartTimer}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border border-hairline shadow-sm border-[var(--color-nous-mist)]/30 ${timerActive
                        ? "bg-red-50 text-red-500 animate-pulse"
                        : "bg-[var(--color-nous-mist)]/20 text-[var(--color-nous-mist)] hover:bg-[var(--color-nous-mist)]/30"
                        }`}
                >
                    {timerActive ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
                </button>
            </div>

            <div className="flex items-center space-x-4">
                <div className="flex flex-col items-end">
                    <span className="text-xs font-light tracking-elegant uppercase text-slate-700">Mi Espacio</span>
                    <span className="text-[10px] text-slate-400 flex items-center font-light uppercase">
                        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${timerActive ? 'bg-[var(--color-nous-mint)] animate-pulse' : 'bg-slate-300'}`}></div>
                        {timerActive ? "Registrando..." : "Disponible"}
                    </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-hairline relative">
                    <User size={18} className="text-slate-400" />
                    <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${timerActive ? 'bg-[var(--color-nous-mint)]' : 'bg-slate-300'}`}></div>
                </div>
            </div>
        </div>
    );
}
