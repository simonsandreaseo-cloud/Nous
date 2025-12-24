import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { ComparisonItem, CannibalizationChartData, TaskPerformance, DashboardStats } from '../types';
import { TaskPerformancePanel } from './TaskPerformancePanel';
import { Dashboard } from './Dashboard';
import { ProjectSelector } from '../../../shared/ProjectSelector';
import { ConcentrationPanel } from './ConcentrationPanel';
import { createPortal } from 'react-dom';
import { UsageMode } from '../types';
import { PitchDeck } from './PitchDeck';

interface ReportViewProps {
    htmlContent: string;
    chartData: {
        chartLookup: Record<string, ComparisonItem>;
        cannibalizationLookup: Record<string, CannibalizationChartData>;
        aiTrafficTrend?: { dates: string[], sessions: number[] };
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
    onShare?: () => void;
    mode?: UsageMode;
}

const EditorIconButton = ({ icon, onClick, label, bold, italic, underline }: any) => (
    <button
        onClick={onClick}
        title={label}
        className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-sm ${bold ? 'font-bold' : ''} ${italic ? 'italic' : ''} ${underline ? 'underline' : ''}`}
    >
        {icon}
    </button>
);

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
    onDateRangeChange,
    onShare,
    mode = 'default'
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartsRef = useRef<Chart[]>([]);
    const [userFeedback, setUserFeedback] = React.useState("");
    const [toolbarState, setToolbarState] = React.useState({ show: false, top: 0, left: 0 });

    // Pitch Mode State
    const [pitchItems, setPitchItems] = React.useState<{ type: string; url: string; title?: string }[]>([]);

    useEffect(() => {
        if (mode === 'pitch' && htmlContent) {
            // Extract chart placeholders from HTML
            const div = document.createElement('div');
            div.innerHTML = htmlContent;
            const placeholders = div.querySelectorAll('.chart-placeholder');
            const items: any[] = [];

            placeholders.forEach((el) => {
                const element = el as HTMLElement;
                // Try to find a previous H2 or H3 for title
                let title = "";
                let prev = element.previousElementSibling;
                while (prev) {
                    if (prev.tagName === 'H2' || prev.tagName === 'H3') {
                        title = prev.textContent || "";
                        break;
                    }
                    prev = prev.previousElementSibling;
                }

                items.push({
                    type: element.dataset.chartType || 'clicks',
                    url: element.dataset.chartUrl || '',
                    title: title
                });
            });

            // If no items found but we have chart data, maybe add top winners/losers automatically?
            // For now, let's respect the AI's selection.
            setPitchItems(items);
        }
    }, [mode, htmlContent]);

    if (mode === 'pitch' && pitchItems.length > 0) {
        return <PitchDeck chartItems={pitchItems} chartData={chartData} onClose={() => window.location.reload()} />;
    }

    // Handle Floating Toolbar
    useEffect(() => {
        const handleSelection = () => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                setToolbarState(s => ({ ...s, show: false }));
                return;
            }

            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Verify selection is within our editor
            if (containerRef.current && !containerRef.current.contains(selection.anchorNode)) {
                setToolbarState(s => ({ ...s, show: false }));
                return;
            }

            setToolbarState({
                show: true,
                top: rect.top - 60, // Position above text
                left: rect.left + (rect.width / 2)
            });
        };

        document.addEventListener('selectionchange', handleSelection);
        return () => document.removeEventListener('selectionchange', handleSelection);
    }, []);

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
            } else if (type === 'ai-trend' && chartData.aiTrafficTrend) {
                renderAiTrendChart(ctx, chartData.aiTrafficTrend);
            }
        });

    }, [htmlContent, chartData]);

    const renderSparkline = (ctx: CanvasRenderingContext2D, data: ComparisonItem) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, 100);
        gradient.addColorStop(0, 'rgba(79, 70, 229, 0.1)'); // Very subtle indigo
        gradient.addColorStop(1, 'rgba(79, 70, 229, 0)');

        // Decide color based on trend
        const isPositive = data.clicksChange >= 0;
        const color = isPositive ? '#10b981' : '#f43f5e'; // Emerald vs Rose

        chartsRef.current.push(new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dailySeriesClicksP2.map((_, i) => i),
                datasets: [{
                    label: 'Clics',
                    data: data.dailySeriesClicksP2,
                    borderColor: color,
                    borderWidth: 1.5,
                    backgroundColor: gradient,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: {
                    x: { display: false },
                    y: { display: false, min: 0 }
                },
                layout: { padding: 0 }
            }
        }));
    };

    const renderCannibalizationChart = (ctx: CanvasRenderingContext2D, data: CannibalizationChartData) => {
        const colors = ['#0f172a', '#64748b', '#94a3b8', '#cbd5e1'];

        const datasets = data.urls.map((u, i) => ({
            label: u.url.replace('https://', '').substring(0, 30) + (u.url.length > 30 ? '...' : ''),
            data: u.dailyPositions,
            borderColor: colors[i % colors.length],
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.3,
            fill: false
        }));

        chartsRef.current.push(new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates.map(d => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'bottom',
                        align: 'start',
                        labels: { boxWidth: 6, font: { size: 10, family: 'Inter' }, usePointStyle: true, padding: 20 }
                    },
                    tooltip: {
                        backgroundColor: '#ffffff',
                        titleColor: '#0f172a',
                        bodyColor: '#64748b',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 12,
                        titleFont: { size: 11, weight: 'bold' },
                        bodyFont: { size: 11 },
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: Pos ${context.parsed.y.toFixed(1)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#94a3b8', maxTicksLimit: 6 } },
                    y: {
                        reverse: true, // SEO Rank style
                        min: 1,
                        max: 20,
                        grid: { color: '#f1f5f9' },
                        ticks: { font: { size: 9 }, stepSize: 5, color: '#94a3b8' }
                    }
                }
            }
        }));
    };

    const renderAiTrendChart = (ctx: CanvasRenderingContext2D, data: { dates: string[], sessions: number[] }) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.1)'); // Emerald
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

        chartsRef.current.push(new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates.map(d => {
                    const date = new Date(d);
                    return isNaN(date.getTime()) ? d : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                }),
                datasets: [{
                    label: 'Sesiones IA',
                    data: data.sessions,
                    borderColor: '#10B981',
                    borderWidth: 2,
                    backgroundColor: gradient,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 10 } },
                    y: { beginAtZero: true, grid: { color: '#f8fafc' }, ticks: { font: { size: 10 } } }
                }
            }
        }));
    };

    return (
        <div className="max-w-[1200px] mx-auto py-12 px-6 sm:px-8 bg-gray-50 min-h-screen">
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
                        onClick={onShare}
                        className="bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:border-indigo-200 transition flex items-center gap-2"
                    >
                        🔗 Compartir
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

            {/* Magazine Layout: Integrated Visuals */}
            <div className="space-y-12">
                {/* Visuals Row (Task Impact & Concentration) */}
                {(taskPerformance?.length! > 0 || concentrationAnalysis) && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 print:break-inside-avoid">
                        {taskPerformance && taskPerformance.length > 0 && user && (
                            <div className="contents">
                                <TaskPerformancePanel taskPerformance={taskPerformance} decayAlerts={decayAlerts || []} user={user} />
                            </div>
                        )}
                        {concentrationAnalysis && (
                            <div className="contents">
                                <ConcentrationPanel
                                    clickConcentration={concentrationAnalysis.clickConcentration}
                                    impressionConcentration={concentrationAnalysis.impressionConcentration}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Main Content Area */}
                <div className="relative">
                    {/* Floating Selection Toolbar (Portal) */}
                    {toolbarState.show && createPortal(
                        <div
                            className="fixed z-[9999] bg-slate-900/90 text-white backdrop-blur shadow-xl rounded-full px-4 py-2 flex items-center gap-2 animate-fade-in-up transition-all transform -translate-x-1/2"
                            style={{ top: toolbarState.top, left: toolbarState.left }}
                            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
                        >
                            <EditorIconButton icon="B" onClick={() => document.execCommand('bold')} label="Negrita" bold />
                            <EditorIconButton icon="I" onClick={() => document.execCommand('italic')} label="Cursiva" italic />
                            <EditorIconButton icon="U" onClick={() => document.execCommand('underline')} label="Subrayado" underline />
                            <div className="w-px h-4 bg-white/20 mx-1"></div>
                            <EditorIconButton icon="H2" onClick={() => document.execCommand('formatBlock', false, 'h2')} label="Título" />
                            <EditorIconButton icon="H3" onClick={() => document.execCommand('formatBlock', false, 'h3')} label="Subtítulo" />
                            <EditorIconButton icon="¶" onClick={() => document.execCommand('formatBlock', false, 'p')} label="Texto" />
                            <div className="w-px h-4 bg-white/20 mx-1"></div>
                            <div className="relative group flex items-center justify-center w-8 h-8 cursor-pointer hover:bg-white/10 rounded-full transition-colors">
                                <span className="text-lg">🎨</span>
                                <input
                                    type="color"
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    onChange={(e) => document.execCommand('foreColor', false, e.target.value)}
                                    title="Color de texto"
                                />
                            </div>
                        </div>,
                        document.body
                    )}

                    {/* Main AI Report (Editable Paper) */}
                    <div className="bg-white p-8 md:p-20 shadow-xl shadow-slate-200/50 rounded-[2rem] border border-slate-100 min-h-[800px] print:shadow-none print:border-none print:p-0 relative font-sans text-slate-700 max-w-5xl mx-auto">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-bl-[4rem] opacity-50 pointer-events-none print:hidden"></div>

                        {/* Style Injection for rendered HTML content */}
                        <style dangerouslySetInnerHTML={{
                            __html: `
                            .report-content h1 { font-size: 2.5em; font-weight: 900; color: #0f172a; letter-spacing: -0.03em; margin-bottom: 0.8em; margin-top: 1em; line-height: 1.1; }
                            .report-content h2 { font-size: 1.75em; font-weight: 800; color: #1e293b; letter-spacing: -0.02em; margin-bottom: 0.8em; margin-top: 2em; display: flex; align-items: center; gap: 0.5em; }
                            .report-content h2::before { content: ''; display: block; width: 6px; height: 1.2em; background: #6366f1; border-radius: 4px; }
                            .report-content h3 { font-size: 1.35em; font-weight: 700; color: #334155; margin-bottom: 0.6em; margin-top: 1.5em; }
                            .report-content p { margin-bottom: 1.5em; line-height: 1.8; color: #475569; font-size: 1.1em; }
                            .report-content ul, .report-content ol { margin-bottom: 1.5em; padding-left: 1.5em; color: #475569; }
                            .report-content li { margin-bottom: 0.5em; }
                            .report-content strong { color: #0f172a; font-weight: 700; }
                            .report-content table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 2em 0; border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                            .report-content th { background: #f8fafc; font-weight: 700; text-transform: uppercase; font-size: 0.75em; letter-spacing: 0.05em; color: #64748b; padding: 1rem 1.25rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
                            .report-content td { padding: 1rem 1.25rem; border-bottom: 1px solid #f1f5f9; font-size: 0.95em; color: #334155; }
                            .report-content tr:last-child td { border-bottom: none; }
                            .report-content tr:hover td { background: #f8fafc; }
                            .report-content blockquote { border-left: 4px solid #6366f1; background: #f5f3ff; padding: 1.5em; border-radius: 0 1rem 1rem 0; color: #4f46e5; font-style: italic; margin-bottom: 2em; font-size: 1.1em; }
                            .report-content .highlight-positive { color: #059669; font-weight: bold; background: #d1fae5; padding: 0.1em 0.4em; border-radius: 4px; }
                            .report-content .highlight-negative { color: #e11d48; font-weight: bold; background: #ffe4e6; padding: 0.1em 0.4em; border-radius: 4px; }
                        `}} />

                        <div
                            ref={containerRef}
                            contentEditable
                            suppressContentEditableWarning
                            className="report-content outline-none focus:ring-0 max-w-none prose prose-slate prose-lg md:prose-xl prose-headings:font-bold prose-a:text-indigo-600 font-serif"
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                    </div>
                </div>


                {/* Fixed Compressed Agent Bar */}
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 print:hidden">
                    <div className="bg-white/90 backdrop-blur-xl shadow-2xl shadow-indigo-900/20 border border-indigo-100 rounded-full p-2 pl-6 flex items-center gap-3 ring-1 ring-slate-900/5 transition-all hover:scale-[1.01] hover:shadow-indigo-500/20">
                        <div className="relative group">
                            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-full flex items-center justify-center text-white text-xs animate-pulse shadow-lg shadow-indigo-500/30">✨</div>
                        </div>

                        <input
                            value={userFeedback}
                            onChange={(e) => setUserFeedback(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !isRegenerating && onRegenerate(userFeedback)}
                            placeholder="Pide ajustes a la IA (ej. 'Resume más la introducción')..."
                            className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400 h-10"
                        />

                        <div className="flex gap-2 shrink-0">
                            <button
                                onClick={() => {
                                    if (containerRef.current) containerRef.current.focus();
                                    const range = window.getSelection()?.getRangeAt(0);
                                    if (range) {
                                        const el = document.createElement('div');
                                        el.className = "p-6 border-2 border-dashed border-indigo-200 rounded-xl my-6 bg-indigo-50/30";
                                        el.innerHTML = "<h3 class='text-lg font-bold text-indigo-900 mb-2'>Nuevo Análisis</h3><p class='text-slate-600'>Escribe aquí...</p>";
                                        range.insertNode(el);
                                    } else {
                                        // Fallback if no selection: append to end
                                        if (containerRef.current) {
                                            const el = document.createElement('div');
                                            el.className = "p-6 border-2 border-dashed border-indigo-200 rounded-xl my-6 bg-indigo-50/30";
                                            el.innerHTML = "<h3 class='text-lg font-bold text-indigo-900 mb-2'>Nuevo Análisis</h3><p class='text-slate-600'>Escribe aquí...</p>";
                                            containerRef.current.appendChild(el);
                                        }
                                    }
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                title="Insertar bloque manual"
                            >
                                <span className="text-xl leading-none mb-1">+</span>
                            </button>
                            <button
                                onClick={() => onRegenerate(userFeedback)}
                                disabled={isRegenerating || !userFeedback}
                                className="h-10 px-6 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20"
                            >
                                {isRegenerating ? '...' : 'Enviar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


