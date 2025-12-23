import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useParams, Link, useNavigate } from 'react-router-dom';
import { Layout, Calendar, List, Settings, Search, BarChart2, Target, ArrowLeft, Menu, X } from 'lucide-react';
import { ProjectService, Project, TaskService, Task } from '../../lib/task_manager';

const ProjectLayout: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (id) loadData();
    }, [id]);

    const loadData = async () => {
        try {
            // Fetch Project first to get the ID (if slug is used in future, but assuming ID for now)
            const pData = await ProjectService.getProjectDetails(id!);
            setProject(pData);

            if (pData && pData.id) {
                const tData = await TaskService.getTasks(pData.id);
                setTasks(tData);
            }
        } catch (e) {
            console.error("Error loading project/tasks:", e);
        } finally {
            setLoading(false);
        }
    };

    // Explicit refresh function for children to call
    const refreshTasks = async () => {
        if (project?.id) {
            const tData = await TaskService.getTasks(project.id);
            setTasks(tData);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-brand-white text-brand-power font-bold">Cargando espacio de trabajo...</div>;
    if (!project) return <div className="min-h-screen flex items-center justify-center bg-brand-white text-brand-power font-bold">Proyecto no encontrado</div>;

    const navItems = [
        { path: 'dashboard', label: 'Resumen', icon: <Layout size={20} /> },
        { path: 'tareas', label: 'Tareas', icon: <List size={20} /> },
        { path: 'calendario', label: 'Calendario', icon: <Calendar size={20} /> },
        { path: 'estrategia', label: 'Estrategia', icon: <Target size={20} /> },
        { path: 'configuracion', label: 'Configuración', icon: <Settings size={20} /> },
    ];

    return (
        <div className="flex h-screen bg-brand-white overflow-hidden">
            {/* Sidebar Navigation */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-brand-power/5 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Project Header in Sidebar */}
                    <div className="p-6 border-b border-brand-power/5">
                        <Link to="/proyectos" className="flex items-center gap-2 text-brand-power/40 hover:text-brand-power text-xs font-bold uppercase tracking-widest mb-4 transition-colors">
                            <ArrowLeft size={12} /> Volver
                        </Link>
                        <h2 className="text-xl font-bold text-brand-power truncate" title={project.name}>{project.name}</h2>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 bg-brand-accent/10 text-brand-accent rounded text-[10px] font-bold uppercase tracking-wider">
                                {project.role || 'Member'}
                            </span>
                            {project.gsc_property_url && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500" title="GSC Conectado"></span>
                            )}
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path} // Relative link
                                onClick={() => setMobileMenuOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                        ? 'bg-brand-power text-white shadow-lg shadow-brand-power/20 scale-[1.02]'
                                        : 'text-brand-power/60 hover:bg-brand-soft/50 hover:text-brand-power'
                                    }`
                                }
                            >
                                {item.icon}
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Footer / User Info could go here */}
                    <div className="p-4 border-t border-brand-power/5">
                        <div className="text-[10px] text-brand-power/30 text-center font-bold uppercase tracking-widest">
                            SEO Workspace v1.0
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-brand-power/20 backdrop-blur-sm md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-brand-soft/20 relative">

                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-brand-power/5">
                    <h2 className="font-bold text-brand-power">{project.name}</h2>
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="p-2 text-brand-power hover:bg-brand-soft rounded-lg"
                    >
                        <Menu size={24} />
                    </button>
                </div>

                {/* Content Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <Outlet context={{ project, tasks, loadData, refreshTasks }} />
                </div>
            </main>
        </div>
    );
};

export default ProjectLayout;
