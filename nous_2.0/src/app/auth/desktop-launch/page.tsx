"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react';
import { LocalNodeBridge } from '@/lib/local-node/bridge';

export default function DesktopLaunchPage() {
    const [status, setStatus] = useState<'initializing' | 'launching' | 'failed' | 'connected'>('initializing');
    const [errorMsg, setErrorMsg] = useState('');
    const user = useAuthStore(state => state.user);
    const statusRef = useRef(status);

    // Keep ref in sync for timeouts
    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    const launchApp = useCallback(() => {
        if (statusRef.current === 'connected') return;

        setStatus('launching');

        const token = user?.id || `demo-${Date.now()}`;
        const deepLink = `nous://auth-callback?token=${token}`;

        console.log('[Web] Launching deep link:', deepLink);
        window.location.href = deepLink;

        // Fallback detection logic if no heartbeat received
        setTimeout(() => {
            if (statusRef.current !== 'connected') {
                setStatus('failed');
                setErrorMsg('We couldn\'t detect the Nous Desktop Engine. Make sure it is installed and running.');
            }
        }, 6000);
    }, [user]);

    useEffect(() => {
        // 1. Check if already connected (e.g. on page refresh)
        if (LocalNodeBridge.isConnected) {
            console.log('[Web] Bridge already connected.');
            setStatus('connected');
            return;
        }

        // 2. Listen for Real Heartbeat from Local App
        const unsubscribe = LocalNodeBridge.on('CONNECTED', () => {
            console.log('[Web] Heartbeat received from Desktop App!');
            setStatus('connected');
        });

        // 3. Initial Launch attempt
        const initTimer = setTimeout(() => {
            launchApp();
        }, 800);

        return () => {
            unsubscribe();
            clearTimeout(initTimer);
        };
    }, [launchApp]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-900 font-sans p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50/20 via-white to-white" />

            <div className="z-10 flex flex-col items-center text-center max-w-sm w-full">
                <div className="relative mb-8">
                    <AnimatePresence mode="wait">
                        {status === 'launching' || status === 'initializing' ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="w-24 h-24 rounded-3xl bg-blue-50 flex items-center justify-center"
                            >
                                <RefreshCcw className="w-10 h-10 text-blue-500 animate-spin" />
                            </motion.div>
                        ) : status === 'failed' ? (
                            <motion.div
                                key="failed"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="w-24 h-24 rounded-3xl bg-amber-50 flex items-center justify-center"
                            >
                                <AlertCircle className="w-12 h-12 text-amber-500" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="connected"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="w-24 h-24 rounded-3xl bg-emerald-50 flex items-center justify-center"
                            >
                                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {(status === 'launching' || status === 'initializing') && (
                        <div className="absolute inset-0 rounded-3xl bg-blue-400/10 animate-ping" />
                    )}
                </div>

                <h1 className="text-2xl font-light tracking-elegant mb-2 uppercase text-slate-800">
                    {status === 'launching' ? 'Lanzando Motor...' :
                        status === 'failed' ? 'Problema de Conexión' :
                            status === 'connected' ? 'Motor Sincronizado' : 'Estableciendo Puente Seguro'}
                </h1>

                <p className="text-[var(--color-nous-mist)] text-[10px] uppercase font-bold tracking-widest mb-10 leading-relaxed px-4">
                    {status === 'launching' ? 'Requesting access to your local desktop modules.' :
                        status === 'failed' ? errorMsg :
                            status === 'connected' ? 'Uplink established successfully. You can now use the studio.' :
                                'Please check your Desktop App for a confirmation alert.'}
                </p>

                <div className="flex flex-col gap-3 w-full">
                    {status === 'connected' ? (
                        <button
                            onClick={() => window.location.href = '/studio/dashboard'}
                            className="w-full py-3.5 rounded-xl font-medium tracking-elegant text-[10px] uppercase bg-[var(--color-nous-mint)]/20 text-[var(--color-nous-mint)] border border-[var(--color-nous-mint)]/30 hover:bg-[var(--color-nous-mint)]/30 shadow-none transition-all"
                        >
                            IR AL DASHBOARD DEL STUDIO
                        </button>
                    ) : (
                        <button
                            onClick={launchApp}
                            disabled={status === 'launching'}
                            className={`w-full py-3.5 rounded-xl font-medium tracking-elegant text-[10px] uppercase transition-all duration-300 shadow-none border ${status === 'launching'
                                ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed'
                                : 'bg-[var(--color-nous-mist)]/20 text-slate-800 hover:bg-[var(--color-nous-mist)]/30 border-[var(--color-nous-mist)]/30'
                                }`}
                        >
                            {status === 'launching' ? 'LANZANDO...' : 'REINTENTAR CONEXIÓN'}
                        </button>
                    )}

                    {status === 'failed' && (
                        <div className="mt-4 pt-6 border-t border-gray-100">
                            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-bold">New to Nous?</p>
                            <a
                                href="/download"
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-semibold transition-colors"
                            >
                                Download Desktop App
                                <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>→</motion.span>
                            </a>
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute bottom-10 text-[10px] text-gray-300 font-medium uppercase tracking-[0.2em]">
                Secure Uplink v0.3.0
            </div>
        </div>
    );
}
