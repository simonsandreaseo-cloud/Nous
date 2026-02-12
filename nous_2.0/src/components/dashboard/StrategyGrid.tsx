'use client';

import { useProjectStore, Task } from '@/store/useProjectStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MoreVertical, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';

import { motion } from 'framer-motion';

interface StrategyGridProps {
    onSelectTask?: (task: Task) => void;
}

export default function StrategyGrid({ onSelectTask }: StrategyGridProps) {
    const { tasks } = useProjectStore();
    const sortedTasks = [...tasks].sort((a, b) => new Date(a.scheduled_date || 0).getTime() - new Date(b.scheduled_date || 0).getTime());

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 gap-3"
            >
                {/* Header Row */}
                <div className="grid grid-cols-12 px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <div className="col-span-2">Estado</div>
                    <div className="col-span-2">Fecha</div>
                    <div className="col-span-4">Título del Contenido</div>
                    <div className="col-span-2">Keywords</div>
                    <div className="col-span-1">Viabilidad</div>
                    <div className="col-span-1 text-right">Acciones</div>
                </div>

                {sortedTasks.map(task => (
                    <motion.div
                        key={task.id}
                        variants={item}
                        onClick={() => onSelectTask?.(task)}
                        className="grid grid-cols-12 items-center px-8 py-5 bg-white/60 backdrop-blur-md border border-slate-100/50 rounded-[28px] shadow-sm hover:shadow-xl hover:border-purple-200/50 hover:bg-white transition-all cursor-pointer group relative overflow-hidden"
                    >
                        {/* Status Glow */}
                        <div className={cn(
                            "absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity",
                            task.status === "done" ? "bg-emerald-500" : "bg-purple-500"
                        )} />

                        <div className="col-span-2">
                            <div className={cn(
                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-2",
                                task.status === "done" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-purple-50 text-purple-600 border border-purple-100"
                            )}>
                                <div className={cn("w-1.5 h-1.5 rounded-full", task.status === "done" ? "bg-emerald-500" : "bg-purple-500 animate-pulse")} />
                                {task.status}
                            </div>
                        </div>

                        <div className="col-span-2">
                            <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors">
                                {task.scheduled_date ? format(new Date(task.scheduled_date), "dd MMM yyyy", { locale: es }) : '--'}
                            </span>
                        </div>

                        <div className="col-span-4 pr-4">
                            <span className="text-sm font-black text-slate-900 tracking-tight group-hover:text-purple-700 transition-colors block truncate">
                                {task.title}
                            </span>
                        </div>

                        <div className="col-span-2 pr-4">
                            <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-500 transition-colors truncate block" title={task.target_keyword}>
                                {task.target_keyword || "--"}
                            </span>
                        </div>

                        <div className="col-span-1">
                            <span className="text-[10px] font-black font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-md group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                                {task.viability || "--"}
                            </span>
                        </div>

                        <div className="col-span-1 text-right">
                            <button className="p-2 hover:bg-purple-50 rounded-xl transition-all group/btn">
                                <MoreVertical size={16} className="text-slate-300 group-hover/btn:text-purple-400" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}
