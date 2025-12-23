import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface LiveConsoleProps {
    logs: LogEntry[];
}

export const LiveConsole: React.FC<LiveConsoleProps> = ({ logs }) => {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar pr-2 font-mono text-xs leading-relaxed">
            {logs.length === 0 && <p className="text-brand-white/20 italic">Esperando inicio del proceso...</p>}
            {logs.map((log, idx) => (
                <div key={idx} className={`mb-2 break-words border-l-2 pl-3 py-0.5 animate-fade-in ${log.type === 'error' ? 'text-red-400 border-red-400/50 bg-red-400/5' :
                        log.type === 'warn' ? 'text-amber-400 border-amber-400/50' :
                            'text-brand-white/80 border-brand-white/10 hover:border-brand-white/30 hover:bg-brand-white/5 transition-colors'
                    }`}>
                    <span className="text-brand-white/30 mr-2 text-[10px] uppercase font-bold tracking-wider">[{log.timestamp}]</span>
                    {log.message}
                </div>
            ))}
            <div ref={endRef} />
        </div>
    );
};
