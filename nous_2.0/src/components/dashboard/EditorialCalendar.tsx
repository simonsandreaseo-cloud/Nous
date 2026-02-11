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
    Trash
} from "lucide-react";
import { useProjectStore, Task } from "@/store/useProjectStore";
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function EditorialCalendar() {
    const { tasks, activeProject, updateTask, addTask } = useProjectStore();
    const router = useRouter();
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskDate, setNewTaskDate] = useState(format(new Date(), 'yyyy-MM-dd'));

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
                    <button
                        onClick={() => setIsBulkModalOpen(true)}
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        <FileUp size={14} /> Carga Masiva
                    </button>
                    <button
                        onClick={() => setIsNewTaskModalOpen(true)}
                        className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center gap-2"
                    >
                        <Plus size={14} /> Nuevo Contenido
                    </button>
                </div>
            </div>

            {/* Grid */}
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
                                    <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-100 rounded-lg transition-all">
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
            </AnimatePresence>
        </div>
    );
}

// Helper to handle individual file/text upload linking
import { supabase } from "@/lib/supabase";
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
