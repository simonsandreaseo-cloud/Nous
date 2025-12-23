import React, { useState } from 'react';
import { Task, TaskService, Project } from '../../lib/task_manager';
import { Plus, MoreHorizontal, Calendar, User, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskDetailModal from './TaskDetailModal';
import { useOutletContext } from 'react-router-dom';

const STATUS_COLUMNS = [
    { id: 'idea', label: 'Ideas', color: 'bg-amber-400' },
    { id: 'todo', label: 'Por Hacer', color: 'bg-slate-400' },
    { id: 'in_progress', label: 'En Progreso', color: 'bg-blue-500' },
    { id: 'review', label: 'Revisión', color: 'bg-purple-500' },
    { id: 'done', label: 'Publicado', color: 'bg-emerald-500' }
];

interface TaskBoardProps {
    tasks?: Task[];
    project?: Project;
    projectId?: string | number;
    onTaskUpdate?: () => void;
    defaultType?: 'task' | 'content';
}

const TaskBoard: React.FC<TaskBoardProps> = (props) => {
    // Try to get from Context (if rendered via Outlet)
    const context = useOutletContext<{ project: Project, tasks: Task[], refreshTasks: () => void }>();

    // Determine data source (Props > Context)
    const tasks = props.tasks || context?.tasks || [];
    const project = props.project || context?.project;
    const projectId = props.projectId || project?.id;
    const onTaskUpdate = props.onTaskUpdate || context?.refreshTasks || (() => { });

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creationStatus, setCreationStatus] = useState('idea');
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    if (!projectId) return <div className="p-8 text-center text-slate-400">Cargando tablero...</div>;

    const handleCreateTask = async () => {
        if (!newTaskTitle.trim()) return;
        try {
            await TaskService.createTask(projectId, {
                title: newTaskTitle,
                status: creationStatus as any,
                priority: 'medium',
                type: props.defaultType || 'task'
            });
            setNewTaskTitle('');
            setShowCreateModal(false);
            onTaskUpdate();
        } catch (error) {
            console.error(error);
            alert("Error al crear tarea");
        }
    };

    const handleMoveTask = async (task: Task, direction: 'next' | 'prev') => {
        const currentIndex = STATUS_COLUMNS.findIndex(c => c.id === task.status);
        if (currentIndex === -1) return;

        const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (newIndex < 0 || newIndex >= STATUS_COLUMNS.length) return;

        const newStatus = STATUS_COLUMNS[newIndex].id;
        try {
            await TaskService.updateTask(task.id, { status: newStatus as any });
            onTaskUpdate();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="h-full overflow-x-auto pb-4">
            <div className="flex gap-6 min-w-[1200px]">
                {STATUS_COLUMNS.map(col => {
                    const colTasks = tasks.filter(t => t.status === col.id);
                    return (
                        <div key={col.id} className="flex-1 min-w-[280px]">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${col.color}`} />
                                    <h3 className="font-bold text-brand-power text-sm uppercase tracking-widest">{col.label}</h3>
                                    <span className="text-xs font-bold text-brand-power/30 bg-brand-soft px-2 py-0.5 rounded-full">{colTasks.length}</span>
                                </div>
                                <button
                                    onClick={() => { setCreationStatus(col.id); setShowCreateModal(true); }}
                                    className="text-brand-power/30 hover:text-brand-accent transition-colors"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>

                            <div className="bg-brand-soft/30 rounded-xl p-2 min-h-[500px]">
                                <div className="space-y-3">
                                    {colTasks.map(task => (
                                        <div key={task.id}
                                            onClick={() => setSelectedTask(task)}
                                            className="bg-white p-4 rounded-lg shadow-sm border border-brand-power/5 group hover:shadow-md transition-all cursor-pointer relative"
                                        >

                                            {/* Priority Stripe */}
                                            <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${task.priority === 'critical' ? 'bg-red-500' :
                                                task.priority === 'high' ? 'bg-orange-400' :
                                                    task.priority === 'medium' ? 'bg-blue-400' : 'bg-gray-300'
                                                }`} title={`Prioridad: ${task.priority}`} />

                                            <div className="flex items-center gap-2 mb-1">
                                                {task.type === 'content' && (
                                                    <span className="text-[8px] font-bold uppercase tracking-tighter bg-brand-accent/20 text-brand-accent px-1 rounded">Contenido</span>
                                                )}
                                                {task.assignee_id && (
                                                    <span className="text-[8px] font-bold uppercase tracking-tighter bg-blue-100 text-blue-600 px-1 rounded flex items-center gap-0.5">
                                                        <User size={8} /> Asignada
                                                    </span>
                                                )}
                                                <h4 className="font-bold text-brand-power text-sm pr-4 truncate">{task.title}</h4>
                                            </div>

                                            <div className="flex items-center justify-between mt-4 border-t border-brand-power/5 pt-3">
                                                <div className="flex items-center gap-2">
                                                    {task.assignee ? (
                                                        <div className="w-6 h-6 rounded-full bg-brand-accent text-white flex items-center justify-center text-[10px] font-bold" title={task.assignee.email}>
                                                            {task.assignee.email[0].toUpperCase()}
                                                        </div>
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-[10px]">
                                                            <User size={12} />
                                                        </div>
                                                    )}
                                                    {task.due_date && (
                                                        <span className="text-[10px] text-brand-power/50 flex items-center gap-1 bg-red-50 px-1.5 py-0.5 rounded text-red-500">
                                                            <Calendar size={10} /> {new Date(task.due_date).getDate()}/{new Date(task.due_date).getMonth() + 1}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Quick Actions (Hover) */}
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleMoveTask(task, 'prev'); }}
                                                        disabled={col.id === 'idea'}
                                                        className="p-1 hover:bg-brand-soft rounded text-brand-power/50 disabled:opacity-30"
                                                    >
                                                        <ArrowLeft size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleMoveTask(task, 'next'); }}
                                                        disabled={col.id === 'done'}
                                                        className="p-1 hover:bg-brand-soft rounded text-brand-power/50 disabled:opacity-30"
                                                    >
                                                        <ArrowRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {colTasks.length === 0 && (
                                        <div
                                            onClick={() => { setCreationStatus(col.id); setShowCreateModal(true); }}
                                            className="border-2 border-dashed border-brand-power/5 rounded-lg p-4 text-center text-xs text-brand-power/30 hover:border-brand-accent/30 hover:text-brand-accent cursor-pointer transition-all"
                                        >
                                            + Añadir Tarea
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create Task Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowCreateModal(false)}
                            className="absolute inset-0 bg-brand-power/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6"
                        >
                            <h3 className="font-bold text-lg text-brand-power mb-4">Nueva Tarea en "{STATUS_COLUMNS.find(c => c.id === creationStatus)?.label}"</h3>
                            <input
                                autoFocus
                                value={newTaskTitle}
                                onChange={e => setNewTaskTitle(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreateTask()}
                                placeholder="Escribe el título de la tarea..."
                                className="w-full bg-brand-soft/20 border border-brand-power/10 rounded-lg p-3 outline-none focus:border-brand-accent mb-6"
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-brand-power/50 text-xs font-bold uppercase hover:text-brand-power">Cancelar</button>
                                <button onClick={handleCreateTask} className="px-4 py-2 bg-brand-power text-white rounded-lg text-xs font-bold uppercase hover:bg-brand-accent shadow-lg">Crear Tarea</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Task Detail Modal */}
            <AnimatePresence>
                {selectedTask && (
                    <TaskDetailModal
                        task={selectedTask}
                        project={project}
                        onClose={() => setSelectedTask(null)}
                        onUpdate={() => {
                            onTaskUpdate();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default TaskBoard;
