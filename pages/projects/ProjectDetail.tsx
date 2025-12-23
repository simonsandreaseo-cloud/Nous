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

import { GscService } from '../../services/gscService';

const ProjectSettings = ({ project, members, onInvite, onUpdate }: { project: Project, members: any, onInvite: (email: string) => void, onUpdate: () => void }) => {
    const [email, setEmail] = useState('');
    const [gscSites, setGscSites] = useState<any[]>([]);
    const [loadingGsc, setLoadingGsc] = useState(false);
    const [selectedSite, setSelectedSite] = useState(project.gsc_property_url || '');

    const handleLoadGsc = async () => {
        setLoadingGsc(true);
        try {
            const sites = await GscService.getSites();
            setGscSites(sites);
        } catch (e: any) {
            alert("Error cargando GSC: " + e.message);
        } finally {
            setLoadingGsc(false);
        }
    };

    const handleSaveGsc = async () => {
        if (!selectedSite) return;
        try {
            await ProjectService.updateProject(project.id, { gsc_property_url: selectedSite });
            onUpdate();
            alert("Propiedad GSC guardada correctamente.");
        } catch (e: any) {
            alert("Error guardando proyecto: " + e.message);
        }
    };

    return (
        <div className="max-w-2xl bg-white p-6 rounded-2xl shadow-sm border border-brand-power/5">
            <h3 className="text-lg font-bold text-brand-power mb-4">Integraciones</h3>
            <div className="mb-8 p-4 bg-brand-soft/10 rounded-xl border border-brand-power/5">
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Search className="w-5 h-5 text-google-blue" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-brand-power">Google Search Console</h4>
                        <p className="text-xs text-brand-power/50">Conecta tu propiedad para sincronizar métricas SEO.</p>
                    </div>
                </div>

                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-brand-power/60 uppercase mb-1 block">Propiedad Conectada</label>
                        {gscSites.length > 0 ? (
                            <select
                                value={selectedSite}
                                onChange={(e) => setSelectedSite(e.target.value)}
                                className="w-full bg-white border border-brand-power/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-accent appearance-none"
                            >
                                <option value="">Seleccionar Propiedad...</option>
                                {gscSites.map((s: any) => (
                                    <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl} ({s.permissionLevel})</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                value={selectedSite}
                                onChange={(e) => setSelectedSite(e.target.value)}
                                placeholder="https://ejemplo.com/"
                                className="w-full bg-white border border-brand-power/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-accent"
                            />
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleLoadGsc}
                            disabled={loadingGsc}
                            className="px-3 py-2 bg-white border border-brand-power/10 text-brand-power rounded-lg font-bold text-xs uppercase hover:bg-brand-soft transition-colors"
                        >
                            {loadingGsc ? '...' : (gscSites.length > 0 ? 'Refrescar' : 'Cargar Sitios')}
                        </button>
                        <button
                            onClick={handleSaveGsc}
                            className="px-3 py-2 bg-brand-power text-brand-white rounded-lg font-bold text-xs uppercase hover:bg-brand-power/90 transition-colors"
                        >
                            Guardar
                        </button>
                    </div>
                </div>
                {project.gsc_property_url && (
                    <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Conectado: {project.gsc_property_url}
                    </div>
                )}
            </div>

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

const ProjectOverview = ({ project, tasks, members, onNavigate }: any) => {
    const taskStats = {
        todo: tasks.filter((t: any) => t.status === 'todo').length,
        inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
        done: tasks.filter((t: any) => t.status === 'done').length,
        total: tasks.length
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Task Summary Card */}
            <div
                onClick={() => onNavigate('board')}
                className="bg-white p-6 rounded-2xl shadow-sm border border-brand-power/5 cursor-pointer hover:shadow-md transition-all group"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-brand-power group-hover:text-brand-accent transition-colors">Tareas</h3>
                    <Layout className="text-brand-power/20 group-hover:text-brand-accent transition-colors" />
                </div>
                <div className="flex gap-4">
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
                <div className="mt-4 pt-4 border-t border-brand-power/5 text-xs text-brand-power/50 font-medium">
                    {taskStats.total} tareas en total
                </div>
            </div>

            {/* Calendar Summary */}
            <div
                onClick={() => onNavigate('calendar')}
                className="bg-white p-6 rounded-2xl shadow-sm border border-brand-power/5 cursor-pointer hover:shadow-md transition-all group"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-brand-power group-hover:text-brand-accent transition-colors">Calendario</h3>
                    <Calendar className="text-brand-power/20 group-hover:text-brand-accent transition-colors" />
                </div>
                <div className="flex flex-col items-center justify-center h-20 text-brand-power/40 text-sm font-medium">
                    Ver Planificación Editorial
                </div>
            </div>

            {/* Sitemap Summary */}
            <div
                onClick={() => onNavigate('sitemap')}
                className="bg-white p-6 rounded-2xl shadow-sm border border-brand-power/5 cursor-pointer hover:shadow-md transition-all group"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-brand-power group-hover:text-brand-accent transition-colors">Sitemap</h3>
                    <Search className="text-brand-power/20 group-hover:text-brand-accent transition-colors" />
                </div>
                <div className="flex flex-col items-center justify-center h-20 text-brand-power/40 text-sm font-medium">
                    Gestionar URLs indexadas
                </div>
            </div>

            {/* Settings / Integrations Summary */}
            <div
                onClick={() => onNavigate('settings')}
                className="bg-white p-6 rounded-2xl shadow-sm border border-brand-power/5 cursor-pointer hover:shadow-md transition-all group"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-brand-power group-hover:text-brand-accent transition-colors">Configuración</h3>
                    <Settings className="text-brand-power/20 group-hover:text-brand-accent transition-colors" />
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-brand-power/70">
                        <span className={`w-2 h-2 rounded-full ${project.gsc_property_url ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
                        {project.gsc_property_url ? 'GSC Conectado' : 'Sin GSC'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-brand-power/70">
                        <Users size={14} />
                        {members.members.length} Miembros
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProjectDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const projectId = id || 0;
    const { user } = useAuth();

    const [project, setProject] = useState<Project | null>(null);
    const [members, setMembers] = useState<{ members: ProjectMember[], invites: any[] }>({ members: [], invites: [] });
    const [tasks, setTasks] = useState<Task[]>([]);

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'board' | 'list' | 'calendar' | 'sitemap' | 'settings'>('overview');

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmName, setDeleteConfirmName] = useState('');

    useEffect(() => {
        if (projectId && user) loadData();
    }, [projectId, user]);

    const loadData = async () => {
        try {
            // 1. Fetch Project Details first
            const pData = await ProjectService.getProjectDetails(projectId);
            setProject(pData);

            if (pData && pData.id) {
                // 2. Use resolved ID (UUID) for other calls
                const mData = await ProjectService.getMembers(pData.id);
                // Wrap task fetching to prevent total failure if one fails
                let tData: Task[] = [];
                try {
                    tData = await TaskService.getTasks(pData.id);
                } catch (e) { console.error("Error loading tasks", e); }

                setMembers(mData as any);
                setTasks(tData);
            }
        } catch (e) {
            console.error("Error loading project data:", e);
            if (e.message) console.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (email: string) => {
        if (!project) return;
        try {
            await ProjectService.inviteMember(project.id, email);
            loadData();
            alert("Invitación enviada");
        } catch (e: any) {
            // Translate common RLS error if possible, though detailed message is good
            if (e.message?.includes('row-level security')) {
                alert("Error de permisos: No tienes autorización para invitar miembros.");
            } else {
                alert(e.message);
            }
        }
    };

    const handleDeleteProject = async () => {
        if (!project) return;
        if (deleteConfirmName !== project.name) {
            alert("El nombre del proyecto no coincide");
            return;
        }

        try {
            await ProjectService.deleteProject(project.id);
            // Redirect to dashboard
            window.location.href = '/proyectos';
        } catch (e: any) {
            alert("Error eliminando proyecto: " + e.message);
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
                        className="min-h-[500px]"
                    >
                        {activeTab === 'board' && <TaskBoard tasks={tasks} projectId={project.id} onTaskUpdate={loadData} />}
                        {activeTab === 'list' && <div>List View Placeholder</div>}
                        {activeTab === 'calendar' && <EditorialCalendar projectId={project.id} tasks={tasks} onTaskUpdate={loadData} />}
                        {activeTab === 'sitemap' && <SitemapManager projectId={project.id} />}
                        {activeTab === 'settings' && (
                            <div className="space-y-8">
                                <ProjectSettings project={project} members={members} onInvite={handleInvite} onUpdate={loadData} />

                                {/* Danger Zone */}
                                <div className="max-w-2xl bg-red-50 p-6 rounded-2xl border border-red-100">
                                    <h3 className="text-lg font-bold text-red-800 mb-2">Zona de Peligro</h3>
                                    <p className="text-sm text-red-600 mb-4">Estas acciones no se pueden deshacer.</p>
                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs uppercase hover:bg-red-700 transition-colors"
                                    >
                                        Eliminar Proyecto
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Delete Modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-bold text-brand-power mb-4">¿Eliminar Proyecto?</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Esta acción eliminará permanentemente el proyecto <strong>{project.name}</strong> y todos sus datos asociados.
                            </p>
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                    Escribe "{project.name}" para confirmar
                                </label>
                                <input
                                    value={deleteConfirmName}
                                    onChange={e => setDeleteConfirmName(e.target.value)}
                                    placeholder={project.name}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 outline-none focus:border-red-500"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => { setShowDeleteModal(false); setDeleteConfirmName(''); }}
                                    className="px-4 py-2 text-gray-600 font-bold text-sm hover:bg-gray-100 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDeleteProject}
                                    disabled={deleteConfirmName !== project.name}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Confirmar Eliminación
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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

