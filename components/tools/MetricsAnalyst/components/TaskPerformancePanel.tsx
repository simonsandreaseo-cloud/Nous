import React, { useState } from 'react';
import { TaskPerformance, ComparisonItem } from '../types';
import { supabase } from '../../../../lib/supabase';

interface TaskPerformancePanelProps {
    taskPerformance: TaskPerformance[];
    decayAlerts: any[]; // Using any for now to map from chart/report payload helpers
    user?: any;
}

export const TaskPerformancePanel: React.FC<TaskPerformancePanelProps> = ({ taskPerformance, decayAlerts, user }) => {
    const [activeTab, setActiveTab] = useState<'watchlist' | 'decay'>('watchlist');
    const [isCreating, setIsCreating] = useState<string | null>(null);

    const [isSyncing, setIsSyncing] = useState(false);

    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const showMessage = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 4000);
    };

    const handleCreateTask = async (item: any) => {
        if (!user) return showMessage("Debes iniciar sesión.", 'error');
        setIsCreating(item.keyword || item.url);

        try {
            const title = `Optimizar Decay: ${item.keyword || item.url}`;
            const description = `Detectada caída de tráfico/posición en informe SEO.\n\nKeyword: ${item.keyword}\nPosición Anterior: ${item.positionP1}\nPosición Actual: ${item.positionP2}\nCambio: ${item.positionChange}`;

            const { error } = await supabase.from('tasks').insert({
                title,
                description,
                status: 'todo',
                project_id: null, // Global task or prompt user? For now global.
                user_id: user.id
            });

            if (error) throw error;
            showMessage("Tarea creada y añadida al tablero.", 'success');
        } catch (e: any) {
            showMessage("Error al crear tarea: " + e.message, 'error');
        } finally {
            setIsCreating(null);
        }
    };

    const handleSync = async () => {
        if (!user) return showMessage("Debes iniciar sesión.", 'error');
        // We keep confirm for bulk actions as it's good practice
        if (!confirm(`¿Sincronizar métricas actualizadas en ${taskPerformance.length} tareas? Esto añadirá un log en la descripción de cada tarea.`)) return;

        setIsSyncing(true);
        let updated = 0;
        try {
            for (const task of taskPerformance) {
                // 1. Fetch current description
                const { data: currentTask, error: fetchError } = await supabase.from('tasks').select('description').eq('id', task.taskId).single();
                if (fetchError) continue;

                const dateStr = new Date().toLocaleDateString();
                const newLog = `\n\n[Sync GSC ${dateStr}]\nClicks: ${task.metrics.clicks} (${task.comparison.clicksChange > 0 ? '+' : ''}${task.comparison.clicksChange})\nImp: ${task.metrics.impressions}\nPos: ${task.metrics.position.toFixed(1)}`;

                const newDesc = (currentTask.description || '') + newLog;

                const { error: updateError } = await supabase.from('tasks').update({ description: newDesc }).eq('id', task.taskId);
                if (!updateError) updated++;
            }
            showMessage(`Sincronización completada. ${updated} tareas actualizadas.`, 'success');
        } catch (e: any) {
            console.error(e);
            showMessage("Error durante la sincronización.", 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    // Helper for trend badge
    const TrendBadge = ({ value, type = 'moreIsBetter', suffix = '' }: { value: number, type?: 'moreIsBetter' | 'lessIsBetter', suffix?: string }) => {
        if (value === 0) return <span className="text-slate-400 font-mono text-xs">-</span>;

        const isGood = type === 'moreIsBetter' ? value > 0 : value < 0;
        const colorClass = isGood
            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
            : 'bg-rose-50 text-rose-600 border-rose-100';

        return (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${colorClass}`}>
                {value > 0 ? '↗' : '↘'} {Math.abs(value).toFixed(type === 'lessIsBetter' ? 1 : 0)}{suffix}
            </span>
        );
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-8 no-print relative overflow-hidden">
            {/* Decorative top border */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

            {/* Feedback Toast */}
            {message && (
                <div className={`absolute top-4 right-4 px-4 py-2 rounded-lg text-xs font-bold shadow-lg animate-fade-in z-20 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {message.type === 'success' ? '✨' : '⚠️'} {message.text}
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-indigo-600 shadow-sm">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Inteligencia de Tareas</h3>
                        <p className="text-sm text-slate-500">Monitoeor de impacto SEO en tareas activas</p>
                    </div>
                </div>

                <div className="flex bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <button
                        onClick={() => setActiveTab('watchlist')}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition flex items-center gap-2 ${activeTab === 'watchlist' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <span>📋</span> Tareas Activas ({taskPerformance.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('decay')}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition flex items-center gap-2 ${activeTab === 'decay' ? 'bg-white text-rose-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <span>📉</span> Alertas Decay ({decayAlerts.length})
                    </button>
                    {activeTab === 'watchlist' && taskPerformance.length > 0 && (
                        <div className="w-px h-6 bg-slate-200 mx-2 self-center"></div>
                    )}
                    {activeTab === 'watchlist' && taskPerformance.length > 0 && (
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className={`px-4 py-2 rounded-md text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition`}
                        >
                            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'watchlist' && (
                <div className="overflow-hidden rounded-xl border border-slate-100">
                    {taskPerformance.length === 0 ? (
                        <div className="text-center py-12 px-4 bg-slate-50/50">
                            <div className="inline-block p-4 rounded-full bg-slate-100 mb-4 tex-slate-300">🔍</div>
                            <p className="text-slate-500 font-medium">No se encontraron tareas activas vinculadas.</p>
                            <p className="text-slate-400 text-sm">Vincula URLs en tus tareas para ver su rendimiento aquí.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-100">
                                <tr>
                                    <th className="p-4 pl-6">Tarea</th>
                                    <th className="p-4">Recurso</th>
                                    <th className="p-4 text-right">Clics</th>
                                    <th className="p-4 text-right">Impresiones</th>
                                    <th className="p-4 text-right">Posición</th>
                                    <th className="p-4 text-right header-ga4 text-indigo-600">Sesiones</th>
                                    <th className="p-4 text-right header-ga4 text-indigo-600">Retención</th>
                                    <th className="p-4 text-right header-ga4 text-indigo-600">Rebote</th>
                                    <th className="p-4 pr-6 text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                                {taskPerformance.map((task) => (
                                    <tr key={task.taskId} className="hover:bg-indigo-50/30 transition group">
                                        <td className="p-4 pl-6">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-700 text-sm group-hover:text-indigo-600 transition">{task.taskTitle}</span>
                                                <span className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {task.taskId}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="max-w-[180px] truncate text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200" title={task.url}>
                                                {task.url.replace('https://', '').replace('www.', '')}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="font-bold text-slate-700 text-sm">{task.metrics.clicks.toLocaleString()}</div>
                                            <TrendBadge value={task.comparison.clicksChange} />
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="font-bold text-slate-700 text-sm">{task.metrics.impressions.toLocaleString()}</div>
                                            <TrendBadge value={task.comparison.impressionsChange} />
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="font-bold text-slate-700 text-sm">{task.metrics.position.toFixed(1)}</div>
                                            <TrendBadge value={task.comparison.positionChange} type="lessIsBetter" />
                                        </td>
                                        <td className="p-4 text-right bg-indigo-50/20">
                                            <div className="font-bold text-indigo-900 text-sm">{task.metrics.sessions?.toLocaleString() || '-'}</div>
                                        </td>
                                        <td className="p-4 text-right bg-indigo-50/20">
                                            <div className="font-bold text-indigo-900 text-sm">{task.metrics.avgDuration ? task.metrics.avgDuration.toFixed(0) + 's' : '-'}</div>
                                        </td>
                                        <td className="p-4 text-right bg-indigo-50/20">
                                            <div className="font-bold text-indigo-900 text-sm">{task.metrics.bounceRate ? (task.metrics.bounceRate * 100).toFixed(0) + '%' : '-'}</div>
                                        </td>
                                        <td className="p-4 pr-6 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${task.status === 'growth' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                task.status === 'decay' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                                                    'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${task.status === 'growth' ? 'bg-emerald-500' : task.status === 'decay' ? 'bg-rose-500' : 'bg-slate-400'}`}></span>
                                                {task.status === 'growth' ? 'Growth' : task.status === 'decay' ? 'Risk' : 'Stable'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'decay' && (
                <div className="overflow-hidden rounded-xl border border-slate-100">
                    {decayAlerts.length === 0 ? (
                        <div className="text-center py-12 px-4 bg-emerald-50/30">
                            <div className="inline-block p-4 rounded-full bg-emerald-100 mb-4 text-emerald-500">🛡️</div>
                            <p className="text-emerald-900 font-medium">Todo bajo control</p>
                            <p className="text-emerald-600/70 text-sm">No se han detectado caídas significativas de keywords.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-100">
                                <tr>
                                    <th className="p-4 pl-6">Keyword Afectada</th>
                                    <th className="p-4 text-right">Pos. Anterior</th>
                                    <th className="p-4 text-right">Pos. Actual</th>
                                    <th className="p-4 text-right">Impacto</th>
                                    <th className="p-4 pr-6 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                                {decayAlerts.map((alert, idx) => (
                                    <tr key={idx} className="hover:bg-rose-50/30 transition group">
                                        <td className="p-4 pl-6">
                                            <div className="font-bold text-slate-700 text-sm">{alert.keyword || alert.name}</div>
                                            {alert.url && <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{alert.url}</div>}
                                        </td>
                                        <td className="p-4 text-right text-slate-400 font-mono text-xs">{alert.positionP1?.toFixed(1) || '-'}</td>
                                        <td className="p-4 text-right text-slate-800 font-bold font-mono text-xs">{alert.positionP2?.toFixed(1) || '-'}</td>
                                        <td className="p-4 text-right">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-100 text-rose-700 text-[11px] font-bold">
                                                ▼ {Math.abs(alert.positionChange?.toFixed(1) || 0)}
                                            </span>
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            <button
                                                onClick={() => handleCreateTask(alert)}
                                                disabled={isCreating === (alert.keyword || alert.name)}
                                                className="bg-white border border-slate-200 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg font-semibold text-[11px] transition disabled:opacity-50 shadow-sm"
                                            >
                                                {isCreating === (alert.keyword || alert.name) ? 'Creando...' : '+ Crear Tarea'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};
