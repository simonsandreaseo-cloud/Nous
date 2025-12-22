import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Task } from '../../lib/task_manager';

interface EditorialCalendarProps {
    projectId: string | number;
    tasks: Task[];
    onTaskUpdate: () => void;
}

export const EditorialCalendar: React.FC<EditorialCalendarProps> = ({ projectId, tasks, onTaskUpdate }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

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
        const title = prompt(`New Task for ${day} ${monthName}:`);
        if (!title) return;

        // Construct date string YYYY-MM-DD
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dueDate = `${year}-${month}-${dayStr}`;

        try {
            // We need to use TaskService.createTask but it requires projectId
            // And we are inside a component. We'll use supabase directly for speed or import TaskService
            // Since TaskService is imported in parent, let's use supabase here for simplicity or props?
            // Actually better to use supabase directly as I imported it.
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const { error } = await supabase.from('tasks').insert({
                project_id: projectId,
                title,
                status: 'idea',
                due_date: dueDate,
                created_by: user.id
            });

            if (error) throw error;
            onTaskUpdate();
        } catch (e: any) {
            alert(e.message);
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
                    {dayTasks.map(task => (
                        <div
                            key={task.id}
                            className={`text-[10px] px-1.5 py-1 rounded truncate border border-l-2 cursor-pointer pointer-events-auto
                                ${task.status === 'done' ? 'bg-emerald-50 border-emerald-200 border-l-emerald-500 text-emerald-700' :
                                    task.status === 'review' ? 'bg-amber-50 border-amber-200 border-l-amber-500 text-amber-700' :
                                        'bg-white border-slate-200 border-l-indigo-500 text-slate-700 shadow-sm'}
                            `}
                            title={task.title}
                            onClick={(e) => { e.stopPropagation(); /* Maybe open detail modal future */ }}
                        >
                            {task.title}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                <div className="text-xs text-slate-400 font-medium">
                    {tasks.filter(t => t.due_date).length} Tareas Programadas
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
        </div>
    );
};
