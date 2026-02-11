"use client";

import { useState, useMemo, useRef } from "react";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    FileText,
    Ghost,
    CheckCircle2,
    Clock,
    MoreVertical,
    FileUp,
    Sparkles,
    Calendar as CalendarIcon,
    X,
    Clipboard,
    Paperclip,
    Check,
    Loader2,
    Trash,
    LayoutList,
    TableProperties,
    LayoutDashboard
} from "lucide-react";
import { useProjectStore, Task } from "@/store/useProjectStore";
import { supabase } from "@/lib/supabase";
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { StrategyService } from "@/lib/services/strategy";

export function EditorialCalendar() {
    const { tasks, activeProject, updateTask, addTask } = useProjectStore();
    const router = useRouter();
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
    const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
    const [suggestedTasks, setSuggestedTasks] = useState<any[]>([]);
    const [isLoadingStrategy, setIsLoadingStrategy] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskDate, setNewTaskDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [currentView, setCurrentView] = useState<'calendar' | 'grid'>('calendar');
    const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);

    const handleGenerateStrategy = async () => {
        if (!activeProject) return;
        setIsLoadingStrategy(true);
        try {
            const suggestions = await StrategyService.suggestTasksFromMetrics(activeProject.id);
            setSuggestedTasks(suggestions);
            setIsStrategyModalOpen(true);
        } catch (error) {
            console.error(error);
            alert("Error generando estrategia");
        } finally {
            setIsLoadingStrategy(false);
        }
    };

    const handleAcceptSuggestion = async (suggestion: any) => {
        if (!activeProject) return;
        await addTask({
            project_id: activeProject.id,
            title: suggestion.title,
            scheduled_date: format(new Date(), 'yyyy-MM-dd'),
            status: 'todo',
            target_keyword: suggestion.target_keyword,
            priority: suggestion.priority
        });
        setSuggestedTasks(prev => prev.filter(t => t.target_keyword !== suggestion.target_keyword));
    };

    const handleCreateQuickTask = async () => {
        if (!newTaskTitle || !activeProject) return;
        await addTask({
            project_id: activeProject.id,
            title: newTaskTitle,
            scheduled_date: newTaskDate,
            status: 'todo',
            brief: ''
        });
        setIsNewTaskModalOpen(false);
        setNewTaskTitle("");
    };

    const handleDirectUpload = async (taskId: string, content: string, shouldHumanize: boolean) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const draftId = await saveContentAndLink(taskId, content, session?.user?.id);

            if (shouldHumanize) {
                router.push(`/writer?mode=humanize&draftId=${draftId}&activeTaskId=${taskId}`);
            } else {
                setIsUploadModalOpen(false);
                setSelectedTask(null);
            }
        } catch (err) {
            console.error("Upload error:", err);
        }
    };

    // Calendar Generation
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({
        start: calendarStart,
        end: calendarEnd,
    });

    const nextMonth = () => setViewDate(addMonths(viewDate, 1));
    const prevMonth = () => setViewDate(subMonths(viewDate, 1));

    const tasksByDay = useMemo(() => {
        const map: Record<string, Task[]> = {};
        tasks.forEach(task => {
            const d = format(new Date(task.scheduled_date), 'yyyy-MM-dd');
            if (!map[d]) map[d] = [];
            map[d].push(task);
        });
        return map;
    }, [tasks]);

    return (
        <div className="flex flex-col h-full bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
            {/* Header */}
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white/50 backdrop-blur-xl sticky top-0 z-20">
                <div className="flex items-center gap-6">
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono leading-none mb-2">Editorial</h3>
                        <p className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Calendario</p>
                    </div>

                    <div className="h-12 w-px bg-slate-100 mx-2" />

                    <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        <button onClick={prevMonth} className="p-2.5 hover:bg-white rounded-xl shadow-sm transition-all text-slate-400 hover:text-slate-900">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm font-black uppercase tracking-widest min-w-[160px] text-center text-slate-700">
                            {format(viewDate, 'MMMM yyyy', { locale: es })}
                        </span>
                        <button onClick={nextMonth} className="p-2.5 hover:bg-white rounded-xl shadow-sm transition-all text-slate-400 hover:text-slate-900">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Switcher */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-2xl mr-4">
                        <button
                            onClick={() => setCurrentView('calendar')}
                            className={cn(
                                "p-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                currentView === 'calendar' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <CalendarIcon size={14} /> Calendario
                        </button>
                        <button
                            onClick={() => setCurrentView('grid')}
                            className={cn(
                                "p-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                currentView === 'grid' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <TableProperties size={14} /> Grilla
                        </button>
                    </div>

                    <button
                        onClick={handleGenerateStrategy}
                        disabled={isLoadingStrategy}
                        className={cn(
                            "px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center gap-2",
                            isLoadingStrategy && "opacity-70 cursor-wait"
                        )}
                    >
                        {isLoadingStrategy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        {isLoadingStrategy ? "Analizando..." : "Sugerir Estrategia"}
                    </button>
                    <button
                        onClick={() => setIsSchedulingModalOpen(true)}
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        <LayoutList size={14} /> Importar Planificación
                    </button>
                    <button
                        onClick={() => setIsBulkModalOpen(true)}
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        <FileUp size={14} /> Carga Contenidos
                    </button>
                    <button
                        onClick={() => setIsNewTaskModalOpen(true)}
                        className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center gap-2"
                    >
                        <Plus size={14} /> Nuevo
                    </button>
                </div>
            </div>

            {/* Content View */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {currentView === 'calendar' ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-7 border-b border-slate-50">
                            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                                <div key={day} className="py-4 text-center border-r border-slate-50 last:border-none">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{day}</span>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 auto-rows-[180px]">
                            {days.map((day, i) => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const dayTasks = tasksByDay[dateStr] || [];
                                const isToday = isSameDay(day, new Date());
                                const isCurrentMonth = isSameMonth(day, monthStart);

                                return (
                                    <div
                                        key={i}
                                        className={cn(
                                            "border-r border-b border-slate-50 p-3 flex flex-col gap-2 transition-colors relative group",
                                            !isCurrentMonth && "bg-slate-50/30 opacity-40",
                                            isToday && "bg-cyan-50/20"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={cn(
                                                "text-sm font-black w-7 h-7 flex items-center justify-center rounded-full transition-all",
                                                isToday ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30" : "text-slate-400 group-hover:text-slate-900"
                                            )}>
                                                {format(day, 'd')}
                                            </span>
                                            <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-100 rounded-lg transition-all" onClick={() => {
                                                setNewTaskDate(dateStr);
                                                setIsNewTaskModalOpen(true);
                                            }}>
                                                <Plus size={14} className="text-slate-400" />
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5">
                                            {dayTasks.map(task => (
                                                <motion.div
                                                    key={task.id}
                                                    layoutId={task.id}
                                                    onClick={() => setSelectedTask(task)}
                                                    className={cn(
                                                        "p-2.5 rounded-xl border text-[11px] font-bold leading-tight cursor-pointer transition-all shadow-sm hover:translate-y-[-2px]",
                                                        task.status === 'done'
                                                            ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                                            : task.status === 'in_progress'
                                                                ? "bg-purple-50 border-purple-100 text-purple-700"
                                                                : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-1.5 mb-1 opacity-60">
                                                        {task.status === 'done' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                                        <span className="text-[8px] uppercase tracking-wider">{task.status}</span>
                                                    </div>
                                                    <p className="line-clamp-2">{task.title}</p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <EditorialGrid tasks={tasks} onSelectTask={setSelectedTask} onUpdateTask={updateTask} />
                )}
            </div>

            {/* STRATEGY MODAL */}
            <AnimatePresence>
                {isStrategyModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-24 bg-slate-900/60 backdrop-blur-md"
                        onClick={() => setIsStrategyModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-violet-50">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-2">
                                        <Sparkles className="text-indigo-600" /> Estrategia IA
                                    </h2>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                                        Basado en datos de Search Console
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsStrategyModalOpen(false)}
                                    className="p-3 bg-white hover:bg-slate-50 rounded-2xl transition-all shadow-sm"
                                >
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {suggestedTasks.length === 0 ? (
                                    <div className="text-center py-10 opacity-50">
                                        <Ghost size={48} className="mx-auto mb-4 text-slate-300" />
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay sugerencias nuevas por ahora</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {suggestedTasks.map((task, i) => (
                                            <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-md transition-all group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                        Oportunidad
                                                    </span>
                                                    <button
                                                        onClick={() => handleAcceptSuggestion(task)}
                                                        className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                                                    >
                                                        <Plus size={12} /> Agregar
                                                    </button>
                                                </div>
                                                <h3 className="font-bold text-slate-800 mb-1">{task.title}</h3>
                                                <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono">
                                                    <span>KW: {task.target_keyword}</span>
                                                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                    <span>Prioridad: {task.priority}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* TASK DETAILS MODAL */}
            <AnimatePresence>
                {selectedTask && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-24 bg-slate-900/40 backdrop-blur-md"
                        onClick={() => setSelectedTask(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-3">
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                                selectedTask.status === 'done' ? "bg-emerald-100 text-emerald-600" : "bg-purple-100 text-purple-600"
                                            )}>
                                                {selectedTask.status}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                <CalendarIcon size={12} /> {format(new Date(selectedTask.scheduled_date), "d 'de' MMMM", { locale: es })}
                                            </span>
                                        </div>
                                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{selectedTask.title}</h2>
                                    </div>
                                    <button
                                        onClick={() => setSelectedTask(null)}
                                        className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all"
                                    >
                                        <X size={20} className="text-slate-400" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-8 mb-10">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Original Brief / Keywords</label>
                                            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                {selectedTask.brief || "Sin instrucciones adicionales."}
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={() => router.push(`/writer?activeTaskId=${selectedTask.id}`)}
                                                className="w-full py-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3"
                                            >
                                                <Sparkles size={16} className="text-cyan-400" /> Redactar con IA Nous
                                            </button>

                                            <button
                                                onClick={() => setIsUploadModalOpen(true)}
                                                className="w-full py-5 bg-white border-2 border-slate-100 text-slate-600 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
                                            >
                                                <Paperclip size={16} /> Adjuntar Contenido Externo
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="p-6 bg-cyan-50/30 rounded-[32px] border border-cyan-100/50">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20">
                                                    <Ghost size={16} />
                                                </div>
                                                <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">Humanización Directa</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                                ¿Ya tienes el texto? Súbelo y la IA lo procesará para eliminar patrones robóticos manteniendo tus enlaces.
                                            </p>
                                            <button
                                                onClick={() => router.push(`/writer?mode=humanize&activeTaskId=${selectedTask.id}`)}
                                                className="w-full py-3 bg-white text-cyan-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-cyan-200 hover:bg-cyan-50 transition-all"
                                            >
                                                Subir y Humanizar Ahora
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* UPLOAD MODAL */}
            <AnimatePresence>
                {isUploadModalOpen && selectedTask && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white w-full max-w-xl rounded-[40px] p-10 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Adjuntar Contenido</h2>
                                <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all"><X size={20} /></button>
                            </div>

                            <div className="space-y-6">
                                <input
                                    type="file"
                                    id="single-upload"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const content = file.name.endsWith('.docx') ? await parseDocx(file) : await parseHtml(file);
                                            handleDirectUpload(selectedTask.id, content, false);
                                        }
                                    }}
                                />
                                <label htmlFor="single-upload" className="block border-2 border-dashed border-slate-100 rounded-[32px] p-12 text-center hover:bg-slate-50 transition-all cursor-pointer group">
                                    <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <FileUp size={32} />
                                    </div>
                                    <p className="text-sm font-bold text-slate-600 mb-1">Cargar archivo HTML o DOCX</p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">Haz clic para explorar</p>
                                </label>

                                <div className="relative">
                                    <div className="absolute inset-x-0 top-1/2 h-px bg-slate-100" />
                                    <span className="relative z-10 mx-auto w-12 h-6 bg-white flex items-center justify-center text-[10px] font-black text-slate-300">O</span>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 leading-none">Pega el texto enriquecido (HTML)</label>
                                    <div className="relative">
                                        <textarea
                                            id="pasted-html"
                                            className="w-full min-h-[200px] bg-slate-50 border border-slate-100 rounded-[24px] p-6 text-sm text-slate-600 outline-none focus:border-slate-300 transition-all font-mono"
                                            placeholder="Pega tu HTML aquí..."
                                        />
                                        <div className="absolute top-4 right-4">
                                            <Clipboard size={16} className="text-slate-300" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => {
                                            const val = (document.getElementById('pasted-html') as HTMLTextAreaElement)?.value;
                                            if (val) handleDirectUpload(selectedTask.id, val, false);
                                        }}
                                        className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/20"
                                    >
                                        Guardar Adjunto
                                    </button>
                                    <button
                                        onClick={() => {
                                            const val = (document.getElementById('pasted-html') as HTMLTextAreaElement)?.value;
                                            if (val) handleDirectUpload(selectedTask.id, val, true);
                                        }}
                                        className="flex-1 py-4 bg-cyan-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                                    >
                                        <Sparkles size={14} /> Guardar y Humanizar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* BULK UPLOAD MODAL */}
            <AnimatePresence>
                {isBulkModalOpen && (
                    <MassUploadModal onClose={() => setIsBulkModalOpen(false)} />
                )}
            </AnimatePresence>

            {/* NEW TASK MODAL */}
            <AnimatePresence>
                {isNewTaskModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Planificar</h2>
                                <button onClick={() => setIsNewTaskModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all"><X size={20} /></button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Título del Contenido</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm outline-none focus:border-slate-300 transition-all font-bold text-slate-900"
                                        placeholder="Ej: Maximizando Conversiones..."
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Fecha de Publicación</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm outline-none focus:border-slate-300 transition-all font-bold text-slate-900"
                                        value={newTaskDate}
                                        onChange={(e) => setNewTaskDate(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={handleCreateQuickTask}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/20"
                                >
                                    Agendar Contenido
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
                {isSchedulingModalOpen && (
                    <MassSchedulingModal onClose={() => setIsSchedulingModalOpen(false)} />
                )}
            </AnimatePresence>
        </div>
    );
}

function EditorialGrid({ tasks, onSelectTask, onUpdateTask }: { tasks: Task[], onSelectTask: (t: Task) => void, onUpdateTask: (id: string, updates: any) => void }) {
    const sortedTasks = [...tasks].sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());

    return (
        <div className="flex-1 overflow-auto p-8">
            <table className="w-full border-separate border-spacing-y-2">
                <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-left">
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4">Fecha</th>
                        <th className="px-6 py-4">Título del Contenido</th>
                        <th className="px-6 py-4">Brief / Keywords</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedTasks.map(task => (
                        <tr
                            key={task.id}
                            onClick={() => onSelectTask(task)}
                            className="group bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-pointer"
                        >
                            <td className="px-6 py-4 first:rounded-l-2xl">
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex",
                                    task.status === "done" ? "bg-emerald-100 text-emerald-600" : "bg-purple-100 text-purple-600"
                                )}>
                                    {task.status}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-xs font-bold text-slate-500">{format(new Date(task.scheduled_date), "dd MMM yyyy", { locale: es })}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-sm font-black text-slate-900 tracking-tight">{task.title}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-xs text-slate-400 line-clamp-1">{task.brief || "--"}</span>
                            </td>
                            <td className="px-6 py-4 text-right last:rounded-r-2xl">
                                <button className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                                    <MoreVertical size={16} className="text-slate-300" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function MassSchedulingModal({ onClose }: { onClose: () => void }) {
    const [pastedData, setPastedData] = useState("");
    const [parsedTasks, setParsedTasks] = useState<{ title: string, date: string }[]>([]);
    const { activeProject, addTask } = useProjectStore();
    const [isSaving, setIsSaving] = useState(false);

    const handleParse = () => {
        const lines = pastedData.split("\n").filter(l => l.trim());
        const tasks = lines.map(line => {
            const parts = line.split(/[\t,;]/);
            const title = parts[0]?.trim();
            let date = parts[1]?.trim();

            if (!date || isNaN(new Date(date).getTime())) {
                date = format(new Date(), "yyyy-MM-dd");
            } else {
                date = format(new Date(date), "yyyy-MM-dd");
            }

            return { title, date };
        }).filter(t => t.title);
        setParsedTasks(tasks);
    };

    const handleSave = async () => {
        if (!activeProject) return;
        setIsSaving(true);
        for (const task of parsedTasks) {
            await addTask({
                project_id: activeProject.id,
                title: task.title,
                scheduled_date: task.date,
                status: "todo",
                brief: ""
            });
        }
        setIsSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden"
            >
                <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Importar Planificación Masiva</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pega desde Excel o sube un CSV</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"><X size={20} /></button>
                </div>

                <div className="p-10 space-y-8">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Programación (Título [TAB/COMA] Fecha)</label>
                        <textarea
                            className="w-full h-48 bg-slate-50 border border-slate-100 rounded-3xl p-6 text-sm font-mono outline-none focus:border-slate-300 transition-all"
                            placeholder={"Mi primer articulo\t2026-03-01\nMi segundo articulo\t2026-03-02..."}
                            value={pastedData}
                            onChange={(e) => setPastedData(e.target.value)}
                        />
                        <button
                            onClick={handleParse}
                            className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                            Previsualizar {parsedTasks.length > 0 && `(${parsedTasks.length} detectados)`}
                        </button>
                    </div>

                    {parsedTasks.length > 0 && (
                        <div className="max-h-48 overflow-y-auto border border-slate-50 rounded-2xl p-4 bg-slate-50/30">
                            {parsedTasks.map((t, i) => (
                                <div key={i} className="flex justify-between py-2 border-b border-slate-100 last:border-none text-xs">
                                    <span className="font-bold text-slate-700">{t.title}</span>
                                    <span className="text-slate-400">{t.date}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                    <button onClick={onClose} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Cancelar</button>
                    <button
                        disabled={parsedTasks.length === 0 || isSaving}
                        onClick={handleSave}
                        className="px-12 py-4 bg-slate-900 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 disabled:opacity-50"
                    >
                        {isSaving ? "Procesando..." : "Confirmar e Importar"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}


// Helper to handle individual file/text upload linking
// Helper to handle individual file/text upload linking
import { parseDocx, parseHtml } from "../tools/writer/services";

async function saveContentAndLink(taskId: string, html: string, userId?: string) {
    const { data: draft, error: draftErr } = await supabase.from('content_drafts').insert({
        user_id: userId,
        html_content: html,
        title: 'Contenido Adjunto'
    }).select().single();

    if (draftErr) throw draftErr;

    const { error: linkErr } = await supabase.from('task_artifacts').insert({
        task_id: taskId,
        artifact_type: 'draft',
        artifact_reference: draft.id,
        name: 'Borrador Adjunto'
    });

    if (linkErr) throw linkErr;

    await supabase.from('content_tasks').update({ status: 'in_progress' }).eq('id', taskId);

    return draft.id;
}

function MassUploadModal({ onClose }: { onClose: () => void }) {
    const [filesWithData, setFilesWithData] = useState<{ file: File, content: string, matchedTaskId: string | null }[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [autoHumanize, setAutoHumanize] = useState(false);
    const { tasks } = useProjectStore();
    const router = useRouter();

    const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const newData = await Promise.all(files.map(async f => {
            const content = f.name.endsWith('.docx') ? await parseDocx(f) : await parseHtml(f);
            const fileName = f.name.toLowerCase().replace(/\.(docx|html|txt)$/, '').replace(/[-_]/g, ' ');
            const match = tasks.find(t => {
                const title = t.title.toLowerCase();
                return title.includes(fileName) || fileName.includes(title);
            });
            return { file: f, content, matchedTaskId: match?.id || null };
        }));
        setFilesWithData(prev => [...prev, ...newData]);
    };

    const handleStartProcessing = async () => {
        setIsProcessing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const results = await Promise.all(filesWithData.filter(f => f.matchedTaskId).map(async f => {
                const draftId = await saveContentAndLink(f.matchedTaskId!, f.content, session?.user?.id);
                return { draftId, taskId: f.matchedTaskId };
            }));

            if (autoHumanize && results.length > 0) {
                router.push(`/writer?mode=humanize&draftId=${results[0].draftId}&activeTaskId=${results[0].taskId}`);
            } else {
                onClose();
            }
        } catch (err) {
            console.error("Bulk upload error:", err);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
                <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Carga Masiva</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sincroniza múltiples archivos</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 group">
                        <X size={20} className="group-active:scale-95 transition-transform" />
                    </button>
                </div>

                <div className="flex-1 p-10 overflow-y-auto custom-scrollbar flex flex-col gap-8">
                    <div className="border-2 border-dashed border-slate-100 rounded-[40px] p-20 text-center hover:bg-slate-50/50 transition-all cursor-pointer group bg-slate-50/20 relative">
                        <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileSelection} />
                        <div className="w-20 h-20 rounded-full bg-white shadow-xl shadow-slate-200/50 text-slate-400 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                            <FileUp size={32} />
                        </div>
                        <h4 className="text-lg font-black text-slate-700 uppercase tracking-tighter italic mb-2">Selecciona múltiples archivos</h4>
                        <p className="text-sm text-slate-400 mb-6 px-12">Detectamos automáticamente a qué contenido programado pertenece cada archivo.</p>
                        <span className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all">
                            Seleccionar Archivos
                        </span>
                    </div>

                    {filesWithData.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2 px-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filesWithData.length} Archivos Encontrados</span>
                                <button onClick={() => setFilesWithData([])} className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-500">Limpiar Todo</button>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {filesWithData.map((item, idx) => (
                                    <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-[20px] flex items-center justify-between group animate-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-300"><FileText size={20} /></div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700 tracking-tight">{item.file.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {item.matchedTaskId ? (
                                                        <div className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-[8px] font-black text-emerald-600 uppercase tracking-widest">Auto-Detectado</div>
                                                    ) : (
                                                        <div className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-100 text-[8px] font-black text-amber-600 uppercase tracking-widest">Sin asignar</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                className="bg-white border-none rounded-xl text-[10px] font-bold text-slate-500 py-2 px-4 shadow-sm outline-none"
                                                value={item.matchedTaskId || ""}
                                                onChange={(e) => {
                                                    const newArr = [...filesWithData];
                                                    newArr[idx].matchedTaskId = e.target.value;
                                                    setFilesWithData(newArr);
                                                }}
                                            >
                                                <option value="">Asignar manualmente...</option>
                                                {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                            </select>
                                            <button onClick={() => setFilesWithData(filesWithData.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-red-400 transition-colors"><Trash size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-10 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acción Conjunta</span>
                        <label className="flex items-center gap-2 cursor-pointer mt-1">
                            <input type="checkbox" className="w-4 h-4 rounded-md border-slate-200 text-cyan-500 focus:ring-cyan-500" checked={autoHumanize} onChange={(e) => setAutoHumanize(e.target.checked)} />
                            <span className="text-[11px] font-bold text-slate-600">Humanizar automáticamente</span>
                        </label>
                    </div>
                    <button disabled={filesWithData.length === 0 || isProcessing} onClick={handleStartProcessing} className="px-12 py-5 bg-slate-900 text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3">
                        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <><Check size={18} /> Iniciar Procesamiento</>}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
