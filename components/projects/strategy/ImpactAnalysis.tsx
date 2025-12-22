import React, { useEffect, useState } from 'react';
import { Task } from '../../../lib/task_manager';
import { GscService } from '../../../services/gscService';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

interface ImpactAnalysisProps {
    project: any;
    tasks: Task[];
}

export const ImpactAnalysis: React.FC<ImpactAnalysisProps> = ({ project, tasks }) => {
    // Filter finished tasks with URLs
    const completedTasks = tasks.filter(t => t.status === 'done' && (t.target_url_slug || t.associated_url));
    const [impactData, setImpactData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (project.gsc_property_url && completedTasks.length > 0) {
            analyzeImpact();
        }
    }, [tasks, project.gsc_property_url]);

    const analyzeImpact = async () => {
        setLoading(true);
        try {
            const results = [];
            for (const task of completedTasks) {
                // Determine URL
                let url = task.associated_url || (project.gsc_property_url + (task.target_url_slug?.startsWith('/') ? task.target_url_slug.slice(1) : task.target_url_slug));
                if (!url) continue;

                // Determine Date Range (Before/After Task Completion)
                // Assuming task updated_at or create logic for completion date. 
                // For MVP, using 'created_at' + 7 days (mock) or if we had 'completed_at'.
                // Let's assume 'due_date' was the target date.
                const targetDate = task.due_date ? new Date(task.due_date) : new Date(task.created_at);

                const beforeStart = new Date(targetDate);
                beforeStart.setDate(targetDate.getDate() - 14);
                const beforeEnd = new Date(targetDate);

                const afterStart = new Date(targetDate);
                const afterEnd = new Date(targetDate);
                afterEnd.setDate(targetDate.getDate() + 14);

                const fmt = (d: Date) => d.toISOString().split('T')[0];

                try {
                    const [beforeData, afterData] = await Promise.all([
                        GscService.getSearchAnalytics(project.gsc_property_url!, fmt(beforeStart), fmt(beforeEnd), ['date'], { page: url }),
                        GscService.getSearchAnalytics(project.gsc_property_url!, fmt(afterStart), fmt(afterEnd), ['date'], { page: url })
                    ]);

                    const avgClicksBefore = beforeData.reduce((acc: number, r: any) => acc + r.clicks, 0) / (beforeData.length || 1);
                    const avgClicksAfter = afterData.reduce((acc: number, r: any) => acc + r.clicks, 0) / (afterData.length || 1);

                    results.push({
                        task,
                        url,
                        avgClicksBefore,
                        avgClicksAfter,
                        delta: avgClicksAfter - avgClicksBefore
                    });
                } catch (e) {
                    console.warn(`Could not fetch data for ${url}`, e);
                }
            }
            setImpactData(results);
        } catch (e) {
            console.error("Impact Analysis Error", e);
        } finally {
            setLoading(false);
        }
    };

    if (completedTasks.length === 0) {
        return <div className="p-8 text-center text-brand-power/40 border border-dashed border-brand-power/10 rounded-xl">Completa tareas con URLs asociadas para ver su impacto.</div>;
    }

    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-brand-power/5">
            <h3 className="font-bold text-brand-power text-xl mb-6">Impacto de Tareas (Antes vs Después)</h3>

            {loading ? (
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-50 rounded-lg"></div>)}
                </div>
            ) : (
                <div className="space-y-4">
                    {impactData.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="flex-1">
                                <h4 className="font-bold text-brand-power text-sm">{item.task.title}</h4>
                                <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-brand-accent hover:underline truncate block max-w-sm">{item.url}</a>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Antes (Media)</div>
                                    <div className="font-mono text-slate-600 font-bold">{item.avgClicksBefore.toFixed(1)}</div>
                                </div>
                                <ArrowRight className="text-slate-300" size={16} />
                                <div className="text-right">
                                    <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Después (Media)</div>
                                    <div className="font-mono text-brand-power font-bold">{item.avgClicksAfter.toFixed(1)}</div>
                                </div>

                                <div className={`flex items-center gap-1 font-bold text-sm px-3 py-1 rounded-lg ${item.delta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                    {item.delta > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    {Math.abs(item.delta).toFixed(1)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
