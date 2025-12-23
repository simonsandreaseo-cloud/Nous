import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Project, Task } from '../../lib/task_manager';
import { Layout, Calendar, Settings, Search, Users, BarChart2 } from 'lucide-react';

const ProjectDashboard: React.FC = () => {
    const { project, tasks } = useOutletContext<{ project: Project, tasks: Task[] }>();
    const navigate = useNavigate();

    // Calculate Summary Stats from context data
    const taskStats = tasks ? {
        todo: tasks.filter(t => t.status === 'todo').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        done: tasks.filter(t => t.status === 'done').length,
        total: tasks.length
    } : { todo: 0, inProgress: 0, done: 0, total: 0 };

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-brand-power">Resumen del Proyecto</h1>
                <p className="text-brand-power/50 text-sm">Vista general de actividad y estado.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Task Summary Card */}
                <div
                    onClick={() => navigate('../tareas')}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-brand-power/5 cursor-pointer hover:shadow-lg hover:translate-y-[-2px] transition-all group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Layout size={64} className="text-brand-accent transform rotate-12" />
                    </div>

                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h3 className="text-lg font-bold text-brand-power group-hover:text-brand-accent transition-colors">Tareas</h3>
                        <div className="w-8 h-8 rounded-lg bg-brand-soft/50 flex items-center justify-center text-brand-power/40 group-hover:bg-brand-accent/10 group-hover:text-brand-accent transition-colors">
                            <Layout size={18} />
                        </div>
                    </div>

                    <div className="flex justify-between items-end relative z-10">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-brand-power">{taskStats.todo}</div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Por Hacer</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-500">{taskStats.inProgress}</div>
                            <div className="text-[10px] uppercase font-bold text-blue-400">En Curso</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-500">{taskStats.done}</div>
                            <div className="text-[10px] uppercase font-bold text-emerald-400">Hecho</div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-brand-power/5 flex justify-between items-center text-xs font-medium relative z-10">
                        <span className="text-brand-power/50">{taskStats.total} tareas en total</span>
                        <span className="text-brand-accent opacity-0 group-hover:opacity-100 transition-opacity">Ver tablero &rarr;</span>
                    </div>
                </div>

                {/* Calendar Summary */}
                <div
                    onClick={() => navigate('../calendario')}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-brand-power/5 cursor-pointer hover:shadow-lg hover:translate-y-[-2px] transition-all group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Calendar size={64} className="text-brand-accent transform -rotate-12" />
                    </div>

                    <div className="flex justify-between items-center mb-4 relative z-10">
                        <h3 className="text-lg font-bold text-brand-power group-hover:text-brand-accent transition-colors">Calendario</h3>
                        <div className="w-8 h-8 rounded-lg bg-brand-soft/50 flex items-center justify-center text-brand-power/40 group-hover:bg-brand-accent/10 group-hover:text-brand-accent transition-colors">
                            <Calendar size={18} />
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center h-24 text-brand-power/40 text-sm font-medium relative z-10 bg-brand-soft/5 rounded-xl border border-dashed border-brand-power/5 group-hover:border-brand-accent/20 transition-colors">
                        <span>Planificación Editorial</span>
                        <span className="text-xs opacity-60 mt-1">Ver cronograma</span>
                    </div>
                </div>

                {/* Sitemap / Analytics Summary */}
                <div
                    onClick={() => navigate('../configuracion')}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-brand-power/5 cursor-pointer hover:shadow-lg hover:translate-y-[-2px] transition-all group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Settings size={64} className="text-brand-accent" />
                    </div>

                    <div className="flex justify-between items-center mb-4 relative z-10">
                        <h3 className="text-lg font-bold text-brand-power group-hover:text-brand-accent transition-colors">Configuración</h3>
                        <div className="w-8 h-8 rounded-lg bg-brand-soft/50 flex items-center justify-center text-brand-power/40 group-hover:bg-brand-accent/10 group-hover:text-brand-accent transition-colors">
                            <Settings size={18} />
                        </div>
                    </div>

                    <div className="space-y-3 relative z-10 mt-2">
                        <div className={`flex items-center gap-3 p-3 rounded-xl border ${project.gsc_property_url ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${project.gsc_property_url ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-xs uppercase tracking-wider">{project.gsc_property_url ? 'GSC Conectado' : 'Sin Conexión GSC'}</div>
                                {project.gsc_property_url && <div className="text-[10px] opacity-70 truncate">{project.gsc_property_url}</div>}
                            </div>
                            <BarChart2 size={16} className="opacity-50" />
                        </div>

                        <div className="flex items-center gap-2 text-xs font-bold text-brand-power/60 pl-1">
                            <Users size={14} />
                            <span>1 Miembro (Propietario)</span>
                            {/* NOTE: We don't have member count in context yet, safe default or add if critical */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDashboard;
