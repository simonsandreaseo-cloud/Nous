import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface ConcentrationItem {
    url: string;
    value: number;
    percentageOfTotal: number;
}

interface ConcentrationData {
    items: ConcentrationItem[];
    percentage: number; // The sum of percentage of these items (e.g., 60%)
    totalMetric: number;
    threshold: number;
}

interface ConcentrationPanelProps {
    clickConcentration: ConcentrationData;
    impressionConcentration: ConcentrationData;
}

export const ConcentrationPanel: React.FC<ConcentrationPanelProps> = ({ clickConcentration, impressionConcentration }) => {
    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 my-8 print:break-inside-avoid">
            <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <span className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">🎯</span>
                Mapa de Concentración de Tráfico
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <ConcentrationCard
                    title="Concentración de Clics"
                    data={clickConcentration}
                    color="#4F46E5" // Indigo
                    metricLabel="Clics"
                />
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

        // Destroy existing chart
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Prepare Data
        // Visualization: Top items vs "Rest"
        const topItemsValue = data.items.reduce((acc, item) => acc + item.value, 0);
        const restValue = data.totalMetric - topItemsValue;

        const chartData = {
            labels: ['Top Páginas Concentradas', 'Resto del Sitio'],
            datasets: [{
                data: [topItemsValue, restValue],
                backgroundColor: [color, '#F1F5F9'], // Color vs Slate-100
                borderWidth: 0,
                hoverOffset: 4
            }]
        };

        chartRef.current = new Chart(ctx, {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                cutout: '75%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
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
            <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-slate-700 text-lg">{title}</h4>
                <div className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
                    Threshold &gt; {data.threshold}%
                </div>
            </div>

            <div className="flex items-center gap-6 mb-8">
                <div className="w-32 h-32 relative shrink-0">
                    <canvas ref={canvasRef}></canvas>
                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                        <span className="text-2xl font-bold text-slate-800">{data.percentage.toFixed(1)}%</span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">del total</span>
                    </div>
                </div>
                <div className="flex-1 space-y-2">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        <strong style={{ color }}>{data.items.length} URL(s)</strong> generan el <strong>{data.percentage.toFixed(1)}%</strong> de todo el tráfico ({metricLabel.toLowerCase()}).
                    </p>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${data.percentage}%`, backgroundColor: color }}></div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                <h5 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">Top Contribuyentes</h5>
                <div className="overflow-y-auto pr-2 space-y-3 custom-scrollbar max-h-[250px]">
                    {data.items.slice(0, 10).map((item, idx) => (
                        <div key={idx} className="group relative">
                            <div className="flex justify-between items-center text-xs mb-1">
                                <span className="font-medium text-slate-700 truncate max-w-[70%]" title={item.url}>
                                    {item.url}
                                </span>
                                <span className="font-mono text-slate-500">{item.value.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-slate-50 h-1 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full opacity-50 transition-all group-hover:opacity-100"
                                    style={{ width: `${item.percentageOfTotal}%`, backgroundColor: color }}
                                ></div>
                            </div>
                        </div>
                    ))}
                    {data.items.length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-sm italic">
                            No hay concentración significativa detectada.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
