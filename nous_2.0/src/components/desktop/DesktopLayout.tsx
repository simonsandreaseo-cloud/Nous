import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ConnectionStatus } from './ConnectionStatus';
import { ScifiOverlay } from './ScifiOverlay';

interface DesktopLayoutProps {
    children: React.ReactNode;
    isConnected?: boolean;
}

export function DesktopLayout({ children, isConnected = false }: DesktopLayoutProps) {
    const [isHovered, setIsHovered] = useState(false);

    // Initial boot animation state
    const [isBooting, setIsBooting] = useState(true);
    React.useEffect(() => {
        setTimeout(() => setIsBooting(false), 800);
    }, []);

    const minimizeWindow = () => getCurrentWindow().minimize();
    const closeWindow = () => getCurrentWindow().close();

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: "circOut" }}
            className="h-screen w-screen overflow-hidden bg-black/90 backdrop-blur-3xl text-white font-sans selection:bg-cyan-500/30 border border-white/10 rounded-xl flex flex-col shadow-2xl relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <ScifiOverlay />

            {/* Draggable Title Bar */}
            <div data-tauri-drag-region className="h-10 flex items-center justify-between px-4 select-none cursor-move bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-2 pointer-events-none">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/50" />
                    <span className="text-xs font-bold tracking-widest text-white/50 uppercase">Nous Engine</span>
                </div>

                {/* Window Controls */}
                <div className="flex gap-2">
                    <button
                        onClick={minimizeWindow}
                        className="w-3 h-3 rounded-full bg-yellow-500/50 hover:bg-yellow-400 transition-colors"
                    />
                    <button
                        onClick={closeWindow}
                        className="w-3 h-3 rounded-full bg-red-500/50 hover:bg-red-400 transition-colors"
                    />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col p-6 gap-6 relative overflow-hidden">

                {/* Connection Header */}
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50 font-michroma">
                            SYSTEM STATUS
                        </h1>
                        <p className="text-xs text-white/40 mt-1 font-mono">
                            ID: {isConnected ? 'CONNECTED' : 'WAITING_FOR_UPLINK'}
                        </p>
                    </div>
                    <ConnectionStatus status={isConnected ? 'connected' : 'disconnected'} />
                </div>

                {/* Content Injection */}
                <div className="flex-1 flex flex-col min-h-0 relative z-10">
                    {children}
                </div>

                {/* Background Decorative Elements */}
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-20 -left-20 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            </div>
        </motion.div>
    );
}
