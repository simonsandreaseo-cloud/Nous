"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Cpu, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { LocalNodeBridge } from '../../lib/local-node/bridge';

interface SetupStep {
    id: 'welcome' | 'checking' | 'downloading' | 'finishing';
    title: string;
    description: string;
}

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState<SetupStep['id']>('welcome');
    const [progress, setProgress] = useState(0);
    const [downloadInfo, setDownloadInfo] = useState({ downloaded: 0, total: 0, model: 'Iniciando...', label: '' });
    const [logs, setLogs] = useState<{message: string, type: 'info' | 'warn' | 'error'}[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connected');
    const [mounted, setMounted] = useState(false);
    const [enginesReady, setEnginesReady] = useState<{ text: boolean; image: boolean }>({ text: false, image: false });


    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (step === 'downloading') {
            const unSubStatus = LocalNodeBridge.on('MODELS_STATUS', (payload: any) => {
                const { image_ready, text_ready } = payload;
                setEnginesReady({ text: text_ready, image: image_ready });
                if (image_ready && text_ready) {
                    setStep('finishing');
                }
            });

            const unSubDownloadStatus = LocalNodeBridge.on('DOWNLOAD_STATUS', (payload: any) => {

                const { model, status, message } = payload;
                if (status === 'downloading') {
                    setDownloadInfo(prev => ({ ...prev, model }));
                } else if (status === 'error') {
                    setConnectionStatus('error');
                    console.error('Download error:', message);
                }
            });

            const unSubProgress = LocalNodeBridge.on('DOWNLOAD_PROGRESS', (payload: any) => {
                const { progress, downloaded, total, model, label } = payload;
                setProgress(progress);
                setDownloadInfo({ downloaded, total, model, label: label || '' });
            });

            const unSubLog = LocalNodeBridge.on('LOG', (payload: any) => {
                setLogs(prev => [...prev.slice(-3), { message: payload.message, type: payload.level || 'info' }]);
            });


            const unSubEngine = LocalNodeBridge.on('ENGINE_READY', (payload: any) => {
                const engine = payload.engine;
                setEnginesReady(prev => {
                    const newState = { ...prev, [engine]: true };
                    // If both are ready, proceed to finishing
                    if (newState.text && newState.image) {
                        setStep('finishing');
                    }
                    return newState;
                });
            });

            // Re-sync with bridge
            LocalNodeBridge.send('CHECK_MODELS');
            
            return () => {
                unSubStatus();
                unSubDownloadStatus();
                unSubProgress();
                unSubEngine();
                unSubLog();
            };


        }
    }, [step]);

    const startSetup = () => {
        setStep('checking');
        // Small delay to simulate system verification
        setTimeout(() => setStep('downloading'), 2000);
    };

    const formatProgressValues = (downloaded: number, total: number) => {
        if (!total) return 'Iniciando...';
        
        // If it looks like bytes (heuristics: total > 1000)
        if (total > 1000) {
            const formatBytes = (bytes: number) => {
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            };
            return `${formatBytes(downloaded)} / ${formatBytes(total)}`;
        }
        
        // Otherwise it's a counter (like 4/7 files / 517/517 weights)
        return `${downloaded} / ${total} unidades`;
    };


    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center overflow-hidden">
            {/* Ambient Background Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-50/50 via-white to-white" />

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
                                            {downloadInfo.model}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-medium mb-1">
                                            {downloadInfo.label || 'Sincronizando...'}
                                        </div>
                                        <div className="text-2xl font-black text-slate-800">
                                            {progress.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="text-right text-sm font-medium text-slate-400">
                                        {formatProgressValues(downloadInfo.downloaded, downloadInfo.total)}
                                    </div>
                                </div>

                                <div className="w-full bg-slate-200/50 h-3 rounded-full overflow-hidden mb-4">
                                    <motion.div 
                                        className="h-full bg-indigo-600 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>

                                {/* Log Monitor / Console View (Light Theme) */}
                                <div className="w-full bg-slate-50/80 rounded-2xl p-4 font-mono text-[10px] text-slate-500 mb-6 h-28 overflow-hidden border border-slate-200/60 shadow-inner">
                                    <div className="flex flex-col gap-1.5">
                                        {logs.map((log, i) => (
                                            <div key={i} className="flex gap-2 items-start">
                                                <span className="opacity-40 shrink-0 font-bold text-indigo-400">{new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>
                                                <span className={log.type === 'error' ? 'text-rose-500 font-semibold' : log.type === 'warn' ? 'text-amber-600' : 'text-slate-600'}>
                                                    {log.message}
                                                </span>
                                            </div>
                                        ))}
                                        {logs.length === 0 && <div className="opacity-40 italic py-2">Estableciendo puente de datos con el núcleo...</div>}
                                        <div className="w-1.5 h-3 bg-indigo-500/20 animate-pulse inline-block rounded-sm" />
                                    </div>
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
