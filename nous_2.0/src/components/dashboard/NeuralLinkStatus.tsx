import { useEffect, useState } from 'react';
import { useNodeStore } from '@/store/useNodeStore';
import { Cpu, Zap, ZapOff, RefreshCw, AlertTriangle, Activity } from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

export function NeuralLinkStatus() {
    const isConnected = useNodeStore((state) => state.isConnected);
    const nodeStatus = useNodeStore((state) => state.status); // IDLE, CRAWLING, PROCESSING, ERROR
    const queueLength = useNodeStore((state) => state.queueLength);
    const aiMode = useNodeStore((state) => state.aiMode);
    const setAiMode = useNodeStore((state) => state.setAiMode);

    // Visual Mapping based on Node Status
    const statusConfig = {
        IDLE: {
            color: "text-[var(--color-nous-mint)] border-[var(--color-nous-mint)]/30 bg-[var(--color-nous-mint)]/10",
            icon: <Zap size={14} />,
            label: "Santuario Conectado"
        },
        CRAWLING: {
            color: "text-[var(--color-nous-mist)] border-[var(--color-nous-mist)]/30 bg-[var(--color-nous-mist)]/10",
            icon: <Activity size={14} className="animate-spin" />,
            label: "Crawler Activo..."
        },
        PROCESSING: {
            color: "text-[var(--color-nous-lavender)] border-[var(--color-nous-lavender)]/30 bg-[var(--color-nous-lavender)]/10",
            icon: <RefreshCw size={14} className="animate-spin" />,
            label: "Procesando..."
        },
        ERROR: {
            color: "text-red-400 border-red-400/30 bg-red-400/10",
            icon: <AlertTriangle size={14} />,
            label: "Disonancia Nodo"
        },
        DOWNLOADING: {
            color: "text-amber-400 border-amber-400/30 bg-amber-400/10",
            icon: <RefreshCw size={14} className="animate-spin" />,
            label: "Descargando..."
        }
    };

    const currentConfig = isConnected 
        ? (statusConfig[nodeStatus as keyof typeof statusConfig] || statusConfig.IDLE) 
        : {
            color: "text-slate-400 border-hairline opacity-60 backdrop-blur-sm",
            icon: <ZapOff size={14} />,
            label: "Web Mode"
        };

    return (
        <div className="flex items-center gap-4">
            {/* AI Mode Toggle */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-full border border-slate-200">
                <button
                    onClick={() => setAiMode('cloud')}
                    className={cn(
                        "px-2 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full transition-all",
                        aiMode === 'cloud' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    Cloud AI
                </button>
                <button
                    onClick={() => setAiMode('local')}
                    className={cn(
                        "px-2 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full transition-all",
                        aiMode === 'local' ? "bg-[var(--color-nous-lavender)] text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    Local AI
                </button>
            </div>

            <div className="flex items-center gap-2 group cursor-help relative">
                <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 shadow-sm glass-panel",
                    currentConfig.color
                )}>
                    <motion.div
                        animate={nodeStatus === 'CRAWLING' || nodeStatus === 'PROCESSING' ? { rotate: 360 } : {}}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                        {currentConfig.icon}
                    </motion.div>

                    <span className="text-[10px] font-medium tracking-elegant uppercase hidden md:flex items-center gap-2">
                        {currentConfig.label}
                        {queueLength > 0 && (
                            <span className="bg-slate-900 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px]">
                                {queueLength}
                            </span>
                        )}
                    </span>
                </div>

                {/* Tooltip on hover */}
                <div className="absolute top-full right-0 mt-2 p-3 glass-panel text-slate-900 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-56 z-[100]">
                    <p className="text-[10px] font-medium uppercase tracking-elegant mb-1 text-slate-800">
                        Estado del Nodo: {isConnected ? nodeStatus : 'DESCONECTADO'}
                    </p>
                    <div className="space-y-1">
                        <p className="text-[9px] text-slate-400 leading-tight">
                            {isConnected
                                ? `Cola de tareas: ${queueLength}`
                                : 'Inicia la aplicación de escritorio para acceder a funciones locales.'}
                        </p>
                        {isConnected && (
                            <div className="flex gap-1 mt-2">
                                <div className="h-1 flex-1 bg-slate-700 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-cyan-500"
                                        animate={{
                                            width: nodeStatus === 'IDLE' ? "5%" : "100%",
                                            opacity: nodeStatus === 'IDLE' ? 0.5 : 1
                                        }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
