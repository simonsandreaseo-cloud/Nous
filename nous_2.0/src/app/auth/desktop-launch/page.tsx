"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function DesktopLaunchPage() {
    const [status, setStatus] = useState('Initializing Launch Sequence...');

    const launchApp = () => {
        setStatus('Sending Signal to Engine...');
        // Attempt to open custom protocol
        window.location.href = 'nous://open';

        // Fallback detection (rudimentary)
        setTimeout(() => {
            setStatus('Engine not detected?');
        }, 5000);
    };

    useEffect(() => {
        launchApp();
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white font-sans p-4 relative overflow-hidden">

            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />

            <div className="z-10 flex flex-col items-center text-center max-w-md">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 mb-8 shadow-lg shadow-cyan-500/50 flex items-center justify-center"
                >
                    <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-cyan-400 animate-pulse" />
                    </div>
                </motion.div>

                <h1 className="text-3xl font-bold font-michroma mb-4">Nous Engine Launch</h1>
                <p className="text-white/60 mb-8 font-mono">{status}</p>

                <div className="flex flex-col gap-4 w-full">
                    <button
                        onClick={launchApp}
                        className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg transition-colors font-bold tracking-wide"
                    >
                        RETRY LAUNCH
                    </button>

                    {status.includes('not detected') && (
                        <a
                            href="/download" // Assumes we have a download page or direct link
                            className="text-cyan-400 hover:text-cyan-300 text-sm underline decoration-dotted underline-offset-4"
                        >
                            Download Nous Desktop Engine →
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
