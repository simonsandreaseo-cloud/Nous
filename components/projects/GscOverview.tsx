import React, { useEffect, useState, useRef } from 'react';
import Chart from 'chart.js/auto';
import { GscService } from '../../services/gscService';
import { ArrowUp, ArrowDown, Minus, MousePointer2, Eye, Activity, Hash, Loader2, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Project } from '../../lib/task_manager';

interface GscOverviewProps {
    project: Project;
}

interface GscData {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

interface ComparisonData {
    current: GscData;
    previous: GscData;
    rows: any[];
}

export const GscOverview: React.FC<GscOverviewProps> = ({ project }) => {
    const { signInWithGoogle } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<ComparisonData | null>(null);
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        if (project.gsc_property_url) {
            fetchData();
        }
    }, [project.gsc_property_url]);

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
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 28);

            const prevEnd = new Date(start);
            prevEnd.setDate(prevEnd.getDate() - 1);
            const prevStart = new Date(prevEnd);
            prevStart.setDate(prevEnd.getDate() - 28);

            const fmt = (d: Date) => d.toISOString().split('T')[0];

            const [currentRows, prevRows] = await Promise.all([
                GscService.getSearchAnalytics(project.gsc_property_url!, fmt(start), fmt(end), ['date']),
                GscService.getSearchAnalytics(project.gsc_property_url!, fmt(prevStart), fmt(prevEnd), ['date'])
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
                rows: currentRows
            });

        } catch (err: any) {
            console.error("GSC Overview Error", err);
            setError(err.message || 'Error loading GSC data');
        } finally {
            setLoading(false);
        }
    };

    const renderChart = () => {
        if (!chartRef.current || !data) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        // Sort by date
        const sortedRows = [...data.rows].sort((a, b) => new Date(a.keys[0]).getTime() - new Date(b.keys[0]).getTime());
        const labels = sortedRows.map(r => new Date(r.keys[0]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        const clicks = sortedRows.map(r => r.clicks);
        const impressions = sortedRows.map(r => r.impressions);

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Clics',
                        data: clicks,
                        borderColor: '#3b82f6', // blue-500
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        yAxisID: 'y',
                        tension: 0.3,
                        fill: true,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    },
                    {
                        label: 'Impresiones',
                        data: impressions,
                        borderColor: '#8b5cf6', // violet-500
                        borderWidth: 2,
                        borderDash: [5, 5],
                        yAxisID: 'y1',
                        tension: 0.3,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            font: { size: 10, family: 'sans-serif' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#1e293b',
                        bodyColor: '#475569',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 10,
                        titleFont: { size: 12, weight: 'bold' },
                        bodyFont: { size: 11 }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { maxTicksLimit: 8, font: { size: 10 }, color: '#94a3b8' }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: { color: '#f1f5f9' },
                        ticks: { font: { size: 10 }, color: '#94a3b8' }
                    },
                    y1: {
                        type: 'linear',
                        display: false,
                        position: 'right',
                        grid: { display: false }
                    }
                }
            }
        });
    };

    const MetricCard = ({ label, value, prevValue, format, icon: Icon, reverseColor = false }: any) => {
        const delta = value - prevValue;
        const pct = prevValue ? (delta / prevValue) * 100 : 0;

        let colorClass = 'text-slate-500';
        let IconComp = Minus;

        if (delta > 0) {
            colorClass = reverseColor ? 'text-rose-500' : 'text-emerald-500';
            IconComp = ArrowUp;
        } else if (delta < 0) {
            colorClass = reverseColor ? 'text-emerald-500' : 'text-rose-500';
            IconComp = ArrowDown;
        }

        return (
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                        <Icon size={18} />
                    </div>
                    <div className={`flex items-center text-xs font-bold ${colorClass}`}>
                        <IconComp size={12} className="mr-0.5" />
                        {Math.abs(pct).toFixed(1)}%
                    </div>
                </div>
                <div>
                    <div className="text-2xl font-bold text-slate-700">{format(value)}</div>
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</div>
                </div>
            </div>
        );
    };

    if (!project.gsc_property_url) return null;

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-brand-power/5 shadow-sm">
                <Loader2 className="animate-spin text-brand-accent mb-2" size={24} />
                <span className="ml-3 text-sm font-medium text-slate-500">Cargando datos de GSC...</span>
            </div>
        );
    }

    if (error) {
        const isAuthError = error.includes('No access token') || error.includes('sign in with Google') || error.includes('permissions');

        return (
            <div className="p-8 bg-white border border-brand-power/5 rounded-2xl shadow-sm flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4">
                    <Key size={32} />
                </div>
                <h3 className="text-lg font-bold text-brand-power mb-2">
                    {isAuthError ? 'Conexión con Google Requerida' : 'Error de Conexión'}
                </h3>
                <p className="text-sm text-brand-power/50 mb-6 max-w-md">
                    {isAuthError
                        ? 'Para ver las métricas de Search Console, necesitamos que inicies sesión con tu cuenta de Google y concedas permisos de lectura.'
                        : error}
                </p>
                {isAuthError && (
                    <button
                        onClick={() => signInWithGoogle(window.location.href)}
                        className="flex items-center gap-2 px-6 py-3 bg-brand-power text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4" alt="G" />
                        Conectar Google Search Console
                    </button>
                )}
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-brand-power">Rendimiento de Búsqueda</h2>
                    <p className="text-xs text-slate-400">Últimos 28 días vs periodo anterior</p>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    label="Clics Totales"
                    value={data.current.clicks}
                    prevValue={data.previous.clicks}
                    format={(v: number) => new Intl.NumberFormat('en-US').format(v)}
                    icon={MousePointer2}
                />
                <MetricCard
                    label="Impresiones"
                    value={data.current.impressions}
                    prevValue={data.previous.impressions}
                    format={(v: number) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(v)}
                    icon={Eye}
                />
                <MetricCard
                    label="CTR Promedio"
                    value={data.current.ctr}
                    prevValue={data.previous.ctr}
                    format={(v: number) => v.toFixed(1) + '%'}
                    icon={Activity}
                />
                <MetricCard
                    label="Posición Media"
                    value={data.current.position}
                    prevValue={data.previous.position}
                    format={(v: number) => v.toFixed(1)}
                    icon={Hash}
                    reverseColor={true} // Lower is better
                />
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-80">
                <canvas ref={chartRef} />
            </div>
        </div>
    );
};
