"use client";
import React, { useState, useEffect } from 'react';
import { DesktopLayout } from '@/components/desktop/DesktopLayout';
import { LogTerminal } from '@/components/desktop/LogTerminal';
import { CrawlerPanel } from '@/components/desktop/CrawlerPanel';
import { RefineryPanel } from '@/components/desktop/RefineryPanel';
import { TimePanel } from '@/components/desktop/TimePanel';
import { useNousEngine } from '@/hooks/useNousEngine';
import { Activity, Globe, Database, Clock } from 'lucide-react';

export default function DesktopAppPage() {
    const { logs, status: engineStatus, sysStats } = useNousEngine();
    const [isConnected, setIsConnected] = useState(false);
    const [activeModule, setActiveModule] = useState<'dashboard' | 'crawler' | 'refinery' | 'operations'>('dashboard');

    // Mock connection simulation for Web Uplink (separate from Engine)
    useEffect(() => {
        const timer = setTimeout(() => setIsConnected(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    const ramUsageGB = (sysStats.memory_usage / 1024 / 1024 / 1024).toFixed(1);
    const totalRamGB = (sysStats.total_memory / 1024 / 1024 / 1024).toFixed(1);
    const ramPercent = Math.round((sysStats.memory_usage / sysStats.total_memory) * 100) || 0;

    return (
        <DesktopLayout isConnected={isConnected}>
            <div className="flex flex-col h-full gap-4">

                {/* Module Selector (Header) */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveModule('dashboard')}
                        className={`flex-1 p-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${activeModule === 'dashboard' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Activity size={14} />
                        Monitor
                    </button>
                    <button
                        onClick={() => setActiveModule('crawler')}
                        className={`flex-1 p-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${activeModule === 'crawler' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Globe size={14} />
                        Crawler Pro
                    </button>
                    <button
                        onClick={() => setActiveModule('refinery')}
                        className={`flex-1 p-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${activeModule === 'refinery' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Database size={14} />
                        Refinery
                    </button>
                    <button
                        onClick={() => setActiveModule('operations')}
                        className={`flex-1 p-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${activeModule === 'operations' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Clock size={14} />
                        TimeOps
                    </button>
                </div>

                {/* Main Content Area (Switcher) */}
                <div className="flex-1 min-h-0 relative">
                    {activeModule === 'dashboard' && (
                        <div className="flex flex-col h-full gap-4 animate-in fade-in zoom-in-95 duration-300">
                            <div className="grid grid-cols-2 gap-4 h-32">

                                {/* Engine Status Panel */}
                                <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col justify-between hover:bg-white/10 transition-colors group cursor-pointer">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-xs text-white/50 uppercase tracking-widest font-bold">CORE SYSTEM</h3>
                                            <div className={`w-2 h-2 rounded-full ${engineStatus === 'running' ? 'bg-cyan-400 animate-pulse' : 'bg-red-500'}`} />
                                        </div>
                                        <p className="text-2xl font-michroma mt-1 capitalize text-white">
                                            {sysStats.cpu_usage.toFixed(1)}% <span className="text-xs text-white/40 font-mono">CPU LOAD</span>
                                        </p>
                                    </div>
                                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-cyan-400 transition-all duration-300"
                                            style={{ width: `${Math.min(sysStats.cpu_usage, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* RAM Usage Panel */}
                                <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col justify-between hover:bg-white/10 transition-colors cursor-help">
                                    <div>
                                        <h3 className="text-xs text-white/50 uppercase tracking-widest font-bold">MEMORY ALLOCATION</h3>
                                        <p className="text-2xl font-michroma text-emerald-400 mt-1">
                                            {ramUsageGB} <span className="text-xs text-emerald-400/50 font-mono">/ {totalRamGB} GB</span>
                                        </p>
                                    </div>
                                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-400 transition-all duration-300"
                                            style={{ width: `${ramPercent}%` }}
                                        />
                                    </div>
                                </div>

                            </div>

                            {/* Live Terminal */}
                            <LogTerminal logs={logs} />
                        </div>
                    )}

                    {activeModule === 'crawler' && (
                        <div className="h-full animate-in fade-in slide-in-from-right-4 duration-300">
                            <CrawlerPanel />
                        </div>
                    )}

                    {activeModule === 'refinery' && (
                        <div className="h-full animate-in fade-in slide-in-from-right-4 duration-300">
                            <RefineryPanel />
                        </div>
                    )}

                    {activeModule === 'operations' && (
                        <div className="h-full animate-in fade-in slide-in-from-right-4 duration-300">
                            <TimePanel />
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="flex justify-between items-center text-[10px] text-white/20 font-mono">
                    <span>NOUS_KERNEL_V2.0</span>
                    <span>SECURE_ENCLAVE_ACTIVE</span>
                </div>

            </div>
        </DesktopLayout>
    );
}
