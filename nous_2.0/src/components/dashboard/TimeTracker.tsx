'use client';

import { useState, useEffect } from 'react';
import { Play, Square, Timer, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';
import { TimeTrackingService } from '@/lib/services/time-tracking';
import { cn } from '@/utils/cn';
import { useProjectStore } from '@/store/useProjectStore';
import { PresenceService } from '@/lib/services/presence';


interface TimeTrackerProps {
    taskId?: string | number; // Updated to allow both
    taskTitle?: string;
    projectId?: number | string;
}

export default function TimeTracker({ taskId, taskTitle, projectId }: TimeTrackerProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [loading, setLoading] = useState(false);
    
    const { activeTeam } = useProjectStore();

    useEffect(() => {
        let interval: any;
        if (isRecording) {
            interval = setInterval(() => {
                setElapsed(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleStart = async () => {
        setLoading(true);
        try {
            await TimeTrackingService.startTMetric({
                taskId: taskId?.toString(),
                description: taskTitle || 'Writing Session',
                startTime: new Date().toISOString()
            });
            setIsRecording(true);

            // Update Presence to 'busy' with current task
            if (activeTeam) {
                await PresenceService.updatePresence(activeTeam.id, 'busy', taskId);
            }
        } catch (e) {
            console.error(e);
            setIsRecording(true);
        } finally {
            setLoading(false);
        }
    };

    const handleStop = async () => {
        setLoading(true);
        try {
            await TimeTrackingService.stopTMetric();
            setIsRecording(false);

            // Reset Presence to 'online' and clear task
            if (activeTeam) {
                await PresenceService.updatePresence(activeTeam.id, 'online', undefined);
            }

            if (taskId) {
                await TimeTrackingService.updateClickUpTask(taskId.toString(), 'in progress');
            }
        } catch (e) {
            console.error(e);
            setIsRecording(false);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className={cn(
            "flex items-center gap-4 px-6 py-3 rounded-2xl border transition-all duration-700 backdrop-blur-md",
            isRecording
                ? "bg-rose-500/5 border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)]"
                : "bg-white/50 border-slate-200/50"
        )}>
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Time Tracking</span>
                <span className={cn(
                    "text-xl font-mono font-black tracking-tight",
                    isRecording ? "text-rose-600 drop-shadow-sm" : "text-slate-900"
                )}>
                    {formatTime(elapsed)}
                </span>
            </div>

            <div className="h-10 w-px bg-slate-200/50 mx-2" />

            <div className="flex items-center gap-3">
                {!isRecording ? (
                    <button
                        onClick={handleStart}
                        disabled={loading}
                        className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl shadow-emerald-500/25 disabled:opacity-50 group"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" className="ml-1 group-hover:scale-110 transition-transform" />}
                    </button>
                ) : (
                    <button
                        onClick={handleStop}
                        disabled={loading}
                        className="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl shadow-rose-500/25 disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Square size={20} fill="currentColor" />}
                    </button>
                )}
            </div>

            {taskTitle && (
                <div className="hidden lg:flex flex-col ml-3 truncate max-w-[200px]">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter opacity-70">Enviando a TMetric</span>
                    <span className="text-[12px] font-black text-slate-800 truncate leading-tight">{taskTitle}</span>
                </div>
            )}
        </div>
    );
}
