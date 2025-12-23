import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Project, Task } from '../../lib/task_manager';
import { Layout, Calendar, Settings, Search, Users, BarChart2 } from 'lucide-react';
import { GscOverview } from '../../components/projects/GscOverview';
import { ChatPanel } from '../../components/chat/ChatPanel';

const ProjectDashboard: React.FC = () => {
    const { project, tasks } = useOutletContext<{ project: Project, tasks: Task[] }>();
    const navigate = useNavigate();
    const [isChatOpen, setIsChatOpen] = React.useState(true);

    // Calculate Summary Stats from context data
    const taskList = tasks?.filter(t => t.type === 'task' || !t.type) || [];
    const contentList = tasks?.filter(t => t.type === 'content') || [];

    const taskStats = {
        todo: taskList.filter(t => t.status === 'todo').length,
        inProgress: taskList.filter(t => t.status === 'in_progress').length,
        done: taskList.filter(t => t.status === 'done').length,
        total: taskList.length
    };

    const contentStats = {
        todo: contentList.filter(t => t.status === 'todo' || t.status === 'idea').length,
        inProgress: contentList.filter(t => t.status === 'in_progress' || t.status === 'review').length,
        done: contentList.filter(t => t.status === 'done').length,
        total: contentList.length
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Main Layout - Flex Container */}
            <div className="flex gap-6 relative">

                {/* Left Side: Content */}
                <div className="flex-1 min-w-0 space-y-8">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-brand-power">Resumen del Proyecto</h1>
                            <p className="text-brand-power/50 text-sm">Vista general de actividad y estado.</p>
                        </div>
                        {!isChatOpen && (
                            <button
                                onClick={() => setIsChatOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <Users size={18} />
                                <span className="text-sm font-medium">Chat</span>
                            </button>
                        )}
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

                            <div className="flex justify-between items-center mb-6 relative z-10">
                                <h3 className="text-lg font-bold text-brand-power group-hover:text-brand-accent transition-colors">Contenidos</h3>
                                <div className="w-8 h-8 rounded-lg bg-brand-soft/50 flex items-center justify-center text-brand-power/40 group-hover:bg-brand-accent/10 group-hover:text-brand-accent transition-colors">
                                    <Calendar size={18} />
                                </div>
                            </div>

                            <div className="flex justify-between items-end relative z-10">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-brand-power">{contentStats.todo}</div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Planificado</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-500">{contentStats.inProgress}</div>
                                    <div className="text-[10px] uppercase font-bold text-blue-400">En Proceso</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-emerald-500">{contentStats.done}</div>
                                    <div className="text-[10px] uppercase font-bold text-emerald-400">Publicado</div>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-brand-power/5 flex justify-between items-center text-xs font-medium relative z-10">
                                <span className="text-brand-power/50">{contentStats.total} contenidos en total</span>
                                <span className="text-brand-accent opacity-0 group-hover:opacity-100 transition-opacity">Ver cronograma &rarr;</span>
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
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* GSC Overview Section */}
                    {project.gsc_property_url && (
                        <div className="mt-8">
                            <GscOverview project={project} />
                        </div>
                    )}
                </div>

                {/* Right Side: Chat Panel */}
                <div className={`transition-all duration-300 ease-in-out ${isChatOpen ? 'w-96 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-4 overflow-hidden'}`}>
                    <div className="sticky top-0 h-[calc(100vh-120px)]">
                        <ChatPanel
                            projectId={Number(project.id)}
                            isOpen={isChatOpen}
                            onClose={() => setIsChatOpen(false)}
                        />
                    </div>
                </div>
            </div>        </div>
    );
};

export default ProjectDashboard;
