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
    Search,
    Image as ImageIcon,
    Languages,
    RotateCcw,
    Type,
    Link,
    Layout,
    ChevronRight,
    ChevronDown,
    Zap
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
import { parseDocx, parseHtml } from "@/utils/data-importer";
import Papa from "papaparse";
import StrategyGrid from "./StrategyGrid";
import NousOrb from "./NousOrb";
import { 
    processTaskOutlineAction, 
    processTaskDraftAction, 
    processTaskHumanizationAction, 
    processTaskVisualsAction, 
    processTaskTranslationAction 
} from '@/lib/actions/batchActions';
import { formatTasksToTSV, formatTasksToCSV } from "@/utils/exportUtils";

import { ProjectBadge } from "@/components/ui/ProjectBadge";
import ContentDetailView from "./ContentDetailView";
import { useSearchParams } from "next/navigation";

export function EditorialCalendar() {
    const { 
        tasks, activeProject, activeProjectIds, updateTask, addTask, 
        fetchProjectTasks, deleteTasks, fetchTasksFullData 
    } = useProjectStore();
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
    const [researchTaskId, setResearchTaskId] = useState<string | undefined>(undefined);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [improveTitleWithNous, setImproveTitleWithNous] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const isResearching = useWriterStore(state => state.isResearching);
    const setResearching = useWriterStore(state => state.setResearching);
    const researchProgress = useWriterStore(state => state.researchProgress);
    const setResearchProgress = useWriterStore(state => state.setResearchProgress);
    const setResearchPhaseId = useWriterStore(state => state.setResearchPhaseId);
    const setResearchTopic = useWriterStore(state => state.setResearchTopic);
    const searchParams = useSearchParams();

    // Column Visibility State
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        const defaults = [
            { id: 'project', label: 'Proy.', defaultVisible: true },
            { id: 'content_type', label: 'Tipo', defaultVisible: true },
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
            { id: 'word_count', label: 'Palabras (Obj)', defaultVisible: false },
            { id: 'word_count_real', label: 'Palabras (Reales)', defaultVisible: false },
            { id: 'lsi', label: 'LSI', defaultVisible: false },
            { id: 'competitors', label: 'Fuentes', defaultVisible: false },
            { id: 'content', label: 'Cuerpo', defaultVisible: true },
            { id: 'Acciones Nous', label: 'Acciones Nous', defaultVisible: true }
        ].reduce((acc, col) => ({ ...acc, [col.id]: col.defaultVisible }), {});

        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('ns_grid_columns');
            if (saved) {
                try {
                    return { ...defaults, ...JSON.parse(saved) };
                } catch (e) {
                    return defaults;
                }
            }
        }
        return defaults;
    });

    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
    const [batchResearchStatus, setBatchResearchStatus] = useState<Record<string, number>>({});
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [reinvestigateTask, setReinvestigateTask] = useState<{ id: string, keyword: string } | null>(null);
    const [isReinvestigating, setIsReinvestigating] = useState(false);
    const [isCascadeMode, setIsCascadeMode] = useState(true);

    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
    const [batchDeleteOptions, setBatchDeleteOptions] = useState({ research: false, writing: false, images: false, translations: false });
    
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
            const params = new URLSearchParams(searchParams.toString());
            params.delete('action');
            router.replace(window.location.pathname + '?' + params.toString(), { scroll: false });
        }
    }, [searchParams]);

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

    const handleCopyTable = async () => {
        if (filteredTasks.length === 0) return;
        setIsExporting(true);
        try {
            const taskIds = filteredTasks.map(t => t.id);
            const fullDataTasks = await fetchTasksFullData(taskIds);
            const tsvContent = formatTasksToTSV(fullDataTasks);
            if (document.hasFocus()) {
                await navigator.clipboard.writeText(tsvContent);
                NotificationService.success("Tabla copiada", "Lista para pegar en Google Sheets.");
            }
        } catch (error) {
            NotificationService.error("Error al copiar", "No se pudo generar el formato.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownloadCSV = async () => {
        if (filteredTasks.length === 0) return;
        setIsExporting(true);
        try {
            const taskIds = filteredTasks.map(t => t.id);
            const fullDataTasks = await fetchTasksFullData(taskIds);
            const csvContent = formatTasksToCSV(fullDataTasks);
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `planner_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            NotificationService.success("CSV Descargado", "El reporte está listo.");
        } catch (error) {
            NotificationService.error("Error al exportar", "No se pudo generar el archivo.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleUnitAction = async (taskId: string, action: string) => {
        if (!activeProject) return;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        setResearching(true);
        if (!isConsoleOpen) setIsConsoleOpen(true);
        const onLog = (tid: string, stage: string, msg: string, res?: string) => addStrategyLog(tid, stage, msg, res);

        try {
            if (action === 'completar_investigacion') {
                // Intelligent Quality Audit
                const audit = await StrategyService.validateResearchQuality(taskId);
                if (!audit.isValid) {
                    NotificationService.warn("Investigación Incompleta", 
                        `Se detectaron ${audit.issues.length} problemas de calidad. Sugerencia: ${audit.suggestions[0]}`);
                    
                    // We still proceed to run it, but now we know why it was marked as "incomplete"
                    // In a real production app, we might stop here or show a modal.
                }

                setBatchResearchStatus(prev => ({ ...prev, [taskId]: 5 }));
                const result = await StrategyService.runDeepSEOAnalysis({
                    projectId: activeProject.id,
                    keyword: task.target_keyword || task.title,
                    onProgress: (p) => {
                        const progressMap: Record<string, number> = { 'serp': 25, 'scraping': 50, 'keywords': 75, 'metadata': 90, 'interlinking': 95, 'outline': 100 };
                        setBatchResearchStatus(prev => ({ ...prev, [taskId]: progressMap[p] || 10 }));
                        setResearchPhaseId(p);
                        setResearchTopic(task.target_keyword || task.title);
                    },
                    onLog: (s, m, r) => onLog(taskId, s, m, r),
                    taskId: taskId,
                });
                if (result) {
                    await updateTask(taskId, {
                        title: improveTitleWithNous && result.seo_title ? result.seo_title : task.title,
                        research_dossier: result.research_dossier,
                        h1: result.h1,
                        seo_title: result.seo_title,
                        meta_description: result.meta_description,
                        target_url_slug: result.target_url_slug,
                        excerpt: result.excerpt,
                        status: result.status
                    });
                }
            } else if (action === 'reinvestigar_fase') {
                // Open phase selection modal (implementation below)
                setReinvestigateTask({ id: taskId, keyword: task.target_keyword || task.title });
            } else if (action === 'investigar' || action === 'investigar_forzado') {
                const forceRestart = action === 'investigar_forzado';
                setBatchResearchStatus(prev => ({ ...prev, [taskId]: 5 }));
                const result = await StrategyService.runDeepSEOAnalysis({
                    projectId: activeProject.id,
                    keyword: task.target_keyword || task.title,
                    onProgress: (p) => {
                        const progressMap: Record<string, number> = { 'serp': 25, 'scraping': 50, 'keywords': 75, 'metadata': 90, 'interlinking': 95, 'outline': 100 };
                        setBatchResearchStatus(prev => ({ ...prev, [taskId]: progressMap[p] || 10 }));
                        setResearchPhaseId(p);
                        setResearchTopic(task.target_keyword || task.title);
                    },
                    onLog: (s, m, r) => onLog(taskId, s, m, r),
                    taskId: taskId,
                    forceRestart
                });
                if (result) {
                    await updateTask(taskId, {
                        title: improveTitleWithNous && result.seo_title ? result.seo_title : task.title,
                        research_dossier: result.research_dossier,
                        h1: result.h1,
                        seo_title: result.seo_title,
                        meta_description: result.meta_description,
                        target_url_slug: result.target_url_slug,
                        excerpt: result.excerpt,
                        status: result.status
                    });
                }
            } else if (action === 'outline') {
                const res = await processTaskOutlineAction(task, useWriterStore.getState().csvData);
                if (res.success && res.updates) {
                    updateTask(taskId, res.updates);
                    onLog(taskId, 'Outline', res.msg!);
                } else {
                    throw new Error(res.error);
                }
            } else if (action === 'draft') {
                const res = await processTaskDraftAction(task);
                if (res.success && res.updates) {
                    updateTask(taskId, res.updates);
                    onLog(taskId, 'Redacción', res.msg!);
                } else {
                    throw new Error(res.error);
                }
            } else if (action === 'humanize') {
                const res = await processTaskHumanizationAction(task);
                if (res.success && res.updates) {
                    updateTask(taskId, res.updates);
                    onLog(taskId, 'Humanización', res.msg!);
                } else {
                    throw new Error(res.error);
                }
            } else if (action === 'visuals') {
                const res = await processTaskVisualsAction(task);
                if (res.success && res.updates) {
                    updateTask(taskId, res.updates);
                    onLog(taskId, 'Visuals', res.msg!);
                } else {
                    throw new Error(res.error);
                }
            }
        } catch (e: any) {
            console.error(e);
            NotificationService.error("Error en acción individual", e.message);
        } finally {
            setResearching(false);
            setBatchResearchStatus(prev => ({ ...prev, [taskId]: 100 }));
        }
    };

    const handleBatchDelete = async () => {
        if (selectedTaskIds.length === 0) return;
        setIsBatchDeleteModalOpen(true);
    };

    const confirmBatchDelete = async (all: boolean = false) => {
        if (selectedTaskIds.length === 0) return;
        
        setIsDeletingAll(true);
        try {
            if (all) {
                await deleteTasks(selectedTaskIds);
                NotificationService.notify("Tareas Eliminadas", `Se eliminaron completamente ${selectedTaskIds.length} contenidos.`);
            } else {
                for (const taskId of selectedTaskIds) {
                    await useProjectStore.getState().selectiveDeleteTask(taskId, batchDeleteOptions);
                }
                NotificationService.notify("Limpieza Exitosa", `Se limpiaron los datos seleccionados de ${selectedTaskIds.length} contenidos.`);
            }
            setSelectedTaskIds([]);
            setIsBatchDeleteModalOpen(false);
            setBatchDeleteOptions({ research: false, writing: false, images: false, translations: false });
        } catch (e: any) {
            console.error(e);
            NotificationService.error("Error en eliminación masiva", e.message);
        } finally {
            setIsDeletingAll(false);
        }
    };

    const handleOrbAction = async (action: string, config?: any) => {
        if (!activeProject) return;

        if (action === 'sugerir_estrategia') {
            await handleGenerateStrategy();
            return;
        }

        setResearching(true);
        setResearchProgress(0);
        if (!isConsoleOpen) setIsConsoleOpen(true);
        const onLog = (tid: string, stage: string, msg: string, res?: string) => addStrategyLog(tid, stage, msg, res);
        const onProgress = (p: number) => setResearchProgress(p);
        const csvData = useWriterStore.getState().csvData;

        try {
            if (action === 'batch_pipeline') {
                const { research, draft, humanize, translate, finalStatus } = config || {};
                const targetTasks = (selectedTaskIds && selectedTaskIds.length > 0) ? tasks.filter(t => selectedTaskIds.includes(t.id)) : tasks;

                if (!targetTasks || targetTasks.length === 0) {
                    NotificationService.notify("Información", "No hay contenidos seleccionados para procesar.");
                    return;
                }

                const activePhases = [research, draft || research, draft, humanize, translate].filter(Boolean).length;
                const phaseWeight = 100 / (activePhases || 1);
                let currentPhaseIndex = 0;

                if (research) {
                    const toResearch = targetTasks.filter(t => t.status === 'idea' || !t.research_dossier || t.research_dossier._checkpoint !== 'outline_done');
                    if (toResearch.length > 0) {
                        NotificationService.notify("Nous Global", `Fase 1/5: Investigando ${toResearch.length} contenidos...`);
                        let pCount = 0;
                        for (const t of toResearch) {
                            setBatchResearchStatus(prev => ({ ...prev, [t.id]: 5 }));
                            const result = await StrategyService.runDeepSEOAnalysis({
                                projectId: activeProject.id,
                                keyword: t.target_keyword || t.title,
                                onProgress: (p) => {
                                    const progressMap: Record<string, number> = { 'serp': 25, 'scraping': 50, 'keywords': 75, 'metadata': 90, 'interlinking': 95, 'outline': 100 };
                                    setBatchResearchStatus(prev => ({ ...prev, [t.id]: progressMap[p] || 10 }));
                                    setResearchPhaseId(p);
                                    setResearchTopic(t.target_keyword || t.title);
                                },
                                onLog: (s, m, r) => onLog(t.id, s, m, r),
                                taskId: t.id
                            });
                            if (result) {
                                await updateTask(t.id, {
                                    title: improveTitleWithNous && result.seo_title ? result.seo_title : t.title,
                                    research_dossier: result.research_dossier,
                                    seo_title: result.seo_title,
                                    meta_description: result.meta_description,
                                    target_url_slug: result.target_url_slug,
                                    status: result.status
                                });
                            }
                            pCount++;
                            setResearchProgress(currentPhaseIndex * phaseWeight + ((pCount / toResearch.length) * phaseWeight));
                            setBatchResearchStatus(prev => ({ ...prev, [t.id]: 100 }));
                        }
                    }
                    currentPhaseIndex++;
                }

                if (draft || research) {
                    const latestTasks = useProjectStore.getState().tasks.filter(t => targetTasks.some(tgt => tgt.id === t.id));
                    const toOutline = latestTasks.filter(t => {
                        const hasResearch = t.research_dossier && Object.keys(t.research_dossier).length > 0;
                        const hasOutline = (Array.isArray(t.outline_structure) && t.outline_structure.length > 0) || (t.outline_structure?.headers?.length > 0);
                        return hasResearch && !hasOutline;
                    });
                    if (toOutline.length > 0) {
                        NotificationService.notify("Nous Global", `Fase 2/5: Generando arquitectura (Outlines) para ${toOutline.length} artículos...`);
                        const phaseBase = currentPhaseIndex * phaseWeight;
                        let pCount = 0;
                        for (const t of toOutline) {
                            const res = await processTaskOutlineAction(t, csvData);
                            if (res.success && res.updates) {
                                updateTask(t.id, res.updates);
                                onLog(t.id, 'Outline', res.msg!);
                            } else {
                                onLog(t.id, 'Error', `❌ Error: ${res.error}`);
                            }
                            pCount++;
                            setResearchProgress(phaseBase + ((pCount / toOutline.length) * phaseWeight));
                            setBatchResearchStatus(prev => ({ ...prev, [t.id]: 100 }));
                        }
                    }
                    currentPhaseIndex++;
                }

                if (draft) {
                    const latestTasks = useProjectStore.getState().tasks.filter(t => targetTasks.some(tgt => tgt.id === t.id));
                    const toDraft = latestTasks.filter(t => {
                        const hasOutline = (Array.isArray(t.outline_structure) && t.outline_structure.length > 0) || (t.outline_structure?.headers?.length > 0);
                        const hasContent = !!(t.content_body && t.content_body.trim() !== '');
                        return hasOutline && !hasContent;
                    });
                    if (toDraft.length > 0) {
                        NotificationService.notify("Nous Global", `Fase 3/5: Redactando ${toDraft.length} contenidos completos...`);
                        const phaseBase = currentPhaseIndex * phaseWeight;
                        let pCount = 0;
                        for (const t of toDraft) {
                            const res = await processTaskDraftAction(t);
                            if (res.success && res.updates) {
                                updateTask(t.id, res.updates);
                                onLog(t.id, 'Redacción', res.msg!);
                            } else {
                                onLog(t.id, 'Error', `❌ Error: ${res.error}`);
                            }
                            pCount++;
                            setResearchProgress(phaseBase + ((pCount / toDraft.length) * phaseWeight));
                            setBatchResearchStatus(prev => ({ ...prev, [t.id]: 100 }));
                        }
                    }
                    currentPhaseIndex++;
                }

                if (humanize) {
                    const latestTasks = useProjectStore.getState().tasks.filter(t => targetTasks.some(tgt => tgt.id === t.id));
                    const toHumanize = latestTasks.filter(t => !!t.content_body && !t.metadata?.is_humanized);
                    if (toHumanize.length > 0) {
                        NotificationService.notify("Nous Global", `Fase 4/5: Humanizando ${toHumanize.length} artículos...`);
                        const phaseBase = currentPhaseIndex * phaseWeight;
                        let pCount = 0;
                        for (const t of toHumanize) {
                            const res = await processTaskHumanizationAction(t);
                            if (res.success && res.updates) {
                                updateTask(t.id, res.updates);
                                onLog(t.id, 'Humanización', res.msg!);
                            } else {
                                onLog(t.id, 'Error', `❌ Error: ${res.error}`);
                            }
                            pCount++;
                            setResearchProgress(phaseBase + ((pCount / toHumanize.length) * phaseWeight));
                            setBatchResearchStatus(prev => ({ ...prev, [t.id]: 100 }));
                        }
                    }
                    currentPhaseIndex++;
                }

                if (translate) {
                    const latestTasks = useProjectStore.getState().tasks.filter(t => targetTasks.some(tgt => tgt.id === t.id));
                    const targetLangs = activeProject.i18n_settings?.languages || [];
                    if (targetLangs.length > 0 && latestTasks.length > 0) {
                        NotificationService.notify("Nous Global", `Fase 5/5: Traduciendo a ${targetLangs.length} idiomas...`);
                        const phaseBase = currentPhaseIndex * phaseWeight;
                        let pCount = 0;
                        for (const t of latestTasks) {
                            for (const lang of targetLangs) {
                                const res = await processTaskTranslationAction(t, lang);
                                if (res.success) {
                                    onLog(t.id, 'Traducción', res.msg!);
                                } else {
                                    onLog(t.id, 'Error', `❌ Error: ${res.error}`);
                                }
                            }
                            pCount++;
                            setResearchProgress(phaseBase + ((pCount / latestTasks.length) * phaseWeight));
                        }
                    }
                    currentPhaseIndex++;
                }

                if (finalStatus) {
                    const latestTasks = useProjectStore.getState().tasks.filter(t => targetTasks.some(tgt => tgt.id === t.id));
                    for (const t of latestTasks) {
                        if (t.status !== finalStatus) await updateTask(t.id, { status: finalStatus });
                    }
                }

                setResearchProgress(100);
                NotificationService.success('Pipeline Completo', `Nous ha procesado todos los contenidos hasta el estado final.`);
            } else if (action === 'investigar_ideas') {
                const candidates = selectedTaskIds.length > 0 ? tasks.filter(t => selectedTaskIds.includes(t.id)) : tasks.filter(t => t.status === 'idea');
                if (candidates.length === 0) {
                    NotificationService.notify("Aviso", "No hay contenidos seleccionados o ideas para investigar.");
                    return;
                }
                let processedCount = 0;
                for (const t of candidates) {
                    NotificationService.notify('Investigando', t.title);
                    setBatchResearchStatus(prev => ({ ...prev, [t.id]: 5 }));
                    const result = await StrategyService.runDeepSEOAnalysis({
                        projectId: activeProject.id, keyword: t.target_keyword || t.title,
                        onProgress: (p) => {
                            const progressMap: Record<string, number> = { 'serp': 25, 'scraping': 50, 'keywords': 75, 'metadata': 90, 'interlinking': 95, 'outline': 100 };
                            const prog = progressMap[p] || 10;
                            setResearchProgress(prog);
                            setBatchResearchStatus(prev => ({ ...prev, [t.id]: prog }));
                            setResearchPhaseId(p);
                            setResearchTopic(t.target_keyword || t.title);
                        },
                        onLog: (s, m, r) => onLog(t.id, s, m, r), taskId: t.id
                    });
                    if (result) await updateTask(t.id, { title: improveTitleWithNous && result.seo_title ? result.seo_title : t.title, research_dossier: result.research_dossier, seo_title: result.seo_title, meta_description: result.meta_description, target_url_slug: result.target_url_slug, status: result.status });
                    processedCount++;
                    setResearchProgress((processedCount / candidates.length) * 100);
                    setBatchResearchStatus(prev => ({ ...prev, [t.id]: 100 }));
                }
            } else if (action === 'generar_outlines') {
                let filtered = tasks.filter(t => (t.status === 'por_redactar' || t.status === 'en_investigacion' || t.status === 'idea') && t.research_dossier && (!t.outline_structure || !t.outline_structure.headers || t.outline_structure.headers.length === 0));
                if (selectedTaskIds.length > 0) filtered = tasks.filter(t => selectedTaskIds.includes(t.id));
                if (filtered.length === 0) { NotificationService.notify('Sin tareas', 'No hay tareas investigadas que necesiten un outline.'); return; }
                let pCount = 0;
                for (const t of filtered) {
                    const res = await processTaskOutlineAction(t, csvData);
                    if (res.success && res.updates) {
                        updateTask(t.id, res.updates);
                        onLog(t.id, 'Outline', res.msg!);
                    }
                    pCount++;
                    setResearchProgress((pCount / filtered.length) * 100);
                    setBatchResearchStatus(prev => ({ ...prev, [t.id]: 100 }));
                }
            } else if (action === 'redaccion_masiva') {
                let filtered = tasks.filter(t => t.outline_structure?.headers?.length > 0 && !t.content_body);
                if (selectedTaskIds.length > 0) filtered = tasks.filter(t => selectedTaskIds.includes(t.id));
                if (filtered.length === 0) { NotificationService.notify('Sin tareas', 'No hay outlines listos para redactar.'); return; }
                let pCount = 0;
                for (const t of filtered) {
                    const res = await processTaskDraftAction(t);
                    if (res.success && res.updates) {
                        updateTask(t.id, res.updates);
                        onLog(t.id, 'Redacción', res.msg!);
                    }
                    pCount++;
                    setResearchProgress((pCount / filtered.length) * 100);
                    setBatchResearchStatus(prev => ({ ...prev, [t.id]: 100 }));
                }
            } else if (action === 'humanizacion_masiva') {
                let filtered = tasks.filter(t => !!t.content_body && !t.metadata?.is_humanized);
                if (selectedTaskIds.length > 0) filtered = tasks.filter(t => selectedTaskIds.includes(t.id));
                if (filtered.length === 0) { NotificationService.notify('Sin tareas', 'No hay artículos redactados que necesiten humanización.'); return; }
                let pCount = 0;
                for (const t of filtered) {
                    const res = await processTaskHumanizationAction(t);
                    if (res.success && res.updates) {
                        updateTask(t.id, res.updates);
                        onLog(t.id, 'Humanización', res.msg!);
                    }
                    pCount++;
                    setResearchProgress((pCount / filtered.length) * 100);
                    setBatchResearchStatus(prev => ({ ...prev, [t.id]: 100 }));
                }
            } else if (action === 'traduccion_masiva') {
                const targetLangs = activeProject.i18n_settings?.languages || [];
                if (targetLangs.length === 0) { NotificationService.warn('Configuración requerida', 'Debes configurar idiomas de traducción en los ajustes del proyecto.'); return; }
                let filtered = (selectedTaskIds && selectedTaskIds.length > 0) ? tasks.filter(t => selectedTaskIds.includes(t.id)) : tasks;
                if (filtered.length === 0) { NotificationService.notify('Sin tareas', 'No hay contenidos seleccionados para traducir.'); return; }
                let pCount = 0;
                for (const t of filtered) {
                    for (const lang of targetLangs) {
                        const res = await processTaskTranslationAction(t, lang);
                        if (res.success) onLog(t.id, 'Traducción', res.msg!);
                    }
                    pCount++;
                    setResearchProgress((pCount / filtered.length) * 100);
                }
            }
        } catch (e: any) {
            console.error(e);
            NotificationService.error("Error en acción Nous", e.message);
        } finally {
            setResearching(false);
            setResearchProgress(100);
        }
    };

    const handleGenerateStrategy = async () => {
        // Implementation for strategy generation
    };

    return (
        <div className="flex flex-col h-screen bg-white">
            <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 border-r border-slate-100 pr-4 mr-2">
                        <CalendarIcon size={18} className="text-indigo-600" />
                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Estrategia & Plan</h3>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Mejorar título con Nous</span>
                        <button 
                            onClick={() => setImproveTitleWithNous(!improveTitleWithNous)}
                            className={cn(
                                "w-10 h-5 rounded-full transition-all duration-300 relative",
                                improveTitleWithNous ? "bg-indigo-500" : "bg-slate-200"
                            )}
                        >
                            <div className={cn(
                                "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300",
                                improveTitleWithNous ? "left-5.5" : "left-0.5"
                            )} />
                        </button>
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
                        {reinvestigateTask && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="bg-white w-full max-w-md rounded-[24px] p-6 shadow-2xl relative border border-slate-100"
                                >
                                    <div className="mb-6 border-b border-slate-100 pb-4">
                                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Re-investigar Fase</h3>
                                        <p className="text-xs text-slate-500 mt-1">Seleccioná la etapa que deseás ejecutar nuevamente para mejorar los resultados.</p>
                                    </div>

                                    <div className="mb-4 flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">Modo Cascada (Recomendado)</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Propagar los cambios automáticamente a las fases posteriores.</p>
                                        </div>
                                        <button 
                                            onClick={() => setIsCascadeMode(!isCascadeMode)}
                                            className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", isCascadeMode ? 'bg-blue-600' : 'bg-slate-300')}
                                        >
                                            <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", isCascadeMode ? 'translate-x-6' : 'translate-x-1')} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 mb-6">
                                        {[
                                            { id: 'serp_done', label: 'Búsqueda SERP', desc: 'Actualiza el pool de competidores y la intención.', icon: Search },
                                            { id: 'scraping_done', label: 'Extracción de Contenido', desc: 'Vuelve a scrapear los competidores.', icon: FileText },
                                            { id: 'lsi_done', label: 'Keywords LSI', desc: 'Re-analiza la semántica del sector.', icon: Hash },
                                            { id: 'ask_done', label: 'Argot Técnico (ASK)', desc: 'Refina la jerga experta del nicho.', icon: Zap },
                                            { id: 'real_kws_done', label: 'Golden Keywords', desc: 'Extrae keywords con volumen real desde competidores afines.', icon: Sparkles },
                                            { id: 'metadata_done', label: 'Metadatos SEO', desc: 'Genera nuevos títulos y descripciones.', icon: Type },
                                            { id: 'interlinking_done', label: 'Interlinking', desc: 'Busca nuevas conexiones internas.', icon: Link },
                                            { id: 'outline_done', label: 'Estructura Outline', desc: 'Rediseña la arquitectura del artículo.', icon: Layout },
                                        ].map((phase) => (
                                            <button
                                                key={phase.id}
                                                disabled={isReinvestigating}
                                                onClick={async () => {
                                                    if (!isCascadeMode && ['serp_done', 'scraping_done', 'lsi_done'].includes(phase.id)) {
                                                        const conf = window.confirm("⚠️ ADVERTENCIA: Estás a punto de re-extraer datos fundacionales en Modo Aislado. Las fases posteriores (Metadatos, Outline) quedarán desactualizadas respecto al nuevo contenido. Se recomienda usar Modo Cascada.\n\n¿Deseás forzar la investigación de todos modos?");
                                                        if (!conf) return;
                                                    }
                                                    setIsReinvestigating(true);
                                                    try {
                                                        const result = await StrategyService.runDeepSEOAnalysis({
                                                            projectId: activeProject.id,
                                                            keyword: reinvestigateTask.keyword,
                                                            taskId: reinvestigateTask.id,
                                                            phaseToRun: phase.id,
                                                            cascade: isCascadeMode,
                                                            onLog: (s, m, r) => addStrategyLog(reinvestigateTask.id, s, m, r),
                                                            onProgress: (p) => setResearchPhaseId(p),
                                                        });
                                                        if (result) {
                                                            await updateTask(reinvestigateTask.id, {
                                                                research_dossier: result.research_dossier,
                                                                h1: result.h1,
                                                                seo_title: result.seo_title,
                                                                meta_description: result.meta_description,
                                                                target_url_slug: result.target_url_slug,
                                                                excerpt: result.excerpt,
                                                                outline_structure: result.outline_structure
                                                            });
                                                            NotificationService.success("Fase Actualizada", `Se ha re-ejecutado la fase ${phase.label} con éxito.`);
                                                        }
                                                    } catch (e: any) {
                                                        NotificationService.error("Error de fase", e.message);
                                                    } finally {
                                                        setIsReinvestigating(false);
                                                        setReinvestigateTask(null);
                                                    }
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 group"
                                            >
                                                <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-white text-slate-400 group-hover:text-indigo-600 transition-all">
                                                    <phase.icon size={14} />
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <p className="text-slate-900">{phase.label}</p>
                                                    <p className="text-[9px] text-slate-400 font-medium">{phase.desc}</p>
                                                </div>
                                                <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-all" />
                                            </button>
                                        ))}
                                    </div>

                                    <button 
                                        onClick={() => setReinvestigateTask(null)}
                                        className="w-full py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </motion.div>
                            </div>
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
                        className="flex items-center gap-2 group px-3 py-2 rounded-xl transition-all"
                    >
                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-500 transition-all">
                            <X size={12} />
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-rose-500 transition-all">Limpiar</span>
                    </button>
                )}

                {/* Export Buttons */}
                <div className="ml-auto flex items-center gap-2">
                    <button 
                        onClick={handleCopyTable}
                        disabled={isExporting || filteredTasks.length === 0}
                        className="flex items-center gap-2.5 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-50 group"
                    >
                        {isExporting ? <Loader2 size={12} className="animate-spin" /> : <Clipboard size={12} className="group-hover:scale-110 transition-transform" />}
                        <span className="text-[9px] font-black uppercase tracking-widest">Copiar Tabla</span>
                    </button>
                    <button 
                        onClick={handleDownloadCSV}
                        disabled={isExporting || filteredTasks.length === 0}
                        className="flex items-center gap-2.5 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white hover:bg-slate-800 transition-all disabled:opacity-50 group shadow-lg shadow-slate-200"
                    >
                        {isExporting ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} className="group-hover:-translate-y-0.5 transition-transform" />}
                        <span className="text-[9px] font-black uppercase tracking-widest">Descargar CSV</span>
                    </button>
                </div>
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

                {/* Batch Delete Confirmation Modal */}
                {isBatchDeleteModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm pointer-events-auto">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white w-full max-w-sm rounded-[24px] p-6 shadow-2xl relative"
                        >
                            <div className="mb-6 border-b border-slate-100 pb-4">
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Limpieza Selectiva</h3>
                                <p className="text-xs text-slate-500 mt-1">¿Qué deseas eliminar de {selectedTaskIds.length} contenidos?</p>
                            </div>
                            
                            <div className="space-y-2 mb-6">
                                {[
                                    { key: 'research', label: 'Investigación', icon: Search },
                                    { key: 'writing', label: 'Redacción', icon: FileText },
                                    { key: 'images', label: 'Imágenes', icon: ImageIcon },
                                    { key: 'translations', label: 'Traducciones', icon: Languages },
                                ].map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        onClick={() => setBatchDeleteOptions(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                                        className={cn(
                                            "w-full flex items-center gap-3 justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all",
                                            (batchDeleteOptions as any)[key] ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-slate-50 text-slate-600 border border-slate-50 hover:bg-slate-100"
                                        )}
                                    >
                                        <span className="flex items-center gap-2"><Icon size={16} />{label}</span>
                                        {(batchDeleteOptions as any)[key] && <Check size={14} />}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-3">
                                {(batchDeleteOptions.research || batchDeleteOptions.writing || batchDeleteOptions.images || batchDeleteOptions.translations) && (
                                    <button 
                                        onClick={() => confirmBatchDelete(false)}
                                        disabled={isDeletingAll}
                                        className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex justify-center items-center gap-2"
                                    >
                                        {isDeletingAll ? <Loader2 size={14} className="animate-spin" /> : "Confirmar Limpieza Parcial"}
                                    </button>
                                )}
                                
                                {!(batchDeleteOptions.research || batchDeleteOptions.writing || batchDeleteOptions.images || batchDeleteOptions.translations) && (
                                    <>
                                        <div className="h-px bg-slate-100 w-full my-2" />

                                        <button 
                                            onClick={() => {
                                                if (confirm('¿Eliminar por completo todos estos contenidos?')) {
                                                    confirmBatchDelete(true);
                                                }
                                            }}
                                            disabled={isDeletingAll}
                                            className="w-full py-3 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex justify-center items-center gap-2 border border-rose-100"
                                        >
                                            {isDeletingAll ? <Loader2 size={14} className="animate-spin" /> : "ELIMINAR TODO POR COMPLETO"}
                                        </button>
                                    </>
                                )}

                                <button 
                                    onClick={() => setIsBatchDeleteModalOpen(false)}
                                    className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors mt-2"
                                >
                                    Cancelar
                                </button>
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
            const tasksToSave = [...parsedTasks];
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

export default EditorialCalendar;
