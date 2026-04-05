'use client';

import { useState } from 'react';

import { useProjectStore, Task, STATUS_LABELS } from '@/store/useProjectStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Globe, FileText, CheckCircle2, Trash2, Sparkles, Plus, Hash, Tag, Activity, Calendar, MoreVertical, LayoutDashboard } from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectBadge } from '@/components/ui/ProjectBadge';
import { useRouter } from 'next/navigation';
import { useWriterStore } from '@/store/useWriterStore';
import { usePermissions } from '@/hooks/usePermissions';

interface StrategyGalleryProps {
    onSelectTask: (task: Task) => void;
    onRunResearch: (taskId: string) => void;
}

export default function StrategyGallery({ onSelectTask, onRunResearch }: StrategyGalleryProps) {
    const { tasks, activeProject, deleteTask } = useProjectStore();
    const { canCreateOrDelete, canEditAny, canTakeTasks } = usePermissions();
    const { initializeFromTask } = useWriterStore();
    const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
    const router = useRouter();

    const sortedTasks = [...tasks].sort((a, b) => new Date(a.scheduled_date || 0).getTime() - new Date(b.scheduled_date || 0).getTime());

    if (tasks.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Hash size={32} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">No hay contenido programado</h3>
                <p className="text-xs font-bold text-slate-400 mt-2">Agrega nuevas ideas para comenzar tu estrategia.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1600px] mx-auto">
                {sortedTasks.map((task) => (
                    <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => onSelectTask(task)}
                        className="group bg-white rounded-[32px] p-6 border border-slate-100 hover:border-indigo-100/50 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all cursor-pointer relative flex flex-col gap-6"
                    >
                        {/* Header: Project & Publication Date */}
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1.5">
                                <ProjectBadge projectId={task.project_id} />
                                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-300 uppercase tracking-widest tabular-nums">
                                    <Calendar size={10} className="opacity-40" />
                                    {task.scheduled_date ? format(new Date(task.scheduled_date), "dd MMM, yyyy", { locale: es }) : 'Progr...'}
                                </div>
                            </div>
                            <div className={cn(
                                "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border flex items-center gap-1.5",
                                (task.status === "por_maquetar" || task.status === "publicado" || task.status === "done")
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                    : (task.status === "en_investigacion" || task.status === "investigacion_proceso")
                                        ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                                        : (task.status === "por_redactar" || task.status === "por_corregir" || task.status === "en_redaccion")
                                            ? "bg-purple-50 text-purple-600 border-purple-100"
                                            : "bg-slate-50 text-slate-600 border-slate-100"
                            )}>
                                <div className={cn(
                                    "w-1 h-1 rounded-full",
                                    (task.status === "por_maquetar" || task.status === "publicado" || task.status === "done") ? "bg-emerald-500" :
                                    (task.status === "en_investigacion" || task.status === "investigacion_proceso") ? "bg-indigo-500" :
                                    (task.status === "por_redactar" || task.status === "por_corregir" || task.status === "en_redaccion") ? "bg-purple-500" : "bg-slate-300"
                                )} />
                                {STATUS_LABELS[task.status] || task.status.replace(/_/g, ' ')}
                            </div>
                        </div>

                        {/* Body: Title & Keywords */}
                        <div className="space-y-3 flex-1">
                            <h3 className="text-sm font-black text-slate-900 tracking-tight leading-tight line-clamp-3 min-h-[3rem] group-hover:text-indigo-600 transition-colors">
                                {task.title || <span className="text-slate-300 italic font-medium">Escribe un título...</span>}
                            </h3>
                            
                            <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
                                {task.target_keyword && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg max-w-[150px]">
                                        <Tag size={9} className="text-slate-400 shrink-0" />
                                        <span className="text-[9px] font-bold text-slate-600 truncate">{task.target_keyword}</span>
                                    </div>
                                )}
                                {task.research_dossier?.lsiKeywords && task.research_dossier.lsiKeywords.length > 0 && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50/50 border border-indigo-100/50 rounded-lg">
                                        <span className="text-[9px] font-black text-indigo-500 tracking-widest">{task.research_dossier.lsiKeywords.length} LSI</span>
                                    </div>
                                )}
                                {task.outline_structure && task.outline_structure.length > 0 && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-violet-50/50 border border-violet-100/50 rounded-lg">
                                        <Sparkles size={9} className="text-violet-500" />
                                        <span className="text-[9px] font-black text-violet-500 tracking-widest uppercase">Estrategia</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stats Dock */}
                        <div className="flex items-center justify-between py-4 border-t border-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                        <Activity size={10} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                                        <span className="text-[11px] font-black text-indigo-600 tabular-nums">
                                            {(task.volume || 0) + (task.research_dossier?.lsiKeywords?.reduce((acc: number, kw: any) => acc + (kw.volume || 0), 0) || 0)}
                                        </span>
                                    </div>
                                    <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">Volumen</span>
                                </div>
                                <div className="w-px h-6 bg-slate-50" />
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                        <FileText size={10} className="text-slate-400" />
                                        <span className="text-[11px] font-black text-slate-700 tabular-nums">
                                            {task.word_count || "--"}
                                        </span>
                                    </div>
                                    <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">Palabras</span>
                                </div>
                                <div className="w-px h-6 bg-slate-50" />
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                        <Globe size={10} className="text-emerald-400" />
                                        <span className="text-[11px] font-black text-emerald-600 tabular-nums">
                                            {task.research_dossier?.top10Urls?.length || 0}
                                        </span>
                                    </div>
                                    <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">Fuentes</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer: Action Dock */}
                        <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1.5">
                                {(canEditAny() || canTakeTasks()) && (
                                    <>
                                        <button
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                initializeFromTask(task, activeProject);
                                                router.push('/contents/writer');
                                            }}
                                            className="p-2.5 bg-slate-50/50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 rounded-lg transition-all text-slate-400 hover:text-indigo-600"
                                            title="Redactar"
                                        >
                                            <FileText size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                router.push(`/contents/corrector?taskId=${task.id}`);
                                            }}
                                            className="p-2.5 bg-slate-50/50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-100 rounded-lg transition-all text-slate-400 hover:text-emerald-600"
                                            title="Corregir"
                                        >
                                            <CheckCircle2 size={14} />
                                        </button>
                                    </>
                                )}
                                {onRunResearch && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRunResearch(task.id); }}
                                        className="p-2.5 bg-indigo-50/50 hover:bg-indigo-100 border border-indigo-100/30 rounded-lg transition-all text-indigo-400 hover:text-indigo-600 shadow-sm shadow-indigo-100"
                                        title="Investigar"
                                    >
                                        <Sparkles size={14} />
                                    </button>
                                )}
                            </div>
                            
                            {canCreateOrDelete() && (
                                <div className="relative flex items-center justify-center min-w-[32px]">
                                    <AnimatePresence mode="wait">
                                        {deletingTaskId === task.id ? (
                                            <motion.button
                                                key="confirm"
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.8, opacity: 0 }}
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try {
                                                        await deleteTask?.(task.id);
                                                        setDeletingTaskId(null);
                                                    } catch (err: any) {
                                                        console.error("Delete fail:", err);
                                                        setDeletingTaskId(null);
                                                    }
                                                }}
                                                onMouseLeave={() => setDeletingTaskId(null)}
                                                className="px-3 py-1.5 bg-rose-600 text-white rounded-md text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 animate-pulse relative z-20"
                                            >
                                                ¿Seguro?
                                            </motion.button>
                                        ) : (
                                            <motion.button
                                                key="trash"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeletingTaskId(task.id);
                                                }}
                                                className="p-2.5 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all text-slate-300 hover:text-rose-500 relative z-10"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={14} />
                                            </motion.button>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
