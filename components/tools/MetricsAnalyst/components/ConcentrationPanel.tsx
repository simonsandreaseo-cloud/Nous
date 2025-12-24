import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface ConcentrationItem {
    url: string;
    value: number;
    percentageOfTotal: number;
}

interface ConcentrationData {
    items: ConcentrationItem[];
    percentage: number;
    totalMetric: number;
    threshold: number;
}

interface ConcentrationPanelProps {
    clickConcentration: ConcentrationData;
    impressionConcentration: ConcentrationData;
}

export const ConcentrationPanel: React.FC<ConcentrationPanelProps> = ({ clickConcentration, impressionConcentration }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 print:break-inside-avoid">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <span className="bg-indigo-50 text-indigo-600 p-2 rounded-lg border border-indigo-100">🎯</span>
                Mapa de Concentración
            </h3>

            <div className="flex flex-col gap-8">
                <ConcentrationCard
                    title="Concentración de Clics"
                    data={clickConcentration}
                    color="#4F46E5" // Indigo
                    metricLabel="Clics"
                />
                <div className="h-px bg-slate-100 w-full" />
                <ConcentrationCard
                    title="Concentración de Impresiones"
                    data={impressionConcentration}
                    color="#0EA5E9" // Sky Blue
                    metricLabel="Impresiones"
                />
            </div>
        </div>
    );
};

const ConcentrationCard = ({ title, data, color, metricLabel }: { title: string, data: ConcentrationData, color: string, metricLabel: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const topItemsValue = data.items.reduce((acc, item) => acc + item.value, 0);
        const restValue = data.totalMetric - topItemsValue;

        const chartData = {
            labels: ['Top Páginas', 'Resto'],
            datasets: [{
                data: [topItemsValue, restValue],
                backgroundColor: [color, '#f1f5f9'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        };

        chartRef.current = new Chart(ctx, {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '80%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1e293b',
                        bodyColor: '#475569',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: (ctx) => {
                                const val = ctx.raw as number;
                                const pct = ((val / data.totalMetric) * 100).toFixed(1);
                                return `${ctx.label}: ${val.toLocaleString()} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });

        return () => {
            if (chartRef.current) chartRef.current.destroy();
        };
    }, [data, color]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{title}</h4>
                <div className="text-[10px] font-mono bg-slate-50 px-2 py-1 rounded text-slate-400 border border-slate-100">
                    Threshold &gt; {data.threshold}%
                </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="w-24 h-24 relative shrink-0">
                    <canvas ref={canvasRef}></canvas>
                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                        <span className="text-xl font-bold text-slate-800">{data.percentage.toFixed(0)}%</span>
                        <span className="text-[9px] text-slate-400 uppercase font-bold">top url</span>
                    </div>
                </div>
                <div className="flex-1 space-y-2">
                    <p className="text-xs text-slate-500 leading-relaxed">
                        <strong style={{ color }} className="font-bold">{data.items.length} URL(s)</strong> generan el <strong className="text-slate-700">{data.percentage.toFixed(1)}%</strong> del tráfico total.
                    </p>
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${data.percentage}%`, backgroundColor: color }}></div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Top Contribuyentes</h5>
                <div className="overflow-y-auto pr-1 space-y-2 custom-scrollbar max-h-[180px] print:max-h-none print:overflow-visible">
                    {data.items.slice(0, 10).map((item, idx) => (
                        <div key={idx} className="group relative">
                            <div className="flex justify-between items-center text-[11px] mb-1">
                                <span className="font-medium text-slate-600 truncate max-w-[70%]" title={item.url}>
                                    {item.url.replace('https://', '').replace('www.', '')}
                                </span>
                                <span className="font-mono text-slate-400">{item.value.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-slate-50 h-0.5 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full opacity-60 group-hover:opacity-100 transition-all"
                                    style={{ width: `${item.percentageOfTotal}%`, backgroundColor: color }}
                                ></div>
                            </div>
                        </div>
                    ))}
                    {data.items.length === 0 && (
                        <div className="text-center py-4 text-slate-400 text-xs italic">
                            No hay concentración significativa.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
