import React, { useEffect, useRef } from 'react';
import { ChartData, ReportSection, UsageMode, TaskPerformance, DashboardStats } from '../types';
import { TaskPerformancePanel } from './TaskPerformancePanel';
import { ProjectSelector } from '../../../shared/ProjectSelector';
import { ConcentrationPanel } from './ConcentrationPanel';
import { PitchDeck } from './PitchDeck';
import { UnifiedReportRenderer } from './UnifiedReportRenderer';

interface ReportViewProps {
    // New Props
    sections: ReportSection[];
    onSectionsChange?: (sections: ReportSection[]) => void;
    chartData: ChartData;

    // Legacy / Shared Props
    p1Name: string;
    p2Name: string;
    onRegenerate: (msg: string) => void;
    isRegenerating: boolean;
    dashboardStats?: DashboardStats;
    logo?: string | null;
    onSave: (currentSections?: ReportSection[]) => void;
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

export const ReportView: React.FC<ReportViewProps> = ({
    sections,
    onSectionsChange,
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
    // Pitch Mode Logic (Simplified extraction from sections)
    const [pitchItems, setPitchItems] = React.useState<{ type: string; url: string; title?: string }[]>([]);

    useEffect(() => {
        if (mode === 'pitch' && sections) {
            // Extract charts from sections
            const items: any[] = [];
            sections.forEach(s => {
                if (s.chartConfig) {
                    items.push({
                        type: s.chartConfig.type,
                        url: s.chartConfig.filter?.urlIncludes || 'general',
                        title: s.chartConfig.title
                    });
                }
            });
            setPitchItems(items);
        }
    }, [mode, sections]);

    if (mode === 'pitch' && pitchItems.length > 0) {
        return <PitchDeck chartItems={pitchItems} chartData={chartData} onClose={() => window.location.reload()} />;
    }

    // -- Section Integration Logic --
    // Ensure system charts are present in the sections list
    useEffect(() => {
        if (!sections || isSaving || isRegenerating) return;

        const hasKpi = sections.some(s => s.customComponent === 'kpi-main');

        if (!hasKpi && dashboardStats) {
            console.log("Injecting system sections into report...");

            const newSections = [...sections];

            // 1. KPI Grid (Always First)
            const kpiSection: ReportSection = {
                id: 'sys-kpi-main',
                type: 'custom-component',
                customComponent: 'kpi-main',
                title: 'Métricas Generales',
                isEditable: false,
                order: 0
            };

            // 2. Trend & Donuts (After Exec Summary - assumed to be first section)
            // If first section exists, we insert after it. If not, just append.
            const trendSection: ReportSection = {
                id: 'sys-trend', type: 'custom-component', customComponent: 'trend-chart', title: 'Tendencia Temporal', isEditable: false, order: 0
            };
            const donutSection: ReportSection = {
                id: 'sys-donuts', type: 'custom-component', customComponent: 'segment-donuts', title: 'Segmentación', isEditable: false, order: 0
            };
            const taskSection: ReportSection = {
                id: 'sys-task', type: 'custom-component', customComponent: 'task-performance', title: 'Inteligencia de Tareas', isEditable: false, order: 0
            };
            const concSection: ReportSection = {
                id: 'sys-conc', type: 'custom-component', customComponent: 'concentration-map', title: 'Mapa de Concentración', isEditable: false, order: 0
            };

            // Construction: [KPI, (First Section / Exec Summary), Trend, Donuts, Task, Concentration, ...Rest]

            const firstSection = newSections.length > 0 ? newSections[0] : null;
            const restSections = newSections.length > 1 ? newSections.slice(1) : [];

            const assembled = [
                kpiSection,
                ...(firstSection ? [firstSection] : []),
                trendSection,
                donutSection,
                taskSection,
                concSection,
                ...restSections
            ];

            // Re-index orders
            const ordered = assembled.map((s, i) => ({ ...s, order: i }));

            if (onSectionsChange) {
                onSectionsChange(ordered);
            }
        }
    }, [sections, dashboardStats, isSaving, isRegenerating]);

    return (
        <div className="max-w-[1200px] mx-auto py-12 px-6 sm:px-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
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
                        onClick={() => onSave(sections)}
                        disabled={isSaving || hasSaved}
                        className={`px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-2 text-white ${hasSaved ? 'bg-emerald-500 cursor-default' : 'bg-indigo-600 hover:bg-indigo-700'} `}
                    >
                        {isSaving ? 'Guardando...' : hasSaved ? '✅ Guardado' : '☁️ Guardar'}
                    </button>
                </div>
            </div>

            {/* Dashboard Visuals - REMOVED (Integrated into Report) */}
            {/* Magazine Layout: Integrated Visuals - REMOVED (Integrated into Report) */}
            <div className="space-y-12">
                {/* Visuals Row (Task Impact & Concentration) - REMOVED */}


                {/* Main Content Area - UNIFIED RENDERER */}
                <div className="relative min-h-[500px]">
                    <UnifiedReportRenderer
                        sections={sections}
                        chartData={chartData}
                        onSectionsChange={onSectionsChange}
                        // Context for custom components
                        dashboardStats={dashboardStats}
                        taskPerformance={taskPerformance}
                        concentrationAnalysis={concentrationAnalysis}
                        user={user}
                        decayAlerts={decayAlerts}
                    />
                </div>

                {/* AI Prompt Bar (Floating) */}
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 print:hidden">
                    <div className="bg-white/90 backdrop-blur-xl shadow-2xl border border-indigo-100 rounded-full p-2 pl-6 flex items-center gap-3 ring-1 ring-slate-900/5 transition-all hover:scale-[1.01]">
                        <input
                            placeholder="Pide ajustes a la IA (ej. 'Agrega un gráfico de tráfico de blog')..."
                            className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-700 h-10"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isRegenerating) {
                                    onRegenerate((e.target as HTMLInputElement).value);
                                    (e.target as HTMLInputElement).value = '';
                                }
                            }}
                        />
                        <button
                            disabled={isRegenerating}
                            className="h-10 px-6 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                            {isRegenerating ? '...' : 'Enviar'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};


