'use client';

import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Loader2, CheckCircle2, AlertCircle, ExternalLink, Activity } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ScrapingStatus {
    url: string;
    status: 'navigating' | 'searching' | 'scraping' | 'done' | 'error';
    message: string;
}

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export default function ScrapingMonitor() {
    const [activeScrapes, setActiveScrapes] = useState<ScrapingStatus[]>([]);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!isTauri) return;

        const unlisten = listen<ScrapingStatus>('scraping-status', (event) => {
            const newStatus = event.payload;
            setIsVisible(true);

            setActiveScrapes(prev => {
                // Update if exists, otherwise add
                const existing = prev.findIndex(s => s.url === newStatus.url);
                if (existing >= 0) {
                    const next = [...prev];
                    next[existing] = newStatus;
                    return next;
                }
                return [newStatus, ...prev].slice(0, 5); // Keep last 5
            });

            // Auto-hide 'done' after 5 seconds
            if (newStatus.status === 'done') {
                setTimeout(() => {
                    setActiveScrapes(prev => prev.filter(s => s.url !== newStatus.url));
                }, 5000);
            }
        });

        return () => {
            unlisten.then(f => f());
        };
    }, []);

    if (!isTauri || activeScrapes.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] w-[350px]">
            <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden ring-1 ring-white/5">
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Local Node Crawler</span>
                    </div>
                    <Activity size={14} className="text-slate-500" />
                </div>

                <div className="p-4 space-y-3">
                    <AnimatePresence>
                        {activeScrapes.map((scrape, i) => (
                            <motion.div
                                key={scrape.url}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="p-3 bg-white/5 rounded-2xl border border-white/5 group hover:border-white/10 transition-all"
                            >
                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        "p-2 rounded-xl flex-shrink-0",
                                        scrape.status === 'navigating' ? "bg-cyan-500/20 text-cyan-400" :
                                            scrape.status === 'searching' ? "bg-amber-500/20 text-amber-400" :
                                                scrape.status === 'done' ? "bg-emerald-500/20 text-emerald-400" :
                                                    "bg-rose-500/20 text-rose-400"
                                    )}>
                                        {scrape.status === 'done' ? <CheckCircle2 size={14} /> :
                                            scrape.status === 'error' ? <AlertCircle size={14} /> :
                                                <Loader2 size={14} className="animate-spin" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                                {scrape.status}
                                            </span>
                                            <ExternalLink size={10} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-200 truncate">
                                            {scrape.url}
                                        </p>
                                        <p className="text-[9px] text-slate-500 font-medium truncate mt-0.5">
                                            {scrape.message}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Desktop "Mini View" Placeholder */}
                <div className="px-4 pb-4">
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-cyan-500"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 3, repeat: Infinity }}
                        />
                    </div>
                    <p className="text-[8px] text-slate-600 mt-2 text-center uppercase font-black tracking-widest">
                        Neural Proxy Active • Clinical IP Verified
                    </p>
                </div>
            </div>
        </div>
    );
}
