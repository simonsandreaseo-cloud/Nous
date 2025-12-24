import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Task, Project, TaskService } from '../../lib/task_manager';
import { ContentService, ContentItem } from '../../lib/ContentService';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Lock, Unlock, User, Calendar as CalIcon, Edit3, X, FileText, Sparkles, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import TaskDetailModal from './TaskDetailModal';
import { ProjectSettingsModal } from './ProjectSettingsModal';
import { GoalTrackingWidget } from './GoalTrackingWidget';
import { ContentPerformanceDashboard } from './ContentPerformanceDashboard';

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
    const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
    const [showSettings, setShowSettings] = useState(false);

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
            const newTask = await TaskService.createTask(projectId, {
                title,
                status: 'idea',
                type: 'content',
                due_date: dueDate,
                priority: 'medium'
            });
            onTaskUpdate();
            // Open modal immediately
            if (newTask) {
                setSelectedTask(newTask as ContentItem);
            }
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

    const [isCreating, setIsCreating] = useState(false);

    const handlePaste = async (e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData('text');
        if (!text) return;

        const rows = text.split(/\r?\n/).filter(r => r.trim());
        const isTabular = text.includes('\t') || rows.length > 1;

        // If NOT tabular and focused on input, allow default behavior (paste text into input)
        if (!isTabular) {
            const tagName = (e.target as HTMLElement).tagName;
            if (tagName === 'INPUT' || tagName === 'TEXTAREA') return;
        }

        // If tabular, we intercept even if focused on input
        if (isTabular) {
            e.preventDefault();
            if (!confirm(`Se han detectado ${rows.length} filas en el portapapeles. \n¿Deseas importarlas como nuevos contenidos?\n\nFormato esperado: Título | Estado | Fecha | Keywod | URL`)) return;

            setIsCreating(true);
            try {
                let createdCount = 0;
                for (const row of rows) {
                    const cols = row.split('\t').map(c => c.trim());
                    if (!cols[0]) continue;

                    const title = cols[0];
                    let status = 'idea';
                    if (cols[1]) {
                        const s = cols[1].toLowerCase();
                        if (['todo', 'por hacer'].includes(s)) status = 'todo';
                        else if (['in_progress', 'en progreso', 'working'].includes(s)) status = 'in_progress';
                        else if (['review', 'revisión', 'revision'].includes(s)) status = 'review';
                        else if (['done', 'publicado', 'finalizado'].includes(s)) status = 'done';
                    }

                    let dueDate = null;
                    if (cols[2]) {
                        const d = new Date(cols[2]);
                        if (!isNaN(d.getTime())) dueDate = d.toISOString();
                    }

                    await TaskService.createTask(projectId, {
                        title,
                        status: status as any,
                        type: 'content',
                        due_date: dueDate || new Date().toISOString(),
                        priority: 'medium',
                        target_keyword: cols[3] || '',
                        secondary_url: cols[4] || ''
                    });
                    createdCount++;
                }

                onTaskUpdate();
                alert(`${createdCount} contenidos creados exitosamente.`);
            } catch (error: any) {
                console.error("Error importing tasks:", error);
                alert("Hubo un error al importar algunos items: " + error.message);
            } finally {
                setIsCreating(false);
            }
        }
    };

    const handleQuickAdd = async () => {
        const title = prompt("Título del nuevo contenido:");
        if (!title) return;

        try {
            await TaskService.createTask(projectId, {
                title,
                status: 'idea',
                type: 'content',
                due_date: new Date().toISOString(),
                priority: 'medium'
            });
            onTaskUpdate();
        } catch (e: any) {
            alert("Error al crear: " + e.message);
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
        <div
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative outline-none"
            onPaste={viewMode === 'table' ? handlePaste : undefined}
            tabIndex={0}
        >
            {isCreating && (
                <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center flex-col gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="text-sm font-bold text-indigo-600">Importando contenidos...</span>
                </div>
            )}
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                    {/* View Toggles */}
                    <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-1.5 rounded transition-all ${viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Vista Calendario"
                        >
                            <CalIcon size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded transition-all ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Vista Tabla"
                        >
                            <FileText size={16} />
                        </button>
                    </div>

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
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
                    {viewMode === 'table' && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 hidden lg:inline-block mr-2">
                                💡 Tip: Pega filas de Excel/Sheets (Título | Estado | Fecha...)
                            </span>
                            <button
                                onClick={handleQuickAdd}
                                className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                            >
                                <Plus size={14} /> Agregar Contenido
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => alert("Próximamente: Importar CSV")}
                        className="text-xs font-bold text-brand-power/50 hover:text-brand-power flex items-center gap-1 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200 hidden md:flex"
                    >
                        <FileText size={12} /> Importar CSV
                    </button>
                    <button
                        onClick={() => alert("Próximamente: Generar con IA")}
                        className="text-xs font-bold text-brand-accent hover:text-brand-accent/80 flex items-center gap-1 bg-brand-accent/5 px-2 py-1.5 rounded-lg border border-brand-accent/20 hidden md:flex"
                    >
                        <Edit3 size={12} /> Sugerencias IA
                    </button>
                    {project?.role === 'owner' || project?.role === 'admin' ? (
                        <button
                            onClick={() => setShowSettings(true)}
                            className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200"
                            title="Configurar Categorías y Objetivos"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                    ) : null}
                    <div className="text-xs text-slate-400 font-medium border-l border-slate-200 pl-3">
                        {tasks.filter(t => t.due_date).length} Tareas
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="px-4 pt-4">
                {project && <ContentPerformanceDashboard project={project} tasks={tasks} />}
                <GoalTrackingWidget project={project} tasks={tasks} currentDate={currentDate} />
            </div>

            {viewMode === 'calendar' ? (
                <>
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
                </>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[30%]">Título</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Palabra Clave</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">URL Objetivo</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[50px]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tasks
                                .filter(t => t.type === 'content')
                                .sort((a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime())
                                .map(task => {
                                    const isLocked = ContentService.isLocked(task as ContentItem, user?.id || '');

                                    const updateField = async (field: keyof Task, value: any) => {
                                        try {
                                            await TaskService.updateTask(task.id, { [field]: value });
                                            onTaskUpdate();
                                        } catch (e: any) {
                                            alert(`Error al actualizar ${field}: ${e.message}`);
                                        }
                                    };

                                    return (
                                        <tr key={task.id} className="hover:bg-slate-50 group transition-colors">
                                            <td className="p-3">
                                                <input
                                                    className="w-full bg-transparent border-transparent border-b hover:border-slate-300 focus:border-brand-accent focus:ring-0 text-sm font-medium text-slate-700 transition-colors py-1"
                                                    defaultValue={task.title}
                                                    onBlur={(e) => {
                                                        if (e.target.value !== task.title) updateField('title', e.target.value);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                                    }}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <select
                                                    value={task.status}
                                                    onChange={(e) => updateField('status', e.target.value)}
                                                    className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full border border-transparent hover:border-slate-200 cursor-pointer outline-none
                                                        ${task.status === 'done' ? 'bg-emerald-50 text-emerald-600' :
                                                            task.status === 'review' ? 'bg-amber-50 text-amber-600' :
                                                                task.status === 'in_progress' ? 'bg-blue-50 text-blue-600' :
                                                                    'bg-slate-100 text-slate-500'}`}
                                                >
                                                    <option value="idea">Idea</option>
                                                    <option value="todo">Por Hacer</option>
                                                    <option value="in_progress">En Progreso</option>
                                                    <option value="review">Revisión</option>
                                                    <option value="done">Publicado</option>
                                                </select>
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    type="date"
                                                    className="bg-transparent text-xs text-slate-500 font-medium outline-none hover:text-brand-power cursor-pointer"
                                                    value={task.due_date ? new Date(task.due_date).toLocaleDateString('en-CA') : ''}
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            const [y, m, d] = e.target.value.split('-').map(Number);
                                                            // Keep time if exists or default to noon
                                                            const originalDate = task.due_date ? new Date(task.due_date) : new Date(y, m - 1, d, 12, 0, 0);
                                                            const newDate = new Date(y, m - 1, d, originalDate.getHours(), originalDate.getMinutes());
                                                            updateField('due_date', newDate.toISOString());
                                                        }
                                                    }}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    {task.target_keyword ? (
                                                        <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-1 rounded-md border border-slate-200 truncate max-w-[150px]" title={task.target_keyword}>
                                                            {task.target_keyword}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-300 italic">--</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    className="w-full bg-transparent text-xs text-slate-500 font-mono outline-none border-b border-transparent hover:border-slate-300 focus:border-brand-accent transition-colors py-1 truncate"
                                                    placeholder="URL..."
                                                    defaultValue={task.secondary_url || ''}
                                                    onBlur={(e) => {
                                                        if (e.target.value !== (task.secondary_url || '')) updateField('secondary_url', e.target.value);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                                    }}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <button
                                                    onClick={() => handleOpenTask(task)}
                                                    className="p-1.5 text-slate-400 hover:text-brand-accent hover:bg-brand-accent/5 rounded-lg transition-colors"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            {tasks.filter(t => t.type === 'content').length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                                        No hay contenidos planificados. Usa el botón de abajo o pega filas desde Excel.
                                    </td>
                                </tr>
                            )}
                            {/* Add New Row Button at the bottom */}
                            <tr>
                                <td colSpan={6} className="p-2 border-t border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors text-center">
                                    <button
                                        onClick={async () => {
                                            try {
                                                await TaskService.createTask(projectId, {
                                                    title: '', // Empty title so user can type
                                                    status: 'idea',
                                                    type: 'content',
                                                    due_date: new Date().toISOString(),
                                                    priority: 'medium'
                                                });
                                                onTaskUpdate();
                                            } catch (e: any) { alert("Error al crear fila: " + e.message); }
                                        }}
                                        className="w-full py-2 text-xs font-bold text-slate-400 hover:text-indigo-600 border border-dashed border-slate-300 hover:border-indigo-300 rounded-lg flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Plus size={14} /> Agregar Fila Vacía (Click para pegar aquí)
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

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

            {/* Project Settings Modal */}
            {project && (
                <ProjectSettingsModal
                    project={project}
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                    onUpdate={onTaskUpdate}
                />
            )}
        </div>
    );
};

