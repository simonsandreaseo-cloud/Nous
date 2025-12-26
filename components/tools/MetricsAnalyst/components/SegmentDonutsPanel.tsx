import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { DashboardStats } from '../types';

interface SegmentDonutsPanelProps {
    stats: DashboardStats;
}

export const SegmentDonutsPanel: React.FC<SegmentDonutsPanelProps> = ({ stats }) => {
    const segmentClicksCanvas = useRef<HTMLCanvasElement>(null);
    const segmentImpCanvas = useRef<HTMLCanvasElement>(null);
    const chartInstances = useRef<Chart[]>([]); // Keep track of charts

    useEffect(() => {
        // Cleanup existing charts
        chartInstances.current.forEach(c => c.destroy());
        chartInstances.current = [];

        if (!stats) return;

        const safeSegments = Array.isArray(stats.segmentStats) ? stats.segmentStats : [];
        const topSegments = safeSegments.slice(0, 5);
        if (topSegments.length === 0) return;

        const otherClicks = safeSegments.slice(5).reduce((acc, s) => acc + s.clicks, 0);
        const otherImp = safeSegments.slice(5).reduce((acc, s) => acc + s.impressions, 0);
        const segmentLabels = [...topSegments.map(s => s.name === '/' ? 'Home' : s.name), 'Otros'];
        const clicksData = [...topSegments.map(s => s.clicks), otherClicks];
        const impData = [...topSegments.map(s => s.impressions), otherImp];
        const bgColors = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#f1f5f9'];

        const doughnutOptions = (color: string): any => ({
            responsive: true,
            maintainAspectRatio: false,
            cutout: '80%',
            scales: { x: { display: false }, y: { display: false } },
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
            }
        });

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

        return () => {
            chartInstances.current.forEach(c => c.destroy());
            chartInstances.current = [];
        };
    }, [stats]);

    const safeSegments = Array.isArray(stats.segmentStats) ? stats.segmentStats : [];
    const topSegments = safeSegments.slice(0, 5);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DonutCard
                title="Top Guías (Clics)"
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
    );
};

const DonutCard = ({ title, canvasRef, stats, metric, total, color }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{title}</h3>
        <div className="flex items-center gap-4">
            <div className="h-32 w-32 relative shrink-0">
                <canvas ref={canvasRef} />
            </div>
            <div className="flex-1 space-y-2 overflow-hidden">
                {stats.slice(0, 3).map((s: any, i: number) => {
                    const pct = total > 0 ? ((s[metric] / total) * 100).toFixed(0) : '0';
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
