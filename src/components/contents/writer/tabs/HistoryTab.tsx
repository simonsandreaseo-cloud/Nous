import React, { useEffect, useState } from 'react';
import { useWriterStore } from '@/store/useWriterStore';
import { History, RotateCcw, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/utils/cn';
import { toast } from 'sonner';

export const HistoryTab: React.FC = () => {
    const { 
        draftId, 
        taskVersions, 
        fetchTaskVersions, 
        restoreTaskVersion,
        isSaving,
        content
    } = useWriterStore();
    
    const [isRestoring, setIsRestoring] = useState(false);
    
    useEffect(() => {
        if (draftId) {
            fetchTaskVersions(draftId);
        }
    }, [draftId, fetchTaskVersions]);

    const handleRestore = async (versionId: string) => {
        if (isRestoring || isSaving) return;
        
        setIsRestoring(true);
        try {
            await restoreTaskVersion(versionId);
            toast.success('Versión restaurada correctamente. La versión previa ha sido guardada en el historial.');
        } catch (error) {
            toast.error('Error al restaurar la versión');
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-900/50">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
                <div className="flex items-center gap-2 text-indigo-400">
                    <History size={18} />
                    <h3 className="font-semibold text-slate-100">Historial de Versiones</h3>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(!taskVersions || taskVersions.length === 0) ? (
                    <div className="text-center text-slate-500 mt-10">
                        <Clock size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay versiones guardadas todavía.</p>
                        <p className="text-xs mt-1">Las versiones se guardarán automáticamente después de procesos clave como la Humanización o Edición Quirúrgica.</p>
                    </div>
                ) : (
                    <div className="relative border-l border-slate-700/50 ml-3 pl-5 space-y-6">
                        {taskVersions.map((version, idx) => {
                            const isActive = version.content_body === content;
                            
                            return (
                            <div key={version.id} className="relative group">
                                {/* Timeline dot */}
                                <div className={cn(
                                    "absolute -left-[25px] top-1.5 w-2 h-2 rounded-full ring-4 ring-slate-900 transition-colors",
                                    isActive ? "bg-emerald-400 group-hover:bg-emerald-300" : "bg-indigo-500 group-hover:bg-indigo-400"
                                )} />
                                
                                <div className={cn(
                                    "rounded-lg p-3 transition-all",
                                    isActive 
                                        ? "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/50 hover:border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                                        : "bg-slate-800/50 hover:bg-slate-800 border-slate-700/50 hover:border-slate-600 border"
                                )}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-medium text-slate-200 text-sm">
                                            {version.process_name || 'Versión Guardada'}
                                        </div>
                                        <span className="text-xs text-slate-400">
                                            {format(new Date(version.created_at), "d MMM, HH:mm", { locale: es })}
                                        </span>
                                    </div>
                                    
                                    <div className="text-xs text-slate-500 mb-3 flex items-center justify-between">
                                        <span>{(version.content_body?.length || 0).toLocaleString()} caracteres</span>
                                        <div className="flex gap-2">
                                            {isActive && <span className="text-emerald-400/90 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] border border-emerald-500/20">Viendo Actual</span>}
                                            {idx === 0 && !isActive && <span className="text-indigo-400/80 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[10px]">Última guardada</span>}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleRestore(version.id)}
                                        disabled={isRestoring || isSaving}
                                        className={cn(
                                            "w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded text-xs transition-colors disabled:opacity-50",
                                            isActive 
                                                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" 
                                                : "bg-slate-700/30 hover:bg-slate-700/60 text-slate-300 hover:text-white"
                                        )}
                                    >
                                        <RotateCcw size={12} className={isRestoring ? "animate-spin" : ""} />
                                        {isActive ? "Versión Actual" : "Restaurar esta versión"}
                                    </button>
                                </div>
                            </div>
                        )})}
                    </div>
                )}
            </div>
        </div>
    );
};
