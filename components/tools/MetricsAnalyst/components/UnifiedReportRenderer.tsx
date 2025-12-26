import React, { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ReportSection, ChartData } from '../types';
import { DynamicChart } from './DynamicChart';
import { TrendChartPanel } from './TrendChartPanel';
import { SegmentDonutsPanel } from './SegmentDonutsPanel';
import { TaskPerformancePanel } from './TaskPerformancePanel';
import { ConcentrationPanel } from './ConcentrationPanel';
import { KPIGridPanel } from './KPIGridPanel';
import { Trash2, Move, Edit2, Plus, GripVertical, type LucideIcon } from 'lucide-react';
import ContentEditable from 'react-contenteditable';
import { TaskPerformance, DashboardStats } from '../types';

interface UnifiedReportRendererProps {
    sections: ReportSection[];
    chartData: ChartData | null;
    isReadOnly?: boolean;
    onSectionsChange?: (newSections: ReportSection[]) => void;
    // Context Data for Custom Components
    taskPerformance?: TaskPerformance[];
    concentrationAnalysis?: any;
    dashboardStats?: DashboardStats;
    user?: any;
    decayAlerts?: any[];
}

export const UnifiedReportRenderer: React.FC<UnifiedReportRendererProps> = ({
    sections,
    chartData,
    isReadOnly = false,
    onSectionsChange,
    taskPerformance,
    concentrationAnalysis,
    dashboardStats,
    user,
    decayAlerts
}) => {
    // Local state for optimistic updates
    const [localSections, setLocalSections] = useState<ReportSection[]>(sections);

    useEffect(() => {
        setLocalSections(sections);
    }, [sections]);

    const handleDragEnd = (result: any) => {
        if (!result.destination || isReadOnly || !onSectionsChange) return;

        const items = Array.from(localSections);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Update order field
        const updated = items.map((item, index) => ({ ...item, order: index }));

        setLocalSections(updated);
        onSectionsChange(updated);
    };

    const handleContentChange = (id: string, newContent: string) => {
        if (isReadOnly || !onSectionsChange) return;
        const updated = localSections.map(s => s.id === id ? { ...s, content: newContent } : s);
        // Debounce actual parent update could be good, but for now direct update
        setLocalSections(updated);
        // Pass up
        onSectionsChange(updated);
    };

    const handleDelete = (id: string) => {
        if (isReadOnly || !onSectionsChange) return;
        if (!confirm("¿Eliminar esta sección?")) return;
        const updated = localSections.filter(s => s.id !== id);
        setLocalSections(updated);
        onSectionsChange(updated);
    };

    const handleAddSection = (index: number) => {
        if (isReadOnly || !onSectionsChange) return;
        const newSection: ReportSection = {
            id: `manual-${Date.now()}`,
            type: 'text',
            title: 'Nueva Sección',
            content: '<p>Escribe tu análisis aquí...</p>',
            order: index + 1,
            isEditable: true
        };
        const items = Array.from(localSections);
        items.splice(index + 1, 0, newSection);
        const updated = items.map((item, idx) => ({ ...item, order: idx }));
        setLocalSections(updated);
        onSectionsChange(updated);
    };

    // --- RENDERERS ---

    const renderHeader = (section: ReportSection) => (
        <div className="flex items-center justify-between mb-4 group relative">
            <div className="flex items-center gap-3 w-full">
                {!isReadOnly && (
                    <div {...(section as any).dragHandleProps} className="cursor-grab text-slate-300 hover:text-slate-600">
                        <GripVertical size={20} />
                    </div>
                )}
                {/* Title Editable */}
                {isReadOnly ? (
                    <h2 className="text-2xl font-bold text-slate-800">{section.title}</h2>
                ) : (
                    <input
                        value={section.title}
                        onChange={(e) => {
                            const updated = localSections.map(s => s.id === section.id ? { ...s, title: e.target.value } : s);
                            setLocalSections(updated);
                            onSectionsChange?.(updated);
                        }}
                        className="text-2xl font-bold text-slate-800 bg-transparent border-none outline-none focus:ring-2 focus:ring-indigo-200 rounded px-2 w-full"
                    />
                )}
            </div>
            {!isReadOnly && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button onClick={() => handleDelete(section.id)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>
            )}
        </div>
    );

    const renderContent = (section: ReportSection) => {
        if (section.type === 'kpi-grid' && section.kpiConfig && Array.isArray(section.kpiConfig.items)) {
            return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {section.kpiConfig.items.map((kpi, i) => (
                        <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</div>
                            <div className="text-2xl font-black text-slate-900 flex items-end gap-2">
                                {kpi.prefix}{kpi.value}{kpi.suffix}
                                {kpi.trend !== undefined && (
                                    <span className={`text-xs font-bold mb-1 ${kpi.trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {kpi.trend > 0 ? '+' : ''}{kpi.trend}%
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (section.type === 'custom-component') {
            const renderCustomComponent = () => {
                switch (section.customComponent) {
                    case 'kpi-main':
                        return dashboardStats ? <KPIGridPanel stats={dashboardStats} /> : <p className="text-rose-500">Datos de KPI no disponibles</p>;
                    case 'trend-chart':
                        return dashboardStats ? <TrendChartPanel stats={dashboardStats} /> : <p className="text-rose-500">Datos de tendencia no disponibles</p>;
                    case 'segment-donuts':
                        return dashboardStats ? <SegmentDonutsPanel stats={dashboardStats} /> : <p className="text-rose-500">Datos de segmentos no disponibles</p>;
                    case 'task-performance':
                        return (taskPerformance && taskPerformance.length > 0 && user)
                            ? <TaskPerformancePanel taskPerformance={taskPerformance} decayAlerts={decayAlerts || []} user={user} />
                            : <p className="text-slate-400 italic">No hay tareas activas para analizar.</p>;
                    case 'concentration-map':
                        return concentrationAnalysis
                            ? <ConcentrationPanel clickConcentration={concentrationAnalysis.clickConcentration} impressionConcentration={concentrationAnalysis.impressionConcentration} />
                            : <p className="text-rose-500">Análisis de concentración no disponible</p>;
                    default:
                        return <p className="text-slate-400">Componente personalizado no reconocido: {section.customComponent}</p>;
                }
            };

            return (
                <div className="space-y-6">
                    {/* The Chart/Component */}
                    {renderCustomComponent()}

                    {/* The Analysis Content */}
                    {(section.content || !isReadOnly) && (
                        <div className="prose prose-slate max-w-none pt-4 border-t border-slate-100">
                            {isReadOnly ? (
                                <div dangerouslySetInnerHTML={{ __html: section.content || '' }} />
                            ) : (
                                <ContentEditable
                                    html={section.content || '<p class="text-slate-400 italic">Añadir análisis aquí...</p>'}
                                    disabled={false}
                                    onChange={(e) => handleContentChange(section.id, e.target.value)}
                                    className="outline-none focus:ring-2 focus:ring-indigo-50/50 rounded p-2 min-h-[60px]"
                                />
                            )}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="prose prose-slate max-w-none">
                {isReadOnly ? (
                    <div dangerouslySetInnerHTML={{ __html: section.content || '' }} />
                ) : (
                    <ContentEditable
                        html={section.content || ''}
                        disabled={false}
                        onChange={(e) => handleContentChange(section.id, e.target.value)}
                        className="outline-none focus:ring-2 focus:ring-indigo-50/50 rounded p-2 min-h-[100px]"
                    />
                )}

                {section.chartConfig && chartData && (
                    <div className="mt-8 h-80">
                        <DynamicChart config={section.chartConfig} chartData={chartData} />
                    </div>
                )}
            </div>
        );
    };

    if (isReadOnly) {
        return (
            <div className="space-y-12 max-w-5xl mx-auto">
                {localSections.map((section) => (
                    <div key={section.id} className="animate-fade-in">
                        {section.title && <h2 className="text-2xl font-bold text-slate-800 mb-6">{section.title}</h2>}
                        {renderContent(section)}
                    </div>
                ))}
            </div>
        )
    }

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="report-sections">
                {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-8 max-w-5xl mx-auto pb-40">
                        {localSections.map((section, index) => (
                            <Draggable key={section.id} draggableId={section.id} index={index}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`bg-white/90 backdrop-blur-sm p-8 rounded-2xl border transition-all duration-300 relative group
                                            ${snapshot.isDragging ? 'shadow-2xl scale-[1.02] border-indigo-500 ring-4 ring-indigo-500/10 z-50' : 'shadow-lg shadow-indigo-100/40 border-slate-200/60 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-200/40'}
                                        `}
                                    >
                                        <div {...provided.dragHandleProps}>
                                            {renderHeader(section)}
                                        </div>

                                        {renderContent(section)}

                                        {/* Add Button Below */}
                                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <button
                                                onClick={() => handleAddSection(index)}
                                                className="bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                                                title="Insertar Sección Debajo"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}

                        {/* Empty State / Start */}
                        {localSections.length === 0 && (
                            <div className="text-center py-20 border-3 border-dashed border-slate-200 rounded-[2rem] bg-slate-50">
                                <p className="text-slate-400 mb-4 font-bold">Tu informe está vacío</p>
                                <button onClick={() => handleAddSection(-1)} className="text-indigo-600 font-bold hover:underline">
                                    + Crear primera sección
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
};
