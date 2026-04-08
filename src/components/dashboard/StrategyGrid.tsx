'use client';

import { useProjectStore, Task, STATUS_LABELS, STATUS_COLORS } from '@/store/useProjectStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MoreVertical, CheckCircle2, Clock, Calendar, Hash, Tag, Activity, Edit3, Trash2, Plus, Sparkles, X, Globe, FileText, User, UserPlus, ArrowRight, Check, Search, Layout, Zap, BrainCircuit, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationService } from '@/lib/services/notifications';
import { usePermissions } from '@/hooks/usePermissions';
import { ProjectBadge } from '@/components/ui/ProjectBadge';
import { useRouter } from 'next/navigation';
import { useWriterStore } from '@/store/useWriterStore';
import CompetitorModal from './CompetitorModal';

export const ALL_COLUMNS = [
    { id: 'project', label: 'Proy.', width: 'min-w-[50px] w-[5%]', defaultVisible: true },
    { id: 'status', label: 'Estado', width: 'min-w-[100px] w-[8%]', defaultVisible: true },
    { id: 'date', label: 'Publicación', width: 'min-w-[100px] w-[10%]', defaultVisible: true },
    { id: 'title', label: 'Título', width: 'min-w-[200px] w-[25%]', defaultVisible: true },
    { id: 'seo_title', label: 'SEO Title', width: 'min-w-[150px] w-[15%]', defaultVisible: false },
    { id: 'slug', label: 'Slug / URL', width: 'min-w-[120px] w-[10%]', defaultVisible: false },
    { id: 'meta_description', label: 'Meta Desc.', width: 'min-w-[200px] w-[20%]', defaultVisible: false },
    { id: 'keywords', label: 'Keywords', width: 'min-w-[120px] w-[12%]', defaultVisible: true },
    { id: 'strategy', label: 'Estrategia', width: 'min-w-[80px] w-[6%]', defaultVisible: true },
    { id: 'assigned', label: 'Responsable', width: 'min-w-[100px] w-[8%]', defaultVisible: true },
    { id: 'total_volume', label: 'Vol.', width: 'min-w-[60px] w-[6%]', defaultVisible: true },
    { id: 'word_count', label: 'Palabras', width: 'min-w-[70px] w-[7%]', defaultVisible: true },
    { id: 'lsi', label: 'LSI', width: 'min-w-[120px] w-[12%]', defaultVisible: true },
    { id: 'competitors', label: 'Fuentes', width: 'min-w-[100px] w-[8%]', defaultVisible: true },
    { id: 'Acciones Nous', label: 'Acciones Nous', width: 'min-w-[140px] w-[9%]', defaultVisible: true },
];

interface StrategyGridProps {
    onSelectTask?: (task: Task) => void;
    onRunAction?: (taskId: string, action: string) => void;
    columnVisibility?: Record<string, boolean>;
    selectedTaskIds?: string[];
    onSelectionChange?: (ids: string[]) => void;
    batchProgress?: Record<string, number>;
}

export default function StrategyGrid({ 
    onSelectTask, 
    onRunAction, 
    columnVisibility: externalVisibility,
    selectedTaskIds = [],
    onSelectionChange,
    batchProgress = {}
}: StrategyGridProps) {
    const { tasks, activeProject, addTask, updateTask, deleteTask, deleteTasks, selectiveDeleteTask, teamMembers, assignTask, claimTask } = useProjectStore();
    const [assignSelectorId, setAssignSelectorId] = useState<string | null>(null);
    const [deletePopupId, setDeletePopupId] = useState<string | null>(null);
    const [deleteOptions, setDeleteOptions] = useState({ research: false, writing: false });
    const [editingCell, setEditingCell] = useState<{ id: string, field: string } | null>(null);
    const [tempValue, setTempValue] = useState("");
    
    // Internal fallback for compatibility, but primarily uses externalVisibility
    const [internalVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('ns_grid_columns');
            if (saved) return JSON.parse(saved);
        }
        return ALL_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: col.defaultVisible }), {});
    });

    const columnVisibility = externalVisibility || internalVisibility;
    const [keywordModal, setKeywordModal] = useState<{ taskId: string, type: 'main' | 'lsi' } | null>(null);
    const [competitorModalTask, setCompetitorModalTask] = useState<string | null>(null);
    const [newKw, setNewKw] = useState({ keyword: "", volume: 0 });
    const [volTemp, setVolTemp] = useState<string>("0");
    const [openLsiId, setOpenLsiId] = useState<string | null>(null);
    const [selectedCompetitor, setSelectedCompetitor] = useState<{ task: Task, comp: any, index: number } | null>(null);
    const [isEditingComp, setIsEditingComp] = useState(false);
    const [compContent, setCompContent] = useState("");
    const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
    const router = useRouter();
    const { initializeFromTask } = useWriterStore();

    const sortedTasks = [...tasks].sort((a, b) => new Date(a.scheduled_date || 0).getTime() - new Date(b.scheduled_date || 0).getTime());
    const { canCreateOrDelete, canEditAny, canTakeTasks } = usePermissions();

    const visibleColumns = ALL_COLUMNS.filter(c => columnVisibility[c.id]);

    const toggleAll = () => {
        if (!onSelectionChange) return;
        if (selectedTaskIds.length === sortedTasks.length) {
            onSelectionChange([]);
        } else {
            onSelectionChange(sortedTasks.map(t => t.id));
        }
    };

    const toggleOne = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onSelectionChange) return;
        if (selectedTaskIds.includes(id)) {
            onSelectionChange(selectedTaskIds.filter(tid => tid !== id));
        } else {
            onSelectionChange([...selectedTaskIds, id]);
        }
    };

    const handleCellClick = (task: Task, field: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canEditAny() && !canTakeTasks()) return;
        setEditingCell({ id: task.id, field });
        const val = field === 'date' ? task.scheduled_date : task[field as keyof Task];
        setTempValue(String(val || ""));
    };

    const handleSave = async () => {
        if (!editingCell) return;
        const { id, field } = editingCell;
        const originalTask = tasks.find(t => t.id === id);
        if (originalTask) {
            const actualField = (field as string) === 'date' ? 'scheduled_date' : field as keyof Task;
            await updateTask(id, { [actualField]: tempValue });
        }
        setEditingCell(null);
    };

    const handleRemoveCompetitor = async () => {
        if (!selectedCompetitor) return;
        const { task, index } = selectedCompetitor;
        const newUrls = [...(task.research_dossier?.top10Urls || [])];
        newUrls.splice(index, 1);
        await updateTask(task.id, { 
            research_dossier: { 
                ...task.research_dossier, 
                top10Urls: newUrls 
            } 
        });
        setSelectedCompetitor(null);
        NotificationService.success('Competidor eliminado de las referencias');
    };

    const handleSaveCompetitor = async () => {
        if (!selectedCompetitor) return;
        const { task, index } = selectedCompetitor;
        const newUrls = [...(task.research_dossier?.top10Urls || [])];
        newUrls[index] = { ...newUrls[index], content: compContent };
        await updateTask(task.id, { 
            research_dossier: { 
                ...task.research_dossier, 
                top10Urls: newUrls 
            } 
        });
        setIsEditingComp(false);
        NotificationService.success('Referencia actualizada correctamente');
    };


    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setEditingCell(null);
        }
    };

    const addNewRow = async () => {
        if (!activeProject || !canCreateOrDelete()) return;
        const newTask = {
            project_id: activeProject.id,
            title: "",
            scheduled_date: format(new Date(), 'yyyy-MM-dd'),
            status: 'idea' as const,
            target_keyword: "",
            viability: "",
            brief: ""
        };
        await addTask(newTask);
    };

    const handleRemoveKeyword = async (task: Task, kw: string) => {
        const dossier = task.research_dossier || {};
        const lsi = dossier.lsiKeywords || [];
        const newLsi = lsi.filter((l: any) => l.keyword !== kw);
        await updateTask(task.id, { research_dossier: { ...dossier, lsiKeywords: newLsi } });
    };

    const handleAddKeyword = async () => {
        if (!keywordModal || !newKw.keyword.trim()) return;
        const task = tasks.find(t => t.id === keywordModal.taskId);
        if (!task) return;

        if (keywordModal.type === 'main') {
            await updateTask(task.id, { target_keyword: newKw.keyword, volume: newKw.volume });
        } else {
            const dossier = task.research_dossier || {};
            const lsi = dossier.lsiKeywords || [];
            const newLsi = [...lsi, { keyword: newKw.keyword, count: newKw.volume }];
            await updateTask(task.id, { research_dossier: { ...dossier, lsiKeywords: newLsi } });
        }
        setNewKw({ keyword: "", volume: 0 });
        setVolTemp("0");
        setKeywordModal(null);
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        if (!activeProject || !canCreateOrDelete()) return;

        const pasteData = e.clipboardData.getData('text');
        if (!pasteData) return;

        const rows = pasteData.split(/\r?\n/).filter(row => row.trim() !== '');
        if (rows.length === 0) return;

        let addedCount = 0;

        for (const row of rows) {
            const columns = row.split('\t');
            if (columns.length < 1) continue;

            const title = columns[0].trim();
            if (!title) continue;

            let dateStr = columns[1]?.trim();
            if (!dateStr || isNaN(new Date(dateStr).getTime())) {
                dateStr = format(new Date(), 'yyyy-MM-dd');
            } else {
                dateStr = format(new Date(dateStr), 'yyyy-MM-dd');
            }

            const keyword = columns[2]?.trim() || '';
            const volume = parseInt(columns[3]?.trim() || '0');
            const viability = columns[4]?.trim() || '';

            try {
                await addTask({
                    project_id: activeProject.id,
                    title,
                    scheduled_date: dateStr,
                    status: 'idea',
                    target_keyword: keyword,
                    volume: isNaN(volume) ? 0 : volume,
                    viability: viability,
                    brief: ''
                });
                addedCount++;
            } catch (err) {
                console.error("Error pasting task:", err);
            }
        }

        if (addedCount > 0) {
            NotificationService.notify("Importación exitosa", `Se han añadido ${addedCount} contenidos desde el portapapeles.`);
        }
    };

    return (
        <div
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
            onPaste={handlePaste}
        >
            <div className="flex-1 overflow-auto custom-scrollbar border border-slate-100 rounded-2xl bg-white shadow-sm">
                <table className="min-w-full text-left border-collapse table-auto">
                    <thead>
                        <tr className="bg-white border-b border-slate-100 sticky top-0 z-[10] shadow-sm">
                            <th className="px-3 py-3 w-[1%] whitespace-nowrap min-w-[40px]">
                                <div 
                                    className={cn(
                                        "w-4 h-4 rounded-[4px] border flex items-center justify-center cursor-pointer transition-all",
                                        selectedTaskIds.length > 0 && selectedTaskIds.length === sortedTasks.length 
                                            ? "bg-indigo-500 border-indigo-500 text-white shadow-sm" 
                                            : "border-slate-300 bg-white hover:border-indigo-400"
                                    )}
                                    onClick={toggleAll}
                                >
                                    {selectedTaskIds.length > 0 && selectedTaskIds.length === sortedTasks.length && (
                                        <Check size={12} strokeWidth={3} />
                                    )}
                                    {selectedTaskIds.length > 0 && selectedTaskIds.length !== sortedTasks.length && (
                                        <div className="w-2 h-0.5 bg-indigo-500 rounded-full" />
                                    )}
                                </div>
                            </th>
                            {visibleColumns.map((header) => (
                                <th 
                                    key={header.id} 
                                    className={cn(
                                        "px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap", 
                                        header.width,
                                        header.id === 'Acciones Nous' && "text-right"
                                    )}
                                >
                                    {header.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50">
                        {sortedTasks.length === 0 ? (
                            <tr>
                                <td colSpan={visibleColumns.length} className="px-6 py-32 text-center text-slate-400">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">No hay contenidos programados.</p>
                                </td>
                            </tr>
                        ) : (
                            sortedTasks.map((task) => (
                                <tr
                                    key={task.id}
                                    className={cn(
                                        "group hover:bg-slate-50/30 even:bg-slate-50/10 transition-all cursor-pointer select-none border-b border-slate-50 last:border-none relative overflow-hidden",
                                        selectedTaskIds.includes(task.id) && "bg-indigo-50/40 hover:bg-indigo-50/60",
                                        batchProgress[task.id] && batchProgress[task.id] < 100 && "bg-indigo-50/20"
                                    )}
                                    onClick={() => onSelectTask?.(task)}
                                >
                                    <td className="px-3 py-2 w-[1%] whitespace-nowrap min-w-[40px]" onClick={(e) => toggleOne(task.id, e)}>
                                        {batchProgress[task.id] && batchProgress[task.id] < 100 && (
                                            <motion.div 
                                                initial={{ x: "-100%" }}
                                                animate={{ x: "100%" }}
                                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent pointer-events-none z-0"
                                            />
                                        )}
                                        <div 
                                            className={cn(
                                                "w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all opacity-0 group-hover:opacity-100",
                                                selectedTaskIds.includes(task.id) 
                                                    ? "bg-indigo-500 border-indigo-500 opacity-100 text-white shadow-sm" 
                                                    : "border-slate-300 bg-white"
                                            )}
                                        >
                                            {selectedTaskIds.includes(task.id) && (
                                                <Check size={12} strokeWidth={3} />
                                            )}
                                        </div>
                                    </td>
                                    {columnVisibility['project'] && (
                                        <td className="px-3 py-2">
                                            <ProjectBadge projectId={task.project_id} />
                                        </td>
                                    )}

                                    {columnVisibility['status'] && (
                                        <td className="px-3 py-2">
                                            {batchProgress[task.id] && batchProgress[task.id] < 100 ? (
                                                <div className="flex items-center gap-2.5 py-1">
                                                    <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                                                        <svg className="w-full h-full -rotate-90">
                                                            <circle
                                                                cx="14"
                                                                cy="14"
                                                                r="11"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="3"
                                                                className="text-slate-100"
                                                            />
                                                            <motion.circle
                                                                cx="14"
                                                                cy="14"
                                                                r="11"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="3"
                                                                strokeDasharray="69.1"
                                                                initial={{ strokeDashoffset: 69.1 }}
                                                                animate={{ strokeDashoffset: 69.1 - (69.1 * batchProgress[task.id] / 100) }}
                                                                transition={{ duration: 0.5, ease: "easeOut" }}
                                                                className="text-indigo-600"
                                                                strokeLinecap="round"
                                                            />
                                                        </svg>
                                                        <span className="absolute text-[8px] font-black tabular-nums text-slate-900">{Math.round(batchProgress[task.id])}%</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black uppercase text-indigo-600 tracking-tighter leading-none animate-pulse">
                                                            {!task.research_dossier || Object.keys(task.research_dossier).length === 0 ? "Investigando" :
                                                             !task.outline_structure || !task.outline_structure.headers || task.outline_structure.headers.length === 0 ? "Planificando" :
                                                             !task.content_body ? "Redactando" : "Humanizando"}
                                                        </span>
                                                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Nous en proceso</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={cn(
                                                    "px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 border transition-colors",
                                                    STATUS_COLORS[task.status]?.bg || 'bg-slate-50',
                                                    STATUS_COLORS[task.status]?.text || 'text-slate-600',
                                                    STATUS_COLORS[task.status]?.border || 'border-slate-100'
                                                )}>
                                                    <div className={cn(
                                                        "w-1 h-1 rounded-full",
                                                        STATUS_COLORS[task.status]?.dot || 'bg-slate-400'
                                                    )} />
                                                    {STATUS_LABELS[task.status] || task.status.replace(/_/g, ' ')}
                                                </div>
                                            )}
                                        </td>
                                    )}

                                    {columnVisibility['date'] && (
                                        <td className="px-3 py-2 relative cursor-text" onClick={(e) => handleCellClick(task, 'date', e)}>
                                            {editingCell?.id === task.id && editingCell?.field === 'date' ? (
                                                <input
                                                    autoFocus
                                                    type="date"
                                                    className="absolute inset-x-1 inset-y-1 px-2 bg-white border-2 border-slate-900 rounded-lg text-[10px] font-bold text-slate-900 shadow-lg z-10 outline-none"
                                                    value={tempValue}
                                                    onChange={(e) => setTempValue(e.target.value)}
                                                    onBlur={handleSave}
                                                    onKeyDown={handleKeyDown}
                                                />
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 tabular-nums">
                                                    <Calendar size={10} className="opacity-40" />
                                                    {task.scheduled_date ? format(new Date(task.scheduled_date), "dd MMM, yyyy", { locale: es }) : 'Programar...'}
                                                </div>
                                            )}
                                        </td>
                                    )}

                                    {columnVisibility['title'] && (
                                        <td className="px-3 py-2 relative cursor-text" onClick={(e) => handleCellClick(task, 'title', e)}>
                                            {editingCell?.id === task.id && editingCell?.field === 'title' ? (
                                                <input
                                                    autoFocus
                                                    className="absolute inset-x-1 inset-y-1 px-2 bg-white border-2 border-slate-900 rounded-lg text-[11px] font-bold text-slate-900 shadow-lg z-10 outline-none"
                                                    value={tempValue}
                                                    onChange={(e) => setTempValue(e.target.value)}
                                                    onBlur={handleSave}
                                                    onKeyDown={handleKeyDown}
                                                />
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "text-[11px] font-bold text-slate-700 block truncate transition-all leading-tight",
                                                        !task.title && "text-slate-300 italic font-medium"
                                                    )}>
                                                        {task.title || "Escribe un título..."}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                    )}

                                    {columnVisibility['seo_title'] && (
                                        <td className="px-3 py-2 relative cursor-text" onClick={(e) => handleCellClick(task, 'seo_title', e)}>
                                            {editingCell?.id === task.id && editingCell?.field === 'seo_title' ? (
                                                <input
                                                    autoFocus
                                                    className="absolute inset-x-1 inset-y-1 px-2 bg-white border-2 border-slate-900 rounded-lg text-[10px] font-bold text-slate-900 shadow-lg z-10 outline-none"
                                                    value={tempValue}
                                                    onChange={(e) => setTempValue(e.target.value)}
                                                    onBlur={handleSave}
                                                    onKeyDown={handleKeyDown}
                                                />
                                            ) : (
                                                <span className="text-[10px] text-slate-500 truncate block max-w-[150px]">
                                                    {task.seo_title || "--"}
                                                </span>
                                            )}
                                        </td>
                                    )}

                                    {columnVisibility['slug'] && (
                                        <td className="px-3 py-2 relative cursor-text" onClick={(e) => handleCellClick(task, 'target_url_slug', e)}>
                                            {editingCell?.id === task.id && editingCell?.field === 'target_url_slug' ? (
                                                <input
                                                    autoFocus
                                                    className="absolute inset-x-1 inset-y-1 px-2 bg-white border-2 border-slate-900 rounded-lg text-[10px] font-bold text-slate-900 shadow-lg z-10 outline-none"
                                                    value={tempValue}
                                                    onChange={(e) => setTempValue(e.target.value)}
                                                    onBlur={handleSave}
                                                    onKeyDown={handleKeyDown}
                                                />
                                            ) : (
                                                <span className="text-[10px] text-indigo-400 font-mono truncate block max-w-[120px]">
                                                    /{task.target_url_slug || "--"}
                                                </span>
                                            )}
                                        </td>
                                    )}

                                    {columnVisibility['meta_description'] && (
                                        <td className="px-3 py-2 relative cursor-text" onClick={(e) => handleCellClick(task, 'meta_description', e)}>
                                            {editingCell?.id === task.id && editingCell?.field === 'meta_description' ? (
                                                <textarea
                                                    autoFocus
                                                    className="absolute inset-x-1 inset-y-1 px-2 bg-white border-2 border-slate-900 rounded-lg text-[10px] font-medium text-slate-900 shadow-lg z-10 outline-none resize-none"
                                                    value={tempValue}
                                                    onChange={(e) => setTempValue(e.target.value)}
                                                    onBlur={handleSave}
                                                    onKeyDown={handleKeyDown}
                                                />
                                            ) : (
                                                <span className="text-[10px] text-slate-400 truncate block max-w-[200px]" title={task.meta_description}>
                                                    {task.meta_description || "--"}
                                                </span>
                                            )}
                                        </td>
                                    )}

                                    {columnVisibility['keywords'] && (
                                        <td className="px-3 py-2 relative">
                                            <div className="flex items-center gap-1 overflow-hidden group/kwrow">
                                                {task.target_keyword ? (
                                                     <div className="flex items-center gap-1 group/kw max-w-full">
                                                        <span className="text-[10px] font-bold text-slate-600 truncate">{task.target_keyword} ({task.volume || 0})</span>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); updateTask(task.id, { target_keyword: '', volume: 0 }); }}
                                                            className="opacity-0 group-hover/kw:opacity-100 p-0.5 hover:text-red-500 transition-all shrink-0"
                                                        >
                                                            <X size={8} />
                                                        </button>
                                                     </div>
                                                ) : (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setKeywordModal({ taskId: task.id, type: 'main' }); }}
                                                        className="w-fit p-1 hover:bg-slate-100 rounded-lg text-slate-300 hover:text-indigo-400 transition-colors"
                                                    >
                                                        <Plus size={10} />
                                                    </button>
                                                )}
                                            </div>

                                            <AnimatePresence>
                                                {keywordModal?.taskId === task.id && keywordModal?.type === 'main' && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setKeywordModal(null)} />
                                                        <motion.div 
                                                            initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                                            className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-2xl z-20 p-4 space-y-3"
                                                        >
                                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Agregar Keyword Principal</span>
                                                            <div className="space-y-3">
                                                                <input 
                                                                    autoFocus
                                                                    type="text"
                                                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-[11px] font-bold text-slate-600 outline-none focus:border-indigo-400"
                                                                    value={newKw.keyword}
                                                                    onChange={e => setNewKw({ ...newKw, keyword: e.target.value })}
                                                                    placeholder="Ej: SEO Clinico"
                                                                />
                                                                <input 
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-[11px] font-bold text-slate-600 outline-none focus:border-indigo-400"
                                                                    placeholder="Volumen"
                                                                    value={volTemp}
                                                                    onChange={e => {
                                                                        const val = e.target.value;
                                                                        if (val === "" || /^\d+$/.test(val)) {
                                                                            setVolTemp(val);
                                                                            setNewKw({ ...newKw, volume: parseInt(val || '0') });
                                                                        }
                                                                    }}
                                                                />
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        onClick={() => setKeywordModal(null)}
                                                                        className="flex-1 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                                                    >
                                                                        Cerrar
                                                                    </button>
                                                                    <button 
                                                                        onClick={handleAddKeyword}
                                                                        className="flex-1 py-1.5 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                                                                    >
                                                                        Guardar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </td>
                                    )}

                                    {columnVisibility['strategy'] && (
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-1.5 justify-center">
                                                {((Array.isArray(task.outline_structure) && task.outline_structure.length > 0) || (task.outline_structure?.headers?.length > 0)) ? (
                                                    <div className="flex items-center gap-1 text-violet-500 bg-violet-50 px-2 py-0.5 rounded-lg border border-violet-100" title="Outline Completo">
                                                        <Sparkles size={11} />
                                                        <span className="text-[8px] font-black uppercase tracking-tighter">Plan</span>
                                                    </div>
                                                ) : task.brief ? (
                                                    <div className="flex items-center gap-1 text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100" title="Solo Brief">
                                                        <FileText size={11} />
                                                        <span className="text-[8px] font-black uppercase tracking-tighter">Notas</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[8px] text-slate-200 italic">--</span>
                                                )}
                                            </div>
                                        </td>
                                    )}

                                     {columnVisibility['assigned'] && (
                                        <td className="px-3 py-2 relative">
                                            <div 
                                                className="flex items-center gap-2 group/avatar cursor-pointer"
                                                onClick={(e) => { e.stopPropagation(); setAssignSelectorId(assignSelectorId === task.id ? null : task.id); }}
                                            >
                                                {task.assigned_to ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                            {teamMembers.find(m => m.user_id === task.assigned_to)?.profile?.avatar_url ? (
                                                                <img 
                                                                    src={teamMembers.find(m => m.user_id === task.assigned_to)?.profile?.avatar_url} 
                                                                    alt="Avatar" 
                                                                    className="w-full h-full object-cover" 
                                                                />
                                                            ) : (
                                                                <User size={12} className="text-slate-400" />
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-500 truncate max-w-[60px]">
                                                            {teamMembers.find(m => m.user_id === task.assigned_to)?.profile?.full_name?.split(' ')[0] || 'Miembro'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-slate-300 group-hover/avatar:text-indigo-400 transition-colors">
                                                        <div className="w-6 h-6 rounded-full border border-dashed border-slate-200 flex items-center justify-center">
                                                            <UserPlus size={12} />
                                                        </div>
                                                        <span className="text-[9px] font-bold uppercase tracking-widest">Libre</span>
                                                    </div>
                                                )}
                                            </div>

                                            <AnimatePresence>
                                                {assignSelectorId === task.id && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setAssignSelectorId(null)} />
                                                        <motion.div 
                                                            initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                                            className="absolute left-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-2xl z-30 overflow-hidden"
                                                        >
                                                            <div className="p-2 bg-slate-50 border-b border-slate-100">
                                                                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Asignar a...</span>
                                                            </div>
                                                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); assignTask(task.id, null); setAssignSelectorId(null); }}
                                                                    className="w-full text-left px-3 py-2 text-[10px] font-bold text-rose-500 hover:bg-rose-50 transition-colors border-b border-slate-50"
                                                                >
                                                                    Desasignar
                                                                </button>
                                                                {teamMembers.map((member) => (
                                                                    <button
                                                                        key={member.user_id}
                                                                        onClick={(e) => { e.stopPropagation(); assignTask(task.id, member.user_id); setAssignSelectorId(null); }}
                                                                        className={cn(
                                                                            "w-full text-left px-3 py-2 text-[10px] font-medium hover:bg-slate-50 transition-colors flex items-center gap-2",
                                                                            task.assigned_to === member.user_id ? "bg-indigo-50 text-indigo-600" : "text-slate-600"
                                                                        )}
                                                                    >
                                                                        <div className="w-5 h-5 rounded-full bg-slate-100 overflow-hidden shrink-0">
                                                                            {member.profile?.avatar_url && <img src={member.profile.avatar_url} className="w-full h-full object-cover" />}
                                                                        </div>
                                                                        <span className="truncate">{member.profile?.full_name || 'Sin nombre'}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </td>
                                    )}

                                    {columnVisibility['total_volume'] && (
                                        <td className="px-3 py-2">
                                            <span className="text-[10px] font-bold text-indigo-600 tabular-nums">
                                                {(task.volume || 0) + (task.research_dossier?.lsiKeywords?.reduce((acc: number, kw: any) => acc + (kw.volume || 0), 0) || 0)}
                                            </span>
                                        </td>
                                    )}

                                    {columnVisibility['word_count'] && (
                                        <td className="px-3 py-2">
                                            <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                                                {task.word_count || "--"}
                                            </span>
                                        </td>
                                    )}

                                    {columnVisibility['lsi'] && (
                                        <td className="px-3 py-2 relative">
                                            <div 
                                                className="flex items-center gap-1 max-w-full overflow-hidden cursor-pointer relative pr-4 group/lsirow"
                                                onClick={(e) => { e.stopPropagation(); setOpenLsiId(openLsiId === task.id ? null : task.id); }}
                                            >
                                                {(task.research_dossier?.lsiKeywords || task.research_dossier?.keywordIdeas)?.slice(0, 1).map((kw: any, i: number) => (
                                                    <div key={i} className="px-1.5 py-0.5 bg-indigo-50/30 text-indigo-500 border border-indigo-100/50 rounded-lg text-[8px] font-bold uppercase shrink-0">
                                                        {kw.keyword}
                                                    </div>
                                                )) || <span className="text-[8px] text-slate-300 italic">--</span>}
                                                {(task.research_dossier?.lsiKeywords || task.research_dossier?.keywordIdeas) && (task.research_dossier?.lsiKeywords || task.research_dossier?.keywordIdeas).length > 1 && (
                                                    <span className="text-[8px] font-bold text-slate-400 shrink-0">+{(task.research_dossier?.lsiKeywords || task.research_dossier?.keywordIdeas).length - 1}</span>
                                                )}
                                                <div className="absolute right-0 opacity-0 group-hover/lsirow:opacity-100 transition-all">
                                                    <Plus size={8} className="text-slate-300" />
                                                </div>
                                            </div>

                                            <AnimatePresence>
                                                {openLsiId === task.id && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setOpenLsiId(null)} />
                                                        <motion.div 
                                                            initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                                            className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-2xl z-30 p-4 space-y-4"
                                                        >
                                                            <div>
                                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-2">Keywords LSI</span>
                                                                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto custom-scrollbar p-0.5">
                                                                    {(task.research_dossier?.lsiKeywords || task.research_dossier?.keywordIdeas)?.map((kw: any, i: number) => (
                                                                        <div key={i} className="px-2 py-1 bg-indigo-50/50 text-indigo-500 border border-indigo-100 rounded-lg text-[9px] font-bold uppercase flex items-center gap-1 group/lsi">
                                                                            {kw.keyword} ({kw.volume || kw.score || 0})
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); handleRemoveKeyword(task, kw.keyword); }}
                                                                                className="opacity-0 group-hover/lsi:opacity-100 hover:text-red-500 transition-all"
                                                                            >
                                                                                <X size={8} />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                    {!task.research_dossier?.lsiKeywords && !task.research_dossier?.keywordIdeas && (
                                                                        <span className="text-[9px] text-slate-400 italic">No hay keywords LSI.</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="pt-2 border-t border-slate-50">
                                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-2">Agregar LSI</span>
                                                                <div className="space-y-2">
                                                                    <input 
                                                                        className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-[10px] font-bold text-slate-600 outline-none"
                                                                        placeholder="Palabra..."
                                                                        value={newKw.keyword}
                                                                        onChange={e => setNewKw({ ...newKw, keyword: e.target.value })}
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <input 
                                                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-[10px] font-bold text-slate-600 outline-none"
                                                                            placeholder="Vol."
                                                                            value={volTemp}
                                                                            onChange={e => setVolTemp(e.target.value)}
                                                                        />
                                                                        <button 
                                                                            onClick={handleAddKeyword}
                                                                            className="px-4 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase"
                                                                        >
                                                                            <Plus size={12} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </td>
                                    )}

                                    {columnVisibility['competitors'] && (
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-1.5 overflow-hidden group/comprow">
                                                {task.research_dossier?.top10Urls?.slice(0, 3).map((comp: any, i: number) => {
                                                    const match = task.research_dossier?.competitors?.find((c: any) => c.url === comp.url);
                                                    return (
                                                        <button 
                                                            key={i} 
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                setSelectedCompetitor({ task, comp: match || comp, index: i }); 
                                                                setCompContent(match?.content || comp.content || "");
                                                                setIsEditingComp(false);
                                                            }}
                                                            className={cn(
                                                                "flex items-center gap-1 truncate transition-colors shrink-0",
                                                                match ? "text-indigo-500 hover:text-indigo-700" : "text-slate-300 hover:text-indigo-400"
                                                            )}
                                                            title={comp.url}
                                                        >
                                                            <Globe size={11} className={match ? "animate-pulse" : ""} />
                                                        </button>
                                                    );
                                                }) || <span className="text-[9px] text-slate-300 italic">--</span>}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setCompetitorModalTask(task.id); }}
                                                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-300 hover:text-indigo-600 transition-all"
                                                >
                                                    <Plus size={10} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                     {columnVisibility['Acciones Nous'] && (
                                        <td className="px-3 py-2 pr-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <IntelligentActionButton 
                                                    task={task} 
                                                    isProcessing={!!batchProgress[task.id] && batchProgress[task.id] < 100}
                                                    onAction={async (action) => {
                                                        if (action === 'writer') {
                                                            initializeFromTask(task, activeProject);
                                                            router.push('/contents/writer');
                                                        } else {
                                                            onRunAction?.(task.id, action);
                                                        }
                                                    }}
                                                />

                                                <div className="relative">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeletePopupId(deletePopupId === task.id ? null : task.id);
                                                            setDeleteOptions({ research: false, writing: false });
                                                        }}
                                                        className={cn(
                                                            "p-2 rounded-xl transition-all border",
                                                            deletePopupId === task.id
                                                                ? "bg-rose-50 text-rose-600 border-rose-100 shadow-sm"
                                                                : "text-slate-300 hover:text-rose-500 hover:bg-rose-50 border-transparent hover:border-rose-100"
                                                        )}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>

                                                    <AnimatePresence>
                                                        {deletePopupId === task.id && (
                                                            <>
                                                                <div className="fixed inset-0 z-40" onClick={() => setDeletePopupId(null)} />
                                                                <motion.div 
                                                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                    className="absolute right-0 bottom-full mb-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
                                                                >
                                                                    <div className="p-3 bg-slate-50 border-b border-slate-100">
                                                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">¿Qué deseas eliminar?</span>
                                                                    </div>
                                                                    <div className="p-2 space-y-1">
                                                                        <button 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setDeleteOptions(prev => ({ ...prev, research: !prev.research }));
                                                                            }}
                                                                            className={cn(
                                                                                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold transition-all",
                                                                                deleteOptions.research ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"
                                                                            )}
                                                                        >
                                                                            <span>Investigación</span>
                                                                            {deleteOptions.research && <Check size={12} />}
                                                                        </button>
                                                                        
                                                                        <button 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setDeleteOptions(prev => ({ ...prev, writing: !prev.writing }));
                                                                            }}
                                                                            className={cn(
                                                                                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold transition-all",
                                                                                deleteOptions.writing ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"
                                                                            )}
                                                                        >
                                                                            <span>Redacción</span>
                                                                            {deleteOptions.writing && <Check size={12} />}
                                                                        </button>

                                                                        {(deleteOptions.research || deleteOptions.writing) && (
                                                                            <button 
                                                                                onClick={async (e) => {
                                                                                    e.stopPropagation();
                                                                                    await selectiveDeleteTask(task.id, deleteOptions);
                                                                                    setDeletePopupId(null);
                                                                                }}
                                                                                className="w-full mt-2 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                                                                            >
                                                                                Confirmar Limpieza
                                                                            </button>
                                                                        )}

                                                                        <div className="h-px bg-slate-100 my-1" />

                                                                        <button 
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                if (confirm('¿Eliminar todo este contenido?')) {
                                                                                    await selectiveDeleteTask(task.id, { all: true });
                                                                                    setDeletePopupId(null);
                                                                                }
                                                                            }}
                                                                            className="w-full text-left px-3 py-2 text-[10px] font-bold text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-between"
                                                                        >
                                                                            <span>ELIMINAR TODO</span>
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    </div>
                                                                </motion.div>
                                                            </>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}

                        {canCreateOrDelete() && (
                            <tr className="hover:bg-slate-50/30 transition-colors border-t border-slate-100">
                                <td colSpan={visibleColumns.length} className="p-0">
                                    <button
                                        onClick={addNewRow}
                                        className="w-full py-4 px-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 transition-all flex items-center gap-3 group"
                                    >
                                        <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all scale-90 group-hover:scale-100">
                                            <Plus size={14} />
                                        </div>
                                        Agregar Nuevo Contenido
                                    </button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-auto px-8 py-8 border-t border-slate-100 bg-white/40 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                            <kbd className="px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-400 shadow-sm uppercase tracking-tighter">ENTER</kbd>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Para guardar</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <kbd className="px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-400 shadow-sm uppercase tracking-tighter">ESC</kbd>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Para cancelar</span>
                        </div>
                    </div>
                </div>
            </div>
            {/* Keyword Modal removed as it is now an inline popover */}

            <CompetitorModal 
                isOpen={!!competitorModalTask}
                onClose={() => setCompetitorModalTask(null)}
                taskId={competitorModalTask || ''}
            />

            <AnimatePresence>
                {selectedCompetitor && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/10 backdrop-blur-[2px]">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Globe size={14} className="text-indigo-500" />
                                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest truncate max-w-md">
                                            {selectedCompetitor.comp.title || selectedCompetitor.comp.url}
                                        </h4>
                                    </div>
                                    <a 
                                        href={selectedCompetitor.comp.url} 
                                        target="_blank" 
                                        className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1"
                                    >
                                        {selectedCompetitor.comp.url}
                                    </a>
                                </div>
                                <button 
                                    onClick={() => setSelectedCompetitor(null)}
                                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Contenido de Referencia</span>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={handleRemoveCompetitor}
                                            className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center gap-1.5"
                                        >
                                            <Trash2 size={12} />
                                            Eliminar Referencia
                                        </button>
                                        <button 
                                            onClick={() => setIsEditingComp(!isEditingComp)}
                                            className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-1.5"
                                        >
                                            <Edit3 size={12} />
                                            {isEditingComp ? 'Cancelar Edición' : 'Editar Contenido'}
                                        </button>
                                    </div>
                                </div>

                                {isEditingComp ? (
                                    <textarea 
                                        className="w-full h-96 p-4 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-medium text-slate-600 outline-none focus:border-indigo-200 resize-none leading-relaxed"
                                        value={compContent}
                                        onChange={(e) => setCompContent(e.target.value)}
                                        placeholder="Edita el contenido o agrega notas aquí..."
                                    />
                                ) : (
                                    <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-50 text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap font-medium h-96 overflow-y-auto custom-scrollbar">
                                        {selectedCompetitor.comp.content || (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                                                <Activity size={24} className="opacity-20" />
                                                <p className="italic">No se extrajo contenido legible de esta fuente.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {isEditingComp && (
                                <div className="p-4 border-t border-slate-50 bg-slate-50/20 flex justify-end">
                                    <button 
                                        onClick={handleSaveCompetitor}
                                        className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                                    >
                                        Guardar Cambios
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function IntelligentActionButton({ task, onAction, isProcessing }: { task: Task, onAction: (type: string) => void, isProcessing?: boolean }) {
    const getActionState = () => {
        if (isProcessing) {
            return { label: 'Procesando', action: 'none', color: 'indigo', icon: Loader2, animate: true };
        }
        // 1. Necesita Investigación
        if (!task.research_dossier || Object.keys(task.research_dossier).length === 0) {
            return { label: 'Investigar', action: 'investigar', color: 'indigo', icon: Search };
        }
        // 2. Necesita Redacción (Si tiene dossier o está en estado por_redactar)
        if (task.status === 'por_redactar' || (!task.content_body || task.content_body.trim() === '')) {
            return { label: 'Redactar', action: 'draft', color: 'rose', icon: Sparkles };
        }
        // 3. Necesita Humanización
        if (!task.metadata?.is_humanized) {
            return { label: 'Humanizar', action: 'humanize', color: 'emerald', icon: Zap };
        }
        // Por defecto: Ver en editor
        return { label: 'Ver Editor', action: 'writer', color: 'slate', icon: Edit3 };
    };

    const state = getActionState();
    const Icon = state.icon;

    const colors: any = {
        indigo: "bg-indigo-50 text-indigo-600 hover:bg-indigo-600 border-indigo-100/50 hover:border-indigo-600",
        purple: "bg-purple-50 text-purple-600 hover:bg-purple-600 border-purple-100/50 hover:border-purple-600",
        rose: "bg-rose-50 text-rose-600 hover:bg-rose-600 border-rose-100/50 hover:border-rose-600",
        emerald: "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 border-emerald-100/50 hover:border-emerald-600",
        slate: "bg-slate-50 text-slate-600 hover:bg-slate-800 border-slate-100/50 hover:border-slate-800"
    };

    return (
        <button
            disabled={isProcessing}
            onClick={(e) => { e.stopPropagation(); if (!isProcessing) onAction(state.action); }}
            className={cn(
                "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 group whitespace-nowrap border min-w-[120px] justify-between",
                colors[state.color as string],
                !isProcessing && "hover:text-white",
                isProcessing && "opacity-80 cursor-not-allowed"
            )}
        >
            <div className="flex items-center gap-2">
                <div className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                    isProcessing ? "bg-indigo-600 text-white" : "bg-white/20"
                )}>
                    {isProcessing ? (
                        <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <img 
                            src="/LogoNous.png" 
                            alt="Nous" 
                            className="w-3.5 h-3.5 object-contain" 
                        />
                    )}
                </div>
                <span>{state.label}</span>
            </div>
            <Icon size={10} className={cn(
                "opacity-50 transition-opacity",
                !isProcessing && "group-hover:opacity-100",
                state.animate && "animate-spin"
            )} />
        </button>
    );
}
