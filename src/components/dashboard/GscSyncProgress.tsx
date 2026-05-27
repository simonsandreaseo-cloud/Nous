'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';

interface GscSyncJob {
    id: string;
    status: 'pending' | 'fetching_urls' | 'processing' | 'completed' | 'error';
    total_urls: number;
    processed_urls: number;
    error_message?: string;
    updated_at: string;
}

export function GscSyncProgress() {
    const { activeProject } = useProjectStore();
    const [currentJob, setCurrentJob] = useState<GscSyncJob | null>(null);
    const [isTriggering, setIsTriggering] = useState(false);
    const [totalUrls, setTotalUrls] = useState<number | null>(null);

    // 1. Listen for changes in Realtime
    useEffect(() => {
        if (!activeProject?.id) return;

        // Fetch Total URLs
        const fetchTotalUrls = async () => {
            const { count } = await supabase
                .from('project_urls')
                .select('*', { count: 'exact', head: true })
                .eq('project_id', activeProject.id);
            setTotalUrls(count || 0);
        };
        fetchTotalUrls();

        // Fetch initial active job
        const fetchInitial = async () => {
            const { data } = await supabase
                .from('gsc_sync_jobs')
                .select('*')
                .eq('project_id', activeProject.id)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (data && data.status !== 'completed' && data.status !== 'error') {
                setCurrentJob(data);
            }
        };

        fetchInitial();

        const channel = supabase.channel('gsc_sync_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'gsc_sync_jobs',
                    filter: `project_id=eq.${activeProject.id}`
                },
                (payload) => {
                    const job = payload.new as GscSyncJob;
                    if (job.status === 'completed' || job.status === 'error') {
                        setCurrentJob(job); // update to show 100% or error
                        setTimeout(() => setCurrentJob(null), 5000); // hide after 5 seconds
                        if (job.status === 'completed') {
                            // Fetch updated count
                            supabase
                                .from('project_urls')
                                .select('*', { count: 'exact', head: true })
                                .eq('project_id', activeProject.id)
                                .then(({ count }) => setTotalUrls(count || 0));
                        }
                    } else {
                        setCurrentJob(job);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeProject?.id]);

    // 2. Trigger Sync
    const startSync = async () => {
        if (!activeProject?.id || isTriggering) return;
        setIsTriggering(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");

            // Llama a la Edge Function
            const { error } = await supabase.functions.invoke('gsc-url-sync', {
                body: { project_id: activeProject.id }
            });

            if (error) {
                console.error("Failed to invoke Edge Function", error);
            }
        } catch (e) {
            console.error("Error triggering sync", e);
        } finally {
            setIsTriggering(false);
        }
    };

    if (!activeProject) return null;

    // Calculos de progreso
    const isWorking = currentJob && ['pending', 'fetching_urls', 'processing'].includes(currentJob.status);
    const progress = currentJob?.total_urls 
        ? Math.round((currentJob.processed_urls / currentJob.total_urls) * 100) 
        : 0;

    let statusText = "Preparando...";
    if (currentJob?.status === 'fetching_urls') statusText = "Descargando URLs desde Google...";
    if (currentJob?.status === 'processing') statusText = `Guardando en Base de Datos... (${currentJob.processed_urls} de ${currentJob.total_urls})`;
    if (currentJob?.status === 'completed') statusText = "¡Sincronización completada!";
    if (currentJob?.status === 'error') statusText = "Error en sincronización";

    return (
        <div className="w-full flex flex-col gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        Sincronización de URLs (GSC)
                        {totalUrls !== null && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-semibold">
                                {totalUrls} en inventario
                            </span>
                        )}
                    </h4>
                    <p className="text-xs text-slate-500">
                        Descarga e indexa todas las URLs de Google Search Console para el enlazado interno.
                    </p>
                </div>
                <button
                    onClick={startSync}
                    disabled={isWorking || isTriggering}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {(isWorking || isTriggering) ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <RefreshCw size={14} />
                    )}
                    {isWorking ? 'Sincronizando...' : 'Iniciar Sincronización'}
                </button>
            </div>

            <AnimatePresence>
                {currentJob && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-2 mt-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                <div className="flex items-center gap-2">
                                    {currentJob.status === 'completed' ? (
                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                    ) : currentJob.status === 'error' ? (
                                        <AlertCircle size={14} className="text-rose-500" />
                                    ) : (
                                        <RefreshCw size={14} className="animate-spin text-blue-500" />
                                    )}
                                    <span className={
                                        currentJob.status === 'completed' ? 'text-emerald-600' :
                                        currentJob.status === 'error' ? 'text-rose-600' : 'text-slate-700'
                                    }>
                                        {statusText}
                                    </span>
                                </div>
                                <span>{progress}%</span>
                            </div>
                            
                            {/* Barra de progreso visual */}
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                <motion.div 
                                    className={`h-full rounded-full ${
                                        currentJob.status === 'error' ? 'bg-rose-500' : 
                                        currentJob.status === 'completed' ? 'bg-emerald-500' : 
                                        'bg-blue-500'
                                    }`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                            {currentJob.error_message && (
                                <p className="text-[10px] text-rose-500 mt-1">{currentJob.error_message}</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
