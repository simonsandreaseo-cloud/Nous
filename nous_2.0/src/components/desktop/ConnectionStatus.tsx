import React from 'react';
import { motion } from 'framer-motion';

interface ConnectionStatusProps {
    status: 'connected' | 'connecting' | 'disconnected';
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
    const getStatusColor = () => {
        switch (status) {
            case 'connected': return 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.7)]';
            case 'connecting': return 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.7)]';
            case 'disconnected': return 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.7)]';
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'connected': return 'LINK ESTABLISHED';
            case 'connecting': return 'SEARCHING UPLINK...';
            case 'disconnected': return 'OFFLINE';
        }
    };

    return (
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
            <div className="relative">
                <motion.div
                    animate={{ scale: status === 'connecting' ? [1, 1.5, 1] : 1, opacity: status === 'connecting' ? [0.5, 1, 0.5] : 1 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className={`w-3 h-3 rounded-full ${getStatusColor()}`}
                />
                {status === 'connected' && (
                    <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-20" />
                )}
            </div>
            <span className="text-xs font-mono tracking-widest text-white/80 font-bold">
                {getStatusText()}
            </span>
        </div>
    );
}
