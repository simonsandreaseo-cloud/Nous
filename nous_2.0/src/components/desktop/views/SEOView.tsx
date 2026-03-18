import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Terminal as TerminalIcon, Download, Server, Cpu } from 'lucide-react';
import dynamic from 'next/dynamic';
import { NousOrb } from '../../canvas/NousOrb';

const SceneLayout = dynamic(
    () => import("../../canvas/SceneLayout"),
    { ssr: false }
);

interface ModelStatus {
    id: string;
    label: string;
    status: 'pending' | 'checking' | 'downloading' | 'complete' | 'error';
    progress: number;
    downloaded?: number;
    total?: number;
    size?: string;
}

const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function SEOView({ isConnected }: { isConnected: boolean }) {
    const [isRunning, setIsRunning] = useState(false);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [models, setModels] = useState<ModelStatus[]>([
        { id: 'Gemma-3-4B', label: 'Gemma 3 (Text)', status: 'pending', progress: 0, size: '~3.4 GB' },
        { id: 'SDXL-Turbo', label: 'SDXL Turbo (Vision)', status: 'pending', progress: 0, size: '~6.5 GB' }
    ]);
    const [logs, setLogs] = useState<string[]>([
        "SYSTEM_INITIALIZED: Ready to connect to Unified AI Core..."
    ]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev.slice(-99), `> ${msg}`]);
    };

    const toggleServer = () => {
        if (isRunning) {
            if (ws) {
                ws.close();
                setWs(null);
            }
            setIsRunning(false);
            addLog("Disconnected from local Node.");
            setModels(models.map(m => ({...m, status: 'pending'})));
        } else {
            addLog("Connecting to Native Python Engine (ws://127.0.0.1:8181)...");
            const socket = new WebSocket('ws://127.0.0.1:8181');
            
            socket.onopen = () => {
                setIsRunning(true);
                addLog("Neural connection established. Sending Handshake...");
                socket.send(JSON.stringify({ type: 'AUTH', payload: { token: 'nous-dev-token-2026' } }));
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'AUTH_SUCCESS') {
                        addLog("Auth success. Models status updated.");
                    }
                    else if (data.type === 'DOWNLOAD_STATUS') {
                        const { model, status, message } = data.payload;
                        setModels(prev => prev.map(m => {
                            if (m.id === model) {
                                return { ...m, status: status as any, progress: status === 'complete' ? 100 : m.progress };
                            }
                            return m;
                        }));
                        if (status === 'complete') addLog(`[${model}] Pipeline loaded successfully.`);
                        else if (status === 'downloading') addLog(`[${model}] Starting weight transfer...`);
                        else if (status === 'error') addLog(`[!] Critical Error: ${message}`);
                    }
                    else if (data.type === 'DOWNLOAD_PROGRESS') {
                        const { model, progress, downloaded, total } = data.payload;
                        setModels(prev => prev.map(m => {
                            if (m.id === model) {
                                return { ...m, status: 'downloading', progress: progress || 0, downloaded, total };
                            }
                            return m;
                        }));
                    }
                    else if (data.type === 'ENGINE_READY') {
                        addLog(`+++ ${data.payload.engine.toUpperCase()} MODULE ACTIVE +++`);
                    }
                } catch (e) {}
            };

            socket.onclose = () => {
                setIsRunning(false);
                addLog("Neural connection severed.");
            };

            setWs(socket);
        }
    };

    return (
        <div className="h-full w-full flex flex-col p-8 overflow-hidden bg-[url('/Fondo_Nous.webp')] bg-cover bg-center">
            {/* Glassmorphism Header */}
            <div className="flex items-center justify-between mb-8 shrink-0 bg-white/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/40 shadow-xl">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <div className="w-2.5 h-10 bg-indigo-600 rounded-full" />
                        NOUS AI Core
                    </h2>
                    <p className="text-slate-600 text-sm font-medium mt-1">Unified Intelligence Interface</p>
                </div>
                <button
                    onClick={toggleServer}
                    className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold transition-all shadow-xl ${
                        isRunning 
                            ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-200' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                    }`}
                >
                    {isRunning ? <><Square size={20} fill="currentColor" /> Terminar Sesión</> : <><Play size={20} fill="currentColor" /> Iniciar Nodo Local</>}
                </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0 gap-8">
                
                {/* Visualizer & Model Status Row */}
                <div className="flex gap-8 h-[320px] shrink-0">
                    {/* 3D Orb Card */}
                    <div className="w-1/2 relative bg-white/20 backdrop-blur-md rounded-[2.5rem] border border-white/30 overflow-hidden flex items-center justify-center shadow-2xl group transition-transform duration-500 hover:scale-[1.01]">
                        <div className="w-full h-full relative" style={{ isolation: 'isolate' }}>
                             <SceneLayout inline>
                                <group scale={1.8} position={[0, -0.5, 0]}>
                                    <NousOrb />
                                </group>
                             </SceneLayout>
                        </div>
                        
                        {/* Status Float */}
                        <div className="absolute top-6 right-6 z-20 bg-black/80 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                             <div className="relative flex h-2 w-2">
                                {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-indigo-400"></span>}
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${isRunning ? 'bg-indigo-400' : 'bg-slate-500'}`}></span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
                                {isRunning ? 'Neural Engine Active' : 'Offline'}
                            </span>
                        </div>
                    </div>

                    {/* Model Manager Card */}
                    <div className="w-1/2 bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/40 p-8 flex flex-col overflow-hidden shadow-2xl">
                        <div className="flex items-center gap-3 mb-6 text-slate-800">
                            <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                                <Server size={20} />
                            </div>
                            <h3 className="font-black text-xl tracking-tight">Accelerators</h3>
                        </div>
                        
                        <div className="flex flex-col gap-5 overflow-y-auto pr-3 custom-scrollbar">
                            {models.map(model => (
                                <div key={model.id} className="p-5 bg-white/40 rounded-3xl border border-white/60 shadow-sm transition-all hover:bg-white/60">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl transition-colors ${model.status === 'complete' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <Cpu size={18} />
                                            </div>
                                            <div>
                                                <span className="font-bold text-slate-800 block text-sm">{model.label}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{model.size}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full bg-slate-200/50 rounded-full h-2 mb-3 mt-4 overflow-hidden">
                                        <motion.div 
                                            className={`h-full rounded-full ${model.status === 'error' ? 'bg-rose-500' : (model.status === 'complete' ? 'bg-emerald-500' : 'bg-indigo-600')}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${model.progress}%` }}
                                            transition={{ duration: 0.8, ease: "circOut" }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className={`font-bold tracking-tight ${model.status === 'error' ? 'text-rose-600' : (model.status === 'complete' ? 'text-emerald-600' : 'text-slate-500')}`}>
                                            {model.status === 'pending' && 'Standing by'}
                                            {model.status === 'checking' && 'Verifying Integrity...'}
                                            {model.status === 'downloading' && (
                                                model.downloaded && model.total 
                                                    ? `${formatBytes(model.downloaded)} / ${formatBytes(model.total)}`
                                                    : 'Syncing weights...'
                                            )}
                                            {model.status === 'complete' && 'READY'}
                                            {model.status === 'error' && 'LOAD_FAILED'}
                                        </span>
                                        {model.status === 'downloading' && (
                                            <div className="flex items-center gap-2 px-2 py-1 bg-indigo-50 rounded-lg text-indigo-600 font-bold text-[10px] animate-pulse">
                                                <Download size={10} /> {model.progress.toFixed(1)}%
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Console Card */}
                <div className="flex-1 bg-black/90 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 flex flex-col shadow-inner overflow-hidden shadow-2xl">
                    <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Kernel_0.4_IO_Stream</span>
                        </div>
                        <div className="px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                            <span className="text-[10px] font-black text-indigo-400 font-mono tracking-widest uppercase">P_8181_ACTIVE</span>
                        </div>
                    </div>
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 font-mono text-xs text-indigo-300/80 leading-[1.8] scroll-smooth custom-scrollbar">
                        {logs.map((log, i) => (
                            <div key={i} className={`mb-2 break-all flex gap-3 ${log.includes('Error') || log.includes('[!]') ? 'text-rose-400' : ''}`}>
                                <span className="text-white/20 select-none">[{i.toString().padStart(3, '0')}]</span>
                                <span>{log}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 20px; }
            `}</style>
        </div>
    );
}
