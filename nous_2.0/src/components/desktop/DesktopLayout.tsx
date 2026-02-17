"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { X, Minus, RotateCcw } from 'lucide-react';

interface DesktopLayoutProps {
    children: React.ReactNode;
    isConnected?: boolean;
}

export function DesktopLayout({ children, isConnected = false }: DesktopLayoutProps) {
    const [appWindow, setAppWindow] = useState<any>(null);

    useEffect(() => {
        // Initialize window object only on client side
        setAppWindow(getCurrentWindow());
    }, []);

    const handleMinimize = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[Window] Minimizing...');
        if (appWindow) await appWindow.minimize();
    };

    const handleClose = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[Window] Closing...');
        if (appWindow) await appWindow.close();
    };

    const handleDrag = async (e: React.MouseEvent) => {
        // Only drag if left button is pressed
        if (e.button === 0 && appWindow) {
            await appWindow.startDragging();
        }
    };

    const handleReload = () => {
        window.location.reload();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-screen w-screen overflow-hidden bg-white text-gray-900 font-sans border border-gray-200 rounded-2xl flex flex-col shadow-2xl relative"
        >
            {/* 100% Reliable Custom Title Bar */}
            <div
                className="h-12 flex items-center justify-between px-4 select-none bg-gray-50/80 border-b border-gray-100 relative z-[9999] cursor-default"
                onMouseDown={handleDrag}
            >
                {/* Status Indicator */}
                <div className="flex items-center gap-3 pointer-events-none">
                    <div className="relative">
                        <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]' : 'bg-amber-400 animate-pulse'}`} />
                        {isConnected && <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-20" />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                        Nous Engine <span className="text-[8px] opacity-40">v0.4.0</span>
                    </span>
                </div>

                {/* Window Actions */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleReload}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
                        title="Reload Interface"
                    >
                        <RotateCcw size={14} />
                    </button>
                    <div className="w-[1px] h-4 bg-gray-200 mx-1" />
                    <button
                        onClick={handleMinimize}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
                        title="Minimize"
                    >
                        <Minus size={16} />
                    </button>
                    <button
                        onClick={handleClose}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="p-2 rounded-xl text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-all font-bold"
                        title="Close"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Content Overflow Guard */}
            <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-white">
                <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                    {children}
                </div>
            </main>

            {/* Resize Area (Hit area for the corner) */}
            <div
                className="absolute bottom-0 right-0 w-8 h-8 z-[10000] cursor-se-resize flex items-end justify-end p-1 group"
                onMouseDown={async (e) => {
                    e.stopPropagation();
                    if (appWindow) await appWindow.startResizing('BottomRight');
                }}
            >
                <div className="w-2 h-2 border-r-2 border-b-2 border-gray-200 group-hover:border-gray-400 transition-colors rounded-br-sm" />
            </div>

            {/* Final aesthetic touch: Inner border */}
            <div className="absolute inset-0 border border-white/50 rounded-2xl pointer-events-none" />
        </motion.div>
    );
}
