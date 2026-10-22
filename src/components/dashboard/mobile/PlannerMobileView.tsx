'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Menu, 
    Search, 
    Filter, 
    Plus, 
    Calendar, 
    MoreVertical, 
    Sparkles, 
    Trash2, 
    ExternalLink, 
    X, 
    Check, 
    FileText, 
    Layers, 
    Clock, 
    ArrowUpRight,
    PenTool,
    Hash,
    SlidersHorizontal,
    BrainCircuit,
    Info,
    RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { Task, useProjectStore, STATUS_LABELS } from '@/store/useProjectStore';
import { useAuthStore } from '@/store/useAuthStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PlannerMobileViewProps {
    tasks: Task[];
    allTasks: Task[];
    selectedTask: Task | null;
    onSelectTask: (task: Task | null) => void;
    onOpenDrawer: () => void;
    onOpenPipeline: () => void;
    onOpenSmartUpload: () => void;
    searchQuery: string;
    onSearchChange: (q: string) => void;
    statusFilter: string[];
    onToggleStatusFilter: (status: string) => void;
    onClearFilters: () => void;
    dateFrom: string;
    onDateFromChange: (d: string) => void;
    dateTo: string;
    onDateToChange: (d: string) => void;
    onReinvestigate: (task: { id: string; keyword: string }) => void;
    onDeleteTask: (taskId: string) => void;
    onAddTask: () => void;
}

const STATUS_COLOR_MAP: Record<string, { bg: string; text: string; dot: string }> = {
    idea: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
    en_investigacion: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    por_redactar: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    en_redaccion: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
    por_corregir: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
    redactado: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
    en_revision: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
    humanizado: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
    por_maquetar: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
    publicado: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

export function PlannerMobileView({
    tasks,
    allTasks,
    selectedTask,
    onSelectTask,
    onOpenDrawer,
    onOpenPipeline,
    onOpenSmartUpload,
    searchQuery,
    onSearchChange,
    statusFilter,
    onToggleStatusFilter,
    onClearFilters,
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    onReinvestigate,
    onDeleteTask,
    onAddTask
}: PlannerMobileViewProps) {
    const router = useRouter();
    const { activeProject, activeTeam } = useProjectStore();
    const { user } = useAuthStore();
    const [isFilterBubbleOpen, setIsFilterBubbleOpen] = useState(false);
    const [actionTaskId, setActionTaskId] = useState<string | null>(null);

    const hasActiveFilters = statusFilter.length > 0 || !!dateFrom || !!dateTo;

    const statusLabelsMap = useMemo(() => {
        const map: Record<string, string> = { ...STATUS_LABELS };
        const customStatuses = activeTeam?.settings?.custom_statuses || [];
        customStatuses.forEach((status: string) => {
            map[status] = status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        });
        return map;
    }, [activeTeam]);

    const formatDateBadge = (dateStr?: string) => {
        if (!dateStr) return 'Sin fecha';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            const isMonthMode = activeProject?.settings?.content_preferences?.date_mode === 'month';
            if (isMonthMode) {
                return format(date, 'MMM yyyy', { locale: es });
            }
            return format(date, 'd MMM yyyy', { locale: es });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 select-none relative overflow-hidden">
            {/* Top Search & Filter Bar (Minimalist Google Docs style) */}
            <div className="px-4 pt-3 pb-2 shrink-0 bg-white border-b border-slate-100 z-20">
                <div className="bg-slate-100/90 rounded-full h-12 flex items-center px-3.5 gap-2 border border-slate-200/60 shadow-xs">
                    {/* Hamburger Button (3 rayitas) -> Opens Main Drawer */}
                    <button
                        onClick={onOpenDrawer}
                        className="p-1.5 rounded-full text-slate-700 hover:bg-slate-200/70 transition-colors active:scale-95 shrink-0"
                        aria-label="Abrir menú"
                    >
                        <Menu size={20} />
                    </button>

                    {/* Search Input */}
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Buscar tareas o keywords..."
                        className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 text-sm font-medium"
                    />

                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                        >
                            <X size={14} />
                        </button>
                    )}

                    {/* Filter Icon Button (Icon Only, with indicator dot if active) */}
                    <button
                        onClick={() => setIsFilterBubbleOpen(!isFilterBubbleOpen)}
                        className={cn(
                            "relative p-2 rounded-full transition-all shrink-0 active:scale-95",
                            hasActiveFilters
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-slate-600 hover:bg-slate-200/70"
                        )}
                        aria-label="Filtrar contenidos"
                        title="Filtros"
                    >
                        <Filter size={18} />
                        {hasActiveFilters && (
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 border border-white" />
                        )}
                    </button>

                    {/* Nous Pipeline Button */}
                    <button
                        onClick={onOpenPipeline}
                        className="p-2 rounded-full bg-slate-900 text-amber-400 hover:bg-slate-800 transition-colors shrink-0 active:scale-95 shadow-xs"
                        aria-label="Abrir Pipeline Nous"
                        title="Nous Master"
                    >
                        <Sparkles size={16} />
                    </button>
                </div>
            </div>

            {/* Subheader: Project name, task counter, and active filter tags */}
            <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-200/70 bg-white shrink-0">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 truncate">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 truncate max-w-[160px]">
                        {activeProject ? activeProject.name : 'Planificador'}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] font-semibold text-slate-500">
                        {tasks.length} {tasks.length === 1 ? 'contenido' : 'contenidos'}
                    </span>
                </div>

                {hasActiveFilters && (
                    <button
                        onClick={onClearFilters}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-colors"
                    >
                        <span>Limpiar filtros</span>
                        <X size={11} />
                    </button>
                )}
            </div>

            {/* Filter Popover Bubble */}
            <AnimatePresence>
                {isFilterBubbleOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFilterBubbleOpen(false)}
                            className="fixed inset-0 bg-black/30 backdrop-blur-xs z-30"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.98 }}
                            className="absolute top-16 right-4 left-4 max-w-sm ml-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-40 space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Filtros del Planificador</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Filtra por estado y fecha</p>
                                </div>
                                <button
                                    onClick={() => setIsFilterBubbleOpen(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Status Section */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                                    Por Estado
                                </label>
                                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                                    {Object.entries(STATUS_LABELS).map(([statusKey, statusLabel]) => {
                                        const isChecked = statusFilter.includes(statusKey);
                                        return (
                                            <button
                                                key={statusKey}
                                                type="button"
                                                onClick={() => onToggleStatusFilter(statusKey)}
                                                className={cn(
                                                    "flex items-center gap-2 p-2 rounded-xl text-left border text-[11px] font-bold transition-all",
                                                    isChecked
                                                        ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                                        : "bg-slate-50/60 border-slate-100 text-slate-600 hover:bg-slate-100"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-3.5 h-3.5 rounded flex items-center justify-center border",
                                                    isChecked ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                                                )}>
                                                    {isChecked && <Check size={10} strokeWidth={3} />}
                                                </div>
                                                <span className="truncate">{statusLabel}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Date Range Section */}
                            <div className="pt-2 border-t border-slate-100">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                                    Rango de Fechas
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                                        <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-1">Desde</span>
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => onDateFromChange(e.target.value)}
                                            className="w-full bg-transparent border-none text-[11px] font-bold text-slate-700 outline-none p-0"
                                        />
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                                        <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-1">Hasta</span>
                                        <input
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => onDateToChange(e.target.value)}
                                            className="w-full bg-transparent border-none text-[11px] font-bold text-slate-700 outline-none p-0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={onClearFilters}
                                    className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600"
                                >
                                    Limpiar Todo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsFilterBubbleOpen(false)}
                                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-colors"
                                >
                                    Aplicar
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Task Card List Area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-24">
                {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                        <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4 border border-slate-200">
                            <Layers size={28} />
                        </div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">No hay contenidos</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                            {searchQuery || hasActiveFilters
                                ? 'No se encontraron resultados para los filtros seleccionados.'
                                : 'Comienza agregando un nuevo contenido al planificador.'}
                        </p>
                        {(searchQuery || hasActiveFilters) && (
                            <button
                                onClick={onClearFilters}
                                className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    tasks.map((task) => {
                        const statusTheme = STATUS_COLOR_MAP[task.status] || {
                            bg: 'bg-slate-100',
                            text: 'text-slate-700',
                            dot: 'bg-slate-400'
                        };
                        const statusLabel = statusLabelsMap[task.status] || task.status;

                        return (
                            <div
                                key={task.id}
                                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition-all space-y-3 relative"
                            >
                                {/* Card Header: Status badge, Date badge, 3-dots */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {/* Status Badge */}
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                            statusTheme.bg,
                                            statusTheme.text
                                        )}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full", statusTheme.dot)} />
                                            {statusLabel}
                                        </span>

                                        {/* Date Badge */}
                                        {task.scheduled_date && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                                <Calendar size={11} className="text-slate-400" />
                                                {formatDateBadge(task.scheduled_date)}
                                            </span>
                                        )}
                                    </div>

                                    {/* 3-dots Menu Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActionTaskId(actionTaskId === task.id ? null : task.id);
                                        }}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                        aria-label="Más opciones"
                                    >
                                        <MoreVertical size={16} />
                                    </button>
                                </div>

                                {/* Title & Target Keyword */}
                                <div
                                    onClick={() => onSelectTask(task)}
                                    className="cursor-pointer space-y-1"
                                >
                                    <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                                        {task.title || task.target_keyword || 'Sin título propuesto'}
                                    </h3>
                                    {task.target_keyword && task.target_keyword !== task.title && (
                                        <p className="text-[11px] text-slate-400 font-medium truncate flex items-center gap-1">
                                            <Hash size={11} className="text-slate-300 shrink-0" />
                                            {task.target_keyword}
                                        </p>
                                    )}
                                </div>

                                {/* Tags Row: Content Type & Word Count */}
                                <div className="flex items-center gap-2 pt-1">
                                    {task.content_type && (
                                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                            {task.content_type}
                                        </span>
                                    )}
                                    {(task.word_count_real || task.target_word_count) && (
                                        <span className="text-[9px] font-medium text-slate-400">
                                            {task.word_count_real ? `${task.word_count_real} palabras` : `Meta: ${task.target_word_count} pals`}
                                        </span>
                                    )}
                                </div>

                                {/* Bottom Quick Actions Strip */}
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                    <button
                                        onClick={() => onSelectTask(task)}
                                        className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors py-1"
                                    >
                                        <Info size={12} />
                                        Detalles / Outline
                                    </button>

                                    <button
                                        onClick={() => router.push(`/contents/writer?taskId=${task.id}`)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-colors"
                                    >
                                        <PenTool size={11} />
                                        Abrir en Studio
                                    </button>
                                </div>

                                {/* Action Dropdown Sheet (When 3-dots tapped) */}
                                <AnimatePresence>
                                    {actionTaskId === task.id && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-30"
                                                onClick={() => setActionTaskId(null)}
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                                className="absolute right-3 top-12 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-40 space-y-1"
                                            >
                                                <button
                                                    onClick={() => {
                                                        setActionTaskId(null);
                                                        onSelectTask(task);
                                                    }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                                >
                                                    <FileText size={14} className="text-slate-400" />
                                                    <span>Ver detalles</span>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setActionTaskId(null);
                                                        router.push(`/contents/writer?taskId=${task.id}`);
                                                    }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                >
                                                    <PenTool size={14} />
                                                    <span>Editar en Studio</span>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setActionTaskId(null);
                                                        onReinvestigate({
                                                            id: task.id,
                                                            keyword: task.target_keyword || task.title
                                                        });
                                                    }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                                >
                                                    <RotateCcw size={14} className="text-amber-500" />
                                                    <span>Re-investigar fases</span>
                                                </button>

                                                <div className="border-t border-slate-100 my-1" />

                                                <button
                                                    onClick={() => {
                                                        setActionTaskId(null);
                                                        onDeleteTask(task.id);
                                                    }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                    <span>Eliminar contenido</span>
                                                </button>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Floating Action Button (+ FAB) for creating a new task */}
            <div className="fixed bottom-6 right-6 z-30">
                <motion.button
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={onAddTask}
                    className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-xl shadow-slate-900/30 hover:bg-slate-800 transition-all border border-slate-700/50"
                    aria-label="Agregar contenido"
                >
                    <Plus size={24} strokeWidth={2.5} />
                </motion.button>
            </div>
        </div>
    );
}
