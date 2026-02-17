'use client';

import { useProjectStore, Task } from '@/store/useProjectStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MoreVertical, CheckCircle2, Clock, Calendar, Hash, Tag, Activity, Edit3, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';
import { NotificationService } from '@/lib/services/notifications';

interface StrategyGridProps {
    onSelectTask?: (task: Task) => void;
}

export default function StrategyGrid({ onSelectTask }: StrategyGridProps) {
    const { tasks, activeProject, addTask } = useProjectStore();
    const sortedTasks = [...tasks].sort((a, b) => new Date(a.scheduled_date || 0).getTime() - new Date(b.scheduled_date || 0).getTime());

    const handlePaste = async (e: React.ClipboardEvent) => {
        if (!activeProject) return;

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
            className="flex-1 overflow-auto custom-scrollbar bg-slate-50/50"
            onPaste={handlePaste}
        >
            <div className="max-w-full min-w-[1000px] p-6">
                <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[140px]">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[140px]">Fecha</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Título del Contenido</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[200px]">Keywords</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[120px]">Viabilidad</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[80px] text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sortedTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-30">
                                            <Edit3 size={32} />
                                            <p className="text-xs font-bold uppercase tracking-widest">Pega aquí tus tareas desde Excel o Sheets</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                sortedTasks.map((task) => (
                                    <tr
                                        key={task.id}
                                        onClick={() => onSelectTask?.(task)}
                                        className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-3">
                                            <div className={cn(
                                                "px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5",
                                                task.status === "done" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                                            )}>
                                                <div className={cn("w-1 h-1 rounded-full", task.status === "done" ? "bg-emerald-500" : "bg-blue-500")} />
                                                {task.status}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                                                <Calendar size={12} className="opacity-40" />
                                                {task.scheduled_date ? format(new Date(task.scheduled_date), "dd MMM, yyyy", { locale: es }) : '--'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="text-[13px] font-semibold text-slate-700 group-hover:text-slate-900 transition-colors block truncate max-w-[500px]">
                                                {task.title}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                                                <Tag size={12} className="opacity-40" />
                                                <span className="truncate" title={task.target_keyword}>{task.target_keyword || "--"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-md border border-slate-100">
                                                <Activity size={10} className="text-slate-400" />
                                                <span className="text-[10px] font-bold text-slate-500">{task.viability || "--"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <button className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-white border hover:border-slate-200 rounded-lg transition-all text-slate-400 hover:text-slate-900">
                                                <MoreVertical size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

