"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface DesktopLayoutProps {
    children: React.ReactNode;
    isConnected?: boolean;
}

export function DesktopLayout({ children, isConnected = false }: DesktopLayoutProps) {
    const appWindow = typeof window !== 'undefined' ? getCurrentWindow() : null;

    const minimizeWindow = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (appWindow) await appWindow.minimize();
    };

    const closeWindow = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (appWindow) await appWindow.close();
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-screen w-screen overflow-hidden bg-white/90 backdrop-blur-xl text-gray-900 font-sans border border-white/20 rounded-2xl flex flex-col shadow-2xl relative"
        >
            {/* Native Drag Region Title Bar */}
            <div
                data-tauri-drag-region
                className="h-10 flex items-center justify-between px-4 select-none bg-gray-50/30 border-b border-gray-100/50 relative z-[100]"
            >
                <div className="flex items-center gap-2 pointer-events-none">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-400 animate-pulse'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
                        Nous Engine {isConnected ? 'Online' : 'Linking...'}
                    </span>
                </div>

                {/* Window Controls */}
                <div className="flex gap-2.5">
                    <button
                        onClick={minimizeWindow}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-3.5 h-3.5 rounded-full bg-gray-200 hover:bg-gray-300 transition-all flex items-center justify-center group"
                    >
                        <div className="w-1.5 h-[1px] bg-gray-500 group-hover:bg-gray-700" />
                    </button>
                    <button
                        onClick={closeWindow}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-3.5 h-3.5 rounded-full bg-rose-100 hover:bg-rose-500 transition-all flex items-center justify-center group"
                    >
                        <div className="relative w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white rotate-45" />
                            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white -rotate-45" />
                        </div>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
                <div className="flex-1 flex flex-col p-5 gap-5 overflow-y-auto no-scrollbar pb-10">
                    {children}
                </div>
            </div>

            {/* Bottom-Right corner handle for resizing (Tauri usually handles this but we add a hit area) */}
            <div
                className="absolute bottom-0 right-0 w-6 h-6 z-[101] pointer-events-none"
                style={{ cursor: 'se-resize' }}
            >
                <div
                    className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-gray-300 opacity-30"
                    style={{ pointerEvents: 'auto' }}
                    onMouseDown={async (e) => {
                        // In some Tauri versions you can trigger start_resizing
                        // @ts-ignore
                        if (appWindow?.startResizing) await appWindow.startResizing('BottomRight');
                    }}
                />
            </div>

            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none" />
        </motion.div>
    );
}
