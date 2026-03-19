"use client";

import React, { useEffect, useState } from "react";
import { TopBar } from "@/components/office/TopBar";
import { useProjectStore } from "@/store/useProjectStore";
import { supabase } from "@/lib/supabase";
import { 
    Layout, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Coffee, 
    ArrowRight,
    Search,
    Filter,
    PlayCircle
} from "lucide-react";

export default function MyDeskPage() {
    const { tasks, isLoading, fetchPersonalTasks, assignTask, updateTask, activeProjectIds } = useProjectStore();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [availableTasks, setAvailableTasks] = useState<any[]>([]);
    const [view, setView] = useState<'my-tasks' | 'available' | 'completed'>('my-tasks');

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setCurrentUser(session.user);
                await fetchPersonalTasks();
            }
        };
        init();
    }, []);

    // Fetch available tasks when active projects change
    useEffect(() => {
        if (activeProjectIds.length === 0) return;
        
        const fetchAvailable = async () => {
            const { data } = await supabase
                .from('tasks')
                .select('*, projects(name)')
                .is('assigned_to', null)
                .in('project_id', activeProjectIds)
                .neq('status', 'done')
                .limit(10);
            
            if (data) setAvailableTasks(data);
        };
        
        fetchAvailable();
    }, [activeProjectIds]);

    const handleTakeTask = async (taskId: string) => {
        if (!currentUser) return;
        await assignTask(taskId, currentUser.id);
        // Refresh local available list
        setAvailableTasks(prev => prev.filter(t => t.id !== taskId));
    };

    const myActiveTasks = tasks.filter(t => t.status !== 'done');
    const myCompletedTasks = tasks.filter(t => t.status === 'done');

    return (
        <div className="flex h-screen w-screen bg-[var(--color-nous-mist)]/5 overflow-hidden relative">
            <div className="flex flex-col flex-1 z-10 relative">
                <TopBar />

                <div className="flex flex-1 overflow-hidden p-6 gap-6">
                    {/* Left Stats/Nav Panel */}
                    <div className="w-80 flex flex-col gap-6">
                        <div className="glass-panel-dark p-6 rounded-[2rem] text-white flex flex-col justify-between h-48 relative overflow-hidden">
                            <div className="z-10">
                                <h2 className="text-sm font-black uppercase tracking-widest opacity-60">Tu Productividad</h2>
                                <p className="text-4xl font-light mt-2">{myCompletedTasks.length}</p>
                                <p className="text-[10px] uppercase font-bold text-[var(--color-nous-mint)] mt-1">Tareas Completadas</p>
                            </div>
                            <div className="z-10 flex gap-4 mt-4">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold">{myActiveTasks.length}</span>
                                    <span className="text-[9px] uppercase opacity-60">Activas</span>
                                </div>
                                <div className="flex flex-col border-l border-white/20 pl-4">
                                    <span className="text-xs font-bold">{availableTasks.length}</span>
                                    <span className="text-[9px] uppercase opacity-60">Disponibles</span>
                                </div>
                            </div>
                            <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12">
                                <CheckCircle2 size={120} />
                            </div>
                        </div>

                        <div className="glass-panel border border-hairline bg-white/40 rounded-[2rem] p-4 flex flex-col gap-2">
                            <NavButton 
                                active={view === 'my-tasks'} 
                                onClick={() => setView('my-tasks')}
                                icon={<Layout size={18} />} 
                                label="Mis Tareas" 
                                count={myActiveTasks.length}
                            />
                            <NavButton 
                                active={view === 'available'} 
                                onClick={() => setView('available')}
                                icon={<PlayCircle size={18} />} 
                                label="Pool de Tareas" 
                                count={availableTasks.length}
                            />
                            <NavButton 
                                active={view === 'completed'} 
                                onClick={() => setView('completed')}
                                icon={<CheckCircle2 size={18} />} 
                                label="Historial" 
                                count={myCompletedTasks.length}
                            />
                        </div>
                    </div>

                    {/* Main Workspace Area */}
                    <div className="flex-1 glass-panel border border-hairline bg-white/40 rounded-[2rem] flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-hairline flex items-center justify-between">
                            <h2 className="text-lg font-light text-slate-800">
                                {view === 'my-tasks' ? 'Trabajo en Curso' : 
                                 view === 'available' ? 'Tareas Disponibles para Tomar' : 
                                 'Tu Legado en Nous'}
                            </h2>
                            <div className="flex gap-2">
                                <div className="px-3 py-1.5 bg-white/60 rounded-full border border-hairline flex items-center gap-2 text-xs text-slate-400">
                                    <Search size={14} />
                                    Buscar...
                                </div>
                                <div className="p-1.5 bg-white/60 rounded-full border border-hairline text-slate-400">
                                    <Filter size={14} />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200">
                            {view === 'my-tasks' && (
                                <div className="space-y-3">
                                    {myActiveTasks.length === 0 ? (
                                        <EmptyDeskMessage 
                                            icon={<Coffee size={40} />} 
                                            title="Escritorio despejado" 
                                            subtitle="No tienes tareas activas. Revisa el pool para tomar una nueva." 
                                            action={() => setView('available')}
                                            actionLabel="Ir al Pool de Tareas"
                                        />
                                    ) : (
                                        myActiveTasks.map(task => (
                                            <TaskRow key={task.id} task={task} type="active" onUpdate={updateTask} />
                                        ))
                                    )}
                                </div>
                            )}

                            {view === 'available' && (
                                <div className="space-y-3">
                                    {availableTasks.length === 0 ? (
                                        <EmptyDeskMessage 
                                            icon={<AlertCircle size={40} />} 
                                            title="Pool Vacío" 
                                            subtitle="No hay tareas disponibles en tus proyectos activos. Contacta con tu Manager." 
                                        />
                                    ) : (
                                        availableTasks.map(task => (
                                            <TaskRow key={task.id} task={task} type="available" onTake={() => handleTakeTask(task.id)} />
                                        ))
                                    )}
                                </div>
                            )}

                            {view === 'completed' && (
                                <div className="space-y-3">
                                    {myCompletedTasks.map(task => (
                                        <TaskRow key={task.id} task={task} type="completed" />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function NavButton({ active, onClick, icon, label, count }: any) {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
                active ? 'bg-[var(--color-nous-mist)] text-white shadow-lg' : 'hover:bg-white text-slate-500 hover:shadow-sm'
            }`}
        >
            <div className="flex items-center gap-3">
                {icon}
                <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
            </div>
            {count > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {count}
                </span>
            )}
        </button>
    );
}

function TaskRow({ task, type, onTake, onUpdate }: any) {
    const getPriorityColor = () => {
        switch(task.priority) {
            case 'high': return 'bg-orange-400';
            case 'critical': return 'bg-red-500';
            default: return 'bg-slate-300';
        }
    };

    return (
        <div className="group flex items-center justify-between p-4 bg-white/60 hover:bg-white border border-hairline rounded-2xl transition-all hover:shadow-md glass-panel-hover">
            <div className="flex items-center gap-4 flex-1">
                <div className={`w-1 h-8 rounded-full ${getPriorityColor()}`}></div>
                <div>
                    <h3 className="text-sm font-medium text-slate-800">{task.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{task.content_type || 'SEO Task'}</span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock size={10} />
                            {task.scheduled_date ? new Date(task.scheduled_date).toLocaleDateString() : 'Sin fecha'}
                        </div>
                        {task.projects?.name && (
                            <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full text-slate-500 font-medium">#{task.projects.name}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {type === 'available' && (
                    <button 
                        onClick={onTake}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--color-nous-mint)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg transition-all"
                    >
                        Tomar Tarea
                        <ArrowRight size={12} />
                    </button>
                )}
                {type === 'active' && (
                    <div className="flex items-center gap-2">
                        <select 
                            value={task.status}
                            onChange={(e) => onUpdate(task.id, { status: e.target.value })}
                            className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 focus:outline-none"
                        >
                            <option value="todo">Pendiente</option>
                            <option value="in_progress">En Curso</option>
                            <option value="review">Revisión</option>
                            <option value="done">Completada</option>
                        </select>
                    </div>
                )}
                {type === 'completed' && (
                    <CheckCircle2 size={18} className="text-[var(--color-nous-mint)]" />
                )}
            </div>
        </div>
    );
}

function EmptyDeskMessage({ icon, title, subtitle, action, actionLabel }: any) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
            <div className="mb-4 text-slate-300">
                {icon}
            </div>
            <h3 className="text-slate-800 font-light text-lg">{title}</h3>
            <p className="text-slate-400 text-sm max-w-xs mt-2">{subtitle}</p>
            {action && (
                <button 
                    onClick={action}
                    className="mt-6 text-[10px] font-black uppercase tracking-widest text-[var(--color-nous-mist)] hover:underline"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
