'use client';

import { useState } from 'react';
import { X, BarChart3, TrendingUp, PieChart, Plus, Loader2, Search } from 'lucide-react';
import { calculateCustomChartDataAction } from "@/app/node-tasks/report-actions";

interface ChartBuilderProps {
    onInsert: (chartType: string, chartConfig?: any) => void;
    onClose: () => void;
    projectId?: string;
    dateRange?: { start: string, end: string };
}

export function ChartBuilder({ onInsert, onClose, projectId, dateRange }: ChartBuilderProps) {
    const [tab, setTab] = useState<'presets' | 'custom' | 'dynamic'>('presets');
    const [customType, setCustomType] = useState<'bar' | 'line' | 'pie'>('bar');

    // Manual Data State
    const [labels, setLabels] = useState<string>('');
    const [dataPoints, setDataPoints] = useState<string>('');
    const [chartTitle, setChartTitle] = useState('');

    // Dynamic Data State
    const [dynamicItems, setDynamicItems] = useState('');
    const [dynamicType, setDynamicType] = useState<'page' | 'query'>('page');
    const [isLoadingDynamic, setIsLoadingDynamic] = useState(false);

    const handleInsertCustom = () => {
        if (!labels || !dataPoints) return;

        const config = {
            title: chartTitle,
            type: customType,
            labels: labels.split(',').map(s => s.trim()),
            data: dataPoints.split(',').map(s => parseFloat(s.trim()))
        };
        onInsert('custom', config);
    };

    const handleGenerateDynamic = async () => {
        if (!projectId || !dateRange || !dynamicItems) return;
        setIsLoadingDynamic(true);

        const items = dynamicItems.split('\n').map(s => s.trim()).filter(Boolean);

        try {
            const res = await calculateCustomChartDataAction(projectId, dateRange, items, dynamicType);
            if (res.success && res.config) {
                // Auto-fill custom fields or just insert directly?
                // Use custom type to render it.
                onInsert('custom', res.config);
                onClose(); // Optional: Close after success
            } else {
                alert("Error: " + (res.error || "No se pudieron generar datos."));
            }
        } catch (e: any) {
            alert("Error de conexión: " + e.message);
        } finally {
            setIsLoadingDynamic(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <BarChart3 size={18} className="text-purple-600" />
                        Insertar Gráfico
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={18} className="text-slate-500" />
                    </button>
                </div>

                <div className="flex border-b border-gray-100 text-sm">
                    <button
                        onClick={() => setTab('presets')}
                        className={`flex-1 py-3 text-center font-medium ${tab === 'presets' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Métricas SEO
                    </button>
                    <button
                        onClick={() => setTab('dynamic')}
                        className={`flex-1 py-3 text-center font-medium ${tab === 'dynamic' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Dinámico GSC
                    </button>
                    <button
                        onClick={() => setTab('custom')}
                        className={`flex-1 py-3 text-center font-medium ${tab === 'custom' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Manual
                    </button>
                </div>

                <div className="p-6">
                    {tab === 'presets' && (
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => onInsert('trend')}
                                className="p-4 border border-slate-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all text-left group"
                            >
                                <div className="bg-purple-100 w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-purple-600 group-hover:scale-110 transition-transform">
                                    <TrendingUp size={20} />
                                </div>
                                <div className="font-bold text-slate-700">Tendencia Mensual</div>
                                <div className="text-xs text-slate-500 mt-1">Comparativa 28 días vs Anterior (Línea)</div>
                            </button>

                            <button
                                onClick={() => onInsert('clicks')}
                                className="p-4 border border-slate-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all text-left group"
                            >
                                <div className="bg-green-100 w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-green-600 group-hover:scale-110 transition-transform">
                                    <BarChart3 size={20} />
                                </div>
                                <div className="font-bold text-slate-700">Top Ganadores</div>
                                <div className="text-xs text-slate-500 mt-1">URLs con mayor crecimiento (Barras)</div>
                            </button>

                            <button
                                onClick={() => onInsert('losers')}
                                className="p-4 border border-slate-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition-all text-left group"
                            >
                                <div className="bg-red-100 w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-red-600 group-hover:scale-110 transition-transform">
                                    <BarChart3 size={20} />
                                </div>
                                <div className="font-bold text-slate-700">Caídas y Riesgos</div>
                                <div className="text-xs text-slate-500 mt-1">URLs con pérdidas de tráfico (Barras)</div>
                            </button>
                        </div>
                    )}

                    {tab === 'dynamic' && (
                        <div className="space-y-4">
                            {!projectId ? (
                                <div className="p-4 bg-red-50 text-red-600 text-xs rounded-lg">
                                    Error: No hay proyecto activo detectado.
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-2">Analizar por:</label>
                                        <div className="flex gap-2">
                                            <button onClick={() => setDynamicType('page')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${dynamicType === 'page' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'border-slate-200'}`}>URLs Específicas</button>
                                            <button onClick={() => setDynamicType('query')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${dynamicType === 'query' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'border-slate-200'}`}>Keywords</button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-2">
                                            Lista de {dynamicType === 'page' ? 'URLs' : 'Keywords'} (una por línea)
                                        </label>
                                        <textarea
                                            value={dynamicItems}
                                            onChange={e => setDynamicItems(e.target.value)}
                                            className="w-full h-32 p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-200 outline-none resize-none font-mono"
                                            placeholder={dynamicType === 'page' ? "https://site.com/blog/post-1\nhttps://site.com/products/item-2" : "comprar zapatos\nzapatos baratos\nmejores zapatos 2024"}
                                        />
                                    </div>

                                    <button
                                        onClick={handleGenerateDynamic}
                                        disabled={isLoadingDynamic || !dynamicItems}
                                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isLoadingDynamic ? <Loader2 size={16} className="animate-spin" /> : <><Search size={16} /> Generar Gráfico</>}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {tab === 'custom' && (
                        <div className="space-y-4">
                            {/* Type Selector */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">Tipo de Gráfico</label>
                                <div className="flex gap-2">
                                    {(['bar', 'line', 'pie'] as const).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setCustomType(t)}
                                            className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg border ${customType === t
                                                ? 'bg-purple-100 border-purple-200 text-purple-700'
                                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                                }`}
                                        >
                                            {t === 'bar' && 'Barras'}
                                            {t === 'line' && 'Línea'}
                                            {t === 'pie' && 'Circular'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Título del Gráfico</label>
                                <input
                                    value={chartTitle} onChange={e => setChartTitle(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm" placeholder="Ej: Proyección Q3"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Etiquetas (separar por comas)</label>
                                <input
                                    value={labels} onChange={e => setLabels(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm" placeholder="Ene, Feb, Mar, Abr"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Datos (separar por comas)</label>
                                <input
                                    value={dataPoints} onChange={e => setDataPoints(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm" placeholder="10, 25, 40, 35"
                                />
                            </div>

                            <button
                                onClick={handleInsertCustom}
                                className="w-full py-2 bg-slate-900 text-white rounded-lg font-bold text-sm mt-2 hover:bg-slate-800"
                            >
                                Insertar Gráfico Manual
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
