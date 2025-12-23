import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface GscChartProps {
    data: any[];
}

const GscChart: React.FC<GscChartProps> = ({ data }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        if (!chartRef.current || !data || data.length === 0) return;

        // Destroy previous instance
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        // Process Data
        // GSC API returns rows like { keys: ['2024-01-01'], clicks: 10, impressions: 1000, ctr: 0.01, position: 5.5 }
        // Sort by date just in case
        const sortedData = [...data].sort((a, b) => new Date(a.keys[0]).getTime() - new Date(b.keys[0]).getTime());

        const labels = sortedData.map(d => new Date(d.keys[0]).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', timeZone: 'UTC' }));
        const clicks = sortedData.map(d => d.clicks);
        const impressions = sortedData.map(d => d.impressions);
        const ctr = sortedData.map(d => d.ctr * 100); // Convert to %
        const position = sortedData.map(d => d.position);

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Impresiones',
                        data: impressions,
                        borderColor: '#818cf8', // Indigo 400
                        backgroundColor: 'rgba(129, 140, 248, 0.1)',
                        yAxisID: 'y_impressions',
                        fill: true,
                        tension: 0,
                        order: 2
                    },
                    {
                        label: 'Clics',
                        data: clicks,
                        borderColor: '#34d399', // Emerald 400
                        backgroundColor: '#34d399',
                        yAxisID: 'y_clicks',
                        type: 'bar',
                        barThickness: 5,
                        order: 1
                    },
                    {
                        label: 'CTR (%)',
                        data: ctr,
                        borderColor: '#fbbf24', // Amber 400
                        borderDash: [5, 5],
                        yAxisID: 'y_ctr',
                        tension: 0,
                        pointRadius: 0,
                        borderWidth: 2,
                        hidden: true // Hidden by default to avoid clutter
                    },
                    {
                        label: 'Posición Media',
                        data: position,
                        borderColor: '#f87171', // Red 400
                        yAxisID: 'y_position',
                        tension: 0,
                        pointRadius: 0,
                        borderWidth: 2,
                        hidden: true // Hidden by default
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
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(2);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y_impressions: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Impresiones' },
                        grid: { borderDash: [2, 4] } as any
                    },
                    y_clicks: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Clics' },
                        grid: { display: false }
                    },
                    y_ctr: {
                        type: 'linear',
                        display: false, // Hidden axis but scaled
                        position: 'right',
                        suggestedMin: 0,
                        suggestedMax: 20
                    },
                    y_position: {
                        type: 'linear',
                        display: false, // Hidden axis but scaled
                        position: 'right',
                        reverse: true, // Rank 1 is top
                        suggestedMin: 1,
                        suggestedMax: 100
                    }
                }
            }
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data]);

    return (
        <div className="w-full h-[400px] bg-white p-4 rounded-2xl shadow-sm border border-brand-power/5">
            <canvas ref={chartRef} />
        </div>
    );
};

export default GscChart;
