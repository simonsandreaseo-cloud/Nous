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
        <div className="bg-gray-800 text-gray-300 font-mono text-sm h-48 overflow-y-auto rounded-lg p-4 border border-gray-700 shadow-inner">
            {logs.length === 0 && <p className="text-gray-500 italic">Ready to analyze...</p>}
            {logs.map((log, idx) => (
                <div key={idx} className={`mb-1 break-words ${log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-amber-400' : ''}`}>
                    <span className="opacity-50 mr-2">[{log.timestamp}]</span>
                    {log.message}
                </div>
            ))}
            <div ref={endRef} />
        </div>
    );
};
