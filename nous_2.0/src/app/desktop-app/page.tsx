"use client";
import React, { useState, useEffect } from 'react';
import { DesktopLayout } from '@/components/desktop/DesktopLayout';
import { LogTerminal } from '@/components/desktop/LogTerminal';
import { CrawlerPanel } from '@/components/desktop/CrawlerPanel';
import { RefineryPanel } from '@/components/desktop/RefineryPanel';
import { TimePanel } from '@/components/desktop/TimePanel';
import { useNousEngine } from '@/hooks/useNousEngine';
import { Activity, Globe, Database, Clock, Cpu, HardDrive } from 'lucide-react';

export default function DesktopAppPage() {
    const { logs, status: engineStatus, sysStats } = useNousEngine();
    const [isConnected, setIsConnected] = useState(false);
    const [activeModule, setActiveModule] = useState<'dashboard' | 'crawler' | 'refinery' | 'operations'>('dashboard');

    // Mock connection simulation for Web Uplink
    useEffect(() => {
        const timer = setTimeout(() => setIsConnected(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    const ramUsageGB = sysStats ? (sysStats.memory_usage / 1024 / 1024 / 1024).toFixed(1) : '0.0';
    const totalRamGB = sysStats ? (sysStats.total_memory / 1024 / 1024 / 1024).toFixed(1) : '0.0';
    const ramPercent = sysStats ? Math.round((sysStats.memory_usage / sysStats.total_memory) * 100) : 0;
    const cpuUsage = sysStats ? sysStats.cpu_usage.toFixed(1) : '0.0';

    return (
        <DesktopLayout isConnected={isConnected}>
            <div className="flex flex-col h-full gap-6">

                {/* Module Selector (Minimal Tabs) */}
                <div className="flex border-b border-gray-100 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveModule('dashboard')}
                        className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${activeModule === 'dashboard' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <Activity size={16} />
                        Monitor
                    </button>
                    <button
                        onClick={() => setActiveModule('crawler')}
                        className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${activeModule === 'crawler' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <Globe size={16} />
                        Crawler
                    </button>
                    <button
                        onClick={() => setActiveModule('refinery')}
                        className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${activeModule === 'refinery' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <Database size={16} />
                        Refinery
                    </button>
                    <button
                        onClick={() => setActiveModule('operations')}
                        className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${activeModule === 'operations' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <Clock size={16} />
                        TimeOps
                    </button>
                </div>

                {/* Dashboard Content */}
                {activeModule === 'dashboard' && (
                    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-300">

                        {/* Status Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* CPU Card */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col justify-between h-24 hover:shadow-sm transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Cpu size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">CPU Load</span>
                                    </div>
                                    <span className={`w-2 h-2 rounded-full ${engineStatus === 'running' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                </div>
                                <div>
                                    <span className="text-2xl font-semibold text-gray-900">{cpuUsage}%</span>
                                </div>
                            </div>

                            {/* RAM Card */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col justify-between h-24 hover:shadow-sm transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <HardDrive size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Memory</span>
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-semibold text-gray-900">{ramUsageGB}</span>
                                    <span className="text-sm text-gray-400 font-medium">/ {totalRamGB} GB</span>
                                </div>
                            </div>
                        </div>

                        {/* Logs Area */}
                        <div className="flex-1 min-h-0 flex flex-col gap-2">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Activity Log</h3>
                            <div className="flex-1 bg-gray-50 rounded-xl border border-gray-100 p-4 font-mono text-xs overflow-hidden">
                                <LogTerminal logs={logs} theme="light" />
                            </div>
                        </div>

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

                {/* Footer */}
                <div className="flex justify-between items-center text-[10px] text-gray-300">
                    <span>Nous Desktop v0.1.0</span>
                    <span className="font-mono">{engineStatus === 'running' ? 'ENGINE_ONLINE' : 'ENGINE_OFFLINE'}</span>
                </div>

            </div>
        </DesktopLayout>
    );
}
