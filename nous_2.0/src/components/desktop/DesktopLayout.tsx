import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ConnectionStatus } from './ConnectionStatus';

interface DesktopLayoutProps {
    children: React.ReactNode;
    isConnected?: boolean;
}

export function DesktopLayout({ children, isConnected = false }: DesktopLayoutProps) {
    const minimizeWindow = async () => {
        try {
            await getCurrentWindow().minimize();
        } catch (e) {
            console.error('Minimize failed:', e);
        }
    };
    const closeWindow = async () => {
        try {
            await getCurrentWindow().close();
        } catch (e) {
            console.error('Close failed:', e);
        }
    };

    const startDrag = async () => {
        await getCurrentWindow().startDragging();
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: "circOut" }}
            className="h-screen w-screen overflow-hidden bg-white text-gray-900 font-sans selection:bg-gray-200 border border-gray-200 rounded-xl flex flex-col shadow-2xl relative"
        >
            {/* Draggable Title Bar (Explicit Handler) */}
            <div
                className="h-8 flex items-center justify-end px-3 select-none cursor-move bg-gray-50/50 border-b border-gray-100 relative z-50"
                onMouseDown={startDrag}
            >
                {/* Window Controls */}
                <div className="flex gap-2" onMouseDown={(e) => e.stopPropagation()}>
                    <button
                        onClick={minimizeWindow}
                        className="w-3 h-3 rounded-full bg-gray-300 hover:bg-gray-400 transition-colors"
                        title="Minimize"
                    />
                    <button
                        onClick={closeWindow}
                        className="w-3 h-3 rounded-full bg-rose-400/80 hover:bg-rose-500 transition-colors"
                        title="Close"
                    />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col p-6 gap-6 relative overflow-hidden">

                {/* Header Zen */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
                            Nous Engine
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5 font-medium flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`}></span>
                            {isConnected ? 'Connected to Brain' : 'Waiting for connection...'}
                        </p>
                    </div>
                    {/* Minimal Status Icon (can replace ConnectionStatus component or simplify it) */}
                    <div className={`p-2 rounded-full ${isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-white/5 text-gray-400'}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </div>
                </div>

                {/* Content Injection */}
                <div className="flex-1 flex flex-col min-h-0 relative z-10">
                    {children}
                </div>

                {/* Resize Handle (Bottom Right) */}
                <div
                    className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 opacity-20 hover:opacity-50 transition-opacity"
                    onMouseDown={(e) => {
                        // Using Tauri's startDragging is tricky from React directly on resize.
                        // Usually window.resize is handled by OS if hit-test works.
                        // For borderless, we might need a specific plugin command or CSS 'resize: both' if overflow allows.
                        // Actually, Tauri 'resizable: true' + 'decorations: false' usually supports edge resizing on Windows.
                        // But let's add a visual cue.
                    }}
                >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
                        <path d="M10 0L10 10L0 10" fill="currentColor" />
                    </svg>
                </div>
            </div>
        </motion.div>
    );
}
