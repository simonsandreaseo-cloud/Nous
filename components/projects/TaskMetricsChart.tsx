import React, { useEffect, useState, useRef } from 'react';
import Chart from 'chart.js/auto';
import { GscService } from '../../services/gscService';
import { ArrowUp, ArrowDown, Activity, Eye, MousePointer2, Hash, Loader2, AlertCircle, Search } from 'lucide-react';
import { Project, Task } from '../../lib/task_manager';

interface TaskMetricsChartProps {
    project: Project;
    task: Task;
    metricsConfig?: { startDate?: string; endDate?: string };
    onConfigChange?: (config: { startDate?: string; endDate?: string }) => void;
}

export const TaskMetricsChart: React.FC<TaskMetricsChartProps> = ({ project, task, metricsConfig, onConfigChange }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    // Initial default dates
    const getDefaultDates = () => {
        const end = new Date();
        end.setDate(end.getDate() - 3); // Default end: today - 3 days

        let start = task.completed_at ? new Date(task.completed_at) : new Date();
        if (!task.completed_at) {
            start.setDate(end.getDate() - 28);
        }
        return { start, end };
    };

    const fmtDateInfo = (d: Date) => d.toISOString().split('T')[0];

    // Local state for dates (initialized from config or defaults)
    const [startDate, setStartDate] = useState<string>(metricsConfig?.startDate || fmtDateInfo(getDefaultDates().start));
    const [endDate, setEndDate] = useState<string>(metricsConfig?.endDate || fmtDateInfo(getDefaultDates().end));

    // Update local state if config changes externally (though unlikely in this modal flow)
    useEffect(() => {
        if (metricsConfig?.startDate) setStartDate(metricsConfig.startDate);
        if (metricsConfig?.endDate) setEndDate(metricsConfig.endDate);
    }, [metricsConfig]);

    useEffect(() => {
        if (project.gsc_property_url && (task.secondary_url || task.associated_url)) {
            fetchData();
        } else {
            setLoading(false);
            if (!project.gsc_property_url) setError("Configura una propiedad de GSC en los ajustes del proyecto.");
            else setError("Asigna una URL de trabajo a la tarea para ver métricas.");
        }
    }, [project.gsc_property_url, task.secondary_url, task.associated_url, startDate, endDate]);

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

    const handleDateChange = (type: 'start' | 'end', value: string) => {
        if (type === 'start') setStartDate(value);
        else setEndDate(value);

        // Notify parent to save config
        if (onConfigChange) {
            onConfigChange({
                startDate: type === 'start' ? value : startDate,
                endDate: type === 'end' ? value : endDate
            });
        }
    };

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);

            // Validate dates
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new Error("Fechas inválidas");
            }

            // Duration in days
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

            // Previous Period immediately before start
            const prevEnd = new Date(start);
            prevEnd.setDate(prevEnd.getDate() - 1);
            const prevStart = new Date(prevEnd);
            prevStart.setDate(prevEnd.getDate() - diffDays); // Exact same duration

            const fmt = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            // Filter URLs
            const urls = (task.secondary_url || task.associated_url || "").split(',').map(u => u.trim());
            const regexFilter = urls.map(u => `^${u.replace(/\//g, '\\/')}$`).join('|');

            console.log('Fetching metrics for:', { start: fmt(start), end: fmt(end), prevStart: fmt(prevStart), prevEnd: fmt(prevEnd) });

            // Changed dimensions to include 'query' to count unique keywords
            const [currentRows, prevRows] = await Promise.all([
                GscService.getSearchAnalytics(project.gsc_property_url!, fmt(start), fmt(end), ['date', 'query'], { page: regexFilter, operator: 'includingRegex' }),
                GscService.getSearchAnalytics(project.gsc_property_url!, fmt(prevStart), fmt(prevEnd), ['date', 'query'], { page: regexFilter, operator: 'includingRegex' })
            ]);

            const agg = (rows: any[]) => {
                const totalClicks = rows.reduce((a, b) => a + b.clicks, 0);
                const totalImp = rows.reduce((a, b) => a + b.impressions, 0);
                const avgPos = rows.length ? rows.reduce((a, b) => a + b.position, 0) / rows.length : 0;

                // Count unique keywords (keys[1] is the query)
                const uniqueKeywords = new Set(rows.map(r => r.keys[1])).size;

                return { clicks: totalClicks, impressions: totalImp, position: avgPos, uniqueKeywords };
            };

            setData({
                current: agg(currentRows),
                previous: agg(prevRows),
                rows: currentRows,
                periodDays: diffDays,
                prevStart: prevStart,
                prevEnd: prevEnd
            });

        } catch (err: any) {
            console.error(err);
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

        // Group rows by date (since we now have multiple rows per date due to 'query' dimension)
        const groupedByDate: Record<string, number> = {};
        data.rows.forEach((r: any) => {
            const date = r.keys[0];
            groupedByDate[date] = (groupedByDate[date] || 0) + r.clicks;
        });

        // Sort dates
        const sortedDates = Object.keys(groupedByDate).sort();

        const labels = sortedDates.map(d => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }));
        const clicks = sortedDates.map(d => groupedByDate[d]);

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
        const isNeutral = delta === 0;

        // Formatter for absolute change
        const fmtDelta = (d: number) => {
            // Basic formatting for integers vs floats
            if (Math.abs(d) < 1 && d !== 0) return d.toFixed(1);
            return Math.round(d).toLocaleString();
        };

        return (
            <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                        <Icon size={16} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-brand-power">{format(value)}</span>
                            <span className={`flex items-center gap-0.5 text-[10px] font-bold ${isNeutral ? 'text-slate-400' : isBetter ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {delta !== 0 && (isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                {delta === 0 ? '-' : `${fmtDelta(Math.abs(delta))} (${Math.abs(pct).toFixed(1)}%)`}
                            </span>
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{label}</div>
                    </div>
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
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="text-sm font-bold text-brand-power">Rendimiento SEO</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => handleDateChange('start', e.target.value)}
                                className="text-[10px] bg-white border border-slate-200 rounded px-2 py-1 text-slate-600 focus:border-brand-accent outline-none"
                            />
                            <span className="text-[10px] text-slate-400">a</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => handleDateChange('end', e.target.value)}
                                className="text-[10px] bg-white border border-slate-200 rounded px-2 py-1 text-slate-600 focus:border-brand-accent outline-none"
                            />
                        </div>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest shrink-0 ml-2">Tracking Activo</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium italic">
                    {data?.periodDays ? `Periodo de ${data.periodDays} días comparado con ${data.prevStart?.toLocaleDateString()} - ${data.prevEnd?.toLocaleDateString()}` : 'Cargando datos...'}
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
                        format={(v: number) => v.toLocaleString()}
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
                    <MetricRow
                        label="Nº Keywords"
                        value={data.current.uniqueKeywords}
                        prevValue={data.previous.uniqueKeywords}
                        format={(v: number) => v.toLocaleString()}
                        icon={Search}
                    />
                </div>
            </div>
        </div>
    );
};


