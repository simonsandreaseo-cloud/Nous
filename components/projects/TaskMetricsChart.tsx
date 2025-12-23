import React, { useEffect, useState, useRef } from 'react';
import Chart from 'chart.js/auto';
import { GscService } from '../../services/gscService';
import { ArrowUp, ArrowDown, Activity, Eye, MousePointer2, Hash, Loader2, AlertCircle } from 'lucide-react';
import { Project, Task } from '../../lib/task_manager';

interface TaskMetricsChartProps {
    project: Project;
    task: Task;
}

export const TaskMetricsChart: React.FC<TaskMetricsChartProps> = ({ project, task }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        if (project.gsc_property_url && (task.secondary_url || task.associated_url)) {
            fetchData();
        } else {
            setLoading(false);
            if (!project.gsc_property_url) setError("Configura una propiedad de GSC en los ajustes del proyecto.");
            else setError("Asigna una URL de trabajo a la tarea para ver métricas.");
        }
    }, [project.gsc_property_url, task.secondary_url, task.associated_url, task.completed_at]);

    useEffect(() => {
        if (data && chartRef.current) {
            renderChart();
        }
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // End date: Latest available is roughly 2-3 days ago
            const end = new Date();
            end.setDate(end.getDate() - 2);

            // Start date: When task was completed, or 28 days ago if not completed
            let start = task.completed_at ? new Date(task.completed_at) : new Date();
            if (!task.completed_at) {
                start.setDate(end.getDate() - 28);
            }

            // Duration in days
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

            // Previous Period
            const prevEnd = new Date(start);
            prevEnd.setDate(prevEnd.getDate() - 1);
            const prevStart = new Date(prevEnd);
            prevStart.setDate(prevEnd.getDate() - diffDays);

            const fmt = (d: Date) => d.toISOString().split('T')[0];

            // Filter URLs
            const urls = (task.secondary_url || task.associated_url || "").split(',').map(u => u.trim());
            const regexFilter = urls.map(u => `^${u.replace(/\//g, '\\/')}$`).join('|');

            const [currentRows, prevRows] = await Promise.all([
                GscService.getSearchAnalytics(project.gsc_property_url!, fmt(start), fmt(end), ['date'], { page: regexFilter, operator: 'includingRegex' }),
                GscService.getSearchAnalytics(project.gsc_property_url!, fmt(prevStart), fmt(prevEnd), ['date'], { page: regexFilter, operator: 'includingRegex' })
            ]);

            const agg = (rows: any[]) => {
                const totalClicks = rows.reduce((a, b) => a + b.clicks, 0);
                const totalImp = rows.reduce((a, b) => a + b.impressions, 0);
                const avgCtr = rows.length ? rows.reduce((a, b) => a + b.ctr, 0) / rows.length : 0;
                const avgPos = rows.length ? rows.reduce((a, b) => a + b.position, 0) / rows.length : 0;
                return { clicks: totalClicks, impressions: totalImp, ctr: avgCtr * 100, position: avgPos };
            };

            setData({
                current: agg(currentRows),
                previous: agg(prevRows),
                rows: currentRows,
                periodDays: diffDays
            });

        } catch (err: any) {
            setError(err.message || 'Error al conectar con Search Console');
        } finally {
            setLoading(false);
        }
    };

    const renderChart = () => {
        if (!chartRef.current || !data) return;
        if (chartInstance.current) chartInstance.current.destroy();

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        const sortedRows = [...data.rows].sort((a, b) => new Date(a.keys[0]).getTime() - new Date(b.keys[0]).getTime());
        const labels = sortedRows.map(r => new Date(r.keys[0]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        const clicks = sortedRows.map(r => r.clicks);

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Clics',
                    data: clicks,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'white',
                        titleColor: '#1e293b',
                        bodyColor: '#475569',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 4,
                        usePointStyle: true
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' } },
                    y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#94a3b8' } }
                }
            }
        });
    };

    const MetricRow = ({ label, value, prevValue, format, icon: Icon, reverse = false }: any) => {
        const delta = value - prevValue;
        const pct = prevValue ? (delta / prevValue) * 100 : 0;
        const isPositive = delta > 0;
        const isBetter = reverse ? !isPositive : isPositive;

        return (
            <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                        <Icon size={16} />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-brand-power">{format(value)}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{label}</div>
                    </div>
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold ${isBetter ? 'text-emerald-500' : delta === 0 ? 'text-slate-400' : 'text-rose-500'}`}>
                    {delta !== 0 && (isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                    {delta === 0 ? '-' : `${Math.abs(pct).toFixed(1)}%`}
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="p-12 flex flex-col items-center justify-center bg-brand-soft/5 rounded-2xl border border-dashed border-brand-power/10">
            <Loader2 className="animate-spin text-brand-accent mb-2" size={24} />
            <p className="text-xs text-slate-500 font-medium">Sincronizando con Search Console...</p>
        </div>
    );

    if (error) return (
        <div className="p-8 bg-amber-50 rounded-2xl border border-amber-100 flex flex-col items-center text-center">
            <AlertCircle className="text-amber-500 mb-2" size={24} />
            <p className="text-sm text-amber-800 font-medium">{error}</p>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-50 bg-slate-50/30">
                <div className="flex justify-between items-center mb-1">
                    <h3 className="text-sm font-bold text-brand-power">Rendimiento SEO</h3>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Tracking Activo</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium italic">
                    {task.completed_at ? `Desde finalización (${new Date(task.completed_at).toLocaleDateString()})` : `Últimos ${data.periodDays} días`}
                </p>
            </div>

            <div className="p-5">
                <div className="h-40 mb-6">
                    <canvas ref={chartRef} />
                </div>

                <div className="space-y-1">
                    <MetricRow
                        label="Clics"
                        value={data.current.clicks}
                        prevValue={data.previous.clicks}
                        format={(v: number) => v}
                        icon={MousePointer2}
                    />
                    <MetricRow
                        label="Impresiones"
                        value={data.current.impressions}
                        prevValue={data.previous.impressions}
                        format={(v: number) => v.toLocaleString()}
                        icon={Eye}
                    />
                    <MetricRow
                        label="Posición Media"
                        value={data.current.position}
                        prevValue={data.previous.position}
                        format={(v: number) => v.toFixed(1)}
                        icon={Hash}
                        reverse={true}
                    />
                </div>
            </div>
        </div>
    );
};
