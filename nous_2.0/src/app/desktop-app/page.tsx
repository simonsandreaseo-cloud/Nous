"use client";
import React, { useState } from 'react';
import { DesktopLayout } from '@/components/desktop/DesktopLayout';
import { LogTerminal } from '@/components/desktop/LogTerminal';
import { CrawlerPanel } from '@/components/desktop/CrawlerPanel';
import { RefineryPanel } from '@/components/desktop/RefineryPanel';
import { TimePanel } from '@/components/desktop/TimePanel';
import { useNousEngine } from '@/hooks/useNousEngine';
import { Activity, Globe, Database, Clock, Cpu, HardDrive } from 'lucide-react';

import { useDesktopStore } from '@/store/useDesktopStore';
import { DeepLinkManager } from '@/components/desktop/DeepLinkManager';

export default function DesktopAppPage() {
    const { logs, status: engineStatus, sysStats } = useNousEngine();
    const isConnected = useDesktopStore(state => state.isWebConnected);
    const [activeModule, setActiveModule] = useState<'dashboard' | 'crawler' | 'refinery' | 'operations'>('dashboard');

    const ramUsageGB = sysStats ? (sysStats.memory_usage / 1024 / 1024 / 1024).toFixed(1) : '0.0';
    const totalRamGB = sysStats ? (sysStats.total_memory / 1024 / 1024 / 1024).toFixed(1) : '0.0';
    const cpuUsage = sysStats ? sysStats.cpu_usage.toFixed(1) : '0.0';

    return (
        <DesktopLayout isConnected={isConnected}>
            <DeepLinkManager />
            <div className="flex flex-col flex-1 min-h-0 gap-5">

                {/* Module Selector */}
                <div className="flex border-b border-gray-100 overflow-x-auto no-scrollbar flex-shrink-0">
                    <button
                        onClick={() => setActiveModule('dashboard')}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${activeModule === 'dashboard' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <Activity size={14} />
                        Monitor
                    </button>
                    <button
                        onClick={() => setActiveModule('crawler')}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${activeModule === 'crawler' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <Globe size={14} />
                        Crawler
                    </button>
                    <button
                        onClick={() => setActiveModule('refinery')}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${activeModule === 'refinery' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <Database size={14} />
                        Refinery
                    </button>
                    <button
                        onClick={() => setActiveModule('operations')}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${activeModule === 'operations' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <Clock size={14} />
                        TimeOps
                    </button>
                </div>

                {/* Main Content Area (Flexible) */}
                <div className="flex-1 min-h-0 flex flex-col">
                    {activeModule === 'dashboard' && (
                        <div className="flex flex-col h-full gap-5 animate-in fade-in duration-300">
                            {/* Status Cards */}
                            <div className="grid grid-cols-2 gap-4 flex-shrink-0">
                                <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between h-24">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Cpu size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">CPU</span>
                                        </div>
                                    </div>
                                    <span className="text-2xl font-semibold text-gray-900">{cpuUsage}%</span>
                                </div>

                                <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between h-24">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <HardDrive size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">RAM</span>
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-semibold text-gray-900">{ramUsageGB}</span>
                                        <span className="text-[10px] text-gray-400 font-bold">/ {totalRamGB} GB</span>
                                    </div>
                                </div>
                            </div>

                            {/* Logs Area */}
                            <div className="flex-1 min-h-0 flex flex-col gap-2">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Activity Stream</h3>
                                    <div className="flex gap-1">
                                        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                        <div className="w-1 h-1 rounded-full bg-emerald-400/50" />
                                    </div>
                                </div>
                                <div className="flex-1 bg-gray-50/30 rounded-2xl border border-gray-100/50 p-4 overflow-hidden backdrop-blur-sm">
                                    <LogTerminal logs={logs} theme="light" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeModule === 'crawler' && <div className="h-full flex flex-col min-h-0"><CrawlerPanel /></div>}
                    {activeModule === 'refinery' && <div className="h-full flex flex-col min-h-0"><RefineryPanel /></div>}
                    {activeModule === 'operations' && <div className="h-full flex flex-col min-h-0"><TimePanel /></div>}
                </div>

                {/* Footer (Fixed) */}
                <div className="flex justify-between items-center text-[10px] text-gray-300 font-bold uppercase tracking-widest pt-2 border-t border-gray-50 flex-shrink-0">
                    <span>Uplink v0.3.0</span>
                    <span className="font-mono text-[9px]">{engineStatus === 'running' ? 'CORE_ONLINE' : 'CORE_STANDBY'}</span>
                </div>

            </div>
        </DesktopLayout>
    );
}
