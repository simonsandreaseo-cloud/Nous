"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react';

import { LocalNodeBridge } from '@/lib/local-node/bridge';

export default function DesktopLaunchPage() {
    const [status, setStatus] = useState<'initializing' | 'launching' | 'failed' | 'connected'>('initializing');
    const [errorMsg, setErrorMsg] = useState('');
    const user = useAuthStore(state => state.user);

    const launchApp = useCallback(() => {
        setStatus('launching');

        // Use a real token if available, otherwise a placeholder for guest/demo
        const token = user?.id || `demo-${Date.now()}`;

        // Attempt to open custom protocol with token
        // Combined 'open' and 'auth-callback' for simplicity
        const deepLink = `nous://auth-callback?token=${token}`;

        console.log('Launching deep link:', deepLink);
        window.location.href = deepLink;

        // Fallback detection logic if no heartbeat received
        const timer = setTimeout(() => {
            if (status !== 'connected') {
                setStatus('failed');
                setErrorMsg('We couldn\'t detect the Nous Desktop Engine. Make sure it is installed and running.');
            }
        }, 6000);

        return () => clearTimeout(timer);
    }, [user, status]);

    useEffect(() => {
        // Listen for Real Heartbeat from Local App
        const unsubscribe = LocalNodeBridge.on('CONNECTED', () => {
            console.log('[Web] Heartbeat received from Desktop App!');
            setStatus('connected');
        });

        // Delay slightly to allow page components to settle
        const initTimer = setTimeout(() => {
            launchApp();
        }, 1000);

        return () => {
            unsubscribe();
            clearTimeout(initTimer);
        };
    }, [launchApp]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-900 font-sans p-6 relative overflow-hidden">

            {/* Background Subtle Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50/20 via-white to-white" />

            <div className="z-10 flex flex-col items-center text-center max-w-sm w-full">

                {/* Dynamic Icon */}
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

                    {/* Pulsing Aura for Loading */}
                    {(status === 'launching' || status === 'initializing') && (
                        <div className="absolute inset-0 rounded-3xl bg-blue-400/10 animate-ping" />
                    )}
                </div>

                <h1 className="text-2xl font-bold tracking-tight mb-2">
                    {status === 'launching' ? 'Launching Engine...' :
                        status === 'failed' ? 'Connection Problem' :
                            status === 'connected' ? 'Engine Synchronized' : 'Establishing Secure Bridge'}
                </h1>

                <p className="text-gray-500 text-sm mb-10 leading-relaxed px-4">
                    {status === 'launching' ? 'Requesting access to your local desktop modules.' :
                        status === 'failed' ? errorMsg :
                            status === 'connected' ? 'Uplink established successfully. You can now close this tab.' :
                                'Please check your Desktop App for a confirmation alert.'}
                </p>

                <div className="flex flex-col gap-3 w-full">
                    {status === 'connected' ? (
                        <button
                            onClick={() => window.location.href = '/studio/dashboard'}
                            className="w-full py-3.5 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 shadow-md transition-all"
                        >
                            GO TO DASHBOARD
                        </button>
                    ) : (
                        <button
                            onClick={launchApp}
                            disabled={status === 'launching'}
                            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-300 shadow-sm ${status === 'launching'
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-gray-900 text-white hover:bg-black hover:shadow-md'
                                }`}
                        >
                            {status === 'launching' ? 'LAUNCHING...' : 'RETRY CONNECTION'}
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

            {/* Subtle Footer */}
            <div className="absolute bottom-10 text-[10px] text-gray-300 font-medium uppercase tracking-[0.2em]">
                Secure Uplink v0.2.1
            </div>
        </div>
    );
}
