import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LogEntry {
    id: string;
    timestamp: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
}

interface LogTerminalProps {
    logs: LogEntry[];
}

export function LogTerminal({ logs }: LogTerminalProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const getTypeColor = (type: LogEntry['type']) => {
        switch (type) {
            case 'info': return 'text-cyan-400';
            case 'success': return 'text-emerald-400';
            case 'warning': return 'text-amber-400';
            case 'error': return 'text-rose-400 font-bold';
        }
    };

    return (
        <div className="flex-1 w-full bg-black/60 border border-white/5 rounded-lg overflow-hidden flex flex-col backdrop-blur-sm relative">
            <div className="absolute top-0 left-0 right-0 h-6 bg-white/5 flex items-center px-2 gap-2 border-b border-white/5 z-10">
                <div className="w-2 h-2 rounded-full bg-white/20" />
                <div className="w-2 h-2 rounded-full bg-white/20" />
                <span className="text-[10px] uppercase font-mono text-white/40 ml-2">System Output</span>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 pt-8 font-mono text-xs space-y-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            >
                <AnimatePresence initial={false}>
                    {logs.map((log) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex gap-3"
                        >
                            <span className="text-white/30 shrink-0 select-none">[{log.timestamp}]</span>
                            <span className={`${getTypeColor(log.type)} break-all`}>
                                {log.type === 'success' && '✓ '}
                                {log.type === 'error' && '✕ '}
                                {log.type === 'warning' && '⚠ '}
                                {log.message}
                            </span>
                        </motion.div>
                    ))}
                    {logs.length === 0 && (
                        <div className="text-white/20 italic text-center mt-10">
                            -- No active tasks --
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Scanline effect */}
            <div className="absolute inset-0 pointer-events-none bg-[url('/scanlines.png')] opacity-5" />
        </div>
    );
}
