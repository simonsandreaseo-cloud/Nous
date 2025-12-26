import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { DashboardStats } from '../types';

interface TrendChartPanelProps {
    stats: DashboardStats;
}

export const TrendChartPanel: React.FC<TrendChartPanelProps> = ({ stats }) => {
    const trendCanvas = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        if (!stats || !trendCanvas.current) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const labels = stats.datesP2 && stats.datesP2.length > 0
            ? stats.datesP2
            : Array.from({ length: Math.max(stats.dailyTrendP1.length, stats.dailyTrendP2.length) }, (_, i) => `Día ${i + 1}`);

        const ctx = trendCanvas.current.getContext('2d');
        if (ctx) {
            const gradIndigo = ctx.createLinearGradient(0, 0, 0, 300);
            gradIndigo.addColorStop(0, 'rgba(99, 102, 241, 0.1)');
            gradIndigo.addColorStop(1, 'rgba(99, 102, 241, 0)');

            chartInstance.current = new Chart(ctx, {
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
                        },
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
            });
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };

    }, [stats]);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
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
    );
};
