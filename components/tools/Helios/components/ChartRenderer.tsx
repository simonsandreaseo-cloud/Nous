import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { HeliosChartConfig } from '../types/heliosSchema';

interface ChartRendererProps {
    config: HeliosChartConfig;
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({ config }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current || !config) return;

        // Cleanup previous instance
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Deterministic Data Mapping
        // We do NOT guess here. We render exactly what is in config.data
        const labels = config.data.map(d => d.label);
        const dataValues = config.data.map(d => d.value);

        // Color Logic
        const baseColor = config.colorScheme === 'alert' ? '#ef4444' :
            config.colorScheme === 'success' ? '#22c55e' :
                '#6366f1'; // Default Brand Color

        chartInstance.current = new Chart(ctx, {
            type: config.type === 'pie' ? 'pie' : config.type === 'line' ? 'line' : 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: config.title,
                    data: dataValues,
                    backgroundColor: config.type === 'pie' ?
                        config.data.map((_, i) => `hsl(${220 + (i * 20)}, 70%, 60%)`) :
                        baseColor,
                    borderColor: baseColor,
                    borderWidth: 1,
                    fill: config.type === 'area',
                    tension: 0.3 // Smooth curves for lines
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: config.type === 'pie', // Only show legend for Pie
                        position: 'bottom'
                    },
                    title: {
                        display: false, // We render title outside usually, or we can enable it here
                        text: config.title
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: (context) => {
                                const idx = context.dataIndex;
                                const category = config.data[idx].category;
                                return category ? `Category: ${category}` : '';
                            }
                        }
                    }
                },
                scales: config.type === 'pie' ? {} : {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: !!config.yAxisLabel,
                            text: config.yAxisLabel
                        }
                    },
                    x: {
                        title: {
                            display: !!config.xAxisLabel,
                            text: config.xAxisLabel
                        }
                    }
                }
            }
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [config]);


    const handleDownload = () => {
        if (!config || !config.data) return;
        const csvContent = "Label,Value,Category\n" +
            config.data.map(d => `"${d.label}",${d.value},"${d.category || ''}"`).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${config.title.replace(/\s+/g, '_').toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full h-full min-h-[300px] bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col relative group">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-slate-700">{config.title}</h3>
                <button
                    onClick={handleDownload}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"
                    title="Download CSV"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                </button>
            </div>

            <div className="flex-1 relative min-h-[250px]">
                <canvas ref={canvasRef} />
            </div>
            {config.description && (
                <p className="mt-2 text-xs text-slate-500 italic">
                    {config.description}
                </p>
            )}
        </div>
    );

};
