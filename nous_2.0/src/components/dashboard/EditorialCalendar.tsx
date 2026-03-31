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
    addDays,
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
    LayoutDashboard,
    Upload,
    Database,
    Wand2,
    Lock
} from "lucide-react";
import { useProjectStore, Task } from "@/store/useProjectStore";
import { supabase } from "@/lib/supabase";
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";

import { useRouter } from "next/navigation";
import { NotificationService } from "@/lib/services/notifications";
import { useWriterStore } from "@/store/useWriterStore";
import { parseDocx, parseHtml } from "@/lib/utils/data-importer";
import Papa from "papaparse";
import StrategyGrid from "./StrategyGrid";
import IntelligenceHub from "./IntelligenceHub";

import { StrategyService } from "@/lib/services/strategy";
import { ProjectBadge } from "@/components/ui/ProjectBadge";

export function EditorialCalendar() {
    const { tasks, activeProject, updateTask, addTask } = useProjectStore();
    const { initializeFromTask } = useWriterStore();
    const router = useRouter();
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
    const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
    const [taskForImages, setTaskForImages] = useState<Task | null>(null);
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

    // --- Google Sheets Sync Logic ---
    const handleSyncWithSheet = async (url: string) => {
        setIsLoadingStrategy(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error("No hay sesión activa. Conecta tu cuenta de Google.");

            // 1. Fetch Sheet Data
            const response = await fetch('/api/google/fetch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ url, type: 'sheet' })
            });

            if (!response.ok) throw new Error("Error fetching sheet. Verifica permisos.");

            const { content } = await response.json();

            if (!content || !Array.isArray(content) || content.length < 2) {
                alert("Hoja vacía o sin encabezados válidos.");
                return;
            }

            // 2. Parse Headers (Assume Row 1)
            const headers = content[0].map((h: string) => h.toLowerCase().trim());
            const rows = content.slice(1);

            let count = 0;

            // 3. Map to Tasks
            for (const row of rows) {
                const getVal = (key: string) => {
                    const idx = headers.findIndex((h: string) => h.includes(key));
                    return idx !== -1 ? row[idx] : '';
                };

                const title = getVal('título') || getVal('title') || getVal('tema');
                if (!title) continue;

                // Date logic
                let dateStr = getVal('fecha') || getVal('date') || getVal('publicación');
                if (!dateStr || isNaN(new Date(dateStr).getTime())) {
                    dateStr = format(new Date(), 'yyyy-MM-dd'); // Default to today if missing
                } else {
                    dateStr = format(new Date(dateStr), 'yyyy-MM-dd');
                }

                // Call addTask from store
                if (activeProject) {
                    await addTask({
                        project_id: activeProject.id,
                        title,
                        scheduled_date: dateStr,
                        status: 'todo',
                        target_keyword: getVal('keyword') || getVal('kw') || '',
                        volume: parseInt(getVal('volumen') || '0'),
                        viability: getVal('viabilidad') || '',
                        brief: getVal('brief') || getVal('notas') || '',
                    });
                    count++;
                }
            }

            NotificationService.notify("Sincronización Completa", `Se han importado ${count} tareas desde la hoja.`);

        } catch (e: any) {
            console.error(e);
            alert("Error de Sincronización: " + e.message);
        } finally {
            setIsLoadingStrategy(false);
        }
    };

    const handleExportToSheet = async () => {
        setIsLoadingStrategy(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error("No hay sesión activa.");

            // 1. Prepare Data
            const headers = ["Título", "Fecha", "Estado", "Keyword", "Volumen", "Brief", "Notas"];
            const rows = tasks.map(t => [
                t.title,
                t.scheduled_date,
                t.status,
                t.target_keyword || "",
                t.volume?.toString() || "",
                t.brief || "",
                "" // Extra column
            ]);

            const sheetData = [headers, ...rows];
            const title = `Planificación - ${activeProject?.name || 'Nous'} - ${format(new Date(), 'yyyy-MM-dd')}`;

            // 2. Call Export API
            const response = await fetch('/api/google/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'create_sheet',
                    title: title,
                    data: sheetData
                })
            });

            if (!response.ok) throw new Error("Failed to export sheet");

            const { url } = await response.json();
            window.open(url, '_blank');
            NotificationService.notify("Exportación Exitosa", "Hoja de cálculo creada.");

        } catch (e: any) {
            console.error(e);
            alert("Error al exportar: " + e.message);
        } finally {
            setIsLoadingStrategy(false);
        }
    };

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
        <div className="flex flex-col h-full bg-white rounded-[24px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white/50 backdrop-blur-xl sticky top-0 z-20">
                <div className="flex items-center gap-6">
                    <div>
                        <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono leading-none mb-1.5">Editorial</h3>
                        <p className="text-xl font-black text-slate-900 tracking-tight uppercase italic leading-none">Calendario</p>
                    </div>

                    <div className="h-8 w-px bg-slate-100 mx-1" />

                    <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                        <button onClick={prevMonth} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-900">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-[11px] font-bold uppercase tracking-widest min-w-[120px] text-center text-slate-600">
                            {format(viewDate, 'MMMM yyyy', { locale: es })}
                        </span>
                        <button onClick={nextMonth} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-900">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Switcher */}
                    <div className="flex items-center bg-slate-50 p-1 rounded-xl mr-2 border border-slate-100">
                        <button
                            onClick={() => setCurrentView('calendar')}
                            className={cn(
                                "p-1.5 px-3 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                                currentView === 'calendar' ? "bg-white text-slate-900 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <CalendarIcon size={12} /> Calendario
                        </button>
                        <button
                            onClick={() => setCurrentView('grid')}
                            className={cn(
                                "p-1.5 px-3 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                                currentView === 'grid' ? "bg-white text-slate-900 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <TableProperties size={12} /> Grilla
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Secondary Actions (Grouped) */}
                        <div className="flex items-center bg-slate-50 rounded-xl px-1 border border-slate-100">
                            <button
                                onClick={() => setIsSchedulingModalOpen(true)}
                                className="p-2.5 text-slate-400 hover:text-slate-600 transition-all rounded-lg"
                                title="Importar Planificación"
                            >
                                <LayoutList size={16} />
                            </button>
                            <button
                                onClick={() => {
                                    const url = prompt("Ingresa la URL de tu Google Sheet para IMPORTAR tareas:");
                                    if (url) handleSyncWithSheet(url);
                                }}
                                className="p-2.5 text-slate-400 hover:text-green-600 transition-all rounded-lg"
                                title="Importar Google Sheet"
                            >
                                <Database size={16} />
                            </button>
                            <button
                                onClick={handleExportToSheet}
                                disabled={tasks.length === 0}
                                className="p-2.5 text-slate-400 hover:text-green-600 transition-all rounded-lg"
                                title="Exportar a Sheet"
                            >
                                <FileUp size={16} />
                            </button>
                            <button
                                onClick={() => setIsBulkModalOpen(true)}
                                className="p-2.5 text-slate-400 hover:text-slate-600 transition-all rounded-lg"
                                title="Importar CSV"
                            >
                                <Upload size={16} />
                            </button>
                        </div>

                        <div className="w-px h-6 bg-slate-100 mx-1" />

                        <button
                            onClick={handleGenerateStrategy}
                            disabled={isLoadingStrategy}
                            className={cn(
                                "px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center gap-2",
                                isLoadingStrategy && "opacity-70 cursor-wait"
                            )}
                        >
                            {isLoadingStrategy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            {isLoadingStrategy ? "..." : "Sugerir Estrategia"}
                        </button>

                        <button
                            onClick={() => setIsNewTaskModalOpen(true)}
                            className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md flex items-center gap-2"
                        >
                            <Plus size={14} /> Nuevo
                        </button>
                    </div>
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

                        <div className="grid grid-cols-7 auto-rows-[130px]">
                            {days.map((day, i) => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const dayTasks = tasksByDay[dateStr] || [];
                                const isToday = isSameDay(day, new Date());
                                const isCurrentMonth = isSameMonth(day, monthStart);

                                return (
                                    <div
                                        key={i}
                                        className={cn(
                                            "border-r border-b border-slate-50 p-2 flex flex-col gap-1 transition-colors relative group",
                                            !isCurrentMonth && "bg-slate-50/30 opacity-40",
                                            isToday && "bg-cyan-50/10"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-0.5">
                                            <span className={cn(
                                                "text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all",
                                                isToday ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20" : "text-slate-300 group-hover:text-slate-600"
                                            )}>
                                                {format(day, 'd')}
                                            </span>
                                            <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-100 rounded-lg transition-all" onClick={() => {
                                                setNewTaskDate(dateStr);
                                                setIsNewTaskModalOpen(true);
                                            }}>
                                                <Plus size={12} className="text-slate-400" />
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                            {dayTasks.map(task => (
                                                <motion.div
                                                    key={task.id}
                                                    layoutId={task.id}
                                                    onClick={() => setSelectedTask(task)}
                                                    className={cn(
                                                        "p-1.5 rounded-lg border text-[10px] font-bold leading-tight cursor-pointer transition-all hover:border-slate-300",
                                                        task.status === 'done'
                                                            ? "bg-emerald-50/50 border-emerald-100 text-emerald-700"
                                                            : task.status === 'in_progress'
                                                                ? "bg-purple-50/50 border-purple-100 text-purple-700"
                                                                : "bg-white border-slate-100 text-slate-500"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between mb-1 gap-1">
                                                        <ProjectBadge projectId={task.project_id} className="scale-75 origin-top-left" />
                                                        {task.locked_by && task.locked_until && new Date(task.locked_until) > new Date() && (
                                                            <span title="Siendo editada"><Lock size={10} className="text-red-400" /></span>
                                                        )}
                                                    </div>
                                                    <p className="line-clamp-1">{task.title}</p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <StrategyGrid onSelectTask={setSelectedTask} />
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
                                            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                                                {selectedTask.brief || "Sin instrucciones adicionales."}
                                            </p>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Keywords</span>
                                                    <p className="text-xs font-bold text-slate-700 truncate" title={selectedTask.target_keyword}>{selectedTask.target_keyword || "--"}</p>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Volumen</span>
                                                    <p className="text-xs font-bold text-slate-700">{selectedTask.volume || "--"}</p>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Viabilidad</span>
                                                    <p className="text-xs font-bold text-slate-700 truncate" title={selectedTask.viability}>{selectedTask.viability || "--"}</p>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ref URLs</span>
                                                    <p className="text-xs font-bold text-slate-700">{selectedTask.refs?.length || 0} Links</p>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 mt-6">
                                                <IntelligenceHub
                                                    taskId={selectedTask.id}
                                                    targetKeyword={selectedTask.target_keyword}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={() => {
                                                    initializeFromTask(selectedTask, activeProject);
                                                    router.push('/studio/writer');
                                                }}
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



function MassSchedulingModal({ onClose }: { onClose: () => void }) {
    const [pastedData, setPastedData] = useState("");
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [parsedTasks, setParsedTasks] = useState<any[]>([]);
    const [enrichWithSEO, setEnrichWithSEO] = useState(false);
    const { activeProject, addTask } = useProjectStore();
    const [isSaving, setIsSaving] = useState(false);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setPastedData(text);
            // Auto-parsear después de cargar
            setTimeout(() => handleParse(), 100);
        };
        reader.readAsText(file);
    };

    const handleParse = () => {
        if (!pastedData.trim()) return;

        // Intentar parsear como CSV con encabezados
        Papa.parse(pastedData, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.trim(), // Limpiar espacios en encabezados
            complete: (results) => {
                console.log("Parsed result:", results);

                // Si detectamos columnas conocidas, usamos la lógica de CSV avanzado
                const hasKnownColumns = results.meta.fields?.some(f =>
                    ['Título Propuesto', 'Keywords', 'Volumen', 'Viabilidad'].some(k => f.includes(k))
                );

                if (hasKnownColumns && results.data.length > 0) {
                    const tasks = results.data.map((row: any, index: number) => {
                        // Mapeo inteligente de columnas
                        const title = row['Título Propuesto'] || row['Title'] || row['Título'] || '';

                        // Fecha: Si no hay columna fecha, usamos la fecha de inicio + index días
                        // Ojo: Esto asume 1 tarea por día si no se especifica.
                        let dateStr = row['Fecha'] || row['Date'];
                        if (!dateStr) {
                            // Distribución simple: 1 por día laborable? O todos seguidos?
                            // Por simplicidad, 1 por día desde la fecha de inicio
                            const baseDate = new Date(startDate);
                            const targetDate = addDays(baseDate, index);
                            dateStr = format(targetDate, 'yyyy-MM-dd');
                        }

                        // Parsear referencias (formato [url], [url])
                        const refsRaw = row['Referencias'] || '';
                        const refs = refsRaw.match(/\[(.*?)\]/g)?.map((r: string) => r.slice(1, -1)) || [];

                        return {
                            title,
                            scheduled_date: dateStr,
                            target_keyword: row['Keywords (5)'] || row['Keywords'] || '',
                            volume: parseInt(row['Volumen']?.replace(/[^0-9]/g, '') || '0'),
                            viability: row['Viabilidad'] || '',
                            brief: row['Notas para redacción'] || row['Brief'] || '',
                            word_count: parseInt(row['Palabras']?.replace(/[^0-9]/g, '') || '0'),
                            ai_percentage: parseInt(row['% IA']?.replace(/[^0-9]/g, '') || '0'),
                            docs_url: row['Docs'] || '',
                            layout_status: row['Maquetado'] === 'TRUE' || row['Maquetado'] === 'true',
                            refs: refs
                        };
                    }).filter((t: any) => t.title);
                    setParsedTasks(tasks);
                } else {
                    // Fallback: Parseo simple por tabulaciones/comas sin header (formato legacy)
                    const lines = pastedData.split("\n").filter(l => l.trim());
                    const tasks = lines.map((line, index) => {
                        const parts = line.split(/[\t,;]/);
                        const title = parts[0]?.trim();
                        let date = parts[1]?.trim();

                        if (!date || isNaN(new Date(date).getTime())) {
                            // Si no hay fecha válida, usar fecha inicio + index
                            const baseDate = new Date(startDate);
                            const targetDate = addDays(baseDate, index);
                            date = format(targetDate, 'yyyy-MM-dd');
                        } else {
                            date = format(new Date(date), "yyyy-MM-dd");
                        }

                        return { title, scheduled_date: date };
                    }).filter(t => t.title);
                    setParsedTasks(tasks);
                }
            }
        });
    };

    const handleSave = async () => {
        if (!activeProject) return;
        setIsSaving(true);

        try {
            let tasksToSave = [...parsedTasks];

            if (enrichWithSEO) {
                const keywords = tasksToSave.map(t => t.target_keyword).filter(Boolean);
                if (keywords.length > 0) {
                    const response = await fetch('/api/dataforseo/keywords', {
                        method: 'POST',
                        body: JSON.stringify({ keywords })
                    });
                    const result = await response.json();
                    if (result.success) {
                        tasksToSave = tasksToSave.map(t => {
                            const match = result.data.find((m: any) => m.keyword.toLowerCase() === t.target_keyword.toLowerCase());
                            return match ? { ...t, volume: match.search_volume, viability: match.competition_level } : t;
                        });
                    }
                }
            }

            for (const task of tasksToSave) {
                await addTask({
                    project_id: activeProject.id,
                    title: task.title,
                    scheduled_date: task.scheduled_date,
                    status: "todo",
                    brief: task.brief || "",
                    target_keyword: task.target_keyword,
                    volume: task.volume,
                    viability: task.viability,
                    refs: task.refs,
                    word_count: task.word_count,
                    ai_percentage: task.ai_percentage,
                    docs_url: task.docs_url,
                    layout_status: task.layout_status
                });
            }
            NotificationService.notify("Importación Exitosa", `Se han programado ${tasksToSave.length} nuevas tareas estratégicas.`);
            onClose();
        } catch (e: any) {
            console.error("Import error:", e);
            NotificationService.notify("Error de Importación", e.message || "No se pudo completar la carga masiva.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Importar Planificación</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Soporta CSV de Planificación Editorial</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white hover:bg-slate-50 rounded-2xl transition-all text-slate-400 shadow-sm border border-slate-100"><X size={20} /></button>
                </div>

                <div className="p-8 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">1. Configuración Inicial</label>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                                <div>
                                    <span className="text-xs font-bold text-slate-700 block mb-2">Fecha de Inicio (para tareas sin fecha)</span>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-indigo-500 transition-all font-bold text-slate-900"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2">Las tareas sin fecha en el CSV se programarán consecutivamente a partir de este día.</p>
                                </div>

                                <div className="pt-4 border-t border-slate-200">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={cn(
                                            "w-6 h-6 rounded-lg border flex items-center justify-center transition-all",
                                            enrichWithSEO ? "bg-cyan-500 border-cyan-500 shadow-lg shadow-cyan-500/20" : "bg-white border-slate-200 group-hover:border-cyan-200"
                                        )}>
                                            {enrichWithSEO && <Database size={14} className="text-white" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={enrichWithSEO}
                                            onChange={(e) => setEnrichWithSEO(e.target.checked)}
                                        />
                                        <div>
                                            <span className="text-xs font-black text-slate-900 uppercase tracking-tight block">Enriquecer con DataForSEO</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block opacity-70">Obtiene volumen y viabilidad en vivo</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">2. Cargar o Pegar CSV</label>

                            {/* Botón de carga de archivo */}
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="csv-file-input"
                                />
                                <label
                                    htmlFor="csv-file-input"
                                    className="w-full py-4 bg-gradient-to-r from-indigo-50 to-violet-50 border-2 border-dashed border-indigo-200 rounded-2xl text-xs font-bold text-indigo-600 hover:border-indigo-400 transition-all cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <Upload size={16} /> Seleccionar Archivo CSV
                                </label>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-slate-200"></div>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">O Pegar Datos</span>
                                <div className="flex-1 h-px bg-slate-200"></div>
                            </div>

                            <textarea
                                className="w-full h-32 bg-slate-50 border border-slate-100 rounded-3xl p-6 text-xs font-mono outline-none focus:border-indigo-500 transition-all resize-none"
                                placeholder={`Título Propuesto,Keywords (5),Volumen,...\nMi Articulo,"key1, key2",100,...`}
                                value={pastedData}
                                onChange={(e) => setPastedData(e.target.value)}
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={handleParse}
                                    disabled={!pastedData.trim()}
                                    className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50"
                                >
                                    Procesar Datos
                                </button>
                            </div>
                        </div>
                    </div>

                    {parsedTasks.length > 0 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Vista Previa ({parsedTasks.length} items)</label>
                                <button onClick={() => setParsedTasks([])} className="text-[10px] font-bold text-red-400 hover:text-red-500 uppercase tracking-widest">Limpiar</button>
                            </div>
                            <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-2xl bg-white shadow-sm custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 sticky top-0 z-10">
                                        <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="p-4 border-b border-slate-100">Fecha</th>
                                            <th className="p-4 border-b border-slate-100">Título</th>
                                            <th className="p-4 border-b border-slate-100">KW</th>
                                            <th className="p-4 border-b border-slate-100 text-right">Vol</th>
                                            <th className="p-4 border-b border-slate-100 text-center">IA%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedTasks.map((t, i) => (
                                            <tr key={i} className="border-b border-slate-50 last:border-none hover:bg-slate-50/50 transition-colors text-xs">
                                                <td className="p-4 font-mono text-slate-500 whitespace-nowrap">{t.scheduled_date}</td>
                                                <td className="p-4 font-bold text-slate-700">{t.title}</td>
                                                <td className="p-4 text-slate-500 max-w-[150px] truncate" title={t.target_keyword}>{t.target_keyword}</td>
                                                <td className="p-4 text-slate-400 font-mono text-right">{t.volume || '-'}</td>
                                                <td className="p-4 text-slate-400 font-mono text-center">{t.ai_percentage ? `${t.ai_percentage}%` : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-8 bg-white border-t border-slate-50 flex justify-end gap-4 z-20">
                    <button onClick={onClose} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
                    <button
                        disabled={parsedTasks.length === 0 || isSaving}
                        onClick={handleSave}
                        className="px-12 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 disabled:opacity-50 hover:shadow-indigo-500/40 transition-all transform hover:-translate-y-1"
                    >
                        {isSaving ? (
                            <div className="flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" /> Procesando...
                            </div>
                        ) : "Confirmar e Importar"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}


// Helper to handle individual file/text upload linking

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

    await supabase.from('tasks').update({ status: 'in_progress' }).eq('id', taskId);

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
