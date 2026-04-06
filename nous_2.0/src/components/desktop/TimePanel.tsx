import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Clock, Play, Pause, Square, Activity, Coffee, RefreshCw } from 'lucide-react';

interface OperationStatus {
    is_idle: boolean;
    idle_seconds: number;
}

export function TimePanel() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isTracking, setIsTracking] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [isIdle, setIsIdle] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        // Listen for idle events
        const unlistenPromise = listen<OperationStatus>('operations-idle-change', (event) => {
            setIsIdle(event.payload.is_idle);
            // Auto-pause if idle
            if (event.payload.is_idle) {
                setIsTracking(false);
            }
        });

        return () => {
            clearInterval(timer);
            unlistenPromise.then(unlisten => unlisten());
        };
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTracking && !isIdle) {
            interval = setInterval(() => {
                setElapsed(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTracking, isIdle]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-full gap-4 text-white font-sans">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold tracking-widest text-cyan-400 uppercase">Operations Command</h3>
                    <p className="text-[10px] text-white/50 font-mono">TEMPORAL & TASK MONITORING</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                    <Clock size={16} className="text-emerald-400" />
                </div>
            </div>

            {/* Main Clock & Timer */}
            <div className="grid grid-cols-2 gap-4">
                {/* Local Time */}
                <div className="bg-white/5 p-4 rounded-lg border border-white/10 flex flex-col justify-center items-center relative overflow-hidden">
                    <div className="absolute top-2 left-2 text-[10px] text-white/40 font-bold tracking-wider">LOCAL_TIME</div>
                    <div className="text-4xl font-michroma text-white tracking-widest">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-sm text-cyan-400 font-mono mt-1">
                        {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}
                    </div>
                </div>

                {/* Session Timer */}
                <div className="bg-white/5 p-4 rounded-lg border border-white/10 flex flex-col justify-center items-center relative overflow-hidden group">
                    <div className="absolute top-2 left-2 text-[10px] text-white/40 font-bold tracking-wider flex items-center gap-2">
                        SESSION_TIMER
                        {isTracking && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                    </div>
                    <div className={`text-4xl font-michroma tracking-widest transition-colors ${isTracking ? 'text-emerald-400' : 'text-white/50'}`}>
                        {formatTime(elapsed)}
                    </div>

                    {/* Controls */}
                    <div className="flex gap-2 mt-4">
                        {!isTracking ? (
                            <button
                                onClick={() => setIsTracking(true)}
                                className="flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-4 py-1 rounded text-xs font-bold border border-emerald-500/50 transition-all"
                            >
                                <Play size={12} fill="currentColor" /> START
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => setIsTracking(false)}
                                    className="flex items-center gap-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-4 py-1 rounded text-xs font-bold border border-yellow-500/50 transition-all"
                                >
                                    <Pause size={12} fill="currentColor" /> PAUSE
                                </button>
                                <button
                                    onClick={() => { setIsTracking(false); setElapsed(0); }}
                                    className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-1 rounded text-xs font-bold border border-red-500/50 transition-all"
                                >
                                    <Square size={12} fill="currentColor" /> STOP
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Integration Status / Task List Placeholder */}
            <div className="flex-1 bg-black/40 rounded-lg border border-white/5 overflow-hidden flex flex-col relative">
                <div className="bg-white/5 p-2 border-b border-white/10 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-white/50">ACTIVE TASKS (INTEGRATIONS PENDING)</span>
                    <button className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                        <RefreshCw size={10} /> SYNC
                    </button>
                </div>

                <div className="p-4 flex flex-col gap-2">
                    {/* Placeholder Task */}
                    <div className="bg-white/5 p-3 rounded border-l-2 border-cyan-500 flex justify-between items-center group hover:bg-white/10 transition-colors cursor-pointer">
                        <div>
                            <h4 className="text-sm font-bold text-white">Implement Operations Module</h4>
                            <p className="text-[10px] text-white/40 font-mono">NOUS-1024 • IN_PROGRESS</p>
                        </div>
                        <div className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play size={16} />
                        </div>
                    </div>

                    <div className="bg-white/5 p-3 rounded border-l-2 border-white/20 flex justify-between items-center group hover:bg-white/10 transition-colors cursor-pointer opacity-60 hover:opacity-100">
                        <div>
                            <h4 className="text-sm font-bold text-white">Review Data Refinery logic</h4>
                            <p className="text-[10px] text-white/40 font-mono">NOUS-1023 • PENDING</p>
                        </div>
                        <div className="text-white/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play size={16} />
                        </div>
                    </div>
                </div>

                {/* Idle Overlay */}
                {isIdle && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-yellow-500 animate-in fade-in duration-500">
                        <Coffee size={48} className="mb-2 animate-bounce" />
                        <h3 className="text-xl font-bold tracking-widest">USER INACTIVE</h3>
                        <p className="text-xs font-mono opacity-70">SESSION PAUSED AUTO_MAGICALLY</p>
                    </div>
                )}
            </div>
        </div>
    );
}
