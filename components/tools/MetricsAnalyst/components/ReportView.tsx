import React, { useEffect, useRef } from 'react';
import { ChartData, ReportSection, UsageMode, TaskPerformance, DashboardStats } from '../types';
import { TaskPerformancePanel } from './TaskPerformancePanel';
import { Dashboard } from './Dashboard';
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
                        onClick={() => onSave(sections)}
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

                {/* Main Content Area - UNIFIED RENDERER */}
                <div className="relative min-h-[500px]">
                    <UnifiedReportRenderer
                        sections={sections}
                        chartData={chartData}
                        onSectionsChange={onSectionsChange}
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


