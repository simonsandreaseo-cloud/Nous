'use client';

import { useState, useMemo } from 'react';
import { 
    Menu, 
    Search, 
    Filter, 
    Plus, 
    FileText, 
    MoreVertical, 
    Check, 
    Calendar, 
    Sparkles, 
    Trash2, 
    ExternalLink,
    X,
    FolderKanban,
    User,
    ArrowUpDown,
    CheckCircle2,
    Clock,
    FileEdit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/useAuthStore';
import { useProjectStore, STATUS_LABELS, STATUS_COLORS } from '@/store/useProjectStore';
import { useWriterStore } from '@/store/useWriterStore';

interface WriterMobileListViewProps {
    onSelectTask: (taskId: string) => void;
    onCreateTask: () => void;
    onOpenDrawer: () => void;
}

export function WriterMobileListView({
    onSelectTask,
    onCreateTask,
    onOpenDrawer
}: WriterMobileListViewProps) {
    const { user } = useAuthStore();
    const { projects, activeProjectIds, activeTeam, deleteTask } = useProjectStore();
    const { projectContents, draftId, projectId } = useWriterStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [actionTaskId, setActionTaskId] = useState<string | null>(null);

    // Filter tasks based on active project IDs, search term, and status filter
    const projectTasks = useMemo(() => {
        return projectContents.filter(t => !projectId || t.project_id === projectId);
    }, [projectContents, projectId]);

    const statusLabelsMap = useMemo(() => {
        const map = { ...STATUS_LABELS };
        const customStatuses = activeTeam?.settings?.custom_statuses || [];
        customStatuses.forEach((status: string) => {
            map[status] = status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        });
        return map;
    }, [activeTeam]);

    const availableStatuses = useMemo<string[]>(() => {
        const statuses = new Set<string>(projectTasks.map(t => (t.status as string)));
        return Array.from(statuses).filter(Boolean);
    }, [projectTasks]);

    const filteredTasks = useMemo(() => {
        return projectTasks.filter(task => {
            const matchesSearch = 
                (task.keyword || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                (task.title || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [projectTasks, searchTerm, statusFilter]);

    // Active project display name
    const currentProject = useMemo(() => {
        return projects.find(p => p.id === projectId) || projects.find(p => activeProjectIds.includes(p.id));
    }, [projects, projectId, activeProjectIds]);

    const handleTaskClick = (taskId: string) => {
        onSelectTask(taskId);
    };

    const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('¿Eliminar este contenido permanentemente?')) {
            await deleteTask(taskId);
            setActionTaskId(null);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Reciente';
        try {
            const d = new Date(dateStr);
            const now = new Date();
            const isToday = d.toDateString() === now.toDateString();
            if (isToday) {
                return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
        } catch {
            return 'Reciente';
        }
    };

    return (
        <div className="flex flex-col h-full bg-white select-none relative overflow-hidden">
            {/* Top Search Bar (Google Docs Style - Image 1) */}
            <div className="px-4 pt-3 pb-2 shrink-0 bg-white z-20">
                <div className="bg-slate-100/90 rounded-full h-12 flex items-center px-3.5 gap-2.5 border border-slate-200/60 shadow-xs">
                    {/* Hamburger Button (3 rayitas) */}
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
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar documentos"
                        className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-500 text-sm font-medium"
                    />

                    {/* Filter Icon Button (ONLY Icon, No text! Space economy crucial) */}
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={cn(
                            "relative p-2 rounded-full transition-all shrink-0 active:scale-95",
                            statusFilter !== 'all'
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-slate-600 hover:bg-slate-200/70"
                        )}
                        aria-label="Filtrar por estado"
                        title="Filtrar por estado"
                    >
                        <Filter size={18} />
                        {statusFilter !== 'all' && (
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 border border-white" />
                        )}
                    </button>

                    {/* Profile Avatar / Button */}
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-slate-200/80 shrink-0 flex items-center justify-center">
                        {user?.user_metadata?.avatar_url ? (
                            <img
                                src={user.user_metadata.avatar_url}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <User size={16} className="text-slate-400" />
                        )}
                    </div>
                </div>
            </div>

            {/* Subheader: Active Filter / Sorting Indicator */}
            <div className="px-5 py-2 flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 bg-white/60 shrink-0">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 truncate">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                        {currentProject ? currentProject.name : 'Todos los proyectos'}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] font-semibold text-slate-500">
                        {filteredTasks.length} {filteredTasks.length === 1 ? 'doc' : 'docs'}
                    </span>
                </div>

                {statusFilter !== 'all' && (
                    <button
                        onClick={() => setStatusFilter('all')}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold"
                    >
                        <span>{statusLabelsMap[statusFilter] || statusFilter}</span>
                        <X size={11} />
                    </button>
                )}
            </div>

            {/* Filter Popover (Clean floating sheet when filter icon is tapped) */}
            <AnimatePresence>
                {isFilterOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFilterOpen(false)}
                            className="fixed inset-0 bg-black/30 backdrop-blur-xs z-30"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.98 }}
                            className="absolute top-18 right-4 w-60 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-40"
                        >
                            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Filtrar por estado
                                </span>
                                <button
                                    onClick={() => setIsFilterOpen(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="max-h-64 overflow-y-auto custom-scrollbar py-1 space-y-0.5">
                                <button
                                    onClick={() => {
                                        setStatusFilter('all');
                                        setIsFilterOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left",
                                        statusFilter === 'all'
                                            ? "bg-slate-900 text-white"
                                            : "text-slate-700 hover:bg-slate-100"
                                    )}
                                >
                                    <span>Todos los estados</span>
                                    {statusFilter === 'all' && <Check size={14} />}
                                </button>

                                {availableStatuses.map((st) => {
                                    const isSelected = statusFilter === st;
                                    const colors = STATUS_COLORS[st] || STATUS_COLORS['idea'];
                                    return (
                                        <button
                                            key={st}
                                            onClick={() => {
                                                setStatusFilter(st);
                                                setIsFilterOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left",
                                                isSelected
                                                    ? "bg-slate-900 text-white"
                                                    : "text-slate-700 hover:bg-slate-100"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <span className={cn("w-2 h-2 rounded-full shrink-0", colors.dot)} />
                                                <span className="truncate">{statusLabelsMap[st] || st}</span>
                                            </div>
                                            {isSelected && <Check size={14} className="shrink-0 ml-1" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Document List (Google Docs items - Image 1) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 pb-24">
                {filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                        <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-3 shadow-inner">
                            <FileEdit size={28} />
                        </div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1">
                            {searchTerm || statusFilter !== 'all' ? 'Sin resultados' : 'No hay documentos'}
                        </h4>
                        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                            {searchTerm || statusFilter !== 'all'
                                ? 'Prueba a cambiar el filtro o el término de búsqueda.'
                                : 'Pulsa el botón + para crear tu primer documento en Studio.'}
                        </p>
                    </div>
                ) : (
                    filteredTasks.map((task) => {
                        const isCurrent = draftId === task.id;
                        const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS['idea'];
                        const taskTitle = task.keyword || task.title || 'Documento sin título';

                        return (
                            <div
                                key={task.id}
                                onClick={() => handleTaskClick(task.id)}
                                className={cn(
                                    "w-full px-4 py-3.5 flex items-center gap-3.5 transition-colors cursor-pointer group active:bg-slate-100/70",
                                    isCurrent ? "bg-indigo-50/50" : "hover:bg-slate-50"
                                )}
                            >
                                {/* Google Docs Blue Document Icon */}
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                    <FileText size={20} className="text-blue-600" />
                                </div>

                                {/* Title and Metadata Subtitle */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-slate-900 truncate tracking-tight leading-snug">
                                        {taskTitle}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-medium">
                                        <div className="flex items-center gap-1">
                                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusColor.dot)} />
                                            <span className="capitalize">{statusLabelsMap[task.status] || task.status}</span>
                                        </div>
                                        <span>•</span>
                                        <span>{formatDate(task.updated_at || task.created_at)}</span>
                                        {task.word_count ? (
                                            <>
                                                <span>•</span>
                                                <span>{task.word_count} pal.</span>
                                            </>
                                        ) : null}
                                    </div>
                                </div>

                                {/* 3 Dots Action Menu Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActionTaskId(actionTaskId === task.id ? null : task.id);
                                    }}
                                    className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                                    aria-label="Más opciones"
                                >
                                    <MoreVertical size={16} />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Task Action Sheet (When 3 dots are clicked) */}
            <AnimatePresence>
                {actionTaskId && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActionTaskId(null)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            className="fixed bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-2xl p-5 z-50 border-t border-slate-200"
                        >
                            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
                            <div className="space-y-2">
                                <button
                                    onClick={() => {
                                        onSelectTask(actionTaskId);
                                        setActionTaskId(null);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-2xl text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                                >
                                    <FileEdit size={16} className="text-indigo-600" />
                                    <span>Abrir en el editor Tiptap</span>
                                </button>
                                <button
                                    onClick={(e) => handleDeleteTask(actionTaskId, e)}
                                    className="w-full flex items-center gap-3 p-3 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                    <Trash2 size={16} />
                                    <span>Eliminar documento</span>
                                </button>
                                <button
                                    onClick={() => setActionTaskId(null)}
                                    className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 mt-2 hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Floating Action Button (FAB - Google Docs Image 1 style) */}
            <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={onCreateTask}
                className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-900/25 flex items-center justify-center hover:bg-slate-800 transition-colors"
                aria-label="Crear nuevo documento"
                title="Crear nuevo documento"
            >
                <Plus size={26} strokeWidth={2.5} />
            </motion.button>
        </div>
    );
}
