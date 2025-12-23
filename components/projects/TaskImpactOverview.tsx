import React, { useEffect, useState } from 'react';
import { GscService } from '../../services/gscService';
import { Project, Task } from '../../lib/task_manager';
import { ArrowUp, ArrowDown, MousePointer2, Eye, Hash, Activity, Loader2, Target } from 'lucide-react';

interface TaskImpactOverviewProps {
    project: Project;
    tasks: Task[];
}

interface TaskImpactData {
    task: Task;
    current: { clicks: number, impressions: number, position: number };
    previous: { clicks: number, impressions: number, position: number };
    loading: boolean;
    error?: string;
}

export const TaskImpactOverview: React.FC<TaskImpactOverviewProps> = ({ project, tasks }) => {
    const [impacts, setImpacts] = useState<TaskImpactData[]>([]);
    const trackedTasks = tasks.filter(t => t.tracking_metrics && (t.secondary_url || t.associated_url));

    useEffect(() => {
        if (project.gsc_property_url && trackedTasks.length > 0) {
            fetchAllImpacts();
        }
    }, [project.gsc_property_url, tasks.length]);

    const fetchAllImpacts = async () => {
        // Initialize state with loading
        const initial = trackedTasks.map(t => ({
            task: t,
            current: { clicks: 0, impressions: 0, position: 0 },
            previous: { clicks: 0, impressions: 0, position: 0 },
            loading: true
        }));
        setImpacts(initial);

        // Fetch each task's impact
        const promises = trackedTasks.map(async (task, index) => {
            try {
                const end = new Date();
                end.setDate(end.getDate() - 2);

                let start = task.completed_at ? new Date(task.completed_at) : new Date();
                if (!task.completed_at) start.setDate(end.getDate() - 28);

                const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
                const prevEnd = new Date(start);
                prevEnd.setDate(prevEnd.getDate() - 1);
                const prevStart = new Date(prevEnd);
                prevStart.setDate(prevEnd.getDate() - diffDays);

                const fmt = (d: Date) => d.toISOString().split('T')[0];
                const urls = (task.secondary_url || task.associated_url || "").split(',').map(u => u.trim());
                const regexFilter = urls.map(u => `^${u.replace(/\//g, '\\/')}$`).join('|');

                const [currentRows, prevRows] = await Promise.all([
                    GscService.getSearchAnalytics(project.gsc_property_url!, fmt(start), fmt(end), ['date'], { page: regexFilter, operator: 'includingRegex' }),
                    GscService.getSearchAnalytics(project.gsc_property_url!, fmt(prevStart), fmt(prevEnd), ['date'], { page: regexFilter, operator: 'includingRegex' })
                ]);

                const agg = (rows: any[]) => {
                    const totalClicks = rows.reduce((a, b) => a + b.clicks, 0);
                    const totalImp = rows.reduce((a, b) => a + b.impressions, 0);
                    const avgPos = rows.length ? rows.reduce((a, b) => a + b.position, 0) / rows.length : 0;
                    return { clicks: totalClicks, impressions: totalImp, position: avgPos };
                };

                setImpacts(prev => prev.map(item =>
                    item.task.id === task.id
                        ? { ...item, current: agg(currentRows), previous: agg(prevRows), loading: false }
                        : item
                ));
            } catch (err: any) {
                setImpacts(prev => prev.map(item =>
                    item.task.id === task.id
                        ? { ...item, loading: false, error: err.message }
                        : item
                ));
            }
        });

        await Promise.all(promises);
    };

    if (trackedTasks.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl border border-brand-power/5 shadow-sm overflow-hidden mt-8">
            <div className="p-6 border-b border-brand-power/5 bg-slate-50/30 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-brand-power flex items-center gap-2">
                        <Target className="text-brand-accent" size={20} /> Impacto Real de Optimizaciones
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Comparativa de métricas antes y después de realizar cada tarea</p>
                </div>
                <div className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">
                    Tracking GSC Activo
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-brand-power/5">
                            <th className="px-6 py-4 text-[10px] font-bold text-brand-power/40 uppercase tracking-widest min-w-[200px]">Tarea / URL</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-brand-power/40 uppercase tracking-widest text-center">Impacto Clics</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-brand-power/40 uppercase tracking-widest text-center">Impresiones</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-brand-power/40 uppercase tracking-widest text-center">Posición Media</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-brand-power/40 uppercase tracking-widest text-center">Estado de Datos</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-power/5">
                        {impacts.map((item) => {
                            const clicksDelta = item.current.clicks - item.previous.clicks;
                            const clicksPct = item.previous.clicks ? (clicksDelta / item.previous.clicks) * 100 : 0;

                            const impDelta = item.current.impressions - item.previous.impressions;
                            const impPct = item.previous.impressions ? (impDelta / item.previous.impressions) * 100 : 0;

                            const posDelta = item.current.position - item.previous.position;
                            const isPosBetter = posDelta < 0; // Lower position is better

                            return (
                                <tr key={String(item.task.id)} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-brand-power text-sm truncate max-w-[300px]" title={item.task.title}>
                                            {item.task.title}
                                        </div>
                                        <div className="text-[10px] text-brand-power/40 font-mono mt-1 flex items-center gap-1">
                                            <Target size={10} /> {item.task.secondary_url?.split(',')[0].replace(/https?:\/\//, '')}
                                            {item.task.secondary_url?.includes(',') && '...'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {item.loading ? <Loader2 className="animate-spin mx-auto text-brand-power/20" size={14} /> : (
                                            <div>
                                                <div className="text-sm font-bold text-brand-power">{item.current.clicks}</div>
                                                <div className={`text-[10px] font-bold flex items-center justify-center gap-0.5 ${clicksDelta > 0 ? 'text-emerald-500' : clicksDelta < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                                    {clicksDelta !== 0 && (clicksDelta > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                                                    {Math.abs(clicksPct).toFixed(1)}%
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {item.loading ? <Loader2 className="animate-spin mx-auto text-brand-power/20" size={14} /> : (
                                            <div>
                                                <div className="text-sm font-bold text-brand-power">{item.current.impressions.toLocaleString()}</div>
                                                <div className={`text-[10px] font-bold flex items-center justify-center gap-0.5 ${impDelta > 0 ? 'text-emerald-500' : impDelta < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                                    {impDelta !== 0 && (impDelta > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                                                    {Math.abs(impPct).toFixed(1)}%
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {item.loading ? <Loader2 className="animate-spin mx-auto text-brand-power/20" size={14} /> : (
                                            <div>
                                                <div className="text-sm font-bold text-brand-power">{item.current.position.toFixed(1)}</div>
                                                <div className={`text-[10px] font-bold flex items-center justify-center gap-0.5 ${posDelta === 0 ? 'text-slate-400' : isPosBetter ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {posDelta !== 0 && (isPosBetter ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                                                    {Math.abs(posDelta).toFixed(1)} pos
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {item.error ? (
                                            <span className="text-[10px] text-rose-400 font-bold bg-rose-50 px-2 py-0.5 rounded" title={item.error}>Error</span>
                                        ) : item.loading ? (
                                            <span className="text-[10px] text-brand-power/30 italic">Sincronizando...</span>
                                        ) : (
                                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">Al día</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {impacts.length > 5 && (
                <div className="p-4 bg-slate-50 border-t border-brand-power/5 text-center">
                    <p className="text-[10px] text-brand-power/40 uppercase font-bold tracking-widest">Mostrando {impacts.length} tareas monitoreadas</p>
                </div>
            )}
        </div>
    );
};
