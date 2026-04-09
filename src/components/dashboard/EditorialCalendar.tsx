"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
    format
} from "date-fns";
import { es } from "date-fns/locale";
import {
    Plus,
    FileText,
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
    Upload,
    Database,
    Wand2,
    Lock,
    Hash,
    FileDown,
    Trash2,
    Share,
    Layers,
    Terminal,
    FileUp as FileUpIcon,
    Search
} from "lucide-react";
import { useProjectStore, Task, STATUS_LABELS } from "@/store/useProjectStore";
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
            { id: 'Acciones Nous', label: 'Acciones Nous', defaultVisible: true }
        ].reduce((acc, col) => ({ ...acc, [col.id]: col.defaultVisible }), {});
    });

    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
    const [batchResearchStatus, setBatchResearchStatus] = useState<Record<string, number>>({});
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    // Advanced Filters State
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

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

    // Filter Logic
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            // Search Query Filter
            if (searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                const matchesTitle = task.title?.toLowerCase().includes(searchLower);
                const matchesKeyword = task.target_keyword?.toLowerCase().includes(searchLower);
                const matchesSlug = task.target_url_slug?.toLowerCase().includes(searchLower);
                if (!matchesTitle && !matchesKeyword && !matchesSlug) return false;
            }

            // Status Filter
            if (statusFilter.length > 0 && !statusFilter.includes(task.status)) {
                return false;
            }

            // Date Range Filter
            if (dateFrom || dateTo) {
                const taskDate = task.scheduled_date ? new Date(task.scheduled_date) : null;
                if (!taskDate) return false;

                if (dateFrom && taskDate < new Date(dateFrom)) return false;
                if (dateTo) {
                    const endLimit = new Date(dateTo);
                    endLimit.setHours(23, 59, 59, 999);
                    if (taskDate > endLimit) return false;
                }
            }

            return true;
        });
    }, [tasks, searchQuery, statusFilter, dateFrom, dateTo]);

    const toggleStatusFilter = (status: string) => {
        setStatusFilter(prev => 
            prev.includes(status) 
                ? prev.filter(s => s !== status) 
                : [...prev, status]
        );
    };

    const clearFilters = () => {
        setSearchQuery("");
        setStatusFilter([]);
        setDateFrom("");
        setDateTo("");
    };

    const handleUnitAction = async (taskId: string, action: string) => {
        if (!activeProject) return;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        setIsResearching(true);
        if (!isConsoleOpen) setIsConsoleOpen(true);
        const onLog = (tid: string, stage: string, msg: string, res?: string) => addStrategyLog(tid, stage, msg, res);

        try {
            if (action === 'investigar') {
                setBatchResearchStatus(prev => ({ ...prev, [taskId]: 5 }));
                const result = await StrategyService.runDeepSEOAnalysis({
                    projectId: activeProject.id,
                    keyword: task.target_keyword || task.title,
                    onProgress: (p) => {
                        const progressMap: Record<string, number> = { 'serp': 25, 'scraping': 50, 'keywords': 75, 'metadata': 90 };
                        setBatchResearchStatus(prev => ({ ...prev, [taskId]: progressMap[p] || 10 }));
                    },
                    onLog: (s, m, r) => onLog(taskId, s, m, r),
                    taskId: taskId
                });
                if (result) {
                    await updateTask(taskId, {
                        research_dossier: result.research_dossier,
                        seo_title: result.seo_title,
                        meta_description: result.meta_description,
                        target_url_slug: result.target_url_slug,
                        status: result.status
                    });
                }
            } else if (action === 'outline') {
                await BatchProcessor.processOutlines(
                    [task], 
                    activeProject.id, 
                    useWriterStore.getState().csvData, 
                    () => {}, 
                    onLog,
                    (id, up) => updateTask(id, up),
                    (id, perc) => setBatchResearchStatus(prev => ({ ...prev, [id]: perc }))
                );
            } else if (action === 'draft') {
                await BatchProcessor.processDrafts(
                    [task], 
                    () => {}, 
                    onLog,
                    (id, up) => updateTask(id, up),
                    (id, perc) => setBatchResearchStatus(prev => ({ ...prev, [id]: perc }))
                );
            } else if (action === 'humanize') {
                await BatchProcessor.processHumanization(
                    [task], 
                    () => {}, 
                    onLog,
                    (id, up) => updateTask(id, up),
                    (id, perc) => setBatchResearchStatus(prev => ({ ...prev, [id]: perc }))
                );
            }
        } catch (e: any) {
            console.error(e);
            NotificationService.error("Error en acción individual", e.message);
        } finally {
            setIsResearching(false);
            setBatchResearchStatus(prev => ({ ...prev, [taskId]: 100 }));
        }
    };

    const handleBatchDelete = async () => {
        if (selectedTaskIds.length === 0) return;
        if (confirm(`¿Estás seguro de eliminar ${selectedTaskIds.length} tareas?`)) {
            await deleteTasks(selectedTaskIds);
            setSelectedTaskIds([]);
            NotificationService.notify("Tareas Eliminadas", "La selección ha sido eliminada.");
        }
    };

    const handleOrbAction = async (action: string, config?: any) => {
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

            if (action === 'batch_pipeline') {
                const { research, draft, humanize, finalStatus } = config || {};
                
                // 1. Identify context (Selected or All active tasks)
                let targetTasks = selectedTaskIds.length > 0 
                    ? tasks.filter(t => selectedTaskIds.includes(t.id))
                    : tasks;

                if (targetTasks.length === 0) {
                    NotificationService.notify("Información", "No hay contenidos seleccionados para procesar.");
                    return;
                }

                // Initial UI Setup
                setIsResearching(true);
                setResearchProgress(0);
                if (!isConsoleOpen) setIsConsoleOpen(true);

                // Progress weighting
                const activePhases = [research, draft || research, draft, humanize].filter(Boolean).length;
                const phaseWeight = 100 / (activePhases || 1);
                let currentPhaseIndex = 0;

                // PHASE 1: RESEARCH
                if (research) {
                    const toResearch = targetTasks.filter(t => t.status === 'idea' || !t.research_dossier || Object.keys(t.research_dossier).length === 0);
                    if (toResearch.length > 0) {
                        NotificationService.notify("Nous Global", `Fase 1/4: Investigando ${toResearch.length} contenidos...`);
                        let pCount = 0;
                        for (const t of toResearch) {
                            setBatchResearchStatus(prev => ({ ...prev, [t.id]: 5 }));
                            const result = await StrategyService.runDeepSEOAnalysis({
                                projectId: activeProject.id,
                                keyword: t.target_keyword || t.title,
                                onLog: (s, m, r) => onLog(t.id, s, m, r),
                                taskId: t.id
                            });
                            if (result) {
                                await updateTask(t.id, {
                                    research_dossier: result.research_dossier,
                                    seo_title: result.seo_title,
                                    meta_description: result.meta_description,
                                    target_url_slug: result.target_url_slug,
                                    status: result.status
                                });
                            }
                            pCount++;
                            // Global ring progress: (CurrentPhase * Weight) + (ProgressWithinPhase * Weight)
                            const phaseBase = currentPhaseIndex * phaseWeight;
                            setResearchProgress(phaseBase + ((pCount / toResearch.length) * phaseWeight));
                            setBatchResearchStatus(prev => ({ ...prev, [t.id]: 100 }));
                        }
                    }
                    currentPhaseIndex++;
                }

                // PHASE 2: OUTLINES (Automatic if results exist and draft/research is true)
                if (draft || research) {
                    const latestTasks = useProjectStore.getState().tasks.filter(t => targetTasks.some(tgt => tgt.id === t.id));
                    const toOutline = latestTasks.filter(t => {
                        const hasResearch = t.research_dossier && Object.keys(t.research_dossier).length > 0;
                        const hasOutline = (Array.isArray(t.outline_structure) && t.outline_structure.length > 0) || 
                                         (t.outline_structure?.headers?.length > 0);
                        return hasResearch && !hasOutline;
                    });
                    
                    if (toOutline.length > 0) {
                        NotificationService.notify("Nous Global", `Fase 2/4: Generando arquitectura (Outlines) para ${toOutline.length} artículos...`);
                        const phaseBase = currentPhaseIndex * phaseWeight;
                        await BatchProcessor.processOutlines(
                            toOutline, activeProject.id, csvData, 
                            (p) => setResearchProgress(phaseBase + (p * 0.01 * phaseWeight)), 
                            onLog, (id, up) => updateTask(id, up),
                            (id, pr) => setBatchResearchStatus(prev => ({ ...prev, [id]: pr }))
                        );
                    }
                    currentPhaseIndex++;
                }

                // PHASE 3: DRAFTING
                if (draft) {
                    const latestTasks = useProjectStore.getState().tasks.filter(t => targetTasks.some(tgt => tgt.id === t.id));
                    const toDraft = latestTasks.filter(t => {
                        const hasOutline = (Array.isArray(t.outline_structure) && t.outline_structure.length > 0) || 
                                         (t.outline_structure?.headers?.length > 0);
                        const hasContent = !!(t.content_body && t.content_body.trim() !== '');
                        return hasOutline && !hasContent;
                    });

                    if (toDraft.length > 0) {
                        NotificationService.notify("Nous Global", `Fase 3/4: Redactando ${toDraft.length} contenidos completos...`);
                        const phaseBase = currentPhaseIndex * phaseWeight;
                        await BatchProcessor.processDrafts(
                            toDraft, 
                            (p) => setResearchProgress(phaseBase + (p * 0.01 * phaseWeight)), 
                            onLog, (id, up) => updateTask(id, up),
                            (id, pr) => setBatchResearchStatus(prev => ({ ...prev, [id]: pr }))
                        );
                    }
                    currentPhaseIndex++;
                }

                // PHASE 4: HUMANIZATION
                if (humanize) {
                    const latestTasks = useProjectStore.getState().tasks.filter(t => targetTasks.some(tgt => tgt.id === t.id));
                    const toHumanize = latestTasks.filter(t => !!t.content_body && !t.metadata?.is_humanized);
                    if (toHumanize.length > 0) {
                        NotificationService.notify("Nous Global", `Fase 4/4: Humanizando ${toHumanize.length} artículos...`);
                        const phaseBase = currentPhaseIndex * phaseWeight;
                        await BatchProcessor.processHumanization(
                            toHumanize, 
                            (p) => setResearchProgress(phaseBase + (p * 0.01 * phaseWeight)), 
                            onLog, (id, up) => updateTask(id, up),
                            (id, pr) => setBatchResearchStatus(prev => ({ ...prev, [id]: pr }))
                        );
                    }
                    currentPhaseIndex++;
                }

                // FINAL STEP: STATUS UPDATE
                if (finalStatus) {
                    const latestTasks = useProjectStore.getState().tasks.filter(t => targetTasks.some(tgt => tgt.id === t.id));
                    for (const t of latestTasks) {
                        if (t.status !== finalStatus) {
                            await updateTask(t.id, { status: finalStatus });
                        }
                    }
                }

                setResearchProgress(100);
                NotificationService.success('Pipeline Completo', `Nous ha procesado todos los contenidos hasta el estado final.`);
            } else if (action === 'investigar_ideas') {
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

                    if (result) {
                        await updateTask(t.id, {
                            research_dossier: result.research_dossier,
                            seo_title: result.seo_title,
                            meta_description: result.meta_description,
                            excerpt: result.extracto,
                            target_url_slug: result.target_url_slug,
                            status: result.status
                        });
                    }

                    processedCount++;
                    const finalProg = (processedCount / candidates.length) * 100;
                    setResearchProgress(finalProg);
                    setBatchResearchStatus(prev => ({ ...prev, [t.id]: 100 }));
                }
            } else if (action === 'generar_outlines') {
                let filtered = tasks.filter(t => 
                    (t.status === 'por_redactar' || t.status === 'en_investigacion' || t.status === 'idea') && 
                    t.research_dossier && (!t.outline_structure || !t.outline_structure.headers || t.outline_structure.headers.length === 0)
                );
                
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

    return (
        <div className="flex flex-col h-screen bg-white overflow-hidden relative">
            {/* Header / Navigation */}
            <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 border-r border-slate-100 pr-4 mr-2">
                        <CalendarIcon size={18} className="text-indigo-600" />
                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Estrategia & Plan</h3>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* Column Selector */}
                        <div className="relative">
                            <button 
                                onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
                                className={cn(
                                    "h-7 w-7 flex items-center justify-center rounded-lg transition-all border shrink-0 bg-white",
                                    isColumnSelectorOpen ? "border-indigo-200 text-indigo-600 bg-indigo-50/50" : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                                )}
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
                                            className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 p-4 space-y-2"
                                        >
                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1 px-1">Columnas</span>
                                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar px-1">
                                                {Object.keys(columnVisibility).map(colId => (
                                                    <label key={colId} className="flex items-center gap-3 p-1.5 hover:bg-slate-50 rounded-md cursor-pointer transition-all">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={columnVisibility[colId]} 
                                                            onChange={() => toggleColumn(colId)}
                                                            className="w-3.5 h-3.5 rounded border-slate-200 text-indigo-500 focus:ring-indigo-400"
                                                        />
                                                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{colId}</span>
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

                <div className="flex items-center gap-3">
                    <AnimatePresence>
                        {selectedTaskIds.length > 0 && (
                            <motion.button 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onClick={handleBatchDelete}
                                className="h-10 px-6 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all flex items-center gap-2 group"
                            >
                                <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                                <span>Eliminar {selectedTaskIds.length} Tareas</span>
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center gap-4 shrink-0">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar por título o keyword..." 
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 placeholder:text-slate-300 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Status Multi-Select */}
                <div className="relative">
                    <button 
                        onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                        className={cn(
                            "h-9 px-4 flex items-center gap-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest",
                            statusFilter.length > 0 ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                    >
                        <Layers size={14} />
                        <span>Estado {statusFilter.length > 0 && `(${statusFilter.length})`}</span>
                    </button>
                    
                    <AnimatePresence>
                        {isStatusFilterOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsStatusFilterOpen(false)} />
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4"
                                >
                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-3 px-1">Filtrar por Estado</span>
                                    <div className="grid grid-cols-1 gap-1">
                                        {Object.entries(STATUS_LABELS).map(([status, label]) => {
                                            const isActive = statusFilter.includes(status);
                                            return (
                                                <button 
                                                    key={status}
                                                    onClick={() => toggleStatusFilter(status)}
                                                    className={cn(
                                                        "flex items-center gap-3 p-2 rounded-lg transition-all text-left",
                                                        isActive ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-4 h-4 rounded-md border flex items-center justify-center transition-all",
                                                        isActive ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-300 bg-white"
                                                    )}>
                                                        {isActive && <Check size={10} strokeWidth={4} />}
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between">
                                        <button 
                                            onClick={() => setStatusFilter([])}
                                            className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
                                        >
                                            Limpiar
                                        </button>
                                        <button 
                                            onClick={() => setIsStatusFilterOpen(false)}
                                            className="text-[9px] font-black text-indigo-600 uppercase tracking-widest"
                                        >
                                            Aplicar
                                        </button>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                {/* Date Filters */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-indigo-400 transition-all">
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mr-2 leading-none">Desde</span>
                        <input 
                            type="date" 
                            className="bg-transparent border-none text-[10px] font-bold text-slate-700 outline-none p-0 cursor-pointer"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-indigo-400 transition-all">
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mr-2 leading-none">Hasta</span>
                        <input 
                            type="date" 
                            className="bg-transparent border-none text-[10px] font-bold text-slate-700 outline-none p-0 cursor-pointer"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>
                </div>

                {/* Clear All Filters */}
                {(searchQuery || statusFilter.length > 0 || dateFrom || dateTo) && (
                    <button 
                        onClick={clearFilters}
                        className="ml-auto flex items-center gap-2 group px-3 py-2 rounded-xl transition-all"
                    >
                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-500 transition-all">
                            <X size={12} />
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-rose-500 transition-all">Limpiar Filtros</span>
                    </button>
                )}
            </div>

            {/* Main Area */}
            <main className="flex-1 overflow-hidden bg-white flex flex-col min-h-0">
                <StrategyGrid 
                    tasks={filteredTasks}
                    onSelectTask={setSelectedTask} 
                    onRunAction={handleUnitAction}
                    columnVisibility={columnVisibility}
                    selectedTaskIds={selectedTaskIds}
                    onSelectionChange={setSelectedTaskIds}
                    batchProgress={batchResearchStatus}
                />
            </main>

            {/* Floating Nous Orb */}
            <NousOrb 
                tasks={tasks}
                onAction={handleOrbAction} 
                isProcessing={isResearching} 
                processingProgress={researchProgress} 
                selectedCount={selectedTaskIds.length}
            />

            {/* Modals & Overlays */}
            <AnimatePresence>
                {/* Content Detail View */}
                {selectedTask && (
                    <ContentDetailView 
                        task={selectedTask} 
                        onClose={() => setSelectedTask(null)} 
                    />
                )}

                {/* New Content / Research Modal */}
                {isNewContentModalOpen && (
                    <NewContentModal 
                        isOpen={isNewContentModalOpen}
                        onClose={handleCloseSEOModal}
                    />
                )}

                {/* Strategy Suggestions Modal */}
                {isStrategyModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md pointer-events-auto">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                        >
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase italic flex items-center gap-2">
                                        <Sparkles className="text-indigo-600" /> Estrategia IA
                                    </h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sugerencias basadas en el proyecto</p>
                                </div>
                                <button onClick={() => setIsStrategyModalOpen(false)} className="p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-100 text-slate-400">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {suggestedTasks.map((task, i) => (
                                    <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl mb-3 flex justify-between items-center hover:shadow-md transition-all group">
                                        <div>
                                            <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{task.title}</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] text-slate-400 font-mono uppercase">KW: {task.target_keyword}</span>
                                                <span className="text-[10px] text-slate-400 font-mono uppercase bg-slate-50 px-2 rounded">Vol: {task.volume}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => handleAcceptSuggestion(task)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all">Aceptar</button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Bulk/Clear Modal */}
                {isDeleteModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-rose-500/20 backdrop-blur-xl pointer-events-auto">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white w-full max-w-md rounded-[32px] p-10 shadow-2xl overflow-hidden relative"
                        >
                            <div className="mb-6">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Limpieza Total</h3>
                                <p className="text-xs text-slate-500 mt-2">Esta acción eliminará todos los contenidos del proyecto activo. No se puede deshacer.</p>
                            </div>
                            
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escribe "ELIMINAR TODO" para confirmar</p>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-rose-600 outline-none focus:border-rose-200 transition-all"
                                    placeholder="ELIMINAR TODO"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                />
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setIsDeleteModalOpen(false)}
                                        className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handleDeleteAll}
                                        disabled={deleteConfirmText !== "ELIMINAR TODO" || isDeletingAll}
                                        className="flex-1 py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-600/20 disabled:opacity-30 hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isDeletingAll ? <Loader2 size={16} className="animate-spin" /> : "Confirmar"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
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
        };
        reader.readAsText(file);
    };

    const handleParse = () => {
        if (!pastedData.trim()) return;

        Papa.parse(pastedData, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.trim(),
            complete: (results) => {
                if (results.data.length > 0) {
                    const tasks = results.data.map((row: any, index: number) => {
                        const title = row['Título Propuesto'] || row['Title'] || row['Título'] || '';
                        return {
                            title,
                            scheduled_date: row['Fecha'] || row['Date'] || format(new Date(), 'yyyy-MM-dd'),
                            target_keyword: row['Keywords (5)'] || row['Keywords'] || '',
                            volume: parseInt(row['Volumen']?.replace(/[^0-9]/g, '') || '0'),
                            viability: row['Viabilidad'] || '',
                            brief: row['Notas para redacción'] || row['Brief'] || '',
                            word_count: parseInt(row['Palabras']?.replace(/[^0-9]/g, '') || '0'),
                            ai_percentage: parseInt(row['% IA']?.replace(/[^0-9]/g, '') || '0'),
                            docs_url: row['Docs'] || '',
                            layout_status: row['Maquetado'] === 'TRUE' || row['Maquetado'] === 'true',
                            refs: []
                        };
                    }).filter((t: any) => t.title);
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
            NotificationService.notify("Importación Exitosa", `Se han programado ${tasksToSave.length} nuevas tareas.`);
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
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">2. Cargar o Pegar CSV</label>
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
                            <textarea
                                className="w-full h-32 bg-slate-50 border border-slate-100 rounded-3xl p-6 text-xs font-mono outline-none focus:border-indigo-500 transition-all resize-none"
                                placeholder={`Título Propuesto,Keywords (5),...\nMi Articulo,"key1, key2",...`}
                                value={pastedData}
                                onChange={(e) => setPastedData(e.target.value)}
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={handleParse}
                                    disabled={!pastedData.trim()}
                                    className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
                                >
                                    Procesar Datos
                                </button>
                            </div>
                        </div>
                    </div>

                    {parsedTasks.length > 0 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Vista Previa ({parsedTasks.length} items)</label>
                            <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-2xl bg-white shadow-sm custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 sticky top-0 z-10">
                                        <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="p-4 border-b border-slate-100">Fecha</th>
                                            <th className="p-4 border-b border-slate-100">Título</th>
                                            <th className="p-4 border-b border-slate-100 text-right">Vol</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedTasks.map((t, i) => (
                                            <tr key={i} className="border-b border-slate-50 text-xs">
                                                <td className="p-4 font-mono text-slate-500">{t.scheduled_date}</td>
                                                <td className="p-4 font-bold text-slate-700">{t.title}</td>
                                                <td className="p-4 text-slate-400 text-right">{t.volume || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-8 bg-white border-t border-slate-50 flex justify-end gap-4">
                    <button onClick={onClose} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
                    <button
                        disabled={parsedTasks.length === 0 || isSaving}
                        onClick={handleSave}
                        className="px-12 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50 transition-all transform hover:-translate-y-1"
                    >
                        {isSaving ? "Procesando..." : "Confirmar e Importar"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
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
                    <button onClick={onClose} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 p-10 overflow-y-auto custom-scrollbar flex flex-col gap-8">
                    <div className="border-2 border-dashed border-slate-100 rounded-[40px] p-20 text-center hover:bg-slate-50/50 transition-all cursor-pointer relative">
                        <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileSelection} />
                        <div className="w-20 h-20 rounded-full bg-white shadow-xl text-slate-400 flex items-center justify-center mx-auto mb-6">
                            <FileUp size={32} />
                        </div>
                        <h4 className="text-lg font-black text-slate-700 uppercase tracking-tighter italic mb-2">Selecciona múltiples archivos</h4>
                    </div>

                    {filesWithData.length > 0 && (
                        <div className="grid grid-cols-1 gap-3">
                            {filesWithData.map((item, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-[20px] flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-300"><FileText size={20} /></div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{item.file.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            className="bg-white border-none rounded-xl text-[10px] font-bold text-slate-500 py-2 px-4 shadow-sm"
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
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-10 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <button disabled={filesWithData.length === 0 || isProcessing} onClick={handleStartProcessing} className="px-12 py-5 bg-slate-900 text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl disabled:opacity-50 flex items-center gap-3">
                        {isProcessing ? "Procesando..." : "Iniciar Procesamiento"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

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

    await supabase.from('tasks').update({ status: 'en_redaccion' }).eq('id', taskId);

    return draft.id;
}
