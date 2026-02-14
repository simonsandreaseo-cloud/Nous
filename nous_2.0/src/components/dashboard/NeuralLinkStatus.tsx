import { useEffect, useState } from 'react';
import { useNodeStore } from '@/store/useNodeStore';
import { Cpu, Zap, ZapOff, RefreshCw, AlertTriangle, Activity } from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

export function NeuralLinkStatus() {
    const isConnected = useNodeStore((state) => state.isConnected);
    const nodeStatus = useNodeStore((state) => state.status); // IDLE, CRAWLING, PROCESSING, ERROR
    const queueLength = useNodeStore((state) => state.queueLength);

    // Visual Mapping based on Node Status
    const statusConfig = {
        IDLE: {
            color: "text-emerald-600 border-emerald-200 bg-emerald-50/50",
            icon: <Zap size={14} />,
            label: "Neural Link Active"
        },
        CRAWLING: {
            color: "text-purple-600 border-purple-200 bg-purple-50/50",
            icon: <Activity size={14} className="animate-spin" />,
            label: "Deep Crawling..."
        },
        PROCESSING: {
            color: "text-orange-600 border-orange-200 bg-orange-50/50",
            icon: <RefreshCw size={14} className="animate-spin" />,
            label: "Refining Data..."
        },
        ERROR: {
            color: "text-red-600 border-red-200 bg-red-50/50",
            icon: <AlertTriangle size={14} />,
            label: "Node Error"
        }
    };

    const currentConfig = isConnected ? statusConfig[nodeStatus] || statusConfig.IDLE : {
        color: "text-slate-400 border-slate-200 opacity-60",
        icon: <ZapOff size={14} />,
        label: "Web Mode"
    };

    return (
        <div className="flex items-center gap-2 group cursor-help relative">
            <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 shadow-sm backdrop-blur-sm",
                currentConfig.color
            )}>
                <motion.div
                    animate={nodeStatus === 'CRAWLING' || nodeStatus === 'PROCESSING' ? { rotate: 360 } : {}}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                    {currentConfig.icon}
                </motion.div>

                <span className="text-[10px] font-black uppercase tracking-widest hidden md:flex items-center gap-2">
                    {currentConfig.label}
                    {queueLength > 0 && (
                        <span className="bg-slate-900 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px]">
                            {queueLength}
                        </span>
                    )}
                </span>
            </div>

            {/* Tooltip on hover */}
            <div className="absolute top-full right-0 mt-2 p-3 bg-slate-900 text-white rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-56 z-[100] border border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-cyan-400">
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
    );
}
