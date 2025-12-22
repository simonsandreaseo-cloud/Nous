import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ProjectService, Project, ProjectMember, TaskService, Task } from '../../lib/task_manager';
import ToolWrapper from '../../components/layout/ToolWrapper';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout, Calendar, List, Settings, Plus, Users, Search, Filter, Share2, Mail } from 'lucide-react';

import TaskBoard from '../../components/projects/TaskBoard';
import { SitemapManager } from '../../components/projects/SitemapManager';
import { EditorialCalendar } from '../../components/projects/EditorialCalendar';

const ProjectSettings = ({ project, members, onInvite }: { project: Project, members: any, onInvite: (email: string) => void }) => {
    const [email, setEmail] = useState('');
    return (
        <div className="max-w-2xl bg-white p-6 rounded-2xl shadow-sm border border-brand-power/5">
            <h3 className="text-lg font-bold text-brand-power mb-4">Gestionar Acceso</h3>
            <div className="flex gap-2 mb-6">
                <input
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="flex-1 bg-brand-soft/20 border border-brand-power/10 rounded-lg px-4 outline-none focus:border-brand-accent"
                />
                <button
                    onClick={() => { onInvite(email); setEmail('') }}
                    className="px-4 py-2 bg-brand-power text-brand-white rounded-lg font-bold text-xs uppercase"
                >
                    Invitar
                </button>
            </div>

            <div className="space-y-4">
                {members.members.map((m: any) => (
                    <div key={m.id} className="flex justify-between items-center p-3 hover:bg-brand-soft/10 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-accent text-white flex items-center justify-center font-bold">
                                {m.user?.email?.[0].toUpperCase()}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-brand-power">{m.user?.email}</div>
                                <div className="text-xs text-brand-power/50 capitalize">{m.role} • {m.status}</div>
                            </div>
                        </div>
                    </div>
                ))}
                {members.invites.map((inv: any) => (
                    <div key={inv.id} className="flex justify-between items-center p-3 opacity-60">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold">
                                <Mail size={14} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-brand-power">{inv.email}</div>
                                <div className="text-xs text-brand-power/50 capitalize">{inv.role} • Pendiente</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
};

const ProjectDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const projectId = id ? parseInt(id) : 0;
    const { user } = useAuth();

    const [project, setProject] = useState<Project | null>(null);
    const [members, setMembers] = useState<{ members: ProjectMember[], invites: any[] }>({ members: [], invites: [] });
    const [tasks, setTasks] = useState<Task[]>([]);

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'board' | 'list' | 'calendar' | 'sitemap' | 'settings'>('board');

    useEffect(() => {
        if (projectId && user) loadData();
    }, [projectId, user]);

    const loadData = async () => {
        try {
            const [pData, mData, tData] = await Promise.all([
                ProjectService.getProjectDetails(projectId),
                ProjectService.getMembers(projectId),
                TaskService.getTasks(projectId)
            ]);
            setProject(pData);
            setMembers(mData as any);
            setTasks(tData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (email: string) => {
        try {
            await ProjectService.inviteMember(projectId, email);
            loadData();
            alert("Invitación enviada");
        } catch (e: any) {
            alert(e.message);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando proyecto...</div>;
    if (!project) return <div className="min-h-screen flex items-center justify-center">Proyecto no encontrado</div>;

    return (
        <ToolWrapper backTo="/proyectos" backLabel="Todos los Proyectos">
            <div className="max-w-7xl mx-auto pb-20">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-bold text-brand-power">{project.name}</h1>
                            {project.role && (
                                <span className="px-2 py-1 bg-brand-soft rounded text-[10px] font-bold uppercase tracking-widest text-brand-power/60">
                                    {project.role}
                                </span>
                            )}
                        </div>
                        <p className="text-brand-power/50 text-sm max-w-2xl">{project.description}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2 mr-4">
                            {members.members.slice(0, 4).map((m: any) => (
                                <div key={m.id} className="w-8 h-8 rounded-full border-2 border-white bg-brand-accent text-white flex items-center justify-center text-xs font-bold" title={m.user?.email}>
                                    {m.user?.email?.[0].toUpperCase()}
                                </div>
                            ))}
                            {members.members.length > 4 && (
                                <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold">
                                    +{members.members.length - 4}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className="bg-brand-white border border-brand-power/10 text-brand-power px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-brand-soft transition-colors flex items-center gap-2"
                        >
                            <Share2 size={14} /> Compartir
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-6 border-b border-brand-power/10 mb-8 overflow-x-auto">
                    <TabButton active={activeTab === 'board'} onClick={() => setActiveTab('board')} icon={<Layout size={16} />} label="Tablero" />
                    <TabButton active={activeTab === 'list'} onClick={() => setActiveTab('list')} icon={<List size={16} />} label="Lista" />
                    <TabButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<Calendar size={16} />} label="Calendario" />
                    <TabButton active={activeTab === 'sitemap'} onClick={() => setActiveTab('sitemap')} icon={<Search size={16} />} label="Sitemap" />
                    <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={16} />} label="Configuración" />
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'board' && <TaskBoard tasks={tasks} projectId={projectId} onTaskUpdate={loadData} />}
                        {activeTab === 'list' && <div>List View Placeholder</div>}
                        {activeTab === 'calendar' && <EditorialCalendar projectId={projectId} tasks={tasks} onTaskUpdate={loadData} />}
                        {activeTab === 'sitemap' && <SitemapManager projectId={projectId} />}
                        {activeTab === 'settings' && <ProjectSettings project={project} members={members} onInvite={handleInvite} />}
                    </motion.div>
                </AnimatePresence>

            </div>
        </ToolWrapper>
    );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 pb-3 border-b-2 transition-all ${active ? 'border-brand-accent text-brand-power font-bold' : 'border-transparent text-brand-power/40 font-medium hover:text-brand-power'}`}
    >
        {icon}
        <span className="text-sm">{label}</span>
    </button>
);

export default ProjectDetail;
