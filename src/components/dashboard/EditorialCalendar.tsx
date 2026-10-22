"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
    format
} from "date-fns";
import { es } from "date-fns/locale";
import {
    Plus,
    Menu,
    Filter,
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
    Zap,
    UploadCloud,
    Settings,
    Eraser,
    BrainCircuit
} from "lucide-react";
import { useProjectStore, Task, STATUS_LABELS } from "@/store/useProjectStore";
import { usePermissions } from '@/hooks/usePermissions';

import { StrategyService, addStrategyLog } from "@/lib/services/strategy";
import { supabase } from "@/lib/supabase";
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";

import { useRouter } from "next/navigation";
import { useAppStore } from '@/store/useAppStore';
import { useWriterStore } from '@/store/useWriterStore';
import { useQueueStore } from '@/store/useQueueStore';
import { useAuthStore } from '@/store/useAuthStore';
import { NotificationService } from "@/lib/services/notifications";
import { parseDocx, parseHtml } from "@/utils/data-importer";
import Papa from "papaparse";
import StrategyGrid from "./StrategyGrid";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PlannerMobileView } from "./mobile/PlannerMobileView";
import { WriterMobileNewTaskModal } from "@/components/contents/writer/mobile/WriterMobileNewTaskModal";
import { NousSquareButton } from "./NousSquareButton";
import { useQueueProcessor } from '@/components/dashboard/useQueueProcessor';
import { SmartUploaderModal } from "./SmartUploaderModal";
import SmartSlugGeneratorModal from "./SmartSlugGeneratorModal";
import { processTaskVisualsAction } from '@/lib/actions/batchActions';
import { 
    processTaskOutlineAction,
    prepareTaskDraftAction,
    saveTaskDraftAction,
    processTaskTranslationAction
} from '@/lib/client/plannerActions';
import { executeDraftPipeline, executeHumanizePipeline } from '@/lib/services/writer/pipeline';
import { executePipeline } from '@/lib/client/pipelineExecutor';
import { NousPipelineModal } from './pipeline/NousPipelineModal';
import { autoInterlinkAsync, cleanAndFormatHtml } from '@/components/tools/writer/services';
import { sizeAwareChunkHtml, HtmlProtectionService } from '@/lib/utils/html-protection';
import { streamFinalCleanup, streamSurgicalEdit } from '@/lib/services/writer/ai-streaming';
import { streamGenerate, streamSEOPostProcess, streamHumanize } from '@/lib/services/writer/ai-streaming';
import { NousExtractorService } from '@/lib/services/nous-extractor';
import { formatTasksToTSV, formatTasksToCSV } from "@/utils/exportUtils";

import { ProjectBadge } from "@/components/ui/ProjectBadge";
import ContentDetailView from "./ContentDetailView";
import { useSearchParams } from "next/navigation";

export function EditorialCalendar() {
    const { 
        tasks, activeProject, activeProjectIds, updateTask, addTask, 
        fetchProjectTasks, deleteTasks, fetchTasksFullData, activeTeam
    } = useProjectStore();
    const isConsoleOpen = useWriterStore(state => state.isConsoleOpen);
    const setIsConsoleOpen = useWriterStore(state => state.setIsConsoleOpen);
    const initializeFromTask = useWriterStore(state => state.initializeFromTask);
    const router = useRouter();
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isSmartUploadModalOpen, setIsSmartUploadModalOpen] = useState(false);
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
    // improveTitleWithNous is read from activeProject.settings.content_preferences
    const [isExporting, setIsExporting] = useState(false);
    const isResearching = useWriterStore(state => state.isResearching);
    const setResearching = useWriterStore(state => state.setResearching);
    const researchProgress = useWriterStore(state => state.researchProgress);
    const setResearchProgress = useWriterStore(state => state.setResearchProgress);
    const setResearchPhaseId = useWriterStore(state => state.setResearchPhaseId);
    const setResearchTopic = useWriterStore(state => state.setResearchTopic);
    const searchParams = useSearchParams();
    const user = useAuthStore(state => state.user);
    const authInitialized = useAuthStore(state => state.initialized);
    const [isConfigLoaded, setIsConfigLoaded] = useState(false);

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
            { id: 'target_word_count', label: 'Palabras (Obj)', defaultVisible: false },
            { id: 'word_count_real', label: 'Palabras (Reales)', defaultVisible: false },
            { id: 'lsi', label: 'LSI', defaultVisible: false },
            { id: 'competitors', label: 'Fuentes', defaultVisible: false },
            { id: 'links', label: 'Interlinking', defaultVisible: true },
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
    const [isFilterBubbleOpen, setIsFilterBubbleOpen] = useState(false);
    const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
    const isMobile = useIsMobile();

    const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);

    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
    const [batchDeleteOptions, setBatchDeleteOptions] = useState({ research: false, writing: false, images: false, translations: false });

    // Project Content Preferences
    const projectContentPrefs = activeProject?.settings?.content_preferences;
    const improveTitleWithNous = projectContentPrefs?.improve_title_with_nous ?? false;
    const linkPlannedContents = projectContentPrefs?.link_planned_contents ?? false;
    const linkPlannedStatuses = projectContentPrefs?.link_planned_statuses ?? ["por_redactar", "por_corregir", "redactado", "en_revision", "publicado", "humanizado", "en_investigacion"];
    
    // Advanced Filters State
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

    // Sync from user_metadata
    useEffect(() => {
        if (!authInitialized) return;

        if (user) {
            if (!isConfigLoaded) {
                if (user.user_metadata?.planner_config) {
                    const config = user.user_metadata.planner_config;
                    if (config.columnVisibility) setColumnVisibility(prev => ({ ...prev, ...config.columnVisibility }));
                    if (config.statusFilter) setStatusFilter(config.statusFilter);
                    if (config.searchQuery !== undefined) setSearchQuery(config.searchQuery);
                    if (config.dateFrom !== undefined) setDateFrom(config.dateFrom);
                    if (config.dateTo !== undefined) setDateTo(config.dateTo);
                    if (config.isCascadeMode !== undefined) setIsCascadeMode(config.isCascadeMode);
                    // improveTitleWithNous and linkPlanned settings are stored in project preferences
                }
                setIsConfigLoaded(true);
            }
        } else {
            setIsConfigLoaded(true);
        }
    }, [user, authInitialized, isConfigLoaded]);

    // Save to user_metadata debounced
    useEffect(() => {
        if (!isConfigLoaded || !user) return;
        const timer = setTimeout(() => {
            const newConfig = {
                columnVisibility,
                statusFilter,
                searchQuery,
                dateFrom,
                dateTo,
                isCascadeMode,
                // preferences saved at project level
            };
            
            const serverConfig = user.user_metadata?.planner_config || {};
            const normalizedServerConfig = {
                columnVisibility: serverConfig.columnVisibility,
                statusFilter: serverConfig.statusFilter,
                searchQuery: serverConfig.searchQuery,
                dateFrom: serverConfig.dateFrom,
                dateTo: serverConfig.dateTo,
                isCascadeMode: serverConfig.isCascadeMode,
                // preferences saved at project level
            };

            if (JSON.stringify(newConfig) !== JSON.stringify(normalizedServerConfig)) {
                supabase.auth.updateUser({
                    data: { planner_config: newConfig }
                });
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [columnVisibility, statusFilter, searchQuery, dateFrom, dateTo, isCascadeMode, isConfigLoaded]);

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
                const matchesSeoTitle = task.seo_title?.toLowerCase().includes(searchLower);
                const matchesMetaDesc = task.meta_description?.toLowerCase().includes(searchLower);
                const matchesContentType = task.content_type?.toLowerCase().includes(searchLower);
                const matchesStatus = task.status?.toLowerCase().includes(searchLower) || (task.status && STATUS_LABELS[task.status as keyof typeof STATUS_LABELS]?.toLowerCase().includes(searchLower));
                const matchesAssociatedUrl = task.associated_url?.toLowerCase().includes(searchLower);
                
                const matchesLsi = task.research_dossier?.lsiKeywords?.some((k: any) => k.keyword?.toLowerCase().includes(searchLower));
                const matchesRefs = task.refs?.some((url: string) => url.toLowerCase().includes(searchLower));
                const matchesTop10 = task.research_dossier?.top10Urls?.some((u: any) => u.url?.toLowerCase().includes(searchLower));

                if (!matchesTitle && !matchesKeyword && !matchesSlug && !matchesSeoTitle && !matchesMetaDesc && !matchesContentType && !matchesStatus && !matchesAssociatedUrl && !matchesLsi && !matchesRefs && !matchesTop10) {
                    return false;
                }
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

    const saveBatchTaskVersion = async (taskId: string, baseName: string, contentBody: string) => {
        try {
            const { data: versions } = await supabase
                .from('task_versions')
                .select('process_name')
                .eq('task_id', taskId)
                .order('created_at', { ascending: false });

            let finalName = baseName;
            if (versions && versions.length > 0) {
                const sameProcess = versions.filter(v => v.process_name.startsWith(baseName));
                if (sameProcess.length > 0) {
                    finalName = `${baseName} x${sameProcess.length + 1}`;
                }
            }
            await supabase.rpc('save_task_version', {
                p_task_id: taskId,
                p_content_body: contentBody,
                p_process_name: finalName
            });
        } catch (e) {
            console.error("Error saving batch task version", e);
        }
    };

    const runTaskDraftPipeline = async (task: Task, onLog: (tid: string, s: string, m: string) => void) => {
        setBatchResearchStatus(prev => ({ ...prev, [task.id]: 50 }));
        try {
            const res = await executeDraftPipeline(
                task, 
                activeProject, 
                (msg) => onLog(task.id, 'Redacción', msg),
                (html) => {}
            );
            if (res.success && res.updates) {
                updateTask(task.id, res.updates);
                if (res.updates.content_body) {
                    await saveBatchTaskVersion(task.id, 'Generación Inicial', res.updates.content_body);
                }
                setBatchResearchStatus(prev => ({ ...prev, [task.id]: 100 }));
            } else {
                setBatchResearchStatus(prev => ({ ...prev, [task.id]: -1 }));
            }
        } catch (e: any) {
            setBatchResearchStatus(prev => ({ ...prev, [task.id]: -1 }));
            onLog(task.id, 'Error', `🚨 Error en redacción: ${e.message}`);
            throw e;
        }
    };

    const runTaskHumanizePipeline = async (
        task: Task, 
        onLog: (tid: string, s: string, m: string) => void,
        humanizerType: 'tradicional' | 'gramatical' = 'tradicional'
    ) => {
        setBatchResearchStatus(prev => ({ ...prev, [task.id]: 10 }));
        try {
            const { data: taskContent, error: fetchErr } = await supabase.from('task_contents').select('content_body').eq('id', task.id).maybeSingle();
            if (fetchErr) throw fetchErr;
            const content = taskContent?.content_body || task.content_body;
            if (!content) throw new Error("No hay contenido para humanizar.");
            
            const isGramatical = humanizerType === 'gramatical';
            await saveBatchTaskVersion(task.id, isGramatical ? 'Pre-Humanización Gramatical' : 'Pre-Humanización', content);

            const res = await executeHumanizePipeline(
                task, 
                content, 
                activeProject,
                (msg) => onLog(task.id, isGramatical ? 'Humanización Gramatical' : 'Humanización Tradicional', msg),
                (html) => {},
                undefined,
                (progress) => setBatchResearchStatus(prev => ({ ...prev, [task.id]: progress })),
                undefined,
                undefined,
                humanizerType
            );
            if (res.success && res.updates) {
                updateTask(task.id, res.updates);
                if (res.updates.content_body) {
                    await saveBatchTaskVersion(task.id, isGramatical ? 'Post-Humanización Gramatical' : 'Humanizada', res.updates.content_body);
                }
                setBatchResearchStatus(prev => ({ ...prev, [task.id]: 100 }));
            } else {
                setBatchResearchStatus(prev => ({ ...prev, [task.id]: -1 }));
            }
        } catch (e: any) {
            setBatchResearchStatus(prev => ({ ...prev, [task.id]: -1 }));
            onLog(task.id, 'Error', `❌ Error en humanización: ${e.message}`);
            throw e;
        }
    };

    const runTaskCleanPipeline = async (task: Task, onLog: (tid: string, s: string, m: string) => void) => {
        setBatchResearchStatus(prev => ({ ...prev, [task.id]: 50 }));
        try {
            const { data: taskContent, error: fetchErr } = await supabase.from('task_contents').select('content_body').eq('id', task.id).maybeSingle();
            if (fetchErr) throw fetchErr;
            const content = taskContent?.content_body || task.content_body;
            if (!content) throw new Error("No hay contenido para limpiar.");

            await saveBatchTaskVersion(task.id, 'Pre-Limpieza', content);

            onLog(task.id, 'Limpieza', 'Iniciando limpieza inteligente por fragmentos...');
            
            const { blindedHtml, map } = HtmlProtectionService.protect(content);
            const chunks = sizeAwareChunkHtml(blindedHtml, 4 * 1500);
            let accumulatedHtml = '';
            
            for (let i = 0; i < chunks.length; i++) {
                let success = false;
                let attempts = 0;
                const MAX_ATTEMPTS = 3;

                while (!success && attempts < MAX_ATTEMPTS) {
                    try {
                        onLog(task.id, 'Limpieza', `Limpiando Chunk ${i + 1}/${chunks.length} (Intento ${attempts + 1})...`);
                        
                        const cleanChunkRes = await streamFinalCleanup(
                            chunks[i].join(''), 
                            (msg) => {} // Omitimos el log detallado de cada chunk para no saturar la vista
                        );
                        
                        accumulatedHtml += cleanChunkRes.html + '\n';
                        success = true;
                    } catch (err: any) {
                        attempts++;
                        if (attempts >= MAX_ATTEMPTS) {
                            throw new Error(`Fallo definitivo en la limpieza del chunk ${i + 1} tras ${MAX_ATTEMPTS} intentos: ${err.message}`);
                        }
                        
                        onLog(task.id, 'Limpieza', `Error en Limpieza Chunk ${i + 1}. Reintentando en 10s... (${attempts}/${MAX_ATTEMPTS})`);
                        await new Promise(resolve => setTimeout(resolve, 10000));
                    }
                }
            }

            const restoredHtml = HtmlProtectionService.restore(accumulatedHtml, map);
            const updates: Partial<Task> = {
                content_body: restoredHtml,
                metadata: { ...(task.metadata as object), is_cleaned: true, cleaned_at: new Date().toISOString() }
            };
            const { error: tErr } = await supabase.from('tasks').update(updates).eq('id', task.id);
            if (tErr) throw tErr;

            const { error: tcErr } = await supabase.from('task_contents').upsert({ id: task.id, content_body: accumulatedHtml });
            if (tcErr) throw tcErr;

            updateTask(task.id, updates); 
            await saveBatchTaskVersion(task.id, 'Limpieza IA', accumulatedHtml);
            setBatchResearchStatus(prev => ({ ...prev, [task.id]: 100 }));
            onLog(task.id, 'Limpieza', '✅ Limpieza inteligente completada exitosamente.');
        } catch (e: any) {
            setBatchResearchStatus(prev => ({ ...prev, [task.id]: -1 }));
            onLog(task.id, 'Error', `❌ Error limpieza: ${e.message}`);
            throw e;
        }
    };

    const runTaskSurgicalEditPipeline = async (task: Task, onLog: (tid: string, s: string, m: string) => void) => {
        setBatchResearchStatus(prev => ({ ...prev, [task.id]: 50 }));
        try {
            const { data: taskContent, error: fetchErr } = await supabase.from('task_contents').select('content_body').eq('id', task.id).maybeSingle();
            if (fetchErr) throw fetchErr;
            const content = taskContent?.content_body || task.content_body;
            if (!content) throw new Error("No hay contenido para edición quirúrgica.");

            await saveBatchTaskVersion(task.id, 'Pre-Edición Quirúrgica', content);

            onLog(task.id, 'Edición Quirúrgica', 'Iniciando edición quirúrgica por fragmentos...');
            
            const { blindedHtml, map } = HtmlProtectionService.protect(content);
            const chunks = sizeAwareChunkHtml(blindedHtml, 3 * 1500);
            let accumulatedHtml = '';
            const config = {
                projectName: activeProject.name,
                niche: activeProject.niche || 'General',
                audience: 'Público General',
                language: activeProject.settings?.content_preferences?.default_content_language || 'es'
            };
            
            for (let i = 0; i < chunks.length; i++) {
                let success = false;
                let attempts = 0;
                const MAX_ATTEMPTS = 3;

                while (!success && attempts < MAX_ATTEMPTS) {
                    try {
                        onLog(task.id, 'Edición Quirúrgica', `Editando Chunk ${i + 1}/${chunks.length} (Intento ${attempts + 1})...`);
                        
                        const chunkResult = await streamSurgicalEdit(
                            chunks[i].join(''), 
                            config,
                            50,
                            () => {},
                            (msg) => {}
                        );
                        
                        accumulatedHtml += chunkResult.html + '\n';
                        success = true;
                    } catch (err: any) {
                        attempts++;
                        if (attempts >= MAX_ATTEMPTS) {
                            throw new Error(`Fallo definitivo en la edición del chunk ${i + 1} tras ${MAX_ATTEMPTS} intentos: ${err.message}`);
                        }
                        
                        onLog(task.id, 'Edición Quirúrgica', `Error en Edición Chunk ${i + 1}. Reintentando en 10s... (${attempts}/${MAX_ATTEMPTS})`);
                        await new Promise(resolve => setTimeout(resolve, 10000));
                    }
                }
            }

            const restoredHtml = HtmlProtectionService.restore(accumulatedHtml, map);
            const updates: Partial<Task> = {
                content_body: restoredHtml,
                metadata: { ...(task.metadata as object), is_surgical_edited: true, surgical_edited_at: new Date().toISOString() }
            };
            const { error: tErr } = await supabase.from('tasks').update(updates).eq('id', task.id);
            if (tErr) throw tErr;

            const { error: tcErr } = await supabase.from('task_contents').upsert({ id: task.id, content_body: accumulatedHtml });
            if (tcErr) throw tcErr;

            updateTask(task.id, updates); 
            await saveBatchTaskVersion(task.id, 'Edición Quirúrgica', accumulatedHtml);
            setBatchResearchStatus(prev => ({ ...prev, [task.id]: 100 }));
            onLog(task.id, 'Edición Quirúrgica', '✅ Edición quirúrgica completada exitosamente.');
        } catch (e: any) {
            setBatchResearchStatus(prev => ({ ...prev, [task.id]: -1 }));
            onLog(task.id, 'Error', `❌ Error edición: ${e.message}`);
            throw e;
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
                    projectId: activeProject ? activeProject.id : "",
                    keyword: task.target_keyword || task.title,
                    onProgress: (p) => {
                        const progressMap: Record<string, number> = { 'serp': 25, 'scraping': 50, 'keywords': 75, 'metadata': 90, 'interlinking': 95, 'outline': 100 };
                        setBatchResearchStatus(prev => ({ ...prev, [taskId]: progressMap[p] || 10 }));
                        setResearchPhaseId(p);
                        setResearchTopic(task.target_keyword || task.title);
                    },
                    onLog: (s, m, r) => onLog(taskId, s, m, r),
                    taskId: taskId,
                    linkPlannedContents,
                    linkPlannedStatuses
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
                    projectId: activeProject ? activeProject.id : "",
                    keyword: task.target_keyword || task.title,
                    onProgress: (p) => {
                        const progressMap: Record<string, number> = { 'serp': 25, 'scraping': 50, 'keywords': 75, 'metadata': 90, 'interlinking': 95, 'outline': 100 };
                        setBatchResearchStatus(prev => ({ ...prev, [taskId]: progressMap[p] || 10 }));
                        setResearchPhaseId(p);
                        setResearchTopic(task.target_keyword || task.title);
                    },
                    onLog: (s, m, r) => onLog(taskId, s, m, r),
                    taskId: taskId,
                    forceRestart,
                    linkPlannedContents,
                    linkPlannedStatuses
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
                setBatchResearchStatus(prev => ({ ...prev, [taskId]: 50 }));
                const res = await processTaskOutlineAction(task.id, useWriterStore.getState().csvData);
                if (res.success && res.updates) {
                    updateTask(taskId, res.updates);
                    onLog(taskId, 'Outline', res.msg!);
                } else {
                    throw new Error(res.error);
                }
            } else if (action === 'draft') {
                await runTaskDraftPipeline(task, onLog);
                await runTaskHumanizePipeline(task, onLog, 'tradicional');
            } else if (action === 'humanize') {
                await runTaskHumanizePipeline(task, onLog, 'tradicional');
            } else if (action === 'humanize_gramatical') {
                await runTaskHumanizePipeline(task, onLog, 'gramatical');
            } else if (action === 'humanize_uniprompt') {
                await runTaskHumanizePipeline(task, onLog, 'uniprompt');
            } else if (action === 'visuals') {
                setBatchResearchStatus(prev => ({ ...prev, [taskId]: 50 }));
                const res = await processTaskVisualsAction(task.id);
                if (res.success && res.updates) {
                    updateTask(task.id, res.updates);
                    onLog(task.id, 'Visuals', res.msg!);
                } else {
                    throw new Error(res.error);
                }
            }
        } catch (e: any) {
            console.error(e);
            NotificationService.error("Error en acción individual", e.message);
            setBatchResearchStatus(prev => ({ ...prev, [taskId]: -1 }));
        } finally {
            setResearching(false);
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
                const { research, draft, humanize, surgicalEdit, clean, translate, finalStatus } = config || {};
                const isManualSelection = selectedTaskIds && selectedTaskIds.length > 0;
                const targetTasks = isManualSelection
                    ? tasks.filter(t => selectedTaskIds.includes(t.id))
                    : tasks;

                if (!targetTasks || targetTasks.length === 0) {
                    NotificationService.notify("Información", "No hay contenidos seleccionados para procesar.");
                    return;
                }

                // ── DB pre-check: fetch which tasks actually have content ──
                setIsOrbPlanLoading(true);
                setIsOrbPlanOpen(true);

                const { data: existingContents, error: fetchErr } = await supabase
                    .from('task_contents')
                    .select('id, content_body')
                    .in('id', targetTasks.map(t => t.id));
                if (fetchErr) console.error("Error checking task_contents:", fetchErr);

                const dbTasksWithContent = (existingContents || [])
                    .filter((c: any) => c.content_body && c.content_body.trim().length > 0)
                    .map((c: any) => c.id);

                const tasksWithContent = new Set([
                    ...dbTasksWithContent,
                    ...targetTasks.filter(t => t.content_body && t.content_body.trim().length > 0).map(t => t.id)
                ]);

                const RESEARCHED_STATUSES = ['por_redactar', 'por_corregir', 'redactado', 'publicado', 'humanizado', 'en_revision', 'en_investigacion', 'por_humanizar', 'por_maquetar'];
                const translateLanguages = activeProject?.i18n_settings?.languages?.length ?? 0;

                // Build plan buckets
                // Only allow actions if prerequisites are met, even if manually selected.
                const planToResearch = research
                    ? targetTasks.filter(t => isManualSelection || !RESEARCHED_STATUSES.includes(t.status))
                    : [];
                
                // Draft items that don't have content.
                const planToDraft = draft
                    ? targetTasks.filter(t => !tasksWithContent.has(t.id))
                    : [];
                
                // Rewrite items only if they already have content.
                const planToRewrite = draft && isManualSelection
                    ? targetTasks.filter(t => tasksWithContent.has(t.id))
                    : [];
                
                // Cascade: Humanize items if they already have content, or if they WILL be drafted in this run.
                const planToHumanize = humanize
                    ? targetTasks.filter(t => tasksWithContent.has(t.id) || draft)
                    : [];

                // Cascade: Surgical Edit items if they have content, or drafted/humanized in this run.
                const planToSurgicalEdit = surgicalEdit
                    ? targetTasks.filter(t => tasksWithContent.has(t.id) || draft || humanize)
                    : [];
                
                // Cascade: Translate items if they already have content, or if they WILL be drafted in this run.
                const planToTranslate = translate
                    ? targetTasks.filter(t => tasksWithContent.has(t.id) || draft)
                    : [];
                
                // Clean items if they have content.
                const planToClean = clean
                    ? targetTasks.filter(t => tasksWithContent.has(t.id))
                    : [];

                const plan: OrbPipelinePlan = {
                    toResearch: planToResearch.map(t => ({ id: t.id, title: t.title })),
                    toDraft: planToDraft.map(t => ({ id: t.id, title: t.title })),
                    toRewrite: planToRewrite.map(t => ({ id: t.id, title: t.title })),
                    toHumanize: planToHumanize.map(t => ({ id: t.id, title: t.title })),
                    toSurgicalEdit: planToSurgicalEdit.map(t => ({ id: t.id, title: t.title })),
                    toTranslate: planToTranslate.map(t => ({ id: t.id, title: t.title })),
                    toClean: planToClean.map(t => ({ id: t.id, title: t.title })),
                    translateLanguages,
                    generateImages: false,
                };

                setOrbPlan(plan);
                setIsOrbPlanLoading(false);
                // Store config for when user confirms
                setPendingOrbConfig({ action, config: { ...config, _plan: plan, _targetTasks: targetTasks, _tasksWithContent: Array.from(tasksWithContent) } });

                // Execution will resume in executeOrbPipeline() after modal confirm
                setResearching(false);
                return;
            }

            // ── Actual pipeline execution (called after modal confirm) ──
            if (action === '__execute_batch_pipeline__') {
                const { research, draft, humanize, surgicalEdit, clean, translate, finalStatus, _plan, _targetTasks } = config || {};
                const targetTasks = _targetTasks || [];

                const { enqueueTask, setBatchInfo } = useQueueStore.getState();
                setBatchInfo(targetTasks.length);
                for (const t of targetTasks) {
                    enqueueTask(`batch_${t.id}_${Date.now()}`, `Pipeline: ${t.title}`, async () => {
                    let latestTask = useProjectStore.getState().tasks.find(tk => tk.id === t.id) || t;
                    let successSoFar = true;

                    // 1. Research
                    const shouldResearch = (_plan?.toResearch || []).some((p: any) => p.id === t.id);
                    if (research && shouldResearch) {
                        setBatchResearchStatus(prev => ({ ...prev, [t.id]: 5 }));
                        const result = await StrategyService.runDeepSEOAnalysis({
                            projectId: activeProject ? activeProject.id : "",
                            keyword: latestTask.target_keyword || latestTask.title,
                            onProgress: (p) => {
                                const progressMap: Record<string, number> = { 'serp': 25, 'scraping': 50, 'keywords': 75, 'metadata': 90, 'interlinking': 95, 'outline': 100 };
                                setBatchResearchStatus(prev => ({ ...prev, [t.id]: progressMap[p] || 10 }));
                                setResearchPhaseId(p);
                                setResearchTopic(latestTask.target_keyword || latestTask.title);
                            },
                            onLog: (s, m, r) => onLog(t.id, s, m, r),
                            taskId: t.id,
                            linkPlannedContents,
                            linkPlannedStatuses
 } , { taskId: t.id });
                        if (result) {
                            const statusToSet = (finalStatus === 'keep_current') ? latestTask.status : result.status;
                            await updateTask(t.id, {
                                title: improveTitleWithNous && result.seo_title ? result.seo_title : latestTask.title,
                                research_dossier: result.research_dossier,
                                seo_title: latestTask.seo_title || result.seo_title,
                                meta_description: latestTask.meta_description || result.meta_description,
                                target_url_slug: latestTask.target_url_slug || result.target_url_slug,
                                status: statusToSet,
                                observaciones: latestTask.observaciones || result.observaciones
                            });
                            latestTask = { ...latestTask, status: statusToSet };
                        } else {
                            successSoFar = false;
                        }
                        setBatchResearchStatus(prev => ({ ...prev, [t.id]: 100 }));
                    }

                    // 2. Draft
                    const shouldDraft = (_plan?.toDraft || []).some((p: any) => p.id === t.id);
                    const shouldRewrite = (_plan?.toRewrite || []).some((p: any) => p.id === t.id);
                    if (draft && successSoFar && (shouldDraft || shouldRewrite)) {
                        try {
                            await runTaskDraftPipeline(latestTask, onLog);
                            latestTask = useProjectStore.getState().tasks.find(tk => tk.id === t.id) || latestTask;
                        } catch (e: any) {
                            successSoFar = false;
                            setBatchResearchStatus(prev => ({ ...prev, [t.id]: -1 }));
                            onLog(t.id, 'Error', `❌ Error redactando: ${e.message}`);
                        }
                    }

                    // 3. Humanize
                    const shouldHumanize = (_plan?.toHumanize || []).some((p: any) => p.id === t.id);
                    if (humanize && successSoFar && shouldHumanize) {
                        try {
                            await runTaskHumanizePipeline(latestTask, onLog);
                            latestTask = useProjectStore.getState().tasks.find(tk => tk.id === t.id) || latestTask;
                        } catch (e: any) {
                            successSoFar = false;
                            setBatchResearchStatus(prev => ({ ...prev, [t.id]: -1 }));
                            onLog(t.id, 'Error', `❌ Error humanizando: ${e.message}`);
                        }
                    }

                    // 3.5 Surgical Edit
                    const shouldSurgicalEdit = (_plan?.toSurgicalEdit || []).some((p: any) => p.id === t.id);
                    if (surgicalEdit && successSoFar && shouldSurgicalEdit) {
                        try {
                            await runTaskSurgicalEditPipeline(latestTask, onLog);
                            latestTask = useProjectStore.getState().tasks.find(tk => tk.id === t.id) || latestTask;
                        } catch (e: any) {
                            successSoFar = false;
                            setBatchResearchStatus(prev => ({ ...prev, [t.id]: -1 }));
                            onLog(t.id, 'Error', `❌ Error edición: ${e.message}`);
                        }
                    }

                    // 4. Clean
                    const shouldClean = (_plan?.toClean || []).some((p: any) => p.id === t.id);
                    if (clean && successSoFar && shouldClean) {
                        try {
                            await runTaskCleanPipeline(latestTask, onLog);
                            latestTask = useProjectStore.getState().tasks.find(tk => tk.id === t.id) || latestTask;
                        } catch (e: any) {
                            successSoFar = false;
                            setBatchResearchStatus(prev => ({ ...prev, [t.id]: -1 }));
                            onLog(t.id, 'Error', `❌ Error limpiando: ${e.message}`);
                        }
                    }

                    // 5. Translate
                    const shouldTranslate = (_plan?.toTranslate || []).some((p: any) => p.id === t.id);
                    const targetLangs = activeProject.i18n_settings?.languages || [];
                    if (translate && successSoFar && shouldTranslate && targetLangs.length > 0) {
                        for (const lang of targetLangs) {
                            const res = await processTaskTranslationAction(t.id, lang);
                            if (res.success) {
                                onLog(t.id, 'Traducción', res.msg!);
                            } else {
                                onLog(t.id, 'Error', `❌ Error traducción: ${res.error}`);
                            }
                        }
                        latestTask = useProjectStore.getState().tasks.find(tk => tk.id === t.id) || latestTask;
                    }

                    // Finally, if everything was successful or at least attempted, set final status for this task
                    if (finalStatus && finalStatus !== 'keep_current' && successSoFar) {
                        if (latestTask.status !== finalStatus) {
                            await updateTask(t.id, { status: finalStatus });
                        }
                    }

                    });
                }

                NotificationService.success('Pipeline Encolado', `Nous ha añadido ${targetTasks.length} contenidos a la cola.`);
            } else if (action === 'investigar_ideas') {
                const candidates = selectedTaskIds.length > 0 ? tasks.filter(t => selectedTaskIds.includes(t.id)) : tasks.filter(t => t.status === 'idea');
                if (candidates.length === 0) {
                    NotificationService.notify("Aviso", "No hay contenidos seleccionados o ideas para investigar.");
                    return;
                }
                let processedCount = 0;
                const { enqueueTask, setBatchInfo } = useQueueStore.getState();
                setBatchInfo(candidates.length);
                for (const t of candidates) {
                    enqueueTask('batch_research', `Investigando: ${t.title}`, 
                        { targetTaskId: t.id, keyword: t.target_keyword || t.title, projectId: activeProject ? activeProject.id : "", linkPlannedContents, linkPlannedStatuses, improveTitleWithNous, currentTitle: t.title, forceRestart: true },
                        { taskId: t.id }
                    );
                }
                NotificationService.success('En cola', `Nous ha añadido ${candidates.length} investigaciones a la cola.`);
            } else if (action === 'generar_outlines') {
                // Use status as proxy: en_investigacion = has research, needs outline
                let filtered = tasks.filter(t => t.status === 'en_investigacion');
                if (selectedTaskIds.length > 0) filtered = tasks.filter(t => selectedTaskIds.includes(t.id));
                if (filtered.length === 0) { NotificationService.notify('Sin tareas', 'No hay tareas investigadas que necesiten un outline.'); return; }
                const { enqueueTask } = useQueueStore.getState();
                for (const t of filtered) {
                    enqueueTask('batch_outline', `Outline: ${t.title}`, 
                        { targetTaskId: t.id, keyword: t.target_keyword || t.title, projectId: activeProject ? activeProject.id : "", researchDossier: t.research_dossier, recommendedWordCount: t.target_word_count },
                        { taskId: t.id }
                    );
                }
                NotificationService.success('En cola', `Nous ha añadido ${filtered.length} outlines a la cola.`);
            } else if (action === 'redaccion_masiva') {
                // Use status as proxy: por_redactar = outline done, no content yet
                let filtered = tasks.filter(t => t.status === 'por_redactar');
                if (selectedTaskIds.length > 0) filtered = tasks.filter(t => selectedTaskIds.includes(t.id));
                if (filtered.length === 0) { NotificationService.notify('Sin tareas', 'No hay outlines listos para redactar.'); return; }
                const { enqueueTask } = useQueueStore.getState();
                for (const t of filtered) {
                    enqueueTask('batch_generate', `Redactando: ${t.title}`, 
                        { targetTask: t, activeProject },
                        { taskId: t.id }
                    );
                }
                NotificationService.success('En cola', `Nous ha añadido ${filtered.length} redacciones a la cola.`);
            } else if (action === 'humanizacion_masiva') {
                // Ignore status if manual selection, but STRICTLY require content
                let filtered = tasks.filter(t => t.status === 'por_corregir' || t.status === 'redactado');
                if (selectedTaskIds.length > 0) {
                    const { data: tc, error: fetchErr } = await supabase.from('task_contents').select('id, content_body').in('id', selectedTaskIds);
                    if (fetchErr) { NotificationService.error('Error de red', 'No se pudieron verificar los contenidos. Verifica tu conexión.'); return; }
                    const validIds = new Set((tc || []).filter((c: any) => c.content_body && c.content_body.trim().length > 0).map((c: any) => c.id));
                    filtered = tasks.filter(t => selectedTaskIds.includes(t.id) && validIds.has(t.id));
                }
                if (filtered.length === 0) { NotificationService.notify('Sin tareas', 'Ninguno de los artículos seleccionados tiene contenido válido para humanizar.'); return; }
                const { enqueueTask } = useQueueStore.getState();
                for (const t of filtered) {
                    enqueueTask('batch_humanize', `Humanizando: ${t.title}`, 
                        { targetTask: t, activeProject, content: t.content_body },
                        { taskId: t.id }
                    );
                }
                NotificationService.success('En cola', `Nous ha añadido ${filtered.length} humanizaciones a la cola.`);
            } else if (action === 'traduccion_masiva') {
                const targetLangs = activeProject.i18n_settings?.languages || [];
                if (targetLangs.length === 0) { NotificationService.warn('Configuración requerida', 'Debes configurar idiomas de traducción en los ajustes del proyecto.'); return; }
                let filtered = (selectedTaskIds && selectedTaskIds.length > 0) ? tasks.filter(t => selectedTaskIds.includes(t.id)) : tasks;
                if (filtered.length === 0) { NotificationService.notify('Sin tareas', 'No hay contenidos seleccionados para traducir.'); return; }
                const { enqueueTask } = useQueueStore.getState();
                for (const t of filtered) {
                    enqueueTask('batch_translate', `Traduciendo: ${t.title}`, 
                        { targetTaskId: t.id, targetLangs },
                        { taskId: t.id }
                    );
                }
                NotificationService.success('En cola', `Nous ha añadido ${filtered.length} traducciones a la cola.`);
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

    // Called when user confirms the pre-flight modal
    const executeOrbPipeline = () => {
        if (!pendingOrbConfig) return;
        setIsOrbPlanOpen(false);
        setOrbPlan(null);
        setResearching(true);
        setResearchProgress(0);
        if (!isConsoleOpen) setIsConsoleOpen(true);
        // Trigger the actual execution path
        handleOrbAction('__execute_batch_pipeline__', pendingOrbConfig.config);
        setPendingOrbConfig(null);
    };

    const cancelOrbPipeline = () => {
        setIsOrbPlanOpen(false);
        setOrbPlan(null);
        setPendingOrbConfig(null);
        setIsOrbPlanLoading(false);
        setResearching(false);
    };


    if (isMobile) {
        return (
            <div className="flex flex-col h-screen bg-slate-50">
                <PlannerMobileView
                    tasks={filteredTasks}
                    allTasks={tasks}
                    selectedTask={selectedTask}
                    onSelectTask={setSelectedTask}
                    onOpenDrawer={() => useAppStore.getState().setIsMobileMenuOpen(true)}
                    onOpenPipeline={() => setIsPipelineModalOpen(true)}
                    onOpenSmartUpload={() => setIsSmartUploadModalOpen(true)}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    statusFilter={statusFilter}
                    onToggleStatusFilter={toggleStatusFilter}
                    onClearFilters={clearFilters}
                    dateFrom={dateFrom}
                    onDateFromChange={setDateFrom}
                    dateTo={dateTo}
                    onDateToChange={setDateTo}
                    onReinvestigate={(task) => setReinvestigateTask(task)}
                    onDeleteTask={async (taskId) => {
                        if (window.confirm("¿Eliminar este contenido permanentemente?")) {
                            await deleteTasks([taskId]);
                        }
                    }}
                    onAddTask={() => setIsNewTaskModalOpen(true)}
                />

                {/* Overlays on Mobile */}
                {selectedTask && (
                    <ContentDetailView 
                        task={selectedTask} 
                        onClose={() => setSelectedTask(null)} 
                    />
                )}

                <NousPipelineModal 
                    isOpen={isPipelineModalOpen}
                    onClose={() => setIsPipelineModalOpen(false)}
                    selectedTaskIds={selectedTaskIds}
                    onExecute={async (blocks, mode, strategy, finalTargetIds, finalStatus) => {
                        if (!activeProject) {
                            NotificationService.error("Error", "No hay proyecto activo.");
                            return;
                        }
                        setResearching(true);
                        setResearchProgress(0);
                        const targetTasks = mode === 'manual' 
                            ? tasks.filter(t => (finalTargetIds || selectedTaskIds).includes(t.id))
                            : mode === 'status'
                                ? tasks.filter(t => t.status === finalStatus)
                                : tasks;
                        if (targetTasks.length === 0) {
                            NotificationService.error("Información", "No hay contenidos para procesar.");
                            setResearching(false);
                            return;
                        }
                        try {
                            await executePipeline({
                                blocks,
                                mode,
                                strategy,
                                targetTasks,
                                project: activeProject,
                                onLog: (taskId, stage, msg) => addStrategyLog(taskId, stage, msg),
                                onProgress: (taskId, progress) => setResearchProgress(progress)
                            });
                            if (activeProject) fetchProjectTasks(activeProject.id);
                            setSelectedTaskIds([]);
                        } catch (e: any) {
                            console.error(e);
                            NotificationService.error("Error en Pipeline", e.message);
                        } finally {
                            setResearching(false);
                        }
                    }}
                />

                <SmartUploaderModal 
                    isOpen={isSmartUploadModalOpen} 
                    onClose={() => setIsSmartUploadModalOpen(false)}
                    projectId={activeProject?.id || ''}
                    onImportComplete={async (importedTasks) => {
                        for (const task of importedTasks) {
                            await addTask(task);
                        }
                        fetchProjectTasks(activeProject?.id || '');
                    }}
                />

                <WriterMobileNewTaskModal
                    isOpen={isNewTaskModalOpen}
                    onClose={() => setIsNewTaskModalOpen(false)}
                    onTaskCreated={() => {
                        fetchProjectTasks(activeProject?.id || '');
                    }}
                />

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
                                                            projectId: activeProject ? activeProject.id : "",
                                                            keyword: reinvestigateTask.keyword,
                                                            taskId: reinvestigateTask.id,
                                                            phaseToRun: phase.id,
                                                            cascade: isCascadeMode,
                                                            onLog: (s, m, r) => addStrategyLog(reinvestigateTask.id, s, m, r),
                                                            onProgress: (p) => setResearchPhaseId(p),
                                                            linkPlannedContents,
                                                            linkPlannedStatuses
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
        );
    }

    return (
        <div className="flex flex-col h-screen bg-white">
            {/* Desktop Single-Row Minimalist Header */}
            <div className="shrink-0 sticky top-0 z-40 bg-white border-b border-slate-100 shadow-xs h-16 flex items-center px-4 md:px-6 gap-3 md:gap-4 justify-between">
                {/* Left side: NousSquareButton & Search & Filter */}
                <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                    {/* Nous Square Button */}
                    <NousSquareButton onClick={() => setIsPipelineModalOpen(true)} />

                    {/* Search Input */}
                    <div className="relative flex-1 max-w-xl lg:max-w-2xl">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar por título o keyword..." 
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Filter Icon Button (with Bubble Menu) */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsFilterBubbleOpen(!isFilterBubbleOpen)}
                            className={cn(
                                "h-9 w-9 flex items-center justify-center rounded-xl border transition-all relative shrink-0",
                                (statusFilter.length > 0 || dateFrom || dateTo)
                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                                    : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300"
                            )}
                            title="Filtrar por estado y fecha"
                            aria-label="Filtros"
                        >
                            <Filter size={15} />
                            {(statusFilter.length > 0 || dateFrom || dateTo) && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white" />
                            )}
                        </button>
                        
                        <AnimatePresence>
                            {isFilterBubbleOpen && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setIsFilterBubbleOpen(false)} />
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute left-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-40 p-4 space-y-4"
                                    >
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Filtros</h4>
                                                <p className="text-[10px] text-slate-400 mt-0.5">Estado y fechas de publicación</p>
                                            </div>
                                            {(statusFilter.length > 0 || dateFrom || dateTo) && (
                                                <button 
                                                    onClick={clearFilters}
                                                    className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600"
                                                >
                                                    Limpiar
                                                </button>
                                            )}
                                        </div>

                                        {/* Status Filter */}
                                        <div>
                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-2">Por Estado</span>
                                            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                                {Object.entries(STATUS_LABELS).map(([status, label]) => {
                                                    const isActive = statusFilter.includes(status);
                                                    return (
                                                        <button 
                                                            key={status}
                                                            onClick={() => toggleStatusFilter(status)}
                                                            className={cn(
                                                                "w-full flex items-center gap-2.5 p-2 rounded-xl transition-all text-left",
                                                                isActive ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "w-3.5 h-3.5 rounded border flex items-center justify-center transition-all",
                                                                isActive ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-300 bg-white"
                                                            )}>
                                                                {isActive && <Check size={10} strokeWidth={3} />}
                                                            </div>
                                                            <span className="text-[11px] font-bold uppercase tracking-tight">{label}</span>
                                                        </button>
                                                    );
                                                })}
                                                {activeTeam?.settings?.custom_statuses?.map((status: string) => {
                                                    const isActive = statusFilter.includes(status);
                                                    return (
                                                        <button 
                                                            key={status}
                                                            onClick={() => toggleStatusFilter(status)}
                                                            className={cn(
                                                                "w-full flex items-center gap-2.5 p-2 rounded-xl transition-all text-left",
                                                                isActive ? "bg-rose-50 text-rose-700" : "hover:bg-slate-50 text-slate-600"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "w-3.5 h-3.5 rounded border flex items-center justify-center transition-all",
                                                                isActive ? "bg-rose-500 border-rose-500 text-white" : "border-slate-300 bg-white"
                                                            )}>
                                                                {isActive && <Check size={10} strokeWidth={3} />}
                                                            </div>
                                                            <span className="text-[11px] font-bold uppercase tracking-tight">{status.replace(/_/g, ' ')}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Date Filters */}
                                        <div className="pt-2 border-t border-slate-100">
                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-2">Por Fecha</span>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                                                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-1">Desde</span>
                                                    <input 
                                                        type="date" 
                                                        className="w-full bg-transparent border-none text-[10px] font-bold text-slate-700 outline-none p-0 cursor-pointer"
                                                        value={dateFrom}
                                                        onChange={(e) => setDateFrom(e.target.value)}
                                                    />
                                                </div>
                                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                                                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-1">Hasta</span>
                                                    <input 
                                                        type="date" 
                                                        className="w-full bg-transparent border-none text-[10px] font-bold text-slate-700 outline-none p-0 cursor-pointer"
                                                        value={dateTo}
                                                        onChange={(e) => setDateTo(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                                            <button 
                                                onClick={() => setIsFilterBubbleOpen(false)}
                                                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                                            >
                                                Listo
                                            </button>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Active Filters Clear Button */}
                    {(searchQuery || statusFilter.length > 0 || dateFrom || dateTo) && (
                        <button 
                            onClick={clearFilters}
                            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-all text-[10px] font-black uppercase tracking-wider"
                        >
                            <X size={12} />
                            <span>Limpiar filtros</span>
                        </button>
                    )}
                </div>

                {/* Right side: Selected counter & Hamburger Menu (3 rayitas ☰) */}
                <div className="flex items-center gap-2 shrink-0">
                    {selectedTaskIds.length > 0 && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                            {selectedTaskIds.length} seleccionados
                        </span>
                    )}

                    {/* Column Visibility Selector (Hash) */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
                            className={cn(
                                "h-9 w-9 flex items-center justify-center rounded-xl transition-all border shrink-0 bg-white",
                                isColumnSelectorOpen ? "border-indigo-200 text-indigo-600 bg-indigo-50/50" : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                            )}
                            title="Configurar columnas"
                        >
                            <Hash size={15} />
                        </button>
                        <AnimatePresence>
                            {isColumnSelectorOpen && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setIsColumnSelectorOpen(false)} />
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 p-4 space-y-2"
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

                    
                    {/* Hamburger Menu (3 rayitas) consolidating Actions */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                            className={cn(
                                "h-9 w-9 flex items-center justify-center rounded-xl border transition-all shadow-xs active:scale-95",
                                isActionsMenuOpen ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                            )}
                            title="Acciones de la tabla"
                            aria-label="Menú de acciones"
                        >
                            <Menu size={16} />
                        </button>

                        <AnimatePresence>
                            {isActionsMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setIsActionsMenuOpen(false)} />
                                    <motion.div 
                                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                        className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-40 p-2 space-y-1"
                                    >
                                        {/* Copiar Tabla */}
                                        <button 
                                            onClick={() => {
                                                setIsActionsMenuOpen(false);
                                                handleCopyTable();
                                            }}
                                            disabled={isExporting || filteredTasks.length === 0}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition-colors disabled:opacity-40"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                <Clipboard size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-tight">Copiar Tabla</p>
                                                <p className="text-[9px] text-slate-400 font-medium">Copia en formato TSV</p>
                                            </div>
                                        </button>

                                        {/* Carga Inteligente */}
                                        <button 
                                            onClick={() => {
                                                setIsActionsMenuOpen(false);
                                                setIsSmartUploadModalOpen(true);
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                <UploadCloud size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-tight">Carga Inteligente</p>
                                                <p className="text-[9px] text-slate-400 font-medium">Importar URLs o datos</p>
                                            </div>
                                        </button>

                                        {/* Descargar CSV */}
                                        <button 
                                            onClick={() => {
                                                setIsActionsMenuOpen(false);
                                                handleDownloadCSV();
                                            }}
                                            disabled={isExporting || filteredTasks.length === 0}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-slate-100 text-slate-700 transition-colors disabled:opacity-40"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                                                <FileDown size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-tight">Descargar CSV</p>
                                                <p className="text-[9px] text-slate-400 font-medium">Exportar vista actual</p>
                                            </div>
                                        </button>

                                        <div className="border-t border-slate-100 my-1" />

                                        {/* Limpieza Parcial */}
                                        <button 
                                            onClick={() => {
                                                setIsActionsMenuOpen(false);
                                                if (selectedTaskIds.length > 0) {
                                                    handleBatchDelete();
                                                }
                                            }}
                                            disabled={selectedTaskIds.length === 0}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-amber-50 text-slate-700 hover:text-amber-700 transition-colors disabled:opacity-40"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                                <Eraser size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-tight">
                                                    Limpieza Parcial {selectedTaskIds.length > 0 && `(${selectedTaskIds.length})`}
                                                </p>
                                                <p className="text-[9px] text-slate-400 font-medium">
                                                    {selectedTaskIds.length > 0 ? 'Limpiar datos de filas seleccionadas' : 'Selecciona filas para limpiar'}
                                                </p>
                                            </div>
                                        </button>

                                        {/* Eliminar Contenido */}
                                        <button 
                                            onClick={() => {
                                                setIsActionsMenuOpen(false);
                                                if (selectedTaskIds.length > 0) {
                                                    const confirmText = prompt(`Escribe "ELIMINAR" para borrar permanentemente ${selectedTaskIds.length} artículos:`);
                                                    if (confirmText === 'ELIMINAR') {
                                                        confirmBatchDelete(true);
                                                    }
                                                }
                                            }}
                                            disabled={selectedTaskIds.length === 0}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-rose-50 text-rose-600 transition-colors disabled:opacity-40"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                                                <Trash2 size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-tight">
                                                    Eliminar Contenido {selectedTaskIds.length > 0 && `(${selectedTaskIds.length})`}
                                                </p>
                                                <p className="text-[9px] text-rose-400 font-medium">
                                                    {selectedTaskIds.length > 0 ? 'Borrar permanentemente' : 'Selecciona filas para borrar'}
                                                </p>
                                            </div>
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

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
                                                            projectId: activeProject ? activeProject.id : "",
                                                            keyword: reinvestigateTask.keyword,
                                                            taskId: reinvestigateTask.id,
                                                            phaseToRun: phase.id,
                                                            cascade: isCascadeMode,
                                                            onLog: (s, m, r) => addStrategyLog(reinvestigateTask.id, s, m, r),
                                                            onProgress: (p) => setResearchPhaseId(p),
                                                            linkPlannedContents,
                                                            linkPlannedStatuses
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

            {/* Modals and Overlays */}
            <SmartUploaderModal 
                isOpen={isSmartUploadModalOpen} 
                onClose={() => setIsSmartUploadModalOpen(false)}
                projectId={activeProject?.id || ''}
                onImportComplete={async (importedTasks) => {
                    for (const task of importedTasks) {
                        await addTask(task);
                    }
                    fetchProjectTasks(activeProject?.id || '');
                }}
            />

            {/* Pipeline Modal */}
            <NousPipelineModal 
                isOpen={isPipelineModalOpen}
                onClose={() => setIsPipelineModalOpen(false)}
                selectedTaskIds={selectedTaskIds}
                onExecute={async (blocks, mode, strategy, finalTargetIds, finalStatus) => {
                    if (!activeProject) {
                        NotificationService.error("Error", "No hay proyecto activo.");
                        return;
                    }
                    
                    // setIsPipelineModalOpen(false); // Mantener el modal abierto!
                    setResearching(true);
                    setResearchProgress(0);
                    // if (!isConsoleOpen) setIsConsoleOpen(true); // Ya no abrimos la consola legacy

                    // Determinar el target base
                    const targetTasks = mode === 'manual' 
                        ? tasks.filter(t => (finalTargetIds || selectedTaskIds).includes(t.id))
                        : mode === 'status'
                            ? tasks.filter(t => t.status === finalStatus)
                            : tasks;
                    
                    if (targetTasks.length === 0) {
                        NotificationService.error("Información", "No hay contenidos para procesar.");
                        setResearching(false);
                        return;
                    }

                    try {
                        await executePipeline({
                            blocks,
                            mode,
                            strategy,
                            targetTasks,
                            project: activeProject,
                            onLog: (taskId, stage, msg) => addStrategyLog(taskId, stage, msg),
                            onProgress: (taskId, progress) => setResearchProgress(progress)
                        });
                        
                        // Refrescar contenidos y selección al terminar
                        if (activeProject) fetchProjectTasks(activeProject.id);
                        setSelectedTaskIds([]);
                    } catch (e: any) {
                        console.error(e);
                        NotificationService.error("Error en Pipeline", e.message);
                    } finally {
                        setResearching(false);
                    }
                }}
            />

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
                                <button 
                                    onClick={() => confirmBatchDelete(false)}
                                    disabled={isDeletingAll || !(batchDeleteOptions.research || batchDeleteOptions.writing || batchDeleteOptions.images || batchDeleteOptions.translations)}
                                    className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:bg-slate-200 transition-all flex justify-center items-center gap-2"
                                >
                                    {isDeletingAll ? <Loader2 size={14} className="animate-spin" /> : "Confirmar Limpieza Parcial"}
                                </button>

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
                    target_word_count: task.target_word_count,
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

