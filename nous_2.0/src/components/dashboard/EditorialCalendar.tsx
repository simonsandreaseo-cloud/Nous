"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
    Upload,
    Database,
    Wand2,
    Lock,
    Hash,
    FileDown,
    Trash2,
    Layers
} from "lucide-react";
import { useProjectStore, Task } from "@/store/useProjectStore";
import { usePermissions } from '@/hooks/usePermissions';

import { StrategyService, addStrategyLog } from "@/lib/services/strategy";
import { supabase } from "@/lib/supabase";
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";

import { useRouter } from "next/navigation";
import { NotificationService } from "@/lib/services/notifications";
import { useWriterStore } from "@/store/useWriterStore";
import { parseDocx, parseHtml } from "@/lib/utils/data-importer";
import Papa from "papaparse";
import StrategyGrid from "./StrategyGrid";
// import IntelligenceHub from "./IntelligenceHub";
import NousOrb from "./NousOrb";
import { BatchProcessor } from '@/lib/services/writer/batch-actions';

import { ProjectBadge } from "@/components/ui/ProjectBadge";
import NewContentModal from "./NewContentModal";
import ContentDetailView from "./ContentDetailView";
import { useSearchParams } from "next/navigation";

export function EditorialCalendar() {
    const { tasks, activeProject, activeProjectIds, updateTask, addTask, fetchProjectTasks, deleteTasks } = useProjectStore();
    const isConsoleOpen = useWriterStore(state => state.isConsoleOpen);
    const setIsConsoleOpen = useWriterStore(state => state.setIsConsoleOpen);
    const initializeFromTask = useWriterStore(state => state.initializeFromTask);
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
    const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
    const [isNewContentModalOpen, setIsNewContentModalOpen] = useState(false);
    const [researchTaskId, setResearchTaskId] = useState<string | undefined>(undefined);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [isResearching, setIsResearching] = useState(false);
    const [researchProgress, setResearchProgress] = useState<number>(0);
    const searchParams = useSearchParams();

    // Column Visibility State
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('ns_grid_columns');
            if (saved) return JSON.parse(saved);
        }
        return [
            { id: 'project', label: 'Proy.', defaultVisible: true },
            { id: 'status', label: 'Estado', defaultVisible: true },
            { id: 'date', label: 'Publicación', defaultVisible: true },
            { id: 'title', label: 'Título', defaultVisible: true },
            { id: 'seo_title', label: 'SEO Title', defaultVisible: false },
            { id: 'slug', label: 'Slug / URL', defaultVisible: false },
            { id: 'meta_description', label: 'Meta Desc.', defaultVisible: false },
            { id: 'keywords', label: 'Keywords', defaultVisible: false },
            { id: 'strategy', label: 'Estrategia', defaultVisible: false },
            { id: 'assigned', label: 'Responsable', defaultVisible: false },
            { id: 'total_volume', label: 'Vol.', defaultVisible: false },
            { id: 'word_count', label: 'Palabras', defaultVisible: false },
            { id: 'lsi', label: 'LSI', defaultVisible: false },
            { id: 'competitors', label: 'Fuentes', defaultVisible: false },
            { id: 'actions', label: 'Acciones', defaultVisible: true }
        ].reduce((acc, col) => ({ ...acc, [col.id]: col.defaultVisible }), {});
    });

    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
    const [isBatchMenuOpen, setIsBatchMenuOpen] = useState(false);
    const [batchResearchStatus, setBatchResearchStatus] = useState<Record<string, number>>({});
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const toggleColumn = (colId: string) => {
        const newVisibility = { ...columnVisibility, [colId]: !columnVisibility[colId] };
        setColumnVisibility(newVisibility);
        localStorage.setItem('ns_grid_columns', JSON.stringify(newVisibility));
    };

    // Fetch tasks on mount or when active projects change
    useEffect(() => {
        if (activeProjectIds.length > 0) {
            fetchProjectTasks(activeProjectIds[0]);
        }
    }, [activeProjectIds, fetchProjectTasks]);

    // Check for research trigger
    useEffect(() => {
        if (searchParams.get('action') === 'new-research') {
            setIsNewContentModalOpen(true);
        }
    }, [searchParams]);

    const handleCloseSEOModal = () => {
        setIsNewContentModalOpen(false);
        setResearchTaskId(undefined);
        const params = new URLSearchParams(searchParams.toString());
        params.delete('action');
        const newSearch = params.toString();
        router.replace(window.location.pathname + (newSearch ? '?' + newSearch : ''), { scroll: false });
    };

    const handleRunResearch = (taskId: string) => {
        setResearchTaskId(taskId);
        setIsNewContentModalOpen(true);
    };



    const handleBatchDelete = async () => {
        if (selectedTaskIds.length === 0) return;
        if (confirm(`¿Estás seguro de eliminar ${selectedTaskIds.length} tareas?`)) {
            await deleteTasks(selectedTaskIds);
            setSelectedTaskIds([]);
            NotificationService.notify("Tareas Eliminadas", "La selección ha sido eliminada.");
        }
    };

    const handleOrbAction = async (action: string) => {
        if (!activeProject) return;

        if (action === 'sugerir_estrategia') {
            await handleGenerateStrategy();
            return;
        }

        setIsResearching(true);
        setResearchProgress(0);
        if (!isConsoleOpen) setIsConsoleOpen(true);

        try {
            const onLog = (tid: string, stage: string, msg: string, res?: string) => addStrategyLog(tid, stage, msg, res);
            const onProgress = (p: number) => setResearchProgress(p);

            const csvData = useWriterStore.getState().csvData;

            if (action === 'investigar_ideas') {
                const candidates = selectedTaskIds.length > 0 
                    ? tasks.filter(t => selectedTaskIds.includes(t.id))
                    : tasks.filter(t => t.status === 'idea');
                
                if (candidates.length === 0) {
                    NotificationService.notify("Aviso", "No hay contenidos seleccionados o ideas para investigar.");
                    return;
                }

                let processedCount = 0;
                for (const t of candidates) {
                    NotificationService.notify('Investigando', t.title);
                    setBatchResearchStatus(prev => ({ ...prev, [t.id]: 5 }));
                    
                    const result = await StrategyService.runDeepSEOAnalysis({
                        projectId: activeProject.id,
                        keyword: t.target_keyword || t.title,
                        onProgress: (p) => {
                            const progressMap: Record<string, number> = { 'serp': 25, 'scraping': 50, 'keywords': 75, 'metadata': 90 };
                            const prog = progressMap[p] || 10;
                            setResearchProgress(prog);
                            setBatchResearchStatus(prev => ({ ...prev, [t.id]: prog }));
                        },
                        onLog: (s, m, r) => onLog(t.id, s, m, r),
                        taskId: t.id
                    });

                    // ACTUALIZACIÓN INMEDIATA EN LA GRILLA
                    if (result) {
                        await updateTask(t.id, {
                            research_dossier: result.research_dossier,
                            seo_title: result.seo_title,
                            meta_description: result.meta_description,
                            excerpt: result.extracto,
                            target_url_slug: result.target_url_slug,
                            status: result.status // 'en_investigacion' or similar
                        });
                    }

                    // Using local counter to track progress
                    processedCount++;
                    const finalProg = (processedCount / candidates.length) * 100;
                    setResearchProgress(finalProg);
                    setBatchResearchStatus(prev => ({ ...prev, [t.id]: 100 }));
                }
            } else if (action === 'generar_outlines') {
                let filtered = tasks.filter(t => 
                    (t.status === 'por_redactar' || t.status === 'en_investigacion' || t.status === 'investigacion_proceso' || t.status === 'idea') && 
                    t.research_dossier && (!t.outline_structure || !t.outline_structure.headers || t.outline_structure.headers.length === 0)
                );
                
                // Si hay selección manual, priorizarla
                if (selectedTaskIds.length > 0) {
                    filtered = tasks.filter(t => selectedTaskIds.includes(t.id));
                }

                if (filtered.length === 0) {
                    NotificationService.notify('Sin tareas', 'No hay tareas investigadas que necesiten un outline.');
                    return;
                }

                setIsResearching(true);
                await BatchProcessor.processOutlines(
                    filtered, 
                    activeProject.id, 
                    csvData, 
                    onProgress, 
                    onLog,
                    (id, up) => updateTask(id, up),
                    (id, perc) => setBatchResearchStatus(prev => ({ ...prev, [id]: perc }))
                );
            } else if (action === 'redaccion_masiva') {
                let filtered = tasks.filter(t => 
                    t.outline_structure?.headers?.length > 0 && !t.content_body
                );

                if (selectedTaskIds.length > 0) {
                    filtered = tasks.filter(t => selectedTaskIds.includes(t.id));
                }

                if (filtered.length === 0) {
                    NotificationService.notify('Sin tareas', 'No hay outlines listos para redactar.');
                    return;
                }

                setIsResearching(true);
                await BatchProcessor.processDrafts(
                    filtered, 
                    onProgress, 
                    onLog,
                    (id, up) => updateTask(id, up),
                    (id, perc) => setBatchResearchStatus(prev => ({ ...prev, [id]: perc }))
                );
            } else if (action === 'humanizacion_masiva') {
                let filtered = tasks.filter(t => 
                    t.content_body && (!t.metadata?.is_humanized && !t.metadata?.humanized_at)
                );

                if (selectedTaskIds.length > 0) {
                    filtered = tasks.filter(t => selectedTaskIds.includes(t.id));
                }

                if (filtered.length === 0) {
                    NotificationService.notify('Sin tareas', 'No hay contenidos que necesiten humanización.');
                    return;
                }

                setIsResearching(true);
                await BatchProcessor.processHumanization(
                    filtered, 
                    onProgress, 
                    onLog,
                    (id, up) => updateTask(id, up),
                    (id, perc) => setBatchResearchStatus(prev => ({ ...prev, [id]: perc }))
                );
            }

            NotificationService.success('Proceso completado', `Nous ha terminado las tareas de ${action}.`);
        } catch (e: any) {
            console.error(e);
            NotificationService.error('Error procesando lote', e.message);
        } finally {
            setIsResearching(false);
            setResearchProgress(0);
        }
    };

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
            status: 'idea',
            target_keyword: suggestion.target_keyword,
            priority: suggestion.priority
        });
        setSuggestedTasks(prev => prev.filter(t => t.target_keyword !== suggestion.target_keyword));
    };
    const handleBatchResearch = async () => {
        if (!activeProject || selectedTaskIds.length === 0) return;
        
        setIsResearching(true);
        setResearchProgress(0);
        if (!isConsoleOpen) setIsConsoleOpen(true);

        try {
            const candidates = tasks.filter(t => selectedTaskIds.includes(t.id));
            
            for (const task of candidates) {
                setBatchResearchStatus(prev => ({ ...prev, [task.id]: 5 }));
                
                const result = await StrategyService.runDeepSEOAnalysis({
                    projectId: activeProject.id,
                    keyword: task.target_keyword || task.title,
                    onProgress: (p) => {
                        const progressMap: Record<string, number> = { 'serp': 25, 'scraping': 50, 'keywords': 75, 'metadata': 90 };
                        setBatchResearchStatus(prev => ({ ...prev, [task.id]: progressMap[p] || 10 }));
                    },
                    taskId: task.id
                });

                // ACTUALIZACIÓN INMEDIATA EN LA GRILLA
                if (result) {
                    await updateTask(task.id, {
                        research_dossier: result.research_dossier,
                        seo_title: result.seo_title,
                        meta_description: result.meta_description,
                        target_url_slug: result.target_url_slug,
                        status: result.status
                    });
                }
                
                setBatchResearchStatus(prev => ({ ...prev, [task.id]: 100 }));
                NotificationService.success("Investigación completada", task.title);
            }
            
            setSelectedTaskIds([]);
            NotificationService.notify("Proceso por lotes terminado", `Se han investigado ${candidates.length} contenidos.`);
        } catch (e: any) {
            console.error(e);
            NotificationService.error("Error en investigación por lotes", e.message);
        } finally {
            setIsResearching(false);
            setBatchResearchStatus({});
        }
    };

    const handleDeleteAll = async () => {
        if (!activeProject || deleteConfirmText !== "ELIMINAR TODO") return;
        
        setIsDeletingAll(true);
        try {
            // Delete tasks for the active project
            const tasksToDelete = tasks.filter(t => t.project_id === activeProject.id);
            for (const task of tasksToDelete) {
                await useProjectStore.getState().deleteTask(task.id);
            }
            NotificationService.success("Limpieza Completa", `Se han eliminado ${tasksToDelete.length} contenidos.`);
            setIsDeleteModalOpen(false);
            setDeleteConfirmText("");
        } catch (error) {
            console.error("Delete all failed:", error);
            alert("Ocurrió un error al intentar eliminar todos los contenidos.");
        } finally {
            setIsDeletingAll(false);
        }
    };

    const handleCreateQuickTask = async () => {
        if (!newTaskTitle || !activeProject) return;
        await addTask({
            project_id: activeProject.id,
            title: newTaskTitle,
            scheduled_date: newTaskDate,
            status: 'idea',
            brief: ''
        });
        setIsNewTaskModalOpen(false);
        setNewTaskTitle("");
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
        <>
            <div className="flex h-full bg-white overflow-hidden">
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* Header Simplificado (Serper Style) */}
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 sticky top-0 z-40">
                        <div className="flex items-center gap-4">
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] border-r border-slate-100 pr-4 mr-2">Planificador</h3>
                            
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-100">
                                    <button onClick={prevMonth} className="p-1 hover:bg-white rounded-md transition-all text-slate-400 hover:text-slate-900">
                                        <ChevronLeft size={14} />
                                    </button>
                                    <span className="text-[10px] font-bold uppercase tracking-widest min-w-[100px] text-center text-slate-600 px-2">
                                        {format(viewDate, 'MMMM yyyy', { locale: es })}
                                    </span>
                                    <button onClick={nextMonth} className="p-1 hover:bg-white rounded-md transition-all text-slate-400 hover:text-slate-900">
                                        <ChevronRight size={14} />
                                    </button>
                                </div>

                                {/* Column Selector Button */}
                                <div className="relative">
                                    <button 
                                        onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
                                        className={cn(
                                            "h-7 w-7 flex items-center justify-center rounded-lg transition-all border shrink-0 bg-white",
                                            isColumnSelectorOpen ? "border-indigo-200 text-indigo-600 bg-indigo-50/50" : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                                        )}
                                        title="Configurar Columnas"
                                    >
                                        <Hash size={14} />
                                    </button>
                                    <AnimatePresence>
                                        {isColumnSelectorOpen && (
                                            <>
                                                <div className="fixed inset-0 z-30" onClick={() => setIsColumnSelectorOpen(false)} />
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-40 p-4 space-y-2"
                                                >
                                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1 px-1">Columnas Visibles</span>
                                                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar px-1">
                                                        {[
                                                            { id: 'project', label: 'Proy.' },
                                                            { id: 'status', label: 'Estado' },
                                                            { id: 'date', label: 'Publicación' },
                                                            { id: 'title', label: 'Título' },
                                                            { id: 'seo_title', label: 'SEO Title' },
                                                            { id: 'slug', label: 'Slug / URL' },
                                                            { id: 'meta_description', label: 'Meta Desc.' },
                                                            { id: 'keywords', label: 'Keywords' },
                                                            { id: 'strategy', label: 'Estrategia' },
                                                            { id: 'assigned', label: 'Responsable' },
                                                            { id: 'total_volume', label: 'Vol.' },
                                                            { id: 'word_count', label: 'Palabras' },
                                                            { id: 'lsi', label: 'LSI' },
                                                            { id: 'competitors', label: 'Fuentes' },
                                                            { id: 'actions', label: 'Acciones' }
                                                        ].map(col => (
                                                            <label key={col.id} className="flex items-center gap-3 p-1.5 hover:bg-slate-50 rounded-md cursor-pointer transition-all">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={columnVisibility[col.id] || false} 
                                                                    onChange={() => toggleColumn(col.id)}
                                                                    className="w-3.5 h-3.5 rounded border-slate-200 text-indigo-500 focus:ring-indigo-400"
                                                                />
                                                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{col.label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Empty for now, but ready for global actions if needed */}
                        </div>
                    </div>

                    {/* VISTA PRINCIPAL (SOLO GRILLA) */}
                    <div className="flex-1 overflow-hidden flex flex-col bg-white">
                        <StrategyGrid 
                            onSelectTask={setSelectedTask} 
                            onRunResearch={(taskId) => { setResearchTaskId(taskId); setIsNewContentModalOpen(true); }}
                            columnVisibility={columnVisibility}
                            selectedTaskIds={selectedTaskIds}
                            onSelectionChange={setSelectedTaskIds}
                            batchProgress={batchResearchStatus}
                        />
                    </div>
                </div>
            </div>

                <AnimatePresence>
                    {/* STRATEGY IA MODAL */}
                    {isStrategyModalOpen && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md pointer-events-auto" onClick={() => setIsStrategyModalOpen(false)}>
                            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
                                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-violet-50">
                                    <h2 className="text-2xl font-black text-slate-900 uppercase italic flex items-center gap-2"><Sparkles className="text-indigo-600" /> Estrategia IA</h2>
                                    <button onClick={() => setIsStrategyModalOpen(false)} className="p-3 bg-white hover:bg-slate-50 rounded-2xl shadow-sm border border-slate-100"><X size={20} className="text-slate-400" /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                    {suggestedTasks.map((task, i) => (
                                        <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl mb-3 flex justify-between items-center hover:shadow-md transition-all">
                                            <div>
                                                <h3 className="font-bold text-slate-800">{task.title}</h3>
                                                <p className="text-[10px] text-slate-400 font-mono">KW: {task.target_keyword} | Vol: {task.volume}</p>
                                            </div>
                                            <button onClick={() => handleAcceptSuggestion(task)} className="p-2 px-4 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase hover:bg-slate-800 transition-all">Aceptar</button>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                    
                    {/* TASK DETAILS & REDACTION */}
                    {selectedTask && (
                        <div className="pointer-events-auto">
                            <ContentDetailView task={selectedTask} onClose={() => setSelectedTask(null)} />
                        </div>
                    )}

                    {/* SEO RESEARCH WORKFLOW */}
                    {isNewContentModalOpen && (
                        <div className="pointer-events-auto">
                            <NewContentModal 
                                isOpen={isNewContentModalOpen}
                                onClose={handleCloseSEOModal}
                            />
                        </div>
                    )}

                    {/* LEGACY MODALS -> REFACTORED */}
                    {isBulkModalOpen && (
                        <div className="pointer-events-auto">
                            <MassUploadModal onClose={() => setIsBulkModalOpen(false)} />
                        </div>
                    )}
                    
                    {isNewTaskModalOpen && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md pointer-events-auto">
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl">
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Planificar</h2>
                                    <button onClick={() => setIsNewTaskModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all"><X size={20} /></button>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Título del Contenido</label>
                                        <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm outline-none focus:border-slate-300 transition-all font-bold text-slate-900" placeholder="Ej: Maximizando Conversiones..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Fecha de Publicación</label>
                                        <input type="date" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm outline-none focus:border-slate-300 transition-all font-bold text-slate-900" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} />
                                    </div>
                                    <button onClick={handleCreateQuickTask} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/20">Agendar Contenido</button>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {isSchedulingModalOpen && <MassSchedulingModal onClose={() => setIsSchedulingModalOpen(false)} />}

                    {/* DELETE ALL CONFIRMATION MODAL */}
                    {isDeleteModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md pointer-events-auto">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl space-y-6"
                            >
                                <div className="text-center space-y-2">
                                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
                                        <Trash size={32} />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">¿Eliminar Absolutamente Todo?</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                        Esta acción no se puede deshacer. Se borrarán todos los contenidos de <span className="text-rose-500">"{activeProject?.name}"</span>.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">
                                        Escribe <span className="text-slate-900">ELIMINAR TODO</span> para confirmar
                                    </label>
                                    <input 
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center text-sm font-black text-rose-600 outline-none focus:border-rose-200 transition-all placeholder:text-slate-200"
                                        placeholder="Escribe aquí..."
                                        value={deleteConfirmText}
                                        onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => { setIsDeleteModalOpen(false); setDeleteConfirmText(""); }}
                                        className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all font-mono"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        disabled={deleteConfirmText !== "ELIMINAR TODO" || isDeletingAll}
                                        onClick={handleDeleteAll}
                                        className="flex-1 py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-600/20 disabled:opacity-30 disabled:shadow-none transition-all group overflow-hidden relative"
                                    >
                                        {isDeletingAll ? (
                                            <Loader2 size={16} className="animate-spin mx-auto" />
                                        ) : (
                                            "Confirmar Borrado"
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            
            <NousOrb 
                tasks={tasks}
                onAction={handleOrbAction}
                isProcessing={isResearching}
                processingProgress={researchProgress}
                activeProjectName={activeProject?.name}
                selectedCount={selectedTaskIds.length}
                viewMode="planner"
            />
        </>
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
                    status: "idea",
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
