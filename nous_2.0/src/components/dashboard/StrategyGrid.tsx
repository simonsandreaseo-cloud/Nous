'use client';

import { useProjectStore, Task } from '@/store/useProjectStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MoreVertical, CheckCircle2, Clock, Calendar, Hash, Tag, Activity, Edit3, Trash2, Plus } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';
import { NotificationService } from '@/lib/services/notifications';
import { usePermissions } from '@/hooks/usePermissions';
import { ProjectBadge } from '@/components/ui/ProjectBadge';

interface StrategyGridProps {
    onSelectTask?: (task: Task) => void;
}

const TABLE_HEADERS = [
    { label: 'Estado', width: 'w-[140px]' },
    { label: 'Fecha', width: 'w-[140px]' },
    { label: 'Título del Contenido', width: '' },
    { label: 'Keywords', width: 'w-[200px]' },
    { label: 'Viabilidad', width: 'w-[120px]' },
    { label: '', width: 'w-[80px]' }
];

export default function StrategyGrid({ onSelectTask }: StrategyGridProps) {
    const { tasks, activeProject, addTask, updateTask, deleteTask } = useProjectStore();
    const [editingCell, setEditingCell] = useState<{ id: string, field: keyof Task } | null>(null);
    const [tempValue, setTempValue] = useState("");
    const sortedTasks = [...tasks].sort((a, b) => new Date(a.scheduled_date || 0).getTime() - new Date(b.scheduled_date || 0).getTime());
    const { canCreateOrDelete, canEditAny, canTakeTasks } = usePermissions();

    const handleCellClick = (task: Task, field: keyof Task, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canEditAny() && !canTakeTasks()) return;
        setEditingCell({ id: task.id, field });
        setTempValue(String(task[field] || ""));
    };

    const handleSave = async () => {
        if (!editingCell) return;
        const { id, field } = editingCell;

        // Only update if value changed
        const originalTask = tasks.find(t => t.id === id);
        if (originalTask && originalTask[field] !== tempValue) {
            await updateTask(id, { [field]: tempValue });
        }

        setEditingCell(null);
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
            status: 'todo' as const,
            target_keyword: "",
            viability: "",
            brief: ""
        };
        await addTask(newTask);

        // Find the newly added task (heuristic: latest by date or just wait for re-render)
        // Since we don't have the ID yet (it's async), we'll let the re-render happen.
        // In a real spreadsheet, we'd immediately focus it.
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        if (!activeProject || !canCreateOrDelete()) return;

        const pasteData = e.clipboardData.getData('text');
        if (!pasteData) return;

        // Parse TSV (Excel/Google Sheets format)
        const rows = pasteData.split(/\r?\n/).filter(row => row.trim() !== '');

        if (rows.length === 0) return;

        let addedCount = 0;

        // Simple heuristic: if the first row has many words, it might be headers
        // For now, let's assume Title is the first column, Date is second, KW is third
        // OR try to detect if it's a "clean" paste without headers

        for (const row of rows) {
            const columns = row.split('\t');
            if (columns.length < 1) continue;

            const title = columns[0].trim();
            if (!title) continue;

            // Try to parse date from second column
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
                    status: 'todo',
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
            NotificationService.notify("Importación exitosa", `Se han añadido ${addedCount} tareas desde el portapapeles.`);
        }
    };

    return (
        <div
            className="flex-1 overflow-auto custom-scrollbar bg-slate-50/20"
            onPaste={handlePaste}
        >
            <div className="max-w-full min-w-[1000px] p-6 pb-24">
                <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100/80">
                                {TABLE_HEADERS.map(header => (
                                    <th key={header.label} className={cn("px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]", header.width)}>
                                        {header.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50">
                            {sortedTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-32 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-30">
                                            <div className="w-16 h-16 rounded-[24px] bg-slate-100 flex items-center justify-center">
                                                <Edit3 size={32} />
                                            </div>
                                            <p className="text-xs font-black uppercase tracking-[0.3em]">Pega tus tareas desde Sheets o Excel</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                sortedTasks.map((task) => (
                                    <tr
                                        key={task.id}
                                        className="group hover:bg-slate-50/50 transition-all cursor-cell select-none"
                                    >
                                        {/* Status */}
                                        <td className="px-6 py-4">
                                            <div className={cn(
                                                "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-2 border",
                                                task.status === "done"
                                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                    : "bg-blue-50 text-blue-600 border-blue-100"
                                            )}>
                                                <div className={cn("w-1.5 h-1.5 rounded-full", task.status === "done" ? "bg-emerald-500" : "bg-blue-500")} />
                                                {task.status}
                                            </div>
                                        </td>

                                        {/* Date */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 lowercase tracking-tight">
                                                <Calendar size={12} className="opacity-40" />
                                                {task.scheduled_date ? format(new Date(task.scheduled_date), "dd MMM, yyyy", { locale: es }) : '--'}
                                            </div>
                                        </td>

                                        {/* Title (Editable) */}
                                        <td className="px-6 py-4 relative" onClick={(e) => handleCellClick(task, 'title', e)}>
                                            {editingCell?.id === task.id && editingCell?.field === 'title' ? (
                                                <input
                                                    autoFocus
                                                    className="absolute inset-x-4 inset-y-2 px-2 bg-white border-2 border-slate-900 rounded-lg text-[13px] font-bold text-slate-900 shadow-lg z-10 outline-none"
                                                    value={tempValue}
                                                    onChange={(e) => setTempValue(e.target.value)}
                                                    onBlur={handleSave}
                                                    onKeyDown={handleKeyDown}
                                                />
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <ProjectBadge projectId={task.project_id} />
                                                    <span className={cn(
                                                        "text-[13px] font-bold text-slate-700 block truncate transition-all",
                                                        !task.title && "text-slate-300 italic font-medium"
                                                    )}>
                                                        {task.title || "Escribe un título..."}
                                                    </span>
                                                </div>
                                            )}
                                        </td>

                                        {/* Keywords (Editable) */}
                                        <td className="px-6 py-4 relative" onClick={(e) => handleCellClick(task, 'target_keyword', e)}>
                                            {editingCell?.id === task.id && editingCell?.field === 'target_keyword' ? (
                                                <input
                                                    autoFocus
                                                    className="absolute inset-x-4 inset-y-2 px-2 bg-white border-2 border-slate-900 rounded-lg text-[11px] font-bold text-slate-900 shadow-lg z-10 outline-none"
                                                    value={tempValue}
                                                    onChange={(e) => setTempValue(e.target.value)}
                                                    onBlur={handleSave}
                                                    onKeyDown={handleKeyDown}
                                                />
                                            ) : (
                                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                                                    <Tag size={12} className="opacity-40" />
                                                    <span className={cn("truncate", !task.target_keyword && "text-slate-300")}>
                                                        {task.target_keyword || "Keyword..."}
                                                    </span>
                                                </div>
                                            )}
                                        </td>

                                        {/* Viability (Editable) */}
                                        <td className="px-6 py-4 relative" onClick={(e) => handleCellClick(task, 'viability', e)}>
                                            {editingCell?.id === task.id && editingCell?.field === 'viability' ? (
                                                <input
                                                    autoFocus
                                                    className="absolute inset-x-4 inset-y-2 px-2 bg-white border-2 border-slate-900 rounded-lg text-[10px] font-black uppercase text-slate-900 shadow-lg z-10 outline-none"
                                                    value={tempValue}
                                                    onChange={(e) => setTempValue(e.target.value)}
                                                    onBlur={handleSave}
                                                    onKeyDown={handleKeyDown}
                                                />
                                            ) : (
                                                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-xl">
                                                    <Activity size={10} className="text-slate-400" />
                                                    <span className={cn("text-[10px] font-black uppercase tracking-widest text-slate-500", !task.viability && "text-slate-300")}>
                                                        {task.viability || "--"}
                                                    </span>
                                                </div>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {(canEditAny() || canTakeTasks()) && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onSelectTask?.(task); }}
                                                        className="p-2 opacity-0 group-hover:opacity-100 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-xl transition-all text-slate-400 hover:text-slate-900"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                )}
                                                {canCreateOrDelete() && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); if (confirm('¿Seguro?')) deleteTask?.(task.id); }}
                                                        className="p-2 opacity-0 group-hover:opacity-100 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all text-slate-400 hover:text-rose-600"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}

                            {/* ADD NEW ROW BUTTON */}
                            {canCreateOrDelete() && (
                                <tr className="hover:bg-slate-50/30 transition-colors border-t border-slate-100">
                                    <td colSpan={6} className="p-0">
                                        <button
                                            onClick={addNewRow}
                                            className="w-full py-4 px-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 transition-all flex items-center gap-3 group"
                                        >
                                            <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all scale-90 group-hover:scale-100">
                                                <Plus size={14} />
                                            </div>
                                            Agregar Fila Nueva
                                        </button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Spreadsheet Helper Info */}
                <div className="mt-8 flex items-center justify-between px-2">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <kbd className="px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-400 shadow-sm">ENTER</kbd>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Para guardar</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <kbd className="px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-400 shadow-sm">ESC</kbd>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cancelar</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

