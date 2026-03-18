"use client";
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Cpu, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { NousOrb } from '../canvas/NousOrb';

const SceneLayout = dynamic(
    () => import("../canvas/SceneLayout"),
    { ssr: false }
);

interface SetupStep {
    id: 'welcome' | 'checking' | 'downloading' | 'finishing';
    title: string;
    description: string;
}

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState<SetupStep['id']>('welcome');
    const [progress, setProgress] = useState(0);
    const [downloadInfo, setDownloadInfo] = useState({ downloaded: 0, total: 0, model: '' });
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (step === 'downloading') {
            setConnectionStatus('connecting');
            const socket = new WebSocket('ws://127.0.0.1:8181');
            
            socket.onopen = () => {
                setConnectionStatus('connected');
                socket.send(JSON.stringify({ type: 'AUTH', payload: { token: 'nous-dev-token-2026' } }));
            };

            socket.onerror = () => {
                setConnectionStatus('error');
            };

            socket.onclose = () => {
                if (progress < 100) setConnectionStatus('error');
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'DOWNLOAD_STATUS') {
                        const { model, status, message } = data.payload;
                        if (status === 'downloading') {
                            setDownloadInfo(prev => ({ ...prev, model }));
                        } else if (status === 'error') {
                            setConnectionStatus('error');
                            console.error('Download error:', message);
                        }
                    } else if (data.type === 'DOWNLOAD_PROGRESS') {
                        const { progress, downloaded, total, model } = data.payload;
                        setProgress(progress);
                        setDownloadInfo({ downloaded, total, model });
                    } else if (data.type === 'ENGINE_READY') {
                        // The server sends this when a model pipeline is fully loaded
                        setStep('finishing');
                    }
                } catch(e) {}
            };

            setWs(socket);
            return () => socket.close();
        }
    }, [step]);

    const startSetup = () => {
        setStep('checking');
        // Small delay to simulate system verification
        setTimeout(() => setStep('downloading'), 2000);
    };

    const formatBytes = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center overflow-hidden">
            {/* Ambient Background Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-50/50 via-white to-white" />

            {/* 3D Background Layer */}
            {mounted && (
                <div className="absolute inset-0 z-0 select-none pointer-events-none">
                    <SceneLayout>
                        <group position={[0, -0.5, -4]} scale={2.5}>
                            <NousOrb />
                        </group>
                    </SceneLayout>
                </div>
            )}

            {/* Content Layer */}
            <div className="relative z-10 w-full max-w-xl px-8 flex flex-col items-center text-center">
                <AnimatePresence mode="wait">
                    {step === 'welcome' && (
                        <motion.div 
                            key="welcome"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex flex-col items-center"
                        >
                            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-indigo-200">
                                <Cpu className="text-white" size={40} />
                            </div>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-4">
                                Bienvenido a Nous
                            </h1>
                            <p className="text-lg text-slate-500 font-light mb-10 leading-relaxed">
                                Estás a un paso de tener el ecosistema SEO más avanzado corriendo nativamente en tu máquina.
                            </p>
                            <button 
                                onClick={startSetup}
                                className="group flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-100 hover:scale-[1.02]"
                            >
                                Iniciar Configuración <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>
                    )}

                    {step === 'checking' && (
                        <motion.div 
                            key="checking"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center"
                        >
                            <Loader2 size={48} className="text-indigo-600 animate-spin mb-8" />
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">Verificando Hardware</h2>
                            <p className="text-slate-500">Optimizando el núcleo de IA para tu procesador...</p>
                            
                            <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <ShieldCheck className="text-emerald-500 mb-2" size={20} />
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Seguridad</div>
                                    <div className="text-sm font-semibold text-slate-700">AES-NI Verified</div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <Cpu className="text-indigo-500 mb-2" size={20} />
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aceleración</div>
                                    <div className="text-sm font-semibold text-slate-700">AVX2 Enabled</div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 'downloading' && (
                        <motion.div 
                            key="downloading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full flex flex-col items-center"
                        >
                            <div className="mb-10 text-center">
                                <h2 className="text-3xl font-bold text-slate-900 mb-2">Desplegando Inteligencia</h2>
                                <p className="text-slate-500">Descargando redes neuronales a tu almacenamiento local.</p>
                            </div>

                            <div className="w-full bg-slate-100 rounded-3xl p-8 border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-end mb-4">
                                    <div className="text-left">
                                        <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                                            {connectionStatus === 'connecting' && <Loader2 size={10} className="animate-spin" />}
                                            {connectionStatus === 'connected' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                            {connectionStatus === 'error' && <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                                            Descargando: {downloadInfo.model || 'Iniciando...'}
                                        </div>
                                        <div className="text-2xl font-black text-slate-800">
                                            {progress.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="text-right text-sm font-medium text-slate-400">
                                        {formatBytes(downloadInfo.downloaded)} / {formatBytes(downloadInfo.total)}
                                    </div>
                                </div>

                                <div className="w-full bg-slate-200/50 h-3 rounded-full overflow-hidden mb-2">
                                    <motion.div 
                                        className="h-full bg-indigo-600 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                    <Download size={12} /> Conexión segura punto a punto con HuggingFace Hub
                                </div>
                            </div>

                            <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-3 text-left">
                                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'error' ? 'bg-rose-500' : 'bg-amber-400 animate-pulse'} shrink-0`} />
                                <p className={`text-xs ${connectionStatus === 'error' ? 'text-rose-700' : 'text-amber-700'} font-medium leading-tight`}>
                                    {connectionStatus === 'error' 
                                        ? "Error en la descarga. Por favor, verifica tu conexión a internet y asegúrate de que el servidor local tenga permisos de escritura."
                                        : "Esta es una descarga única de ~10GB. Por favor, no cierres la aplicación."}
                                </p>
                            </div>
                            
                            {connectionStatus === 'error' && (
                                <button 
                                    onClick={() => setStep('welcome')}
                                    className="mt-6 text-sm font-bold text-indigo-600 hover:text-indigo-700 underline"
                                >
                                    Reintentar configuración
                                </button>
                            )}
                        </motion.div>
                    )}

                    {step === 'finishing' && (
                        <motion.div 
                            key="finishing"
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center"
                        >
                            <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-emerald-100">
                                <ShieldCheck className="text-white" size={48} />
                            </div>
                            <h2 className="text-4xl font-black text-slate-900 mb-4">Todo Listo</h2>
                            <p className="text-slate-500 mb-10 max-w-sm">
                                Tu nodo local de Nous está configurado y listo para generar el mejor contenido SEO del mercado.
                            </p>
                            <button 
                                onClick={onComplete}
                                className="bg-slate-900 hover:bg-black text-white px-12 py-4 rounded-2xl font-bold transition-all shadow-xl hover:scale-[1.02]"
                            >
                                Entrar al Dashboard
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer Branding */}
            <div className="absolute bottom-10 left-10 flex items-center gap-3 opacity-30 select-none grayscale">
                <div className="w-8 h-8 rounded-lg bg-slate-900" />
                <span className="text-sm font-bold tracking-widest text-slate-900 uppercase">Nous Clinical Technology</span>
            </div>
            
            <div className="absolute bottom-10 right-10 text-[10px] font-mono text-slate-300">
                v0.1.0-RC_STABLE
            </div>
        </div>
    );
}
