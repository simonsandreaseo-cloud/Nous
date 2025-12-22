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

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-8 no-print relative group">
            {/* Feedback Toast */}
            {message && (
                <div className={`absolute top-4 right-4 px-4 py-2 rounded-lg text-xs font-bold shadow-lg animate-fade-in z-10 ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                    {message.type === 'success' ? '✅' : '❌'} {message.text}
                </div>
            )}

            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Inteligencia de Tareas</h3>
                        <p className="text-xs text-slate-500">Sincronización con tablero de proyectos</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('watchlist')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${activeTab === 'watchlist' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Tareas Activas ({taskPerformance.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('decay')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${activeTab === 'decay' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Alertas Decay ({decayAlerts.length})
                    </button>
                    {activeTab === 'watchlist' && taskPerformance.length > 0 && (
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className={`ml-2 px-3 py-1.5 rounded-md text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50`}
                        >
                            {isSyncing ? 'Sincronizando...' : 'Sincronizar todo'}
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'watchlist' && (
                <div className="overflow-x-auto">
                    {taskPerformance.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            No se encontraron tareas activas vinculadas a las URLs del informe.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="p-3">Tarea</th>
                                    <th className="p-3">URL / Recurso</th>
                                    <th className="p-3 text-right">Clics</th>
                                    <th className="p-3 text-right">Impresiones</th>
                                    <th className="p-3 text-right">Posición</th>
                                    <th className="p-3 text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {taskPerformance.map((task) => (
                                    <tr key={task.taskId} className="hover:bg-slate-50 transition">
                                        <td className="p-3 font-medium text-slate-700">
                                            <span className="block text-[10px] text-slate-400">ID: #{task.taskId}</span>
                                            {task.taskTitle}
                                        </td>
                                        <td className="p-3 text-slate-500 truncate max-w-[200px]" title={task.url}>{task.url}</td>
                                        <td className="p-3 text-right">
                                            <div className="font-bold text-slate-700">{task.metrics.clicks.toLocaleString()}</div>
                                            <div className={`text-[10px] ${task.comparison.clicksChange >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                                                {task.comparison.clicksChange > 0 ? '+' : ''}{task.comparison.clicksChange}
                                            </div>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="font-bold text-slate-700">{task.metrics.impressions.toLocaleString()}</div>
                                            <div className={`text-[10px] ${task.comparison.impressionsChange >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                                                {task.comparison.impressionsChange > 0 ? '+' : ''}{task.comparison.impressionsChange}
                                            </div>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="font-bold text-slate-700">{task.metrics.position.toFixed(1)}</div>
                                            <div className={`text-[10px] ${task.comparison.positionChange <= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                                                {task.comparison.positionChange > 0 ? '▼' : '▲'} {Math.abs(task.comparison.positionChange).toFixed(1)}
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${task.status === 'growth' ? 'bg-green-100 text-green-700' :
                                                task.status === 'decay' ? 'bg-rose-100 text-rose-700' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                {task.status === 'growth' ? 'Mejorando' : task.status === 'decay' ? 'Cayendo' : 'Estable'}
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
                <div className="overflow-x-auto">
                    {decayAlerts.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            No se detectaron caídas graves de keywords.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="p-3">Keyword Afectada</th>
                                    <th className="p-3 text-right">Posición Anterior</th>
                                    <th className="p-3 text-right">Posición Actual</th>
                                    <th className="p-3 text-right">Caída</th>
                                    <th className="p-3 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {decayAlerts.map((alert, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition">
                                        <td className="p-3 font-bold text-slate-700">{alert.keyword || alert.name}</td>
                                        <td className="p-3 text-right text-slate-500">{alert.positionP1?.toFixed(1) || '-'}</td>
                                        <td className="p-3 text-right text-slate-800 font-bold">{alert.positionP2?.toFixed(1) || '-'}</td>
                                        <td className="p-3 text-right text-rose-600 font-bold">
                                            ▼ {Math.abs(alert.positionChange?.toFixed(1) || 0)}
                                        </td>
                                        <td className="p-3 text-right">
                                            <button
                                                onClick={() => handleCreateTask(alert)}
                                                disabled={isCreating === (alert.keyword || alert.name)}
                                                className="bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 font-bold text-[10px] transition disabled:opacity-50"
                                            >
                                                {isCreating === (alert.keyword || alert.name) ? 'Creando...' : 'Crear Tarea'}
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
