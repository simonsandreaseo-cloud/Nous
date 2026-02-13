'use client';

import { useState } from 'react';
import { X, BarChart3, TrendingUp, PieChart, Plus, Loader2, Search, FileText, Table as TableIcon, Layout, ScatterChart } from 'lucide-react';
import { generateInsightDataAction } from '@/app/actions/report-actions';

interface InsightBuilderProps {
    onInsert: (config: InsightConfig) => void;
    onClose: () => void;
    projectId?: string;
    dateRange?: { start: string, end: string };
}

export interface InsightConfig {
    type: 'insight';
    data: any;
    options: {
        visualization: 'bubble' | 'bar' | 'line' | 'table' | 'text';
        includeTable: boolean;
        includeMetrics: boolean;
        includeAI: boolean;
        aiInstructions: string;
        placement: 'new_slide' | 'current_slide';
        comparison: 'none' | 'prev_period' | 'year';
        limit: number;
        title: string;
        regexFilter?: string;
    };
}

export function InsightBuilder({ onInsert, onClose, projectId, dateRange }: InsightBuilderProps) {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Config State
    const [itemsText, setItemsText] = useState('');
    const [inputType, setInputType] = useState<'page' | 'query'>('page');
    const [visualization, setVisualization] = useState<'bubble' | 'bar' | 'line' | 'table' | 'text'>('bubble');
    const [includeTable, setIncludeTable] = useState(false);
    const [includeMetrics, setIncludeMetrics] = useState(true);
    const [includeAI, setIncludeAI] = useState(false);
    const [aiInstructions, setAiInstructions] = useState('');
    const [placement, setPlacement] = useState<'new_slide' | 'current_slide'>('new_slide');
    const [comparison, setComparison] = useState<'none' | 'prev_period' | 'year'>('prev_period');
    const [limit, setLimit] = useState(10);
    const [title, setTitle] = useState('');
    const [regexFilter, setRegexFilter] = useState('');

    const handleGenerate = async () => {
        if (!projectId || !dateRange || (!itemsText && !regexFilter)) return;
        setIsLoading(true);

        const items = itemsText.split('\n').map(s => s.trim()).filter(Boolean);

        try {
            const res = await generateInsightDataAction(projectId, dateRange, items, inputType, {
                comparison,
                limit,
                regexFilter
            });

            if (res.success && res.data) {
                // Success! Pass data to parent to render
                onInsert({
                    type: 'insight',
                    data: res.data,
                    options: {
                        visualization,
                        includeTable,
                        includeMetrics,
                        includeAI,
                        aiInstructions,
                        placement,
                        comparison,
                        limit,
                        title: title || `Análisis de ${items.length || 'Regex'} ${inputType === 'page' ? 'URLs' : 'Queries'}`,
                        regexFilter
                    }
                });
                onClose();
            } else {
                alert("Error: " + (res.error || "No se pudieron generar datos."));
            }
        } catch (e: any) {
            alert("Error de conexión: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <Layout size={18} className="text-purple-600" />
                        Constructor de Secciones
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={18} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-2 gap-8">
                    {/* Left Column: Input */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">1. Datos</h4>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">Entidad a Analizar</label>
                            <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                                <button onClick={() => setInputType('page')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${inputType === 'page' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500'}`}>URLs</button>
                                <button onClick={() => setInputType('query')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${inputType === 'query' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500'}`}>Keywords</button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">Lista de Items (una por línea)</label>
                            <textarea
                                value={itemsText}
                                onChange={e => setItemsText(e.target.value)}
                                className="w-full h-24 p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-200 outline-none resize-none font-mono"
                                placeholder={inputType === 'page' ? "https://site.com/A\nhttps://site.com/B" : "keyword 1\nkeyword 2"}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">Filtrar por Expresión Regular (Regex)</label>
                            <input
                                type="text"
                                value={regexFilter}
                                onChange={e => setRegexFilter(e.target.value)}
                                className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-200 outline-none font-mono"
                                placeholder="Ej: /blog/.* o ^zapatos"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Opcional: Si se aplica, se combinará con la lista de arriba.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">Periodo Comparativo</label>
                            <select
                                value={comparison}
                                onChange={(e: any) => setComparison(e.target.value)}
                                className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none"
                            >
                                <option value="prev_period">vs Periodo Anterior</option>
                                <option value="year">vs Año Anterior</option>
                                <option value="none">Sin Comparación</option>
                            </select>
                        </div>
                    </div>

                    {/* Right Column: Visualization & Options */}
                    <div className="space-y-6">
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">2. Visualización</h4>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">Gráfico Principal</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => setVisualization('bubble')} className={`p-2 border rounded-lg flex flex-col items-center gap-1 ${visualization === 'bubble' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                                    <ScatterChart size={20} /> <span className="text-[10px] font-bold">Burbujas</span>
                                </button>
                                <button onClick={() => setVisualization('bar')} className={`p-2 border rounded-lg flex flex-col items-center gap-1 ${visualization === 'bar' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                                    <BarChart3 size={20} /> <span className="text-[10px] font-bold">Barras</span>
                                </button>
                                <button onClick={() => setVisualization('line')} className={`p-2 border rounded-lg flex flex-col items-center gap-1 ${visualization === 'line' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                                    <TrendingUp size={20} /> <span className="text-[10px] font-bold">Tendencia</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="incTable" checked={includeTable} onChange={e => setIncludeTable(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500" />
                                <label htmlFor="incTable" className="text-sm text-slate-700">Incluir Tabla de Datos</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="incMet" checked={includeMetrics} onChange={e => setIncludeMetrics(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500" />
                                <label htmlFor="incMet" className="text-sm text-slate-700">Incluir Métricas Generales (Resumen)</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="incAI" checked={includeAI} onChange={e => setIncludeAI(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500" />
                                <label htmlFor="incAI" className="text-sm text-slate-700">Incluir Análisis IA</label>
                            </div>
                        </div>

                        {includeAI && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Instrucciones para IA (Opcional)</label>
                                <textarea
                                    value={aiInstructions}
                                    onChange={e => setAiInstructions(e.target.value)}
                                    className="w-full h-20 p-2 text-xs border border-slate-300 rounded-lg resize-none"
                                    placeholder="Ej: Enfócate en las oportunidades con mas de 1000 impresiones..."
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Límite Items</label>
                                <input type="number" value={limit} onChange={e => setLimit(Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Ubicación</label>
                                <select value={placement} onChange={(e: any) => setPlacement(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm text-slate-700 outline-none">
                                    <option value="new_slide">Nueva Diapositiva</option>
                                    <option value="current_slide">Diapositiva Actual</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-slate-50 flex justify-end gap-3">
                    <input
                        value={title} onChange={e => setTitle(e.target.value)}
                        placeholder="Título de la Sección (Opcional)"
                        className="flex-1 p-2 border border-slate-300 rounded-lg text-sm"
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || (!itemsText && !regexFilter)}
                        className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Generar</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
