import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { ComparisonItem, CannibalizationChartData } from '../types';

interface PitchDeckProps {
    chartItems: { type: string; url: string; title?: string }[];
    chartData: {
        chartLookup: Record<string, ComparisonItem>;
        cannibalizationLookup: Record<string, CannibalizationChartData>;
        aiTrafficTrend?: { dates: string[], sessions: number[] };
    };
    onClose: () => void;
}

export const PitchDeck: React.FC<PitchDeckProps> = ({ chartItems, chartData, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    const currentItem = chartItems[currentIndex];

    useEffect(() => {
        if (!canvasRef.current || !currentItem) return;

        // Destroy previous chart
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const { type, url } = currentItem;
        const urlKey = url.toLowerCase().trim();

        // Render Logic based on type
        if (type === 'clicks' && chartData.chartLookup[urlKey]) {
            renderSparkline(ctx, chartData.chartLookup[urlKey]);
        } else if (type === 'cannibalization' && chartData.cannibalizationLookup[urlKey]) {
            renderCannibalizationChart(ctx, chartData.cannibalizationLookup[urlKey]);
        } else if (type === 'ai-trend' && chartData.aiTrafficTrend) {
            renderAiTrendChart(ctx, chartData.aiTrafficTrend);
        } else {
            // Fallback for missing data
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Datos no disponibles para este gráfico', ctx.canvas.width / 2, ctx.canvas.height / 2);
        }

    }, [currentIndex, currentItem, chartData]);

    const renderSparkline = (ctx: CanvasRenderingContext2D, data: ComparisonItem) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(79, 70, 229, 0.4)');
        gradient.addColorStop(1, 'rgba(79, 70, 229, 0)');

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dailySeriesClicksP2.map((_, i) => i),
                datasets: [{
                    label: 'Clics',
                    data: data.dailySeriesClicksP2,
                    borderColor: '#4F46E5',
                    borderWidth: 4,
                    backgroundColor: gradient,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 8,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        titleFont: { size: 16 },
                        bodyFont: { size: 14 },
                        padding: 16
                    }
                },
                scales: {
                    x: { display: false },
                    y: { display: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 14 } } }
                },
                layout: { padding: 20 }
            }
        });
    };

    const renderCannibalizationChart = (ctx: CanvasRenderingContext2D, data: CannibalizationChartData) => {
        const colors = ['#4F46E5', '#0EA5E9', '#8B5CF6', '#F43F5E'];
        const datasets = data.urls.map((u, i) => ({
            label: u.url.replace('https://', '').substring(0, 35),
            data: u.dailyPositions,
            borderColor: colors[i % colors.length],
            borderWidth: 3,
            pointRadius: 4,
            tension: 0.2,
            fill: false
        }));

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates.map(d => new Date(d).getDate()),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 12, font: { size: 14, family: 'Inter' }, usePointStyle: true, padding: 20 }
                    },
                    tooltip: {
                        padding: 16,
                        titleFont: { size: 16 },
                        bodyFont: { size: 14 }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 14 }, color: '#94a3b8' } },
                    y: {
                        reverse: true,
                        min: 1,
                        max: 20,
                        grid: { color: '#f1f5f9', borderDash: [4, 4] },
                        ticks: { font: { size: 14 }, stepSize: 5, color: '#94a3b8' }
                    }
                }
            }
        });
    };

    const renderAiTrendChart = (ctx: CanvasRenderingContext2D, data: { dates: string[], sessions: number[] }) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates.map(d => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })),
                datasets: [{
                    label: 'Sesiones IA',
                    data: data.sessions,
                    borderColor: '#10B981',
                    borderWidth: 4,
                    backgroundColor: gradient,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 8,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false, padding: 16, titleFont: { size: 16 }, bodyFont: { size: 14 } }
                },
                scales: {
                    x: { ticks: { font: { size: 14 }, maxTicksLimit: 10 } },
                    y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 14 } } }
                }
            }
        });
    };

    const handlePrev = () => {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : chartItems.length - 1));
    };

    const handleNext = () => {
        setCurrentIndex(prev => (prev < chartItems.length - 1 ? prev + 1 : 0));
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [chartItems]);

    return (
        <div className="fixed inset-0 z-[200] bg-slate-900 text-white flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-800">
                <div>
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        <span className="text-indigo-500">📈</span> Pitch Mode
                    </h2>
                    <p className="text-slate-400 text-sm">Diapositiva {currentIndex + 1} de {chartItems.length}</p>
                </div>
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-bold transition-colors"
                >
                    Salir Esc
                </button>
            </div>

            {/* Main Stage */}
            <div className="flex-1 flex items-center justify-center p-10 relative bg-slate-950/50">
                {/* Chart Container */}
                <div className="w-full h-full max-w-6xl max-h-[80vh] bg-white rounded-3xl p-8 shadow-2xl shadow-black border border-slate-800 flex flex-col">
                    <h3 className="text-3xl font-bold text-slate-900 mb-6 text-center">
                        {currentItem?.title || `Gráfico: ${currentItem?.url}`}
                    </h3>
                    <div className="relative flex-1 w-full min-h-0">
                        {/* Canvas must be wrapped in relative container for Check.js proper resizing */}
                        <canvas ref={canvasRef} className="w-full h-full"></canvas>
                    </div>
                    {currentItem?.url && (
                        <div className="mt-4 text-center">
                            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 text-xs rounded-full font-mono border border-slate-200 truncate max-w-md">
                                {currentItem.url}
                            </span>
                        </div>
                    )}
                </div>

                {/* Navigation Arrows */}
                <button
                    onClick={handlePrev}
                    className="absolute left-10 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-slate-800/80 hover:bg-indigo-600 text-white flex items-center justify-center transition-all backdrop-blur hover:scale-110 shadow-xl border border-slate-700/50 group"
                    title="Anterior (Flecha Izquierda)"
                >
                    <span className="text-2xl group-hover:-translate-x-1 transition-transform">←</span>
                </button>

                <button
                    onClick={handleNext}
                    className="absolute right-10 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-slate-800/80 hover:bg-indigo-600 text-white flex items-center justify-center transition-all backdrop-blur hover:scale-110 shadow-xl border border-slate-700/50 group"
                    title="Siguiente (Flecha Derecha)"
                >
                    <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
                </button>
            </div>

            {/* Footer / Progress */}
            <div className="h-2 bg-slate-800">
                <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / chartItems.length) * 100}%` }}
                ></div>
            </div>
        </div>
    );
};
