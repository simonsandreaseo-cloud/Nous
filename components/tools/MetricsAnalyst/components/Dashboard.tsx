import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { DashboardStats } from '../types';

interface DashboardProps {
    stats: DashboardStats;
    logo?: string | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ stats, logo }) => {
    const trendCanvas = useRef<HTMLCanvasElement>(null);
    const segmentClicksCanvas = useRef<HTMLCanvasElement>(null);
    const segmentImpCanvas = useRef<HTMLCanvasElement>(null);
    const chartInstances = useRef<Chart[]>([]);

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
                legend: {
                    labels: {
                        font: { family: "'Inter', sans-serif", size: 10, weight: 600 },
                        usePointStyle: true,
                        boxWidth: 6,
                        color: '#64748b'
                    }
                }
            }
        };

        // 1. Trend Chart
        if (trendCanvas.current) {
            const ctx = trendCanvas.current.getContext('2d');
            if (ctx) {
                const gradientP2 = ctx.createLinearGradient(0, 0, 0, 300);
                gradientP2.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
                gradientP2.addColorStop(1, 'rgba(99, 102, 241, 0)');

                const pointBackgroundColors = stats.dailyTrendP2.map((val, idx) => {
                    const date = stats.datesP2[idx];
                    const isAnomaly = stats.anomalies.find(a => a.date === date);
                    return isAnomaly ? '#ef4444' : '#6366f1';
                });

                const pointRadii = stats.dailyTrendP2.map((val, idx) => {
                    const date = stats.datesP2[idx];
                    const isAnomaly = stats.anomalies.find(a => a.date === date);
                    return isAnomaly ? 3 : 0;
                });

                chartInstances.current.push(new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [
                            {
                                label: `${stats.period1Label}`,
                                data: stats.dailyTrendP1,
                                borderColor: '#cbd5e1',
                                backgroundColor: 'transparent',
                                borderDash: [2, 2],
                                borderWidth: 1.5,
                                pointRadius: 0,
                                tension: 0.3
                            },
                            {
                                label: `${stats.period2Label}`,
                                data: stats.dailyTrendP2,
                                borderColor: '#6366f1',
                                backgroundColor: gradientP2,
                                borderWidth: 2,
                                pointRadius: pointRadii,
                                pointBackgroundColor: pointBackgroundColors,
                                pointHoverRadius: 4,
                                tension: 0.3,
                                fill: true
                            }
                        ]
                    },
                    options: {
                        ...commonOptions,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                            legend: { position: 'top', align: 'end', labels: { boxWidth: 6, usePointStyle: true, padding: 10 } },
                            tooltip: {
                                mode: 'index',
                                intersect: false,
                                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                padding: 8,
                                titleFont: { size: 11 },
                                bodyFont: { size: 10 },
                                cornerRadius: 4
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: { color: '#f1f5f9', tickLength: 0 },
                                border: { display: false },
                                ticks: { color: '#94a3b8', font: { size: 9 }, padding: 5 }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { maxTicksLimit: 8, color: '#94a3b8', font: { size: 9 } }
                            }
                        }
                    }
                }));
            }
        }

        // 2. Doughnut Charts
        const topSegments = stats.segmentStats.slice(0, 5);
        const otherClicks = stats.segmentStats.slice(5).reduce((acc, s) => acc + s.clicks, 0);
        const otherImp = stats.segmentStats.slice(5).reduce((acc, s) => acc + s.impressions, 0);

        const segmentLabels = [...topSegments.map(s => s.name === '/' ? 'Home' : s.name), 'Otros'];
        const clicksData = [...topSegments.map(s => s.clicks), otherClicks];
        const impData = [...topSegments.map(s => s.impressions), otherImp];
        const bgColors = ['#6366f1', '#3b82f6', '#0ea5e9', '#8b5cf6', '#d946ef', '#f1f5f9'];

        const doughnutOptions: any = {
            ...commonOptions,
            cutout: '75%',
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 6, font: { size: 9 }, padding: 10, color: '#475569' } },
                title: { display: false }
            },
            layout: { padding: 0 }
        };

        if (segmentClicksCanvas.current) {
            chartInstances.current.push(new Chart(segmentClicksCanvas.current, {
                type: 'doughnut',
                data: { labels: segmentLabels, datasets: [{ data: clicksData, backgroundColor: bgColors, borderWidth: 0, hoverOffset: 4 }] },
                options: doughnutOptions
            }));
        }

        if (segmentImpCanvas.current) {
            chartInstances.current.push(new Chart(segmentImpCanvas.current, {
                type: 'doughnut',
                data: { labels: segmentLabels, datasets: [{ data: impData, backgroundColor: bgColors, borderWidth: 0, hoverOffset: 4 }] },
                options: doughnutOptions
            }));
        }

    }, [stats]);

    const formatNum = (n: number) => n.toLocaleString('es-ES');
    const formatPerc = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
    const getColor = (n: number) => n >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50';
    const getColorInv = (n: number) => n <= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50';

    return (
        <div className="space-y-5 mb-8">

            {/* Hero Header: Compact SaaS Style */}
            <div className="relative overflow-hidden rounded-xl bg-[#0B1120] text-white shadow-lg border border-slate-800 p-5 md:p-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        {logo && (
                            <div className="bg-white p-1.5 rounded-lg shadow h-10 w-10 flex items-center justify-center">
                                <img src={logo} alt="Logo" className="h-6 w-6 object-contain" />
                            </div>
                        )}
                        <div>
                            <div className="flex gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 uppercase tracking-wider border border-indigo-500/30">Executive Report</span>
                                {stats.anomalies.length > 0 && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 uppercase tracking-wider border border-amber-500/30">
                                        ⚠️ {stats.anomalies.length} Anomalías
                                    </span>
                                )}
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight text-white leading-none">
                                Performance Overview
                            </h2>
                            <p className="text-slate-400 text-xs mt-1">
                                {stats.period1Label} vs {stats.period2Label}
                            </p>
                        </div>
                    </div>

                    {/* Top Line Stats Compact */}
                    <div className="flex gap-8 border-l border-white/10 pl-8">
                        <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Clics</div>
                            <div className="text-2xl font-bold text-white leading-tight">{formatNum(stats.datasetStats.totalClicks)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Impresiones</div>
                            <div className="text-2xl font-bold text-white leading-tight">{formatNum(stats.datasetStats.totalImpressions)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Grid: Small Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard
                    title="Tráfico"
                    value={formatNum(stats.kpis.clicksP2)}
                    subValue={formatPerc((stats.kpis.totalClicksChange / stats.kpis.clicksP1) * 100)}
                    subColor={getColor(stats.kpis.totalClicksChange)}
                />
                <KPICard
                    title="Visibilidad"
                    value={formatNum(stats.kpis.impressionsP2)}
                    subValue={formatPerc((stats.kpis.totalImpressionsChange / stats.kpis.impressionsP1) * 100)}
                    subColor={getColor(stats.kpis.totalImpressionsChange)}
                />
                <KPICard
                    title="CTR"
                    value={stats.kpis.ctrP2.toFixed(2) + '%'}
                    subValue={formatPerc(stats.kpis.ctrChange)}
                    subColor={getColor(stats.kpis.ctrChange)}
                />
                <KPICard
                    title="Posición"
                    value={stats.kpis.avgPosP2.toFixed(1)}
                    subValue={formatPerc(stats.kpis.avgPosChange)}
                    subColor={getColorInv(stats.kpis.avgPosChange)}
                />
            </div>

            {/* Main Trend Chart: Reduced Height */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <div className="flex justify-between items-center mb-2 border-b border-slate-50 pb-2">
                    <h3 className="text-sm font-bold text-slate-800">Evolución de Tráfico (Diario)</h3>
                    <div className="flex gap-3 text-[10px] font-semibold text-slate-500">
                        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Actual</span>
                        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> Anterior</span>
                    </div>
                </div>
                <div className="h-64 w-full relative">
                    <canvas ref={trendCanvas} />
                </div>
            </div>

            {/* Segments: Side-by-side Grid with Reduced Height */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="h-40 w-40 relative flex-shrink-0">
                        <canvas ref={segmentClicksCanvas} />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Top Segmentos</h3>
                        <div className="text-sm font-bold text-slate-800">Por Clics</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="h-40 w-40 relative flex-shrink-0">
                        <canvas ref={segmentImpCanvas} />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Share of Voice</h3>
                        <div className="text-sm font-bold text-slate-800">Por Impresiones</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const KPICard = ({ title, value, subValue, subColor }: any) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between h-24">
        <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{title}</div>
        <div className="text-2xl font-bold text-slate-900 tracking-tight leading-none">{value}</div>
        <div className={`text-[10px] font-bold inline-flex self-start px-1.5 py-0.5 rounded ${subColor}`}>
            {subValue} vs anterior
        </div>
    </div>
);
