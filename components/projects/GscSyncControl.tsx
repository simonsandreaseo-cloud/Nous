import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, Check, Settings, Play, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Project } from '../../lib/task_manager';

interface GscSyncControlProps {
    project: Project;
    onSyncComplete?: () => void;
}

export const GscSyncControl: React.FC<GscSyncControlProps> = ({ project, onSyncComplete }) => {
    const [syncing, setSyncing] = useState(false);
    const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);
    const [recordCount, setRecordCount] = useState<number>(0);
    const [showSettings, setShowSettings] = useState(false);
    const [frequency, setFrequency] = useState(project.gsc_settings?.frequency_days || 2);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        checkSyncStatus();
    }, [project.id]);

    const checkSyncStatus = async () => {
        // Get count
        const { count } = await supabase
            .from('gsc_daily_metrics')
            .select('date', { count: 'exact', head: true })
            .eq('project_id', project.id);
        setRecordCount(count || 0);

        // Get last sync from settings or metrics
        if (project.gsc_settings?.last_sync_at) {
            setLastSyncDate(project.gsc_settings.last_sync_at);
        } else if (count && count > 0) {
            const { data: latest } = await supabase
                .from('gsc_daily_metrics')
                .select('updated_at')
                .eq('project_id', project.id)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();
            if (latest) setLastSyncDate(latest.updated_at);
        }
    };

    const handleSync = async (mode: 'full' | 'incremental' = 'incremental') => {
        if (!project.gsc_property_url) return;
        setSyncing(true);
        setStatusMessage(mode === 'full' ? 'Cargando histórico (esto puede tardar)...' : 'Sincronizando...');

        try {
            const { data, error } = await supabase.functions.invoke('gsc-sync', {
                body: { project_id: project.id, mode }
            });

            if (error) throw error;

            setStatusMessage(`Sincronización completada. ${data?.inserted || 0} registros.`);
            await checkSyncStatus();
            if (onSyncComplete) onSyncComplete();

            // Refresh project to get new settings
            window.location.reload(); // Simple reload to refresh context/settings
        } catch (error: any) {
            console.error('Sync failed', error);
            setStatusMessage('Error: Asegúrate de que las credenciales están configuradas o el servidor está activo.');
            alert('Error al sincronizar: ' + (error.message || 'Error desconocido'));
        } finally {
            setSyncing(false);
            setTimeout(() => setStatusMessage(''), 5000);
        }
    };

    const saveSettings = async () => {
        const newSettings = {
            ...project.gsc_settings,
            frequency_days: frequency
        };

        await supabase.from('projects')
            .update({ gsc_settings: newSettings })
            .eq('id', project.id);

        setShowSettings(false);
        // Optimistic update
        project.gsc_settings = newSettings;
    };

    if (!project.gsc_property_url) return null;

    const initialDone = project.gsc_settings?.initial_sync_done || (recordCount > 300); // Heuristic if flag missing

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-100 shadow-sm relative">
                <div className="flex flex-col flex-grow">
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                        <Database size={10} />
                        {recordCount > 0 ? `${recordCount} días guardados` : 'Sin datos locales'}
                    </span>
                    <div className="flex items-center gap-2">
                        {lastSyncDate && (
                            <span className="text-[10px] text-slate-400">
                                Act: {new Date(lastSyncDate).toLocaleDateString()}
                            </span>
                        )}
                        {statusMessage && <span className="text-[10px] text-indigo-500 animate-pulse">{statusMessage}</span>}
                    </div>
                </div>

                <div className="flex gap-1">
                    {!initialDone && (
                        <button
                            onClick={() => handleSync('full')}
                            disabled={syncing}
                            className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 flex items-center gap-1"
                            title="Cargar historial completo (1.5 años)"
                        >
                            <span className={syncing ? 'animate-spin' : ''}>⏳</span>
                            Carga Inicial
                        </button>
                    )}

                    <button
                        onClick={() => handleSync('incremental')}
                        disabled={syncing}
                        className={`p-2 rounded-md transition-colors ${syncing
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-brand-power/10 text-brand-power hover:bg-brand-power/20'
                            }`}
                        title="Actualizar Recientes"
                    >
                        <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-2 rounded-md text-slate-400 hover:bg-slate-50 transition-colors"
                        title="Configuración de GSC"
                    >
                        <Settings size={16} />
                    </button>
                </div>
            </div>

            {/* Settings Dropdown */}
            {showSettings && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs animate-fade-in-down">
                    <h4 className="font-bold text-slate-700 mb-2">Configuración de Sincronización</h4>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-slate-500">Frecuencia (días):</span>
                        <input
                            type="number"
                            min="1"
                            max="30"
                            value={frequency}
                            onChange={(e) => setFrequency(Number(e.target.value))}
                            className="w-16 p-1 border rounded"
                        />
                    </div>
                    <div className="text-[10px] text-slate-400 mb-3">
                        * La sincronización automática requiere un trabajo programado (Cron).
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowSettings(false)} className="px-3 py-1 text-slate-500 hover:bg-slate-200 rounded">Cancelar</button>
                        <button onClick={saveSettings} className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">Guardar</button>
                    </div>
                </div>
            )}
        </div>
    );
};
