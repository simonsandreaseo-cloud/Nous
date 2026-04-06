import { useState, useEffect, useRef } from 'react';
import { Command, Child } from '@tauri-apps/plugin-shell';
import { invoke } from '@tauri-apps/api/core';

interface LogEntry {
    id: string;
    timestamp: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
}

interface SystemStats {
    cpu_usage: number;
    memory_usage: number;
    total_memory: number;
}

export function useNousEngine() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [status, setStatus] = useState<'stopped' | 'starting' | 'running' | 'error'>('stopped');
    const [sysStats, setSysStats] = useState<SystemStats>({ cpu_usage: 0, memory_usage: 0, total_memory: 0 });
    const processRef = useRef<Child | null>(null);

    const addLog = (type: LogEntry['type'], message: string) => {
        setLogs(prev => [...prev.slice(-99), { // Keep last 100 logs
            id: Math.random().toString(36),
            timestamp: new Date().toLocaleTimeString(),
            type,
            message
        }]);
    };

    useEffect(() => {
        let isMounted = true;

        // Poll system stats
        const statsInterval = setInterval(async () => {
            try {
                const stats = await invoke<SystemStats>('get_system_stats');
                if (isMounted) setSysStats(stats);
            } catch (e) {
                // Ignore errors if app is not running in Tauri
            }
        }, 1000);

        const startEngine = async () => {
            // ... We are now running embedded, so we might not need to spawn a sidecar anymore
            // But for now, let's keep the logic if we want to spawn external binaries later.
            // Actually, since we moved logic to Rust backend, "running" just means app is open.
            setStatus('running');
            addLog('success', 'Nous Engine Core Active');
        };

        startEngine();

        return () => {
            isMounted = false;
            clearInterval(statsInterval);
        };
    }, []);

    return { logs, status, addLog, sysStats };
}
