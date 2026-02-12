'use client';

import { useState } from 'react';
import { LocalNodeBridge } from '@/lib/local-node/bridge';
import { FileUp, Table, Database, CheckCircle, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';
import { NotificationService } from '@/lib/services/notifications';
import { useProjectStore } from '@/store/useProjectStore';

export default function DataRefinery() {
    const { activeProject, addTask } = useProjectStore();
    const [loading, setLoading] = useState(false);
    const [enriching, setEnriching] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [fileData, setFileData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const syncWithBrain = async () => {
        if (!fileData || !activeProject || syncing) return;
        setSyncing(true);
        try {
            const kwCol = fileData.headers.find((h: string) =>
                ['keyword', 'kw', 'palabra', 'query'].some(v => h.toLowerCase().includes(v))
            );
            const titleCol = fileData.headers.find((h: string) =>
                ['title', 'titulo', 'h1', 'content'].some(v => h.toLowerCase().includes(v))
            );

            let added = 0;
            const rowsToSync = fileData.preview.slice(0, 50);

            for (const row of rowsToSync) {
                await addTask({
                    project_id: activeProject.id,
                    title: row[titleCol] || `Contenido para ${row[kwCol] || 'Keyword'}`,
                    target_keyword: row[kwCol] || '',
                    status: 'todo',
                    scheduled_date: new Date().toISOString().split('T')[0],
                    viability: row['Difficulty'] || row['competition_level'] || 'medium',
                    volume: row['Volume (SEO)'] || row['search_volume'] || 0
                });
                added++;
            }
            NotificationService.notify("Cerebro Sincronizado", `Se han inyectado ${added} nuevas tareas a la estrategia.`);
            setFileData(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSyncing(false);
        }
    };

    const pickAndRefine = async () => {
        if (!LocalNodeBridge.isAvailable()) {
            setError("Neural Link required for Data Refinery Pro.");
            return;
        }

        try {
            const { open } = await import('@tauri-apps/plugin-dialog');
            const selected = await open({
                multiple: false,
                filters: [{ name: 'CSV', extensions: ['csv'] }]
            });

            if (selected && typeof selected === 'string') {
                setLoading(true);
                setError(null);
                const result = await LocalNodeBridge.refineData(selected);
                if (result.success) {
                    setFileData(result);
                    NotificationService.notify("Refinería Pro", `Repositorio inyectado: ${result.totalRows} filas procesadas.`);
                } else {
                    setError(result.error);
                }
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEnrich = async () => {
        if (!fileData || enriching) return;

        const kwCol = fileData.headers.find((h: string) =>
            ['keyword', 'kw', 'palabra', 'query'].some(v => h.toLowerCase().includes(v))
        );

        if (!kwCol) {
            setError("No keyword column detected for enrichment.");
            return;
        }

        setEnriching(true);
        setError(null);
        try {
            const keywords = fileData.preview.map((row: any) => row[kwCol]).filter(Boolean).slice(0, 20);

            const response = await fetch('/api/dataforseo/keywords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords })
            });

            const result = await response.json();
            if (result.success) {
                const enrichedPreview = fileData.preview.map((row: any) => {
                    const metrics = result.data.find((m: any) => m.keyword.toLowerCase() === row[kwCol]?.toLowerCase());
                    if (metrics) {
                        return {
                            ...row,
                            'Volume (SEO)': metrics.search_volume,
                            'Difficulty': metrics.competition_level
                        };
                    }
                    return row;
                });

                setFileData({
                    ...fileData,
                    preview: enrichedPreview,
                    headers: Array.from(new Set([...fileData.headers, 'Volume (SEO)', 'Difficulty']))
                });
                NotificationService.notify("Enriquecimiento Neural", "Los datos de SEO han sido integrados con éxito.");
            } else {
                setError(result.error);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setEnriching(false);
        }
    };

    return (
        <div className="w-full h-full p-8 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 mb-2">
                        Data <span className="text-cyan-500">Refinery</span> <span className="text-slate-300">Pro</span>
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                        Massive CSV Processing • Neural Enrichment • Schema Mapping
                    </p>
                </div>
            </div>

            {!fileData ? (
                <div className="flex flex-col items-center justify-center h-[500px] border-2 border-dashed border-slate-200 rounded-[40px] bg-white group hover:border-cyan-300 transition-all cursor-pointer shadow-sm" onClick={pickAndRefine}>
                    {loading ? (
                        <>
                            <Loader2 className="w-16 h-16 text-cyan-500 animate-spin mb-6" />
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest">Refining Neural Patterns...</h3>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-400 mb-6 group-hover:scale-110 group-hover:text-cyan-500 transition-all shadow-sm">
                                <FileUp size={40} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-2">Inject CSV Repository</h3>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Deep context extraction via Local Node</p>

                            {error && (
                                <div className="mt-8 flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-widest bg-rose-50 px-4 py-2 rounded-xl border border-rose-100">
                                    <AlertTriangle size={14} /> {error}
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Rows</h4>
                            <p className="text-3xl font-black text-slate-900">{fileData.totalRows}</p>
                        </div>
                        <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Columns</h4>
                            <p className="text-3xl font-black text-slate-900">{fileData.headers.length}</p>
                        </div>
                        <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data Source</h4>
                            <div className="flex items-center gap-2 text-slate-900 font-black uppercase text-xs">
                                <FileUp size={14} /> Local CSV
                            </div>
                        </div>
                        <div className="p-6 bg-cyan-500 rounded-3xl shadow-lg shadow-cyan-500/20 text-white">
                            <h4 className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-2">Neural Status</h4>
                            <div className="flex items-center gap-2">
                                <CheckCircle size={20} />
                                <span className="text-xl font-black uppercase tracking-widest">Ready</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-white rounded-[40px] shadow-md border border-slate-100 overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Table size={16} className="text-cyan-500" /> Repository Preview
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleEnrich}
                                    disabled={enriching}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {enriching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    Enrich with DataForSEO
                                </button>
                                <button
                                    onClick={syncWithBrain}
                                    disabled={syncing}
                                    className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 group disabled:opacity-50"
                                >
                                    {syncing ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} className="group-hover:rotate-12 transition-transform" />}
                                    Sync with Brain
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 text-xs font-bold flex items-center gap-2">
                                <AlertTriangle size={14} /> {error}
                            </div>
                        )}

                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        {fileData.headers.map((h: string) => (
                                            <th key={h} className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {fileData.preview.map((row: any, i: number) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-all">
                                            {fileData.headers.map((h: string) => (
                                                <td key={h} className="px-4 py-3 text-[11px] font-bold text-slate-600 truncate max-w-[200px]">{row[h]}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <button
                        onClick={() => setFileData(null)}
                        className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-900 transition-colors"
                    >
                        ← Inject Different Repository
                    </button>
                </motion.div>
            )}
        </div>
    );
}
