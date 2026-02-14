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
        <div className="h-16 w-full flex items-center justify-between px-6 border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-50">
            <div className="flex items-center space-x-4">
                <h1 className="text-lg font-michroma text-white tracking-widest">
                    NOUS<span className="text-cyan-400">OFFICE</span>
                </h1>
            </div>

            <div className="flex items-center space-x-4 bg-black/20 rounded-full px-4 py-2 border border-white/5 shadow-inner">
                <div className={`font-mono text-xl tracking-wider w-28 text-center transition-colors ${timerActive ? 'text-cyan-400' : 'text-gray-500'}`}>
                    {formatTime(seconds)}
                </div>

                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center space-x-2 text-sm text-gray-300 hover:text-white transition-colors px-3 py-1 rounded-md hover:bg-white/5"
                        disabled={timerActive}
                    >
                        <span className="truncate max-w-[200px]">{selectedTask?.title || "Select a task..."}</span>
                        <ChevronDown size={14} />
                    </button>

                    {dropdownOpen && (
                        <div className="absolute top-10 left-0 w-80 bg-[#0A0A0A] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
                            <div className="p-2 text-xs text-gray-500 uppercase tracking-wider bg-white/5">Recent Tasks</div>
                            {tasks.length > 0 ? tasks.map((task) => (
                                <button
                                    key={task.id}
                                    onClick={() => {
                                        setSelectedTask(task);
                                        setDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-cyan-400 transition-colors border-b border-white/5 last:border-0"
                                >
                                    <div className="font-medium truncate">{task.title}</div>
                                </button>
                            )) : (
                                <div className="p-4 text-center text-gray-500 text-sm">No active tasks found.</div>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleStartTimer}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${timerActive
                            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse"
                            : "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                        }`}
                >
                    {timerActive ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
                </button>
            </div>

            <div className="flex items-center space-x-4">
                <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-white">My Workspace</span>
                    <span className="text-xs text-gray-400 flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${timerActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                        {timerActive ? "Tracking Time..." : "Available"}
                    </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-900 to-blue-900 flex items-center justify-center border border-white/20 relative">
                    <User size={20} className="text-white/80" />
                    <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-black rounded-full ${timerActive ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                </div>
            </div>
        </div>
    );
}
