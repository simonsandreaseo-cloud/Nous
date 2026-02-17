'use client';

import { useState } from 'react';
import { LocalNodeBridge } from '@/lib/local-node/bridge';
import { Search, Globe, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationService } from '@/lib/services/notifications';

export default function CrawlerConsole() {
    const [keyword, setKeyword] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const runSearch = async () => {
        if (!keyword) return;
        setLoading(true);
        setError(null);
        setResults([]);

        try {
            const response = await LocalNodeBridge.crawl({ keyword, mode: 'search' });
            if (response.success) {
                // Determine if we have SERP results or regular data
                const items = response.data.serpResults || [response.data];
                setResults(items);
                NotificationService.notify("Rastreo Completado", `Se han encontrado ${items.length} resultados para "${keyword}".`);
            } else {
                setError(response.error || 'Unknown crawler error');
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-[40px] h-full flex flex-col relative overflow-hidden group/console border border-slate-100 shadow-sm">
            {/* Glossy Header */}
            <div className="p-8 pb-4 flex items-center justify-between relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Deep Crawler <span className="text-emerald-500 italic">Pro</span></h3>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Neural Engine v2.0</p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div className="flex -space-x-1">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-slate-200" />
                        ))}
                    </div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Global Proxy</span>
                </div>
            </div>

            {/* Main Search Input Area */}
            <div className="px-8 mb-8 relative z-10">
                <div className="bg-slate-50 border border-slate-100 p-2 rounded-[32px] flex gap-2 shadow-inner-sm transition-all focus-within:border-emerald-200 focus-within:bg-white focus-within:shadow-xl focus-within:shadow-emerald-500/5">
                    <div className="relative flex-1">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="Introduce keyword a rastrear en tiempo real..."
                            className="w-full pl-14 pr-4 py-5 bg-transparent text-sm font-bold placeholder:text-slate-300 focus:outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                        />
                    </div>
                    <button
                        onClick={runSearch}
                        disabled={loading || !keyword}
                        className={cn(
                            "px-10 rounded-[24px] font-black text-[11px] uppercase tracking-widest transition-all flex items-center gap-2 relative overflow-hidden",
                            loading
                                ? "bg-slate-100 text-slate-400"
                                : "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10 active:scale-95"
                        )}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} className="text-emerald-400" />}
                        {loading ? "Rastreando" : "Iniciar Escaneo"}
                    </button>
                </div>
            </div>

            {/* Error Message with better style */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mx-8 mb-8 p-5 bg-rose-50 text-rose-600 rounded-3xl border border-rose-100 flex items-center gap-4 shadow-sm"
                    >
                        <div className="p-2 bg-white rounded-xl shadow-sm text-rose-500">
                            <AlertCircle size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5">Fallo de Motor</p>
                            <p className="text-xs font-bold leading-none">{error === 'Crawler timeout' ? 'El motor local no respondió a tiempo. Asegúrate de que el Motor Helios esté encendido.' : error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-[10px] font-black uppercase tracking-widest hover:text-rose-900 p-2">Ignorar</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Results Grid / Area */}
            <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4 custom-scrollbar">
                {results.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {results.map((res, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="p-6 bg-slate-50/50 rounded-[32px] hover:bg-white transition-all border border-transparent hover:border-slate-100 hover:shadow-xl hover:shadow-slate-200/40 group/card relative"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[9px] font-black text-emerald-500 font-mono tracking-tighter bg-emerald-50 px-2 rounded uppercase">Posición {idx + 1}</span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new URL(res.link).hostname}</span>
                                        </div>
                                        <h4 className="text-base font-black text-slate-900 leading-tight group-hover/card:text-emerald-600 transition-colors uppercase italic">{res.title}</h4>
                                    </div>
                                    <a href={res.link} target="_blank" rel="noopener noreferrer" className="p-3 bg-white rounded-2xl shadow-sm opacity-0 group-hover/card:opacity-100 transition-all hover:text-emerald-500">
                                        <ExternalLink size={18} />
                                    </a>
                                </div>
                                <p className="text-[10px] text-slate-400 font-mono mb-4 truncate">{res.link}</p>
                                <div className="p-4 bg-white/60 rounded-2xl border border-slate-50 text-[13px] text-slate-600 leading-relaxed font-medium line-clamp-2">
                                    {res.snippet}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : !loading && (
                    <div className="h-full flex flex-col items-center justify-center py-20">
                        <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center mb-6 border border-slate-100 shadow-inner rotate-3 transition-transform group-hover/console:-rotate-3">
                            <Globe size={40} className="text-slate-200" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Esperando Señal de Entrada</p>
                    </div>
                )}

                {loading && (
                    <div className="space-y-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-slate-50 animate-pulse rounded-[32px] border border-slate-100" />
                        ))}
                    </div>
                )}
            </div>

            {/* Background Texture Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] grayscale bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        </div>
    );
}
