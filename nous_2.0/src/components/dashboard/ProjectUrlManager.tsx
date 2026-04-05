'use client';

import { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    RefreshCw,
    ExternalLink,
    TrendingUp,
    TrendingDown,
    Target,
    Filter,
    ArrowUpRight,
    Loader2,
    AlertCircle,
    CheckCircle2,
    PlusCircle
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface ProjectUrl {
    id: string;
    url: string;
    top_query: string;
    clicks_30d: number;
    impressions_30d: number;
    ctr_30d: number;
    position_30d: number;
    strategic_score: number;
    status: string;
    last_audited_at: string;
    is_task?: boolean;
}

export default function ProjectUrlManager() {
    const { activeProject } = useProjectStore();
    const [urls, setUrls] = useState<ProjectUrl[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAuditing, setIsAuditing] = useState(false);
    const [creatingTaskId, setCreatingTaskId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'high_potential' | 'striking_distance'>('all');

    const { addTask, tasks } = useProjectStore();

    const fetchUrls = async () => {
        if (!activeProject) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('project_urls')
                .select('*')
                .eq('project_id', activeProject.id)
                .order('strategic_score', { ascending: false });

            if (error) throw error;

            // Mark which URLs already have a task
            const existingUrls = new Set(tasks.map(t => t.url));
            const enrichedData = (data || []).map(u => ({
                ...u,
                is_task: existingUrls.has(u.url)
            }));

            setUrls(enrichedData);
        } catch (err) {
            console.error('Error fetching project URLs:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async (url: ProjectUrl) => {
        if (!activeProject) return;
        setCreatingTaskId(url.id);

        try {
            await addTask({
                project_id: activeProject.id,
                title: `Optimizar: ${url.top_query || url.url}`,
                brief: `Optimización basada en GSC. URL actual: ${url.url}.\nKeyword principal: ${url.top_query}.\nMétricas: ${url.clicks_30d} clics, ${url.position_30d.toFixed(1)} pos media.`,
                scheduled_date: new Date().toISOString(),
                status: 'idea',
                priority: url.strategic_score >= 80 ? 'high' : 'medium',
                target_keyword: url.top_query,
                url: url.url,
                research_dossier: {
                    gsc_stats: {
                        clicks: url.clicks_30d,
                        impressions: url.impressions_30d,
                        position: url.position_30d,
                        ctr: url.ctr_30d
                    }
                }
            });

            // Refresh list to show task status
            await fetchUrls();
        } catch (err) {
            console.error('Error creating task:', err);
        } finally {
            setCreatingTaskId(null);
        }
    };

    useEffect(() => {
        fetchUrls();
    }, [activeProject]);

    const handleRunAudit = async () => {
        if (!activeProject || isAuditing) return;
        setIsAuditing(true);
        try {
            const res = await fetch(`/api/projects/${activeProject.id}/audit`, { method: 'POST' });
            if (!res.ok) throw new Error('Audit failed');
            await fetchUrls();
        } catch (err) {
            console.error('Audit error:', err);
        } finally {
            setIsAuditing(false);
        }
    };

    const filteredUrls = urls.filter(u => {
        const matchesSearch = u.url.toLowerCase().includes(search.toLowerCase()) ||
            u.top_query?.toLowerCase().includes(search.toLowerCase());

        if (filter === 'high_potential') return matchesSearch && u.strategic_score >= 80;
        if (filter === 'striking_distance') return matchesSearch && u.position_30d > 3 && u.position_30d <= 15;
        return matchesSearch;
    });

    return (
        <div className="flex flex-col gap-8">
            {/* Header / Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar URL o Keyword..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg py-3 pl-12 pr-6 text-sm w-[300px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-sm"
                        />
                    </div>

                    <div className="flex p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                        <button
                            onClick={() => setFilter('all')}
                            className={cn(
                                "px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                                filter === 'all' ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Todo
                        </button>
                        <button
                            onClick={() => setFilter('striking_distance')}
                            className={cn(
                                "px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                                filter === 'striking_distance' ? "bg-amber-500 text-white" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Striking Distance
                        </button>
                        <button
                            onClick={() => setFilter('high_potential')}
                            className={cn(
                                "px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                                filter === 'high_potential' ? "bg-cyan-500 text-white" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Alto Score
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleRunAudit}
                    disabled={isAuditing}
                    className={cn(
                        "px-6 py-4 bg-slate-900 text-white rounded-lg text-sm font-black uppercase tracking-[0.1em] shadow-xl shadow-slate-900/20 flex items-center gap-3 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100",
                        isAuditing && "animate-pulse"
                    )}
                >
                    {isAuditing ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                    {isAuditing ? "Auditanndo Inventario..." : "Ejecutar Auditoría GSC"}
                </button>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-100 rounded-[40px] shadow-sm overflow-hidden border-b-8 border-b-slate-50">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-50 bg-slate-50/50">
                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">URL / Top Query</th>
                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Métricas (30d)</th>
                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Score Estratégico</th>
                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                            <th className="px-8 py-6"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="px-8 py-10 h-24 bg-white"></td>
                                </tr>
                            ))
                        ) : filteredUrls.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center">
                                    <AlertCircle className="mx-auto text-slate-200 mb-4" size={48} />
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No se encontraron URLs. Ejecuta una auditoría.</p>
                                </td>
                            </tr>
                        ) : (
                            filteredUrls.map((url) => (
                                <tr key={url.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col max-w-[400px]">
                                            <a
                                                href={url.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs font-bold text-slate-600 mb-1 hover:text-cyan-600 transition-colors truncate flex items-center gap-2"
                                            >
                                                {url.url.replace(/^https?:\/\/(www\.)?/, '')} <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                            <div className="flex items-center gap-2">
                                                <Target size={12} className="text-cyan-500" />
                                                <span className="text-[10px] font-black uppercase text-slate-400">{url.top_query}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center justify-center gap-6">
                                            <div className="text-center">
                                                <span className="block text-[9px] font-black text-slate-300 uppercase mb-1">Clics</span>
                                                <span className="text-xs font-bold text-slate-700">{url.clicks_30d.toLocaleString()}</span>
                                            </div>
                                            <div className="text-center">
                                                <span className="block text-[9px] font-black text-slate-300 uppercase mb-1">Posición</span>
                                                <span className={cn(
                                                    "text-xs font-bold",
                                                    url.position_30d <= 3 ? "text-emerald-500" :
                                                        url.position_30d <= 10 ? "text-amber-500" : "text-slate-400"
                                                )}>
                                                    {url.position_30d.toFixed(1)}
                                                </span>
                                            </div>
                                            <div className="text-center">
                                                <span className="block text-[9px] font-black text-slate-300 uppercase mb-1">CTR</span>
                                                <span className="text-xs font-bold text-slate-700">{url.ctr_30d.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden max-w-[100px]">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${url.strategic_score}%` }}
                                                    className={cn(
                                                        "h-full rounded-full",
                                                        url.strategic_score >= 80 ? "bg-cyan-500" :
                                                            url.strategic_score >= 50 ? "bg-indigo-500" : "bg-slate-300"
                                                    )}
                                                />
                                            </div>
                                            <span className="text-xs font-black italic">{url.strategic_score} <span className="text-[10px] opacity-30">pts</span></span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            {url.strategic_score >= 80 ? (
                                                <span className="flex items-center gap-1.5 px-3 py-1 bg-cyan-50 text-cyan-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                    Prioridad Alta
                                                </span>
                                            ) : url.position_30d > 3 && url.position_30d <= 15 ? (
                                                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                    Striking Distance
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                    Optimizado
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        {url.is_task ? (
                                            <div className="flex items-center gap-2 justify-end text-emerald-500 font-bold text-[9px] uppercase tracking-widest px-4 py-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                                <CheckCircle2 size={14} /> En Calendario
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleCreateTask(url)}
                                                disabled={creatingTaskId === url.id}
                                                className="px-4 py-3 bg-white hover:bg-slate-900 hover:text-white border border-slate-100 rounded-lg shadow-sm transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-2 group/btn whitespace-nowrap"
                                            >
                                                {creatingTaskId === url.id ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <PlusCircle size={14} className="text-cyan-500 group-hover/btn:text-white" />
                                                )}
                                                {creatingTaskId === url.id ? "Creando..." : "Crear Tarea"}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
