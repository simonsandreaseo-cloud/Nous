import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { ComparisonItem, CannibalizationChartData, TaskPerformance, DashboardStats } from '../types';
import { TaskPerformancePanel } from './TaskPerformancePanel';
import { Dashboard } from './Dashboard';
import { ProjectSelector } from '../../../shared/ProjectSelector';
import { ConcentrationPanel } from './ConcentrationPanel';

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
    concentrationAnalysis?: any;
    onShowHistory?: () => void;
    selectedProjectId?: string | null;
    onSelectProject?: (id: string) => void;
    onDateRangeChange?: (range: string) => void;
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
    decayAlerts,
    concentrationAnalysis,
    onShowHistory,
    selectedProjectId,
    onSelectProject,
    onDateRangeChange
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
            div.className = "relative h-48 w-full bg-slate-50/50 rounded-lg border border-slate-100 my-4 p-2"; // Add styling container
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
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(79, 70, 229, 0.2)'); // Indigo
        gradient.addColorStop(1, 'rgba(79, 70, 229, 0)');

        chartsRef.current.push(new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dailySeriesClicksP2.map((_, i) => i),
                datasets: [{
                    label: 'Clics (Periodo 2)',
                    data: data.dailySeriesClicksP2,
                    borderColor: '#4F46E5',
                    borderWidth: 2,
                    backgroundColor: gradient,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.1 // Slight curve for aesthetics
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: true, intersect: false, mode: 'index' } },
                scales: { x: { display: false }, y: { display: false, min: 0 } },
                layout: { padding: 4 }
            }
        }));
    };

    const renderCannibalizationChart = (ctx: CanvasRenderingContext2D, data: CannibalizationChartData) => {
        const colors = ['#4F46E5', '#0EA5E9', '#8B5CF6', '#F43F5E'];

        const datasets = data.urls.map((u, i) => ({
            label: u.url.replace('https://', '').substring(0, 25) + (u.url.length > 25 ? '...' : ''),
            data: u.dailyPositions,
            borderColor: colors[i % colors.length],
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.2, // Smoother
            fill: false
        }));

        chartsRef.current.push(new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates.map(d => new Date(d).getDate()), // Simplify dates
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 8, font: { size: 10, family: 'Inter' }, usePointStyle: true, padding: 15 }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1e293b',
                        bodyColor: '#475569',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: Pos ${context.parsed.y.toFixed(1)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' } },
                    y: {
                        reverse: true, // SEO Rank style
                        min: 1,
                        max: 20,
                        grid: { color: '#f1f5f9', borderDash: [4, 4] },
                        ticks: { font: { size: 10 }, stepSize: 5, color: '#94a3b8' }
                    }
                }
            }
        }));
    };

    return (
        <div className="max-w-[1600px] mx-auto py-8 px-4 sm:px-6 lg:px-8 print:px-0 bg-slate-50/50 min-h-screen">
            {/* Header / Save Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 print:hidden gap-4">
                <button
                    onClick={() => window.location.reload()}
                    className="text-sm font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-2 transition-colors px-3 py-2 bg-white rounded-lg shadow-sm border border-slate-200"
                >
                    &larr; Nuevo Análisis
                </button>
                <div className="flex gap-2 items-center flex-wrap justify-end">
                    {onSelectProject && (
                        <div className="h-10">
                            <ProjectSelector
                                selectedProjectId={selectedProjectId || null}
                                onSelectProject={onSelectProject}
                                className="h-full"
                            />
                        </div>
                    )}
                    <div className="h-6 w-px bg-slate-300 mx-2 hidden md:block"></div>
                    <button
                        onClick={onShowHistory}
                        className="bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:border-indigo-200 transition"
                    >
                        🕒 Historial
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:border-indigo-200 transition"
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
                        className={`px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-2 text-white ${hasSaved ? 'bg-emerald-500 cursor-default' : 'bg-indigo-600 hover:bg-indigo-700'} `}
                    >
                        {isSaving ? 'Guardando...' : hasSaved ? '✅ Guardado' : '☁️ Guardar'}
                    </button>
                </div>
            </div>

            {/* Dashboard Visuals */}
            {dashboardStats && (
                <div className="mb-10 animate-fade-in-up">
                    <Dashboard stats={dashboardStats} logo={logo} onDateRangeChange={onDateRangeChange} />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Column: Report */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Editor Toolbar (Floating) */}
                    <div className="sticky top-4 z-50 bg-white/90 backdrop-blur-md shadow-lg rounded-2xl border border-slate-200/60 p-2 flex gap-2 items-center justify-between print:hidden transition-all ring-1 ring-black/5">
                        <div className="flex gap-1 overflow-x-auto no-scrollbar">
                            <EditorButton icon={<span className="font-bold font-serif">B</span>} onClick={() => document.execCommand('bold')} label="Negrita" />
                            <EditorButton icon={<span className="italic font-serif">I</span>} onClick={() => document.execCommand('italic')} label="Cursiva" />
                            <EditorButton icon={<span className="underline font-serif">U</span>} onClick={() => document.execCommand('underline')} label="Subrayado" />
                            <div className="w-px h-5 bg-slate-200 mx-1 self-center"></div>
                            <EditorButton icon={<span className="font-bold">H1</span>} onClick={() => document.execCommand('formatBlock', false, 'h2')} label="Título" />
                            <EditorButton icon={<span className="font-semibold text-sm">H2</span>} onClick={() => document.execCommand('formatBlock', false, 'h3')} label="Subtítulo" />
                            <EditorButton icon={<span className="text-xs">¶</span>} onClick={() => document.execCommand('formatBlock', false, 'p')} label="Texto" />
                            <div className="w-px h-5 bg-slate-200 mx-1 self-center"></div>
                            <EditorButton icon="1." onClick={() => document.execCommand('insertOrderedList')} label="Lista Num." />
                            <EditorButton icon="•" onClick={() => document.execCommand('insertUnorderedList')} label="Lista" />
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button
                                onClick={() => {
                                    const range = window.getSelection()?.getRangeAt(0);
                                    if (range) {
                                        const el = document.createElement('div');
                                        el.className = "p-6 border-2 border-dashed border-indigo-200 rounded-xl my-6 bg-indigo-50/30";
                                        el.innerHTML = "<h3 class='text-lg font-bold text-indigo-900 mb-2'>Nuevo Análisis</h3><p class='text-slate-600'>Escribe aquí...</p>";
                                        range.insertNode(el);
                                    }
                                }}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 text-xs font-bold rounded-lg hover:bg-indigo-100 transition whitespace-nowrap"
                            >
                                + Módulo
                            </button>
                        </div>
                    </div>

                    {/* Main AI Report (Editable Paper) */}
                    <div className="bg-white p-8 md:p-16 shadow-sm rounded-xl border border-slate-200 min-h-[800px] print:shadow-none print:border-none print:p-0 relative font-sans text-slate-700">
                        {/* Style Injection for rendered HTML content */}
                        <style dangerouslySetInnerHTML={{
                            __html: `
                            .report-content h1 { font-size: 2em; font-weight: 800; color: #1e293b; letter-spacing: -0.02em; margin-bottom: 0.8em; margin-top: 1em; }
                            .report-content h2 { font-size: 1.5em; font-weight: 700; color: #334155; letter-spacing: -0.01em; margin-bottom: 0.6em; margin-top: 1.2em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
                            .report-content h3 { font-size: 1.25em; font-weight: 600; color: #475569; margin-bottom: 0.5em; margin-top: 1em; }
                            .report-content p { margin-bottom: 1.25em; line-height: 1.6; color: #4b5563; font-size: 1.05em; }
                            .report-content ul, .report-content ol { margin-bottom: 1.25em; padding-left: 1.5em; color: #4b5563; }
                            .report-content li { margin-bottom: 0.5em; }
                            .report-content strong { color: #1e293b; font-weight: 700; }
                            .report-content table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 1.5em 0; border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden; }
                            .report-content th { background: #f8fafc; font-weight: 600; text-transform: uppercase; font-size: 0.75em; letter-spacing: 0.05em; color: #64748b; padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
                            .report-content td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; font-size: 0.9em; color: #334155; }
                            .report-content tr:last-child td { border-bottom: none; }
                            .report-content tr:hover td { background: #f8fafc; }
                            .report-content blockquote { border-left: 4px solid #6366f1; background: #eff6ff; padding: 1em; border-radius: 0 0.5rem 0.5rem 0; color: #1e40af; font-style: italic; margin-bottom: 1.5em; }
                            .report-content .highlight-positive { color: #10b981; font-weight: bold; background: #ecfdf5; padding: 0.1em 0.3em; border-radius: 4px; }
                            .report-content .highlight-negative { color: #f43f5e; font-weight: bold; background: #fff1f2; padding: 0.1em 0.3em; border-radius: 4px; }
                        `}} />

                        <div
                            ref={containerRef}
                            contentEditable
                            suppressContentEditableWarning
                            className="report-content outline-none focus:ring-0 max-w-none prose prose-slate prose-headings:font-bold prose-a:text-indigo-600"
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                    </div>
                </div>

                {/* Sidebar Column: Widgets */}
                <div className="space-y-8 print:hidden">
                    {/* Chat / Refinement Interface */}
                    <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-lg shadow-indigo-500/5 sticky top-24">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl">✨</div>
                            <h3 className="text-lg font-bold text-slate-800 leading-tight">
                                Agente de Análisis
                            </h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">
                            ¿Necesitas ajustar el tono o profundizar en un punto? Pídeselo a la IA.
                        </p>

                        <div className="relative">
                            <textarea
                                value={userFeedback}
                                onChange={(e) => setUserFeedback(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !isRegenerating && onRegenerate(userFeedback)}
                                placeholder="Ej: 'Añade una tabla comparativa de keywords'..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pb-12 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm resize-none h-32"
                            />
                            <div className="absolute bottom-3 right-3">
                                <button
                                    onClick={() => onRegenerate(userFeedback)}
                                    disabled={isRegenerating || !userFeedback}
                                    className="bg-indigo-600 text-white p-2 rounded-lg font-bold disabled:opacity-50 hover:bg-indigo-700 transition shadow-md"
                                >
                                    {isRegenerating ? <span className="animate-spin">↻</span> : '➤'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Task Intelligence Panel (Phase 5) */}
                    {taskPerformance && taskPerformance.length > 0 && user && (
                        <TaskPerformancePanel taskPerformance={taskPerformance} decayAlerts={decayAlerts || []} user={user} />
                    )}

                    {/* Concentration Map */}
                    {concentrationAnalysis && (
                        <ConcentrationPanel
                            clickConcentration={concentrationAnalysis.clickConcentration}
                            impressionConcentration={concentrationAnalysis.impressionConcentration}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

const EditorButton = ({ icon, onClick, label }: any) => (
    <button
        onClick={onClick}
        title={label}
        className="h-8 min-w-[32px] px-2 flex items-center justify-center rounded hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 font-medium text-sm transition"
    >
        {icon}
    </button>
);
