import React, { useEffect, useState } from 'react';
import { Task, TaskService } from '../../lib/task_manager';
import { CheckSquare, Clock, AlertCircle, ChevronRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface TasksDashboardProps {
    compact?: boolean;
}

const TasksDashboard: React.FC<TasksDashboardProps> = ({ compact = false }) => {
    const [tasks, setTasks] = useState<(Task & { projects: { name: string, slug: string } })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending');

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const data = await TaskService.getMyAssignedTasks();
            setTasks(data);
        } catch (error) {
            console.error('Error fetching assigned tasks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'all') return true;
        if (filter === 'pending') return task.status !== 'done';
        if (filter === 'done') return task.status === 'done';
        return true;
    });

    const displayTasks = compact ? filteredTasks.slice(0, 5) : filteredTasks;

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-brand-soft/20 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {!compact && (
                <div className="flex items-center gap-2 mb-6">
                    {(['pending', 'done', 'all'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${filter === f
                                    ? 'bg-brand-power text-brand-white shadow-lg'
                                    : 'bg-brand-soft/20 text-brand-power/50 hover:bg-brand-soft/40'
                                }`}
                        >
                            {f === 'pending' ? 'Pendientes' : f === 'done' ? 'Completadas' : 'Todas'}
                        </button>
                    ))}
                </div>
            )}

            {displayTasks.length > 0 ? (
                <div className="space-y-3">
                    {displayTasks.map((task) => (
                        <Link
                            key={task.id}
                            to={`/proyectos/${task.projects.slug}`}
                            className="group flex items-center justify-between p-4 bg-white rounded-xl border border-brand-power/5 hover:border-brand-accent/30 hover:bg-brand-soft/5 transition-all shadow-sm"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${task.status === 'done' ? 'bg-emerald-50 text-emerald-500' : 'bg-brand-soft text-brand-power/30 group-hover:bg-brand-accent group-hover:text-brand-power'
                                    }`}>
                                    <CheckSquare size={18} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className="font-bold text-brand-power text-sm truncate">{task.title}</h3>
                                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${task.priority === 'critical' ? 'bg-red-50 text-red-500' :
                                                task.priority === 'high' ? 'bg-orange-50 text-orange-500' :
                                                    task.priority === 'medium' ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-500'
                                            }`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-medium text-brand-power/40 uppercase tracking-wider">
                                        <span className="flex items-center gap-1">
                                            <AlertCircle size={10} /> {task.projects.name}
                                        </span>
                                        {task.due_date && (
                                            <span className="flex items-center gap-1 text-rose-400">
                                                <Clock size={10} /> {new Date(task.due_date).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-brand-power/20 group-hover:text-brand-accent group-hover:translate-x-1 transition-all">
                                <ChevronRight size={18} />
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 border-2 border-dashed border-brand-power/5 rounded-2xl">
                    <p className="text-brand-power/40 text-sm">No tienes tareas {filter === 'pending' ? 'pendientes' : filter === 'done' ? 'completadas' : ''} en este momento.</p>
                </div>
            )}

            {compact && filteredTasks.length > 5 && (
                <Link
                    to="/mis-tareas"
                    className="block text-center py-3 text-xs font-bold text-brand-power/40 hover:text-brand-accent uppercase tracking-[0.2em] transition-colors"
                >
                    Ver todas las tareas &rarr;
                </Link>
            )}
        </div>
    );
};

export default TasksDashboard;
