"use client";

import { useState, useMemo, useEffect } from "react";
import { 
    Search, 
    ChevronRight, 
    CheckCircle2, 
    ArrowRight, 
    PenTool, 
    History, 
    Layout, 
    Settings2, 
    Inbox,
    Loader2,
    Calendar,
    ArrowUpRight,
    ArrowLeft,
    Share2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { useProjectStore, Task } from "@/store/useProjectStore";
import { CorrectionEditor } from "./CorrectionEditor";
import { CorrectionSEOData } from "./CorrectionSEOData";
import { NotificationService } from "@/lib/services/notifications";

export function CorrectionMode() {
    const { tasks, updateTask, isLoading } = useProjectStore();
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [localContent, setLocalContent] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectNote, setRejectNote] = useState("");

    const correctionTasks = useMemo(() => {
        return tasks.filter(task => task.status === 'por_corregir');
    }, [tasks]);

    const activeTask = useMemo(() => {
        return correctionTasks.find(t => t.id === activeTaskId) || null;
    }, [correctionTasks, activeTaskId]);

    // Handle initial selection
    useEffect(() => {
        if (!activeTaskId && correctionTasks.length > 0) {
            setActiveTaskId(correctionTasks[0].id);
        }
    }, [correctionTasks, activeTaskId]);

    // Update local content when active task changes
    useEffect(() => {
        if (activeTask) {
            setLocalContent(activeTask.content_body || "");
        }
    }, [activeTask]);

    // Auto-save logic
    useEffect(() => {
        if (!activeTask || localContent === null) return;
        if (localContent === activeTask.content_body) return;

        const timer = setTimeout(async () => {
            setIsSaving(true);
            try {
                await updateTask(activeTask.id, { content_body: localContent });
            } catch (error) {
                console.error("Auto-save failed", error);
            } finally {
                setIsSaving(false);
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, [localContent, activeTask, updateTask]);

    const handleApprove = async () => {
        if (!activeTask) return;
        try {
            await updateTask(activeTask.id, { status: 'por_maquetar' });
            NotificationService.notify("Contenido Aprobado", "El contenido se movió a Maquetación.");
            moveToNextTask();
        } catch (error) {
            NotificationService.error("Error", "No se pudo actualizar el estado.");
        }
    };

    const handleReject = async (level: 1 | 2 | 3) => {
        if (!activeTask) return;
        
        try {
            const updates: any = {};
            const existingMetadata = activeTask.metadata || {};
            const newMetadata = { ...existingMetadata, rejection_note: rejectNote };

            if (level === 1) {
                Object.assign(updates, { 
                    status: 'por_redactar', 
                    content_body: "",
                    metadata: newMetadata
                });
                NotificationService.notify("Contenido Reseteado", "Se ha devuelto a Redacción con tu nota.");
            } else if (level === 2) {
                Object.assign(updates, { 
                    status: 'en_investigacion', 
                    content_body: "", 
                    research_dossier: null,
                    metadata: newMetadata
                });
                NotificationService.notify("Reset Total", "Se ha devuelto a Investigación con tu nota.");
            } else if (level === 3) {
                const { deleteTask } = useProjectStore.getState();
                await deleteTask(activeTask.id);
                NotificationService.notify("Eliminado", "El contenido ha sido borrado para siempre.");
            }

            if (level !== 3) {
                await updateTask(activeTask.id, updates);
            }

            moveToNextTask();
            setIsRejectModalOpen(false);
            setRejectNote(""); // Reset note
        } catch (error) {
            NotificationService.error("Error", "No se pudo procesar el rechazo.");
        }
    };

    const moveToNextTask = () => {
        if (!activeTask) return;
        const currentIndex = correctionTasks.findIndex(t => t.id === activeTask.id);
        if (currentIndex < correctionTasks.length - 1) {
            setActiveTaskId(correctionTasks[currentIndex + 1].id);
        } else if (correctionTasks.length > 1) {
            setActiveTaskId(correctionTasks[0].id);
        } else {
            setActiveTaskId(null);
        }
    };

    if (correctionTasks.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white">
                <div className="w-24 h-24 rounded-[40px] bg-slate-50 border border-slate-100 flex items-center justify-center mb-6 shadow-sm">
                    <Inbox className="text-slate-200" size={40} />
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase italic tracking-tight mb-2">Bandeja de Entrada Vacía</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-[320px] leading-relaxed text-center px-4">
                    Excelente trabajo. No hay contenidos pendientes de revisión humana en este momento.
                </p>
                <div className="mt-8 flex items-center gap-2 px-6 py-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-600">
                    <CheckCircle2 size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Flujo de Redacción al día</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex overflow-hidden bg-white">
            {/* Column 1: Navigation List */}
            <div className="w-80 flex flex-col bg-slate-50 border-r border-slate-100 shrink-0">
                <div className="p-6 border-b border-slate-100 bg-white/50">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pendientes ({correctionTasks.length})</span>
                        <div className="p-1 px-2 bg-indigo-50 rounded-lg text-indigo-600 text-[10px] font-black italic">
                            HOT REVIEW
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                        <input 
                            type="text" 
                            placeholder="Buscar en lista..."
                            className="w-full h-10 pl-10 pr-4 bg-white border border-slate-100 rounded-xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                    {correctionTasks.map((task) => (
                        <button
                            key={task.id}
                            onClick={() => setActiveTaskId(task.id)}
                            className={cn(
                                "w-full p-5 rounded-[24px] text-left transition-all border",
                                activeTaskId === task.id 
                                    ? "bg-white border-indigo-100 shadow-md shadow-indigo-100/50 scale-[1.02]" 
                                    : "bg-transparent border-transparent hover:bg-white/60 text-slate-500"
                            )}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar size={10} className={cn(activeTaskId === task.id ? "text-indigo-500" : "text-slate-300")} />
                                <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">
                                    {task.scheduled_date ? new Date(task.scheduled_date).toLocaleDateString() : "S/F"}
                                </span>
                            </div>
                            <h4 className={cn(
                                "text-[11px] font-black leading-tight uppercase italic tracking-tight line-clamp-2",
                                activeTaskId === task.id ? "text-slate-900" : "text-slate-500"
                            )}>
                                {task.title}
                            </h4>
                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                    <span className="text-[8px] font-black uppercase tracking-widest opacity-40">IA Draft</span>
                                </div>
                                {activeTaskId === task.id && (
                                    <motion.div layoutId="active-indicator" className="text-indigo-600">
                                        <ChevronRight size={16} />
                                    </motion.div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Column 2: Editor */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className="h-20 px-10 border-b border-slate-50 flex items-center justify-between shrink-0 bg-white/10 backdrop-blur-md">
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-3">
                           <h3 className="text-sm font-black text-slate-800 uppercase italic tracking-tighter truncate max-w-[500px]">
                                {activeTask?.title}
                            </h3>
                            {isSaving && (
                                <div className="flex items-center gap-2 px-2 py-1 bg-indigo-50 rounded-lg">
                                    <Loader2 size={10} className="text-indigo-600 animate-spin" />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600">Guardando...</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsRejectModalOpen(true)}
                            className="px-4 py-2 border border-slate-100 hover:border-amber-200 hover:bg-amber-50 rounded-xl text-amber-600 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <span className="text-[9px] font-black uppercase tracking-widest italic tracking-tight">Rechazar</span>
                        </button>

                        <button 
                            onClick={handleApprove}
                            className="group flex items-center gap-3 px-6 py-3 bg-slate-900 hover:bg-indigo-600 rounded-2xl text-white transition-all shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <span className="text-[11px] font-black uppercase tracking-widest italic tracking-tight">Aprobar Publicación</span>
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar flex justify-center bg-slate-50/20">
                    <div className="w-full max-w-4xl h-full flex flex-col">
                        <CorrectionEditor 
                            content={localContent || ""} 
                            onChange={setLocalContent} 
                        />
                    </div>
                </div>
            </div>

            {/* Column 3: Data SEO */}
            <div className="w-[380px] shrink-0">
                {activeTask && <CorrectionSEOData task={activeTask} />}
            </div>

            {/* REJECT MODAL */}
            <AnimatePresence>
                {isRejectModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
                        onClick={() => setIsRejectModalOpen(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-10 text-center">
                                <div className="w-16 h-16 bg-amber-100 rounded-[24px] flex items-center justify-center text-amber-600 mx-auto mb-6">
                                    <Settings2 size={32} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter mb-2">
                                    Rechazar Contenido
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">
                                    Explica el motivo y selecciona la severidad
                                </p>

                                {/* Reason Field */}
                                <div className="mb-8">
                                    <textarea 
                                        placeholder="Escribe una nota para el redactor (opcional)..."
                                        value={rejectNote}
                                        onChange={(e) => setRejectNote(e.target.value)}
                                        className="w-full h-32 p-6 bg-slate-50 border border-slate-100 rounded-[32px] text-[11px] font-medium text-slate-600 focus:bg-white focus:border-amber-200 outline-none transition-all resize-none shadow-inner"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <button 
                                        onClick={() => handleReject(1)}
                                        className="w-full group flex items-center justify-between p-5 bg-slate-50 hover:bg-amber-50 rounded-[28px] border border-slate-100 hover:border-amber-200 transition-all text-left"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 group-hover:text-amber-500">Nivel 1</span>
                                            <span className="text-[11px] font-black uppercase text-slate-700 italic group-hover:text-amber-900 leading-tight">Solo Redacción</span>
                                            <span className="text-[8px] font-medium text-slate-400 mt-0.5">Limpia texto y devuelve a Redactor.</span>
                                        </div>
                                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-amber-500 group-hover:border-amber-100 transition-all">
                                            <PenTool size={14} />
                                        </div>
                                    </button>

                                    <button 
                                        onClick={() => handleReject(2)}
                                        className="w-full group flex items-center justify-between p-5 bg-slate-50 hover:bg-orange-50 rounded-[28px] border border-slate-100 hover:border-orange-200 transition-all text-left"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 group-hover:text-orange-500">Nivel 2</span>
                                            <span className="text-[11px] font-black uppercase text-slate-700 italic group-hover:text-orange-900 leading-tight">Full Reset</span>
                                            <span className="text-[8px] font-medium text-slate-400 mt-0.5">Limpia todo y vuelve a Investigación.</span>
                                        </div>
                                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-orange-500 group-hover:border-orange-100 transition-all">
                                            <History size={14} />
                                        </div>
                                    </button>

                                    <button 
                                        onClick={() => handleReject(3)}
                                        className="w-full group flex items-center justify-between p-5 bg-white hover:bg-red-500 rounded-[28px] border-2 border-slate-100 hover:border-red-400 transition-all text-left shadow-sm"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-[7px] font-black uppercase tracking-widest text-red-100 group-hover:text-white/60">Nivel 3</span>
                                            <span className="text-[11px] font-black uppercase text-slate-700 italic group-hover:text-white leading-tight">Eliminar</span>
                                            <span className="text-[8px] font-medium text-slate-400 group-hover:text-white/60 mt-0.5">Borrar permanentemente.</span>
                                        </div>
                                        <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-red-600 group-hover:text-white group-hover:border-red-400 transition-all">
                                            <Share2 size={14} />
                                        </div>
                                    </button>
                                </div>

                                <button 
                                    onClick={() => setIsRejectModalOpen(false)}
                                    className="mt-10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-800 transition-colors"
                                >
                                    Cancelar Operación
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
