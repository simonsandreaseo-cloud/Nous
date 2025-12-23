import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Task, Project, TaskService } from '../../lib/task_manager';
import { ContentService, ContentItem } from '../../lib/ContentService';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Lock, Unlock, User, Calendar as CalIcon, Edit3, X, FileText, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import TaskDetailModal from './TaskDetailModal';

interface EditorialCalendarProps {
    projectId?: string | number;
    project?: Project;
    tasks?: Task[];
    onTaskUpdate?: () => void;
}

export const EditorialCalendar: React.FC<EditorialCalendarProps> = (props) => {
    // Try to get from Context (if rendered via Outlet)
    const context = useOutletContext<{ project: Project, tasks: Task[], refreshTasks: () => void }>();

    // Determine data source (Props > Context)
    const tasks = props.tasks || context?.tasks || [];
    const project = props.project || context?.project;
    const projectId = props.projectId || project?.id;
    const onTaskUpdate = props.onTaskUpdate || context?.refreshTasks || (() => { });

    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedTask, setSelectedTask] = useState<ContentItem | null>(null);

    // If still no project ID, show loading
    if (!projectId) return <div className="p-8 text-center text-slate-400">Cargando calendario...</div>;

    // Helper to get days in month
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const getTasksForDay = (day: number) => {
        return tasks.filter(t => {
            if (!t.due_date) return false;
            const d = new Date(t.due_date);
            return d.getDate() === day &&
                d.getMonth() === currentDate.getMonth() &&
                d.getFullYear() === currentDate.getFullYear();
        });
    };

    const handleCreateTask = async (day: number) => {
        const title = prompt(`Nuevo contenido para el ${day} de ${monthName}:`);
        if (!title) return;

        // Use local date at noon to avoid timezone shifts
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 12, 0, 0);
        const dueDate = date.toISOString();

        try {
            await TaskService.createTask(projectId, {
                title,
                status: 'idea',
                type: 'content',
                due_date: dueDate,
                priority: 'medium'
            });
            onTaskUpdate();
        } catch (e: any) {
            console.error("Error creating task:", e);
            alert("Error al crear contenido: " + (e.message || "Error desconocido"));
        }
    };

    const handleOpenTask = (task: Task) => {
        setSelectedTask(task as ContentItem);
    };

    const handleEditContent = async (version: 1 | 2) => {
        if (!selectedTask || !user) return;

        // Check Lock
        if (ContentService.isLocked(selectedTask, user.id)) {
            alert("Este contenido está siendo editado por otro usuario.");
            return;
        }

        try {
            // Lock logic
            await ContentService.lockContent(selectedTask.id);
            // Navigate to Writer with ID
            if (version === 1) {
                navigate(`/herramientas/redactor-ia?draftId=${selectedTask.id}&context=project`);
            } else {
                navigate(`/herramientas/redactor-ia-2?taskId=${selectedTask.id}`);
            }
        } catch (e: any) {
            alert("Error al bloquear contenido: " + e.message);
        }
    };

    const handleAssignMe = async () => {
        if (!selectedTask) return;
        try {
            await ContentService.assignToMe(selectedTask.id);
            onTaskUpdate();
            setSelectedTask({ ...selectedTask, assignee_id: user?.id });
        } catch (e: any) {
            alert("Error al asignar: " + e.message);
        }
    };

    const calendarGrid = [];
    // Padding days
    for (let i = 0; i < firstDay; i++) {
        calendarGrid.push(<div key={`pad-${i}`} className="h-32 bg-slate-50/50 border-b border-r border-slate-100"></div>);
    }
    // Remote days
    for (let day = 1; day <= days; day++) {
        const dayTasks = getTasksForDay(day);
        const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

        calendarGrid.push(
            <div
                key={`day-${day}`}
                className={`h-32 border-b border-r border-slate-100 p-2 transition hover:bg-slate-50 ${isToday ? 'bg-indigo-50/30' : ''} group relative`}
                onClick={() => handleCreateTask(day)}
            >
                <div className="flex justify-between items-start mb-2 pointer-events-none">
                    <span className={`text-xs font-bold ${isToday ? 'text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full' : 'text-slate-400'}`}>{day}</span>
                    <button className="opacity-0 group-hover:opacity-100 text-indigo-500 hover:text-indigo-700 pointer-events-auto">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                </div>
                <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar pointer-events-none">
                    {dayTasks.map(task => {
                        const isLocked = ContentService.isLocked(task as ContentItem, user?.id || '');
                        return (
                            <div
                                key={task.id}
                                className={`text-[10px] px-1.5 py-1 rounded truncate border border-l-2 cursor-pointer pointer-events-auto flex items-center justify-between
                                    ${task.status === 'done' ? 'bg-emerald-50 border-emerald-200 border-l-emerald-500 text-emerald-700' :
                                        task.status === 'review' ? 'bg-amber-50 border-amber-200 border-l-amber-500 text-amber-700' :
                                            'bg-white border-slate-200 border-l-indigo-500 text-slate-700 shadow-sm'}
                                `}
                                title={task.title}
                                onClick={(e) => { e.stopPropagation(); handleOpenTask(task); }}
                            >
                                <span className="truncate">{task.title}</span>
                                {isLocked && <Lock size={8} className="text-red-500 flex-shrink-0 ml-1" />}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-800 capitalize">{monthName}</h2>
                    <div className="flex gap-1">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded text-slate-500">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded text-slate-500">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => alert("Próximamente: Importar CSV")}
                        className="text-xs font-bold text-brand-power/50 hover:text-brand-power flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200"
                    >
                        <FileText size={12} /> Importar CSV
                    </button>
                    <button
                        onClick={() => alert("Próximamente: Generar con IA")}
                        className="text-xs font-bold text-brand-accent hover:text-brand-accent/80 flex items-center gap-1 bg-brand-accent/5 px-2 py-1 rounded-lg border border-brand-accent/20"
                    >
                        <Edit3 size={12} /> Generar Ideas (IA)
                    </button>
                    <div className="text-xs text-slate-400 font-medium border-l border-slate-200 pl-3">
                        {tasks.filter(t => t.due_date).length} Tareas
                    </div>
                </div>
            </div>

            {/* Grid Header */}
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                    <div key={d} className="py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {d}
                    </div>
                ))}
            </div>

            {/* Grid Body */}
            <div className="grid grid-cols-7">
                {calendarGrid}
            </div>

            {/* Task Detail Modal */}
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
        </div>
    );
};

