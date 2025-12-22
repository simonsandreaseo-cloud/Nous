import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { ComparisonItem, CannibalizationChartData, TaskPerformance, DashboardStats } from '../types';
import { TaskPerformancePanel } from './TaskPerformancePanel';
import { Dashboard } from './Dashboard';

interface ReportViewProps {
    htmlContent: string;
    chartData: {
        chartLookup: Record<string, ComparisonItem>;
        cannibalizationLookup: Record<string, CannibalizationChartData>;
    };
    p1Name: string;
    p2Name: string;
    onRegenerate: (msg: string) => void;
    isRegenerating: boolean;
    dashboardStats?: DashboardStats;
    logo?: string | null;
    onSave: () => void;
    isSaving: boolean;
    hasSaved: boolean;
    user?: any;
    taskPerformance?: TaskPerformance[];
    decayAlerts?: any[];
}

export const ReportView: React.FC<ReportViewProps> = ({
    htmlContent,
    chartData,
    p1Name,
    p2Name,
    onRegenerate,
    isRegenerating,
    dashboardStats,
    logo,
    onSave,
    isSaving,
    hasSaved,
    user,
    taskPerformance,
    decayAlerts
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartsRef = useRef<Chart[]>([]);
    const [userFeedback, setUserFeedback] = React.useState("");

    // 1. Render Charts into Placeholders
    useEffect(() => {
        // Cleanup old charts
        chartsRef.current.forEach(c => c.destroy());
        chartsRef.current = [];

        if (!containerRef.current) return;

        // Find all placeholders
        const placeholders = containerRef.current.querySelectorAll('.chart-placeholder');

        placeholders.forEach((el) => {
            const div = el as HTMLDivElement;
            const type = div.dataset.chartType;
            const urlKey = div.dataset.chartUrl?.toLowerCase().trim();

            if (!urlKey) return;

            // Create Canvas
            div.innerHTML = ''; // Clear loading text
            const canvas = document.createElement('canvas');
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            div.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            if (type === 'clicks' && chartData.chartLookup[urlKey]) {
                const data = chartData.chartLookup[urlKey];
                renderSparkline(ctx, data);
            } else if (type === 'cannibalization' && chartData.cannibalizationLookup[urlKey]) {
                const data = chartData.cannibalizationLookup[urlKey];
                renderCannibalizationChart(ctx, data);
            }
        });

    }, [htmlContent, chartData]);

    const renderSparkline = (ctx: CanvasRenderingContext2D, data: ComparisonItem) => {
        // Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 100);
        gradient.addColorStop(0, 'rgba(79, 70, 229, 0.2)');
        gradient.addColorStop(1, 'rgba(79, 70, 229, 0)');

        chartsRef.current.push(new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dailySeriesClicksP2.map((_, i) => i),
                datasets: [{
                    data: data.dailySeriesClicksP2,
                    borderColor: '#4f46e5', // Indigo 600
                    borderWidth: 2,
                    backgroundColor: gradient,
                    fill: true,
                    pointRadius: 0,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: true, intersect: false, mode: 'index' } },
                scales: { x: { display: false }, y: { display: false, min: 0 } }
            }
        }));
    };

    const renderCannibalizationChart = (ctx: CanvasRenderingContext2D, data: CannibalizationChartData) => {
        const colors = ['#4f46e5', '#ec4899', '#f59e0b']; // Indigo, Pink, Amber

        const datasets = data.urls.map((u, i) => ({
            label: u.url.replace('https://', '').substring(0, 20) + '...', // Shorten for legend
            data: u.dailyPositions,
            borderColor: colors[i % colors.length],
            borderWidth: 1.5,
            pointRadius: 1,
            tension: 0.1,
            fill: false
        }));

        chartsRef.current.push(new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 8, font: { size: 9 }, color: '#64748b' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return \`\${context.dataset.label}: Pos \${context.parsed.y}\`;
                            }
                        }
                    }
                },
                scales: {
                    x: { display: false },
                    y: { 
                        reverse: true, // SEO Rank style (1 is top)
                        min: 1,
                        max: 20,
                        grid: { color: '#f1f5f9' },
                        ticks: { font: { size: 9 }, stepSize: 5 }
                    }
                }
            }
        }));
    };

    return (
        <div className="max-w-6xl mx-auto py-10 px-6 print:px-0">
            {/* Header / Save Bar */}
            <div className="flex justify-between items-center mb-8 no-print">
                <button 
                   onClick={() => window.location.reload()}
                   className="text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-2"
                >
                    &larr; Nuevo Análisis
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.print()}
                        className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 transition"
                    >
                        🖨️ PDF
                    </button>
                    <button
                        onClick={onSave}
                        disabled={isSaving || hasSaved}
                        className={`px - 4 py - 2 rounded - lg text - sm font - bold shadow - sm transition flex items - center gap - 2 text - white ${ hasSaved ? 'bg-emerald-500 cursor-default' : 'bg-indigo-600 hover:bg-indigo-700' } `}
                    >
                        {isSaving ? 'Guardando...' : hasSaved ? '✅ Guardado' : '☁️ Guardar en Nube'}
                    </button>
                </div>
            </div>

            {/* Dashboard Visuals */}
            {dashboardStats && (
                <Dashboard stats={dashboardStats} logo={logo} />
            )}

            {/* Task Intelligence Panel (Phase 5) */}
            {taskPerformance && taskPerformance.length > 0 && user && (
                <TaskPerformancePanel taskPerformance={taskPerformance} decayAlerts={decayAlerts || []} user={user} />
            )}

            {/* Main AI Report */}
            <div className="bg-white p-12 shadow-sm border border-slate-100 min-h-screen print:shadow-none print:border-none print:p-0">
                <div ref={containerRef} className="report-content space-y-8 animate-fade-in" dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>

            {/* Chat / Refinement Interface */}
            <div className="mt-12 bg-white p-6 rounded-xl border border-slate-200 shadow-sm no-print">
                 <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    💬 Refinar con IA
                 </h3>
                 <div className="flex gap-4">
                     <input 
                        type="text" 
                        value={userFeedback}
                        onChange={(e) => setUserFeedback(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isRegenerating && onRegenerate(userFeedback)}
                        placeholder="Ej: 'Profundiza más en la estrategia' o 'Analiza el segmento X'..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                     />
                     <button
                        onClick={() => onRegenerate(userFeedback)}
                        disabled={isRegenerating || !userFeedback}
                        className="bg-slate-900 text-white px-6 rounded-lg font-bold disabled:opacity-50 hover:bg-slate-800 transition"
                     >
                        {isRegenerating ? 'Pensando...' : 'Actualizar'}
                     </button>
                 </div>
            </div>
        </div>
    );
};
