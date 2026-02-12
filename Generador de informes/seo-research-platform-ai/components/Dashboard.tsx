import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { DashboardStats } from '../types';

interface DashboardProps {
    stats: DashboardStats;
}

export const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
    const trendCanvas = useRef<HTMLCanvasElement>(null);
    const segmentClicksCanvas = useRef<HTMLCanvasElement>(null);
    const segmentImpCanvas = useRef<HTMLCanvasElement>(null);
    const chartInstances = useRef<Chart[]>([]);

    useEffect(() => {
        chartInstances.current.forEach(c => c.destroy());
        chartInstances.current = [];

        if (!stats) return;

        // Shared Options
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
        };

        // 1. Trend Chart
        if (trendCanvas.current) {
            const ctx = trendCanvas.current.getContext('2d');
            if (ctx) {
                const maxLen = Math.max(stats.dailyTrendP1.length, stats.dailyTrendP2.length);
                const labels = Array.from({ length: maxLen }, (_, i) => `Día ${i + 1}`);

                chartInstances.current.push(new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [
                            {
                                label: `${stats.period1Label} (Clics)`,
                                data: stats.dailyTrendP1,
                                borderColor: '#9ca3af',
                                backgroundColor: 'transparent',
                                borderDash: [4, 4],
                                borderWidth: 2,
                                pointRadius: 0,
                                tension: 0.3
                            },
                            {
                                label: `${stats.period2Label} (Clics)`,
                                data: stats.dailyTrendP2,
                                borderColor: '#3b82f6',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                borderWidth: 2,
                                pointRadius: 0,
                                tension: 0.3,
                                fill: true
                            }
                        ]
                    },
                    options: {
                        ...commonOptions,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                            legend: { position: 'top' },
                            tooltip: { mode: 'index', intersect: false }
                        },
                        scales: {
                            y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
                            x: { grid: { display: false } }
                        }
                    }
                }));
            }
        }

        // 2. Pie Charts Logic
        const topSegments = stats.segmentStats.slice(0, 5);
        const otherClicks = stats.segmentStats.slice(5).reduce((acc, s) => acc + s.clicks, 0);
        const otherImp = stats.segmentStats.slice(5).reduce((acc, s) => acc + s.impressions, 0);
        
        const labels = [...topSegments.map(s => s.name), 'Otros'];
        const clicksData = [...topSegments.map(s => s.clicks), otherClicks];
        const impData = [...topSegments.map(s => s.impressions), otherImp];
        
        const bgColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#e5e7eb'];

        if (segmentClicksCanvas.current) {
            chartInstances.current.push(new Chart(segmentClicksCanvas.current, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{ data: clicksData, backgroundColor: bgColors, borderWidth: 2, borderColor: '#ffffff' }]
                },
                options: {
                    ...commonOptions,
                    plugins: { 
                        legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } },
                        title: { display: true, text: 'Clics por Segmento' } 
                    }
                }
            }));
        }

        if (segmentImpCanvas.current) {
            chartInstances.current.push(new Chart(segmentImpCanvas.current, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{ data: impData, backgroundColor: bgColors, borderWidth: 2, borderColor: '#ffffff' }]
                },
                options: {
                    ...commonOptions,
                    plugins: { 
                        legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } },
                        title: { display: true, text: 'Impresiones por Segmento' } 
                    }
                }
            }));
        }

    }, [stats]);

    const formatNum = (n: number) => n.toLocaleString('es-ES');
    const formatPerc = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
    const getColor = (n: number) => n >= 0 ? 'text-green-600' : 'text-red-600';
    const getColorInv = (n: number) => n <= 0 ? 'text-green-600' : 'text-red-600';

    return (
        <div className="space-y-6 mb-8">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800">Tablero de Control</h2>
                {stats.datasetStats && (
                    <div className="text-right text-xs text-gray-500">
                        <span className="block font-semibold">Total Dataset (CSV Completo)</span>
                        {formatNum(stats.datasetStats.totalClicks)} Clics | {formatNum(stats.datasetStats.totalImpressions)} Impresiones
                    </div>
                )}
            </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard 
                    title="Clics (Periodo Actual)" 
                    value={formatNum(stats.kpis.clicksP2)} 
                    subValue={formatPerc((stats.kpis.totalClicksChange / stats.kpis.clicksP1) * 100)} 
                    subColor={getColor(stats.kpis.totalClicksChange)} 
                />
                <KPICard 
                    title="Impresiones (Periodo Actual)" 
                    value={formatNum(stats.kpis.impressionsP2)} 
                    subValue={formatPerc((stats.kpis.totalImpressionsChange / stats.kpis.impressionsP1) * 100)} 
                    subColor={getColor(stats.kpis.totalImpressionsChange)} 
                />
                <KPICard 
                    title="CTR Promedio" 
                    value={stats.kpis.ctrP2.toFixed(2) + '%'} 
                    subValue={formatPerc(stats.kpis.ctrChange)} 
                    subColor={getColor(stats.kpis.ctrChange)} 
                />
                <KPICard 
                    title="Posición Media" 
                    value={stats.kpis.avgPosP2.toFixed(1)} 
                    subValue={formatPerc(stats.kpis.avgPosChange)} 
                    subColor={getColorInv(stats.kpis.avgPosChange)} 
                    note="(Menor es mejor)" 
                />
            </div>

            {/* Charts Row 1: Trend */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="h-80 w-full relative">
                    <canvas ref={trendCanvas} />
                </div>
            </div>

            {/* Charts Row 2: Segments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="h-64 w-full relative">
                        <canvas ref={segmentClicksCanvas} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="h-64 w-full relative">
                        <canvas ref={segmentImpCanvas} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const KPICard = ({ title, value, subValue, subColor, note }: any) => (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 transition hover:shadow-md">
        <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{title}</div>
        <div className="text-3xl font-bold text-gray-900 mt-2">{value}</div>
        <div className={`text-sm font-medium mt-1 flex items-center ${subColor}`}>
            {subValue} <span className="text-gray-400 font-normal ml-1 text-xs">vs periodo anterior</span>
        </div>
        {note && <div className="text-xs text-gray-400 mt-1 italic">{note}</div>}
    </div>
);