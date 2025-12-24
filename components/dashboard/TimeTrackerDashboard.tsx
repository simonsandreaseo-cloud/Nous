import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Clock, Trash2, Shield, Activity, Calendar } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActivityLog {
    id: string;
    started_at: string;
    ended_at: string;
    activity_percentage: number;
    window_title: string;
    app_name: string;
    screenshot_path: string;
}

const TimeTrackerDashboard: React.FC = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalMinutes, setTotalMinutes] = useState(0);

    useEffect(() => {
        if (user) {
            fetchLogs();
        }
    }, [user]);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const today = startOfDay(new Date()).toISOString();
            const tomorrow = endOfDay(new Date()).toISOString();

            const { data, error } = await supabase
                .from('activity_logs')
                .select('*')
                .gte('started_at', today)
                .lte('started_at', tomorrow)
                .order('started_at', { ascending: false });

            if (error) throw error;
            setLogs(data || []);

            // Calculate total minutes (rough estimate based on blocks)
            setTotalMinutes((data?.length || 0) * 10);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteBlock = async (id: string, path: string) => {
        if (!confirm('¿Estás seguro de eliminar este bloque de 10 minutos? Esto también borrará la captura de pantalla por privacidad.')) return;

        try {
            // 1. Delete from DB
            const { error: dbError } = await supabase
                .from('activity_logs')
                .delete()
                .eq('id', id);

            if (dbError) throw dbError;

            // 2. Delete from Storage if path exists
            if (path) {
                await supabase.storage.from('tracker_captures').remove([path]);
            }

            // 3. Update UI
            setLogs(prev => prev.filter(l => l.id !== id));
            setTotalMinutes(prev => Math.max(0, prev - 10));
        } catch (error: any) {
            alert('Error al eliminar bloque: ' + error.message);
        }
    };

    const getScreenshotUrl = (path: string) => {
        if (!path) return null;
        const { data } = supabase.storage.from('tracker_captures').getPublicUrl(path);
        return data.publicUrl;
    };

    const formatDuration = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h}h ${m}m`;
    };

    return (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-brand-power/5">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                <h2 className="text-xl font-bold text-brand-power flex items-center gap-3">
                    <Clock className="text-brand-accent" />
                    Cronología de Trabajo (Hoy)
                </h2>
                <div className="flex items-center gap-4 bg-brand-soft/30 px-4 py-2 rounded-xl">
                    <Activity size={16} className="text-brand-accent" />
                    <span className="text-sm font-bold text-brand-power">
                        Total: {formatDuration(totalMinutes)}
                    </span>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-brand-soft/10 rounded-xl animate-pulse" />)}
                </div>
            ) : logs.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {logs.map((log) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="group flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl border border-brand-power/5 hover:border-brand-accent/20 hover:bg-brand-soft/5 transition-all"
                        >
                            {/* Time Block Info */}
                            <div className="flex flex-col items-center justify-center min-w-[80px] text-center border-r border-brand-power/5 pr-6">
                                <span className="text-xs font-bold text-brand-power/40 uppercase">Inicio</span>
                                <span className="text-lg font-mono font-bold text-brand-power">
                                    {format(new Date(log.started_at), 'HH:mm')}
                                </span>
                            </div>

                            {/* Screenshot (Blurred by design in Electron, but presented here) */}
                            <div className="relative w-32 h-20 bg-gray-100 rounded-lg overflow-hidden border border-brand-power/5 shadow-inner">
                                {log.screenshot_path ? (
                                    <img
                                        src={getScreenshotUrl(log.screenshot_path) || ''}
                                        alt="Actividad"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-brand-power/20">
                                        <Shield size={24} />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Shield size={20} className="text-white opacity-70" />
                                </div>
                            </div>

                            {/* Activity Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`w-2 h-2 rounded-full ${log.activity_percentage > 50 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                    <span className="text-xs font-bold text-brand-power/60 uppercase tracking-wider">
                                        Actividad: {log.activity_percentage}%
                                    </span>
                                </div>
                                <h4 className="font-bold text-brand-power truncate text-sm" title={log.window_title}>
                                    {log.window_title || 'Sin título de ventana'}
                                </h4>
                                <p className="text-xs text-brand-power/40 truncate">
                                    {log.app_name || 'Aplicación desconocida'}
                                </p>
                            </div>

                            {/* Actions */}
                            <button
                                onClick={() => handleDeleteBlock(log.id, log.screenshot_path)}
                                className="p-3 text-brand-power/20 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                title="Eliminar este bloque"
                            >
                                <Trash2 size={18} />
                            </button>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-brand-soft/10 rounded-2xl border-2 border-dashed border-brand-power/5">
                    <Calendar className="mx-auto text-brand-power/10 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-brand-power mb-2">No hay actividad hoy</h3>
                    <p className="text-sm text-brand-power/40 max-w-xs mx-auto mb-6">
                        Abre la aplicación de escritorio y comienza a registrar para ver tu cronología aquí.
                    </p>
                    <Link to="/herramientas/time-tracker" className="text-xs font-bold text-brand-accent uppercase tracking-widest hover:underline">
                        Descargar Tracker &rarr;
                    </Link>
                </div>
            )}
        </div>
    );
};

export default TimeTrackerDashboard;
