'use client';

import { useState } from 'react';
import { LocalNodeBridge } from '@/lib/local-node/bridge';
import { Search, Globe, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/utils/cn';
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
                setResults(response.data);
                NotificationService.notify("Rastreo Completado", `Se han encontrado ${response.data.length} resultados para "${keyword}".`);
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
        <div className="p-8 bg-white rounded-[40px] shadow-sm border border-slate-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Deep Crawler <span className="text-emerald-500">Pro</span></h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Local Browser Orchestration</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Neural Link Enabled</span>
                </div>
            </div>

            <div className="flex gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="Escribe una keyword para rastrear Google..."
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                    />
                </div>
                <button
                    onClick={runSearch}
                    disabled={loading || !keyword}
                    className="px-8 bg-slate-900 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                    Rastrear
                </button>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex items-center gap-3 mb-8">
                    <AlertCircle size={20} />
                    <span className="text-sm font-bold">{error}</span>
                </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                {results.length > 0 ? (
                    results.map((res, idx) => (
                        <div key={idx} className="p-5 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 group">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{res.title}</h4>
                                <a href={res.link} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-600">
                                    <ExternalLink size={14} />
                                </a>
                            </div>
                            <p className="text-[10px] text-emerald-600 font-mono mb-2 truncate">{res.link}</p>
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{res.snippet}</p>
                        </div>
                    ))
                ) : !loading && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                        <Globe size={48} className="mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest">Esperando instrucciones...</p>
                    </div>
                )}

                {loading && (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-slate-50 animate-pulse rounded-2xl" />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
