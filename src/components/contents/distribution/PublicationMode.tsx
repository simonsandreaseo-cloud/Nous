"use client";

import { useState, useMemo, useEffect } from "react";
import { 
    Search, 
    ChevronRight, 
    CheckCircle2, 
    ArrowRight, 
    Layout, 
    Inbox,
    Loader2,
    Calendar,
    ArrowUpRight,
    ArrowLeft,
    Share2,
    FileText,
    ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { useProjectStore, Task } from "@/store/useProjectStore";
import { PublicationTools } from "./PublicationTools";
import { NotificationService } from "@/lib/services/notifications";

export function PublicationMode() {
    const { tasks, updateTask, isLoading } = useProjectStore();
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

    const publicationTasks = useMemo(() => 
        tasks.filter(t => t.status === 'por_maquetar' || t.status === 'publicado')
             .sort((a, b) => new Date(a.scheduled_date || 0).getTime() - new Date(b.scheduled_date || 0).getTime()),
    [tasks]);

    const completedToday = useMemo(() => 
        tasks.filter(t => (t.status === 'publicado') && 
                    new Date(t.completed_at || "").toDateString() === new Date().toDateString()),
    [tasks]);

    const activeTask = useMemo(() => {
        return publicationTasks.find(t => t.id === activeTaskId) || null;
    }, [publicationTasks, activeTaskId]);

    useEffect(() => {
        if (!activeTaskId && publicationTasks.length > 0) {
            const firstPending = publicationTasks.find(t => t.status === 'por_maquetar');
            if (firstPending) setActiveTaskId(firstPending.id);
        }
    }, [publicationTasks, activeTaskId]);

    const playSuccessSound = () => {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3");
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Audio play blocked"));
    };

    const handleStatusToggle = async () => {
        if (!activeTask) return;
        
        const isCurrentlyPublic = activeTask.status === 'publicado';
        const nextStatus = isCurrentlyPublic ? 'por_maquetar' : 'publicado';
        
        try {
            if (nextStatus === 'publicado') {
                playSuccessSound();
            }

            await updateTask(activeTask.id, { 
                status: nextStatus,
                completed_at: nextStatus === 'publicado' ? new Date().toISOString() : undefined
            });

            NotificationService.notify(
                nextStatus === 'publicado' ? "¡Publicado!" : "Devuelto a Maquetación", 
                `El estado se ha actualizado correctamente.`
            );

            // Auto-advance to next pending task after small delay for animation
            if (nextStatus === 'publicado') {
                const pending = publicationTasks.filter(t => t.status === 'por_maquetar' && t.id !== activeTask.id);
                if (pending.length > 0) {
                    setTimeout(() => setActiveTaskId(pending[0].id), 800);
                }
            }
        } catch (error) {
            NotificationService.error("Error", "No se pudo actualizar el estado.");
        }
    };

    const handleReportIssue = async (note: string) => {
        if (!activeTask) return;

        try {
            await updateTask(activeTask.id, {
                status: 'por_corregir',
                metadata: {
                    ...activeTask.metadata,
                    rejection_note: note,
                    reported_from: 'maquetacion',
                    reported_at: new Date().toISOString()
                }
            });

            NotificationService.notify("Reportado", "El contenido ha vuelto a corrección.");
            
            // Select next pending
            const pending = publicationTasks.filter(t => t.status === 'por_maquetar' && t.id !== activeTask.id);
            if (pending.length > 0) {
                setActiveTaskId(pending[0].id);
            } else {
                setActiveTaskId(null);
            }
        } catch (error) {
            NotificationService.error("Error", "No se pudo reportar el problema.");
        }
    };

    if (publicationTasks.length === 0 && completedToday.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white">
                <div className="w-24 h-24 rounded-[40px] bg-slate-50 border border-slate-100 flex items-center justify-center mb-6 shadow-sm">
                    <Inbox className="text-slate-200" size={40} />
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase italic tracking-tight mb-2">Sin contenidos para maquetar</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-[320px] leading-relaxed text-center px-4">
                    Todos los contenidos han sido publicados o están aún en fase de corrección.
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex overflow-hidden bg-slate-50/30">
            {/* Left Side: Dashboard Grid */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-slate-100 bg-white shadow-[20px_0_40px_rgba(0,0,0,0.01)] relative z-10">
                <div className="p-8 border-b border-slate-50 bg-white/50 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Panel de Maquetación</h2>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Gestión de Publicación en Lote</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100/50">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{publicationTasks.filter(t => t.status === 'por_maquetar').length} Pendientes</span>
                        </div>
                    </div>
                    
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input 
                            type="text" 
                            placeholder="Buscar artículos listos para publicar..."
                            className="w-full h-12 pl-12 pr-6 bg-slate-50/50 border border-slate-100 rounded-[20px] text-xs font-bold uppercase tracking-widest focus:ring-4 focus:ring-emerald-500/5 focus:bg-white focus:border-emerald-200 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="grid grid-cols-2 gap-6 pb-20">
                        {publicationTasks.filter(t => t.status === 'por_maquetar').map((task) => (
                            <button
                                key={task.id}
                                onClick={() => setActiveTaskId(task.id)}
                                className={cn(
                                    "p-6 rounded-[32px] text-left transition-all border group relative",
                                    activeTaskId === task.id 
                                        ? "bg-white border-emerald-200 shadow-xl shadow-emerald-100/50 scale-[1.02] z-10" 
                                        : "bg-slate-50/50 border-slate-100 hover:bg-white hover:border-slate-200"
                                )}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={12} className={cn(activeTaskId === task.id ? "text-emerald-500" : "text-slate-300")} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            {task.scheduled_date ? new Date(task.scheduled_date).toLocaleDateString() : "S/F"}
                                        </span>
                                    </div>
                                </div>

                                <h4 className={cn(
                                    "text-[13px] font-black leading-tight uppercase italic tracking-tight line-clamp-2 mb-6",
                                    activeTaskId === task.id ? "text-slate-900" : "text-slate-500 group-hover:text-slate-700"
                                )}>
                                    {task.title}
                                </h4>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100/50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Listo</span>
                                    </div>
                                    <ArrowRight size={18} className={cn("transition-all", activeTaskId === task.id ? "text-emerald-600 translate-x-0" : "text-slate-200 -translate-x-2 opacity-0")} />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Completed Shelf */}
                <div className="h-32 bg-slate-900 border-t border-slate-800 flex items-center px-8 shrink-0 overflow-hidden relative">
                    <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-900 via-slate-900 to-transparent z-10 flex items-center pl-8">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 italic">Completados Hoy</span>
                    </div>
                    
                    <div className="flex items-center gap-4 pl-32 overflow-x-auto custom-scrollbar-hide h-full py-4">
                        <AnimatePresence>
                            {completedToday.map((task) => (
                                <motion.button
                                    key={task.id}
                                    layoutId={task.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    onClick={() => setActiveTaskId(task.id)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-2xl border shrink-0 transition-all",
                                        activeTaskId === task.id 
                                            ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 scale-105 z-20" 
                                            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                                    )}
                                >
                                    <div className={cn(
                                        "w-6 h-6 rounded-lg flex items-center justify-center",
                                        activeTaskId === task.id ? "bg-white/20 text-white" : "bg-emerald-500/20 text-emerald-400"
                                    )}>
                                        <CheckCircle2 size={14} />
                                    </div>
                                    <span className="text-[10px] font-bold truncate max-w-[150px] uppercase tracking-tighter italic">
                                        {task.title}
                                    </span>
                                </motion.button>
                            ))}
                        </AnimatePresence>
                        {completedToday.length === 0 && (
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Aun no has publicado nada hoy... ¡A darle!</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Side: Enhanced Tools */}
            <div className="flex-1 min-w-0 bg-white">
                <AnimatePresence mode="wait">
                    {activeTask ? (
                        <motion.div 
                            key={activeTask.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-full"
                        >
                            <PublicationTools 
                                task={activeTask} 
                                onStatusToggle={handleStatusToggle} 
                                onReportIssue={handleReportIssue}
                            />
                        </motion.div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-20 text-center">
                            <div className="w-20 h-20 rounded-[32px] bg-slate-50 border border-slate-100 flex items-center justify-center mb-8 text-slate-200">
                                <Layout size={40} />
                            </div>
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Selecciona un artículo</h3>
                            <p className="text-[10px] font-medium text-slate-300 uppercase tracking-widest mt-2">Para ver las herramientas de publicación</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
