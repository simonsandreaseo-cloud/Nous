import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface LogEntry {
    id: string;
    timestamp: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
}

interface LogTerminalProps {
    logs: LogEntry[];
    theme?: 'dark' | 'light';
}

export function LogTerminal({ logs, theme = 'dark' }: LogTerminalProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const isLight = theme === 'light';

    return (
        <div
            ref={scrollRef}
            className={`flex-1 w-full rounded-lg overflow-y-auto font-mono text-xs space-y-1 p-2 ${isLight ? 'bg-transparent text-gray-600' : 'bg-black/60 text-white'
                }`}
        >
            <AnimatePresence initial={false}>
                {logs.map((log) => (
                    <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex gap-2 items-start"
                    >
                        <span className={`shrink-0 select-none ${isLight ? 'text-gray-400' : 'text-white/30'}`}>
                            {log.timestamp}
                        </span>
                        <div className="flex-1 break-all">
                            <span className={`mr-1 font-bold ${log.type === 'info' ? (isLight ? 'text-blue-500' : 'text-cyan-400') :
                                    log.type === 'success' ? (isLight ? 'text-emerald-500' : 'text-emerald-400') :
                                        log.type === 'warning' ? (isLight ? 'text-amber-500' : 'text-amber-400') :
                                            (isLight ? 'text-rose-500' : 'text-rose-400')
                                }`}>
                                {log.type === 'success' && '✓'}
                                {log.type === 'error' && '✕'}
                                {log.type === 'warning' && '!'}
                                {log.type === 'info' && '•'}
                            </span>
                            <span className={isLight ? 'text-gray-700' : 'text-white/80'}>
                                {log.message}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {logs.length === 0 && (
                <div className={`text-center italic mt-4 ${isLight ? 'text-gray-300' : 'text-white/20'}`}>
                    Waiting for activity...
                </div>
            )}
        </div>
    );
}
