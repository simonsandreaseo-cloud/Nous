'use client';

import { useEffect, useState } from 'react';
import { LocalNodeBridge } from '@/lib/local-node/bridge';
import { Cpu, Zap, ZapOff } from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';

export function NeuralLinkStatus() {
    const { neuralLinkStatus: status, setNeuralLinkStatus: setStatus } = useAppStore();
    const [version, setVersion] = useState<string>('');

    useEffect(() => {
        const checkStatus = async () => {
            if (!LocalNodeBridge.isAvailable()) {
                setStatus('offline');
                return;
            }

            try {
                const result = await LocalNodeBridge.ping();
                if (result.includes('Active')) {
                    setStatus('connected');
                    const v = result.match(/v(\d+\.\d+\.\d+)/);
                    if (v) setVersion(v[0]);
                } else {
                    setStatus('offline');
                }
            } catch (e) {
                setStatus('offline');
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 10000);
        return () => clearInterval(interval);
    }, [setStatus]);

    return (
        <div className="flex items-center gap-2 group cursor-help relative">
            <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 bg-white shadow-sm",
                status === 'connected' ? "border-emerald-200 text-emerald-600" :
                    status === 'searching' ? "border-amber-200 text-amber-600 animate-pulse" :
                        "border-slate-200 text-slate-400 opacity-60"
            )}>
                <motion.div
                    animate={status === 'connected' ? {
                        scale: [1, 1.2, 1],
                        opacity: [1, 0.8, 1]
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    {status === 'connected' ? <Zap size={14} /> : status === 'searching' ? <Cpu size={14} /> : <ZapOff size={14} />}
                </motion.div>
                <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">
                    {status === 'connected' ? `Neural Link ${version}` : status === 'searching' ? 'Linking...' : 'Web Mode'}
                </span>
            </div>

            {/* Tooltip on hover */}
            <div className="absolute top-full left-0 mt-2 p-3 bg-slate-900 text-white rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-48 z-[100] border border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-cyan-400">
                    {status === 'connected' ? 'Escritorio Conectado' : 'Modo Navegador'}
                </p>
                <p className="text-[9px] text-slate-400 leading-tight">
                    {status === 'connected'
                        ? 'Acceso local completo habilitado (FS, Scraping Pro, Python Nodes).'
                        : 'Acceso local restringido. Para habilitar funciones avanzadas, inicia Nous Local.'}
                </p>
            </div>
        </div>
    );
}
