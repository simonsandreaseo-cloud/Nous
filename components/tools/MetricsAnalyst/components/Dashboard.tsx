import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { DashboardStats } from '../types';

interface DashboardProps {
    stats: DashboardStats;
    logo?: string | null;
    onDateRangeChange?: (range: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ stats, logo, onDateRangeChange }) => {
    const trendCanvas = useRef<HTMLCanvasElement>(null);
    const segmentClicksCanvas = useRef<HTMLCanvasElement>(null);
    const segmentImpCanvas = useRef<HTMLCanvasElement>(null);
    const chartInstances = useRef<Chart[]>([]);

    // Data Preparation (Memoized or Direct)
    const safeSegments = Array.isArray(stats.segmentStats) ? stats.segmentStats : [];
    const topSegments = safeSegments.slice(0, 5);

    useEffect(() => {
        chartInstances.current.forEach(c => c.destroy());
        chartInstances.current = [];

        if (!stats) return;

        const labels = stats.datesP2 && stats.datesP2.length > 0
            ? stats.datesP2
            : Array.from({ length: Math.max(stats.dailyTrendP1.length, stats.dailyTrendP2.length) }, (_, i) => `Día ${i + 1}`);

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1e293b',
                    bodyColor: '#475569',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 4,
                    usePointStyle: true,
                }
            },
            elements: {
                line: { tension: 0.2 },
                point: { radius: 0, hoverRadius: 5 }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { maxTicksLimit: 8, color: '#94a3b8', font: { size: 10 } }
                }
            }
        };

        // 1. Main Trend Chart
        if (trendCanvas.current) {
            const ctx = trendCanvas.current.getContext('2d');
            if (ctx) {
                const gradIndigo = ctx.createLinearGradient(0, 0, 0, 300);
                gradIndigo.addColorStop(0, 'rgba(99, 102, 241, 0.1)');
                gradIndigo.addColorStop(1, 'rgba(99, 102, 241, 0)');

                chartInstances.current.push(new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [
                            {
                                label: 'Clics',
                                data: stats.dailyClicks,
                                borderColor: '#6366f1',
                                backgroundColor: gradIndigo,
                                borderWidth: 3,
                                fill: true,
                                yAxisID: 'y'
                            },
                            {
                                label: 'Impresiones',
                                data: stats.dailyImpressions,
                                borderColor: '#0ea5e9',
                                borderWidth: 2,
                                borderDash: [5, 5],
                                fill: false,
                                yAxisID: 'y1'
                            }
                        ]
                    },
                    options: {
                        ...commonOptions,
                        interaction: { mode: 'index', intersect: false },
                        scales: {
                            ...commonOptions.scales,
                            y: {
                                type: 'linear',
                                display: true,
                                position: 'left',
                                grid: { color: '#f1f5f9' },
                                ticks: { color: '#6366f1', font: { size: 10, weight: 'bold' } }
                            },
                            y1: {
                                type: 'linear',
                                display: true,
                                position: 'right',
                                grid: { display: false },
                                ticks: { color: '#0ea5e9', font: { size: 10, weight: 'bold' } }
                            }
                        }
                    }
                }));
            }
        }

        // 2. Segment Doughnuts
        const doughnutOptions = (color: string): any => ({
            ...commonOptions,
            cutout: '80%',
            scales: { x: { display: false }, y: { display: false } },
            plugins: {
                ...commonOptions.plugins,
                legend: { display: false }
            }
        });

        const otherClicks = safeSegments.slice(5).reduce((acc, s) => acc + s.clicks, 0);
        const otherImp = safeSegments.slice(5).reduce((acc, s) => acc + s.impressions, 0);
        const segmentLabels = [...topSegments.map(s => s.name === '/' ? 'Home' : s.name), 'Otros'];
        const clicksData = [...topSegments.map(s => s.clicks), otherClicks];
        const impData = [...topSegments.map(s => s.impressions), otherImp];
        const bgColors = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#f1f5f9'];

        if (segmentClicksCanvas.current) {
            chartInstances.current.push(new Chart(segmentClicksCanvas.current, {
                type: 'doughnut',
                data: { labels: segmentLabels, datasets: [{ data: clicksData, backgroundColor: bgColors, borderWidth: 0 }] },
                options: doughnutOptions('#6366f1')
            }));
        }

        if (segmentImpCanvas.current) {
            chartInstances.current.push(new Chart(segmentImpCanvas.current, {
                type: 'doughnut',
                data: { labels: segmentLabels, datasets: [{ data: impData, backgroundColor: bgColors, borderWidth: 0 }] },
                options: doughnutOptions('#0ea5e9')
            }));
        }

    }, [stats]);

    const formatNum = (n: number) => n.toLocaleString('es-ES');
    const formatPerc = (val: number, base: number) => {
        if (!base) return '0%';
        const p = (val / base) * 100;
        return `${p > 0 ? '+' : ''}${p.toFixed(1)}%`;
    };

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                    <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></svg>
                </div>

                <div className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div className="flex items-center gap-5">
                        {logo ? (
                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 shadow-sm">
                                <img src={logo} alt="Project" className="h-12 w-12 object-contain" />
                            </div>
                        ) : (
                            <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-lg shadow-indigo-200">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                        )}
                        <div>
                            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none mb-2">Análisis de Métrcas</h2>
                            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">GSC Insights</span>
                                <span>{stats.period2Label} vs {stats.period1Label}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 print:hidden">
                        {onDateRangeChange && (
                            <div className="bg-slate-50 p-1 rounded-xl border border-slate-200 flex gap-1">
                                {[
                                    { label: '28D', val: '28d' },
                                    { label: 'Mes', val: 'last_month' },
                                    { label: 'Trim.', val: 'last_quarter' }
                                ].map(opt => (
                                    <button
                                        key={opt.val}
                                        onClick={() => onDateRangeChange(opt.val)}
                                        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:text-indigo-600 rounded-lg hover:bg-white transition"
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-slate-100 bg-slate-50/30">
                    <MetricBlock
                        label="Total Clics"
                        value={formatNum(stats.kpis.clicksP2)}
                        change={formatPerc(stats.kpis.totalClicksChange, stats.kpis.clicksP1)}
                        positive={stats.kpis.totalClicksChange >= 0}
                    />
                    <MetricBlock
                        label="Impresiones"
                        value={formatNum(stats.kpis.impressionsP2)}
                        change={formatPerc(stats.kpis.totalImpressionsChange, stats.kpis.impressionsP1)}
                        positive={stats.kpis.totalImpressionsChange >= 0}
                    />
                    <MetricBlock
                        label="CTR Promedio"
                        value={stats.kpis.ctrP2.toFixed(2) + '%'}
                        change={stats.kpis.ctrChange.toFixed(1) + '%'}
                        positive={stats.kpis.ctrChange >= 0}
                    />
                    <MetricBlock
                        label="Posición Media"
                        value={stats.kpis.avgPosP2.toFixed(1)}
                        change={Math.abs(stats.kpis.avgPosChange).toFixed(1)}
                        positive={stats.kpis.avgPosChange <= 0}
                        isPos
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            Tendencia Temporal
                        </h3>
                        <div className="flex gap-4 text-[10px] font-bold uppercase text-slate-400">
                            <span className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-indigo-500"></span> Clics</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-sky-400 border-b border-dashed border-sky-400"></span> Imp.</span>
                        </div>
                    </div>
                    <div className="h-72 w-full">
                        <canvas ref={trendCanvas} />
                    </div>
                </div>

                <div className="space-y-6">
                    <DonutCard
                        title="Top Segmentos (Clics)"
                        canvasRef={segmentClicksCanvas}
                        stats={topSegments}
                        metric="clicks"
                        total={stats.kpis.clicksP2}
                        color="#6366f1"
                    />
                    <DonutCard
                        title="Share of Voice (Imp.)"
                        canvasRef={segmentImpCanvas}
                        stats={topSegments}
                        metric="impressions"
                        total={stats.kpis.impressionsP2}
                        color="#0ea5e9"
                    />
                </div>
            </div>
        </div>
    );
};

const MetricBlock = ({ label, value, change, positive, isPos }: any) => (
    <div className="p-6 border-r border-slate-100 last:border-r-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{value}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {isPos ? (positive ? '↑' : '↓') : (positive ? '+' : '')}{change}
            </span>
        </div>
    </div>
);

const DonutCard = ({ title, canvasRef, stats, metric, total, color }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{title}</h3>
        <div className="flex items-center gap-4">
            <div className="h-32 w-32 relative shrink-0">
                <canvas ref={canvasRef} />
            </div>
            <div className="flex-1 space-y-2 overflow-hidden">
                {stats.slice(0, 3).map((s: any, i: number) => {
                    const pct = ((s[metric] / total) * 100).toFixed(0);
                    return (
                        <div key={i} className="flex flex-col">
                            <div className="flex justify-between text-[10px] items-baseline font-medium">
                                <span className="truncate text-slate-600 w-24">{s.name === '/' ? 'Home' : s.name}</span>
                                <span className="font-bold text-slate-900">{pct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1 rounded-full mt-1">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color, opacity: 1 - (i * 0.2) }}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
);
