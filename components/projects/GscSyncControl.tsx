import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, Check } from 'lucide-react';
import { GscService } from '../../services/gscService';
import { Project } from '../../lib/task_manager';
import { supabase } from '../../lib/supabase';

interface GscSyncControlProps {
    project: Project;
    onSyncComplete?: () => void;
}

export const GscSyncControl: React.FC<GscSyncControlProps> = ({ project, onSyncComplete }) => {
    const [syncing, setSyncing] = useState(false);
    const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);
    const [recordCount, setRecordCount] = useState<number>(0);

    useEffect(() => {
        checkSyncStatus();
    }, [project.id]);

    const checkSyncStatus = async () => {
        const { data, count } = await supabase
            .from('gsc_daily_metrics')
            .select('date', { count: 'exact', head: true })
            .eq('project_id', project.id);

        setRecordCount(count || 0);

        if (count && count > 0) {
            const { data: latest } = await supabase
                .from('gsc_daily_metrics')
                .select('updated_at')
                .eq('project_id', project.id)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (latest) {
                setLastSyncDate(latest.updated_at);
            }
        }
    };

    const handleSync = async () => {
        if (!project.gsc_property_url) return;
        setSyncing(true);
        try {
            const end = new Date();
            end.setDate(end.getDate() - 2); // GSC limit
            const start = new Date();
            start.setDate(start.getDate() - 90); // Last 90 days

            const fmt = (d: Date) => d.toISOString().split('T')[0];

            await GscService.syncProjectAnalytics(project.id, project.gsc_property_url, fmt(start), fmt(end));

            await checkSyncStatus();
            if (onSyncComplete) onSyncComplete();
        } catch (error) {
            console.error('Sync failed', error);
            alert('Error al sincronizar datos');
        } finally {
            setSyncing(false);
        }
    };

    if (!project.gsc_property_url) return null;

    return (
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <Database size={10} />
                    {recordCount > 0 ? `${recordCount} días guardados` : 'Sin datos locales'}
                </span>
                {lastSyncDate && (
                    <span className="text-[10px] text-slate-400">
                        Act: {new Date(lastSyncDate).toLocaleDateString()}
                    </span>
                )}
            </div>
            <button
                onClick={handleSync}
                disabled={syncing}
                className={`p-2 rounded-md transition-colors ${syncing
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-brand-power/10 text-brand-power hover:bg-brand-power/20'
                    }`}
                title="Sincronizar datos de Search Console"
            >
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            </button>
        </div>
    );
};
