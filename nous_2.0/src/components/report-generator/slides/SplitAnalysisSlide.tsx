import React, { useEffect, useRef } from 'react';
import { MetricCard } from './MetricCard';
import Chart from 'chart.js/auto';
import ReactMarkdown from 'react-markdown';

interface SplitAnalysisProps {
    title: string;
    analysis: string;
    metrics?: { label: string; value: string | number; trend?: 'up' | 'down' | 'neutral' }[];
    chartConfig: any;
    theme?: 'light' | 'dark';
}

export const SplitAnalysisSlide: React.FC<SplitAnalysisProps> = ({
    title,
    analysis,
    metrics,
    chartConfig,
    theme = 'light'
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current || !chartConfig) return;

        // Destroy previous chart
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Reusing the Chart.js logic from ReportView but scoped to this component
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: theme === 'dark' ? '#cbd5e1' : '#475569', font: { family: 'Inter', size: 11, weight: 600 } }
                }
            },
            scales: {
                x: { ticks: { color: theme === 'dark' ? '#94a3b8' : '#64748b' }, grid: { display: false } },
                y: { ticks: { color: theme === 'dark' ? '#94a3b8' : '#64748b' }, grid: { color: theme === 'dark' ? '#334155' : '#f1f5f9' } }
            }
        };

        let type = chartConfig.type || 'bar';
        // Validate type. The prompt sometimes makes Gemini return "type": "insight" which crashes Chart.js
        const validTypes = ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea', 'bubble', 'scatter'];
        if (!validTypes.includes(type)) type = 'bar';

        let datasets = chartConfig.datasets || [];
        let labels = chartConfig.labels || [];

        // Simple fallback generation if only config string is passed
        if (datasets.length === 0 && chartConfig.chartType === 'trend') {
            labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
            datasets = [{ label: 'Proyección', data: [10, 20, 15, 30], borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.1)', fill: true, tension: 0.4 }];
        }

        chartInstance.current = new Chart(ctx, {
            type,
            data: { labels, datasets },
            options: {
                ...commonOptions,
                plugins: {
                    ...commonOptions.plugins,
                    title: { display: !!chartConfig.title, text: chartConfig.title, color: theme === 'dark' ? '#fff' : '#1e293b' }
                }
            }
        });

        return () => {
            if (chartInstance.current) chartInstance.current.destroy();
        };
    }, [chartConfig, theme]);

    return (
        <section className="report-slide bg-white h-full relative overflow-hidden p-12 flex flex-col min-h-[600px]">
            <div className="flex items-center justify-between mb-10 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[var(--color-nous-mist)]/30 text-[var(--color-nous-mist)] rounded-2xl flex items-center justify-center shadow-sm">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">{title}</h2>
                </div>
                <div className="px-4 py-1.5 glass-panel bg-[var(--color-nous-lavender)]/10 border-hairline rounded-full text-[10px] font-black uppercase text-[var(--color-nous-lavender)] tracking-widest">Análisis Profundo</div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-10 min-h-0">
                {/* Left: Visuals */}
                <div className="col-span-7 flex flex-col gap-6 h-full">
                    {metrics && metrics.length > 0 && (
                        <div className="grid grid-cols-2 gap-4">
                            {metrics.map((m, i) => <MetricCard key={i} {...m} />)}
                        </div>
                    )}

                    <div className="chart-container-premium flex-1 group relative">
                        <div className="absolute top-6 right-6 flex gap-2">
                            <div className="h-2 w-2 rounded-full bg-[var(--color-nous-lavender)]"></div>
                            <div className="h-2 w-2 rounded-full bg-[var(--color-nous-mist)]"></div>
                        </div>
                        <div className="w-full h-full min-h-[300px] relative">
                            <canvas ref={canvasRef}></canvas>
                        </div>
                    </div>
                </div>

                {/* Right: Analysis */}
                <div className="col-span-5 flex flex-col h-full overflow-hidden">
                    <div className="report-card h-full flex flex-col p-8 glass-panel bg-white/40 border-hairline rounded-3xl">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6 italic">Visualización y Estrategia</h3>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="prose prose-slate prose-sm text-slate-600 leading-relaxed font-medium">
                                <ReactMarkdown>
                                    {analysis}
                                </ReactMarkdown>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-hairline flex justify-between items-center">
                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Powered by Gemini AI</span>
                            <div className="flex -space-x-2">
                                <div className="w-6 h-6 rounded-full bg-[var(--color-nous-lavender)] border-2 border-white"></div>
                                <div className="w-6 h-6 rounded-full bg-[var(--color-nous-mist)] border-2 border-white"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
