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
    onSave: (currentHtml?: string) => void;
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
                                return `${context.dataset.label}: Pos ${context.parsed.y}`;
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
                        onClick={() => {
                            if (containerRef.current) {
                                onSave(containerRef.current.innerHTML);
                            }
                        }}
                        disabled={isSaving || hasSaved}
                        className={`px - 4 py - 2 rounded - lg text - sm font - bold shadow - sm transition flex items - center gap - 2 text - white ${hasSaved ? 'bg-emerald-500 cursor-default' : 'bg-indigo-600 hover:bg-indigo-700'} `}
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

            {/* Editor Toolbar (New) */}
            <div className="sticky top-4 z-40 bg-white shadow-lg rounded-xl border border-slate-200 p-2 mb-6 flex gap-2 items-center justify-between no-print transition-all">
                <div className="flex gap-1">
                    <EditorButton icon="B" onClick={() => document.execCommand('bold')} label="Negrita" />
                    <EditorButton icon="I" onClick={() => document.execCommand('italic')} label="Cursiva" />
                    <EditorButton icon="U" onClick={() => document.execCommand('underline')} label="Subrayado" />
                    <div className="w-px h-6 bg-slate-200 mx-2"></div>
                    <EditorButton icon="H1" onClick={() => document.execCommand('formatBlock', false, 'h2')} label="Título" />
                    <EditorButton icon="H2" onClick={() => document.execCommand('formatBlock', false, 'h3')} label="Subtítulo" />
                    <EditorButton icon="P" onClick={() => document.execCommand('formatBlock', false, 'p')} label="Texto" />
                    <div className="w-px h-6 bg-slate-200 mx-2"></div>
                    <EditorButton icon="🔢" onClick={() => document.execCommand('insertOrderedList')} label="Lista Num." />
                    <EditorButton icon="•" onClick={() => document.execCommand('insertUnorderedList')} label="Lista" />
                    <div className="w-px h-6 bg-slate-200 mx-2"></div>
                    <EditorButton icon="⬅" onClick={() => document.execCommand('justifyLeft')} label="Izq." />
                    <EditorButton icon="↔" onClick={() => document.execCommand('justifyCenter')} label="Centro" />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            const range = window.getSelection()?.getRangeAt(0);
                            if (range) {
                                const el = document.createElement('div');
                                el.className = "p-6 border border-dashed border-slate-300 rounded-xl my-4 bg-slate-50";
                                el.innerHTML = "<h3 class='font-bold text-slate-400'>Nuevo Módulo (Editable)</h3><p>Escribe aquí tu análisis...</p>";
                                range.insertNode(el);
                            }
                        }}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 transition"
                    >
                        + Módulo
                    </button>
                    <button
                        onClick={() => {
                            // Trigger manual format of numbers in selection if needed, 
                            // but system prompt should handle it. 
                            // We can add a button to toggle color?
                            // For now, let's keep it simple.
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600"
                    >
                        🎨
                    </button>
                </div>
            </div>

            {/* Main AI Report (Editable) */}
            <div className="bg-white p-12 shadow-sm border border-slate-100 min-h-screen print:shadow-none print:border-none print:p-0 relative">
                <div
                    ref={containerRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="report-content space-y-8 animate-fade-in outline-none focus:ring-0"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                    onBlur={(e) => {
                        // Optional: Sync back changes to parent if we wanted to persist EDITS to Cloud
                        // But ReportView props are read-only for htmlContent currently.
                        // Ideally we should have a `onContentChange` prop.
                        // But for printing/saving via onSave(), we usually read the current DOM or stored state.
                        // The `onSave` logic in App.tsx reads `reportHTML` STATE. 
                        // To save EDITS, we must update the state!
                        // Since we are in a Controlled Component pattern mostly,
                        // we need to expose an onChange.
                        // But `dangerouslySetInnerHTML` updates are one-way.
                        // We must manually listen to input and update parent.
                        // HOWEVER, updating parent causes re-render which resets cursor in contentEditable!
                        // Solution: Don't update parent on every keystroke. Update parent on SAVE or BLUR.
                        // But `App.tsx` handleSaveCloud reads `reportHTML`.
                        // So we need to lift state up.
                        // Let's assume onSave reads from `htmlContent` prop, which is STALE if we edit here.
                        // FIX: App.tsx needs `setReportHTML` exposed to ReportView? 
                        // Or ReportView handles the saving by passing the curent DOM HTML to `onSave(html)`.
                        // Let's update `onSave` signature in ReportView.
                    }}
                    onInput={(e) => {
                        // We will rely on a Ref to capture the current HTML when clicking Save.
                        // We won't trigger re-renders.
                    }}
                />
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

const EditorButton = ({ icon, onClick, label }: any) => (
    <button
        onClick={onClick}
        title={label}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 font-bold text-sm transition"
    >
        {icon}
    </button>
);
