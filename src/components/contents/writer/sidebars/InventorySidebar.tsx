'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { 
    Search, 
    ChevronRight, 
    Calendar,
    Filter,
    ArrowUpRight,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { useProjectStore, STATUS_LABELS, STATUS_COLORS } from '@/store/useProjectStore';
import { useWriterStore } from '@/store/useWriterStore';
import { useShallow } from 'zustand/react/shallow';

export function InventorySidebar() {
    const { 
        tasks, 
        isLoading 
    } = useProjectStore();
    
    const { 
        draftId, 
        loadContentById,
        leftSidebarWidth,
        setLeftSidebarWidth
    } = useWriterStore(useShallow(state => ({
        draftId: state.draftId,
        loadContentById: state.loadContentById,
        leftSidebarWidth: state.leftSidebarWidth,
        setLeftSidebarWidth: state.setLeftSidebarWidth
    })));

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isResizing, setIsResizing] = useState(false);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [tasks, searchTerm, statusFilter]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing) return;
        const newWidth = (e.clientX / window.innerWidth) * 100;
        if (newWidth > 10 && newWidth < 40) {
            setLeftSidebarWidth(newWidth);
        }
    }, [isResizing, setLeftSidebarWidth]);

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
    }, []);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, handleMouseMove, handleMouseUp]);

    // Available statuses from tasks
    const availableStatuses = useMemo(() => {
        const statuses = new Set(tasks.map(t => t.status));
        return Array.from(statuses);
    }, [tasks]);

    return (
        <div 
            className="h-full flex flex-col bg-slate-50 border-r border-slate-200/50 relative select-none"
            style={{ width: `${leftSidebarWidth}%` }}
        >
            {/* SEARCH & FILTER HEADER */}
            <div className="p-6 border-b border-slate-100 bg-white/40 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Navegación</h3>
                    <div className="px-2 py-1 bg-indigo-50 rounded-lg text-indigo-600 text-[9px] font-black uppercase">
                        {filteredTasks.length} ITEMS
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                        <input 
                            type="text" 
                            placeholder="Buscar contenido..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-10 pl-10 pr-4 bg-white border border-slate-100 rounded-xl text-[11px] font-bold uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all placeholder:text-slate-300 shadow-sm"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={cn(
                                "flex-shrink-0 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                                statusFilter === 'all' 
                                    ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200" 
                                    : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
                            )}
                        >
                            Todos
                        </button>
                        {availableStatuses.map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={cn(
                                    "flex-shrink-0 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                                    statusFilter === status 
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" 
                                        : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
                                )}
                            >
                                {STATUS_LABELS[status] || status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* TASK LIST */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 bg-slate-50/50">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="animate-spin text-indigo-300" size={24} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Cargando inventario...</span>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-20">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic">No hay resultados</span>
                    </div>
                ) : (
                    filteredTasks.map((task) => (
                        <button
                            key={task.id}
                            onClick={() => loadContentById(task.id)}
                            className={cn(
                                "w-full p-4 rounded-[20px] text-left transition-all border group relative",
                                draftId === task.id 
                                    ? "bg-white border-indigo-100 shadow-xl shadow-indigo-100/50 scale-[1.02] z-10" 
                                    : "bg-transparent border-transparent hover:bg-white/60 text-slate-500 hover:border-slate-200/50"
                            )}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        STATUS_COLORS[task.status]?.dot || "bg-slate-300"
                                    )} />
                                    <span className={cn(
                                        "text-[8px] font-black uppercase tracking-widest",
                                        draftId === task.id ? "text-indigo-600" : "text-slate-400"
                                    )}>
                                        {STATUS_LABELS[task.status] || task.status}
                                    </span>
                                </div>
                                <span className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">
                                    {task.scheduled_date ? new Date(task.scheduled_date).toLocaleDateString() : "Draft"}
                                </span>
                            </div>

                            <h4 className={cn(
                                "text-[11px] font-black leading-tight uppercase italic tracking-tight line-clamp-2 transition-colors",
                                draftId === task.id ? "text-slate-900" : "text-slate-500 group-hover:text-slate-700"
                            )}>
                                {task.title}
                            </h4>

                            {draftId === task.id && (
                                <div className="absolute right-4 bottom-4 text-indigo-500">
                                    <ArrowUpRight size={14} />
                                </div>
                            )}
                        </button>
                    ))
                )}
            </div>

            {/* RESIZE HANDLE */}
            <div 
                onMouseDown={handleMouseDown}
                className={cn(
                    "absolute top-0 right-0 w-1 h-full cursor-col-resize transition-all z-30",
                    isResizing ? "bg-indigo-500 w-1" : "hover:bg-indigo-300/50 hover:w-1"
                )}
            />
        </div>
    );
}
