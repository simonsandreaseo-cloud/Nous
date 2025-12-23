import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ProjectService, Project } from '../../lib/task_manager';
import ToolWrapper from '../../components/layout/ToolWrapper';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Folder, Users, Search, ChevronRight, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GscService } from '../../services/gscService';
import ProjectCard from '../../components/projects/ProjectCard';

const ProjectsDashboard: React.FC = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);

    // New Project Form
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newGsc, setNewGsc] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const [gscSites, setGscSites] = useState<any[]>([]);
    const [isLoadingGsc, setIsLoadingGsc] = useState(false);

    useEffect(() => {
        if (user) loadProjects();
    }, [user]);

    const loadProjects = async () => {
        try {
            const data = await ProjectService.getProjects();
            setProjects(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadGsc = async () => {
        setIsLoadingGsc(true);
        try {
            const sites = await GscService.getSites();
            setGscSites(sites);
        } catch (e: any) {
            console.error("Error loading GSC in creation:", e);
        } finally {
            setIsLoadingGsc(false);
        }
    };

    const handleCreateProject = async () => {
        if (!newName.trim()) return alert("Nombre requerido");
        setIsCreating(true);
        try {
            await ProjectService.createProject(newName, newDesc, newGsc);
            setNewName('');
            setNewDesc('');
            setNewGsc('');
            setGscSites([]);
            setShowNewProjectModal(false);
            loadProjects();
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteProject = async (e: React.MouseEvent, project: Project) => {
        e.preventDefault();
        e.stopPropagation();

        if (confirm(`¿Estás seguro de que deseas eliminar el proyecto "${project.name}"?`)) {
            try {
                await ProjectService.deleteProject(project.id);
                loadProjects();
            } catch (e: any) {
                alert("Error eliminando proyecto: " + e.message);
            }
        }
    };

    return (
        <ToolWrapper backTo="/dashboard" backLabel="Volver al Dashboard">
            <div className="max-w-6xl mx-auto pb-20">
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h1 className="text-3xl font-bold text-brand-power mb-2 flex items-center gap-3">
                            <Folder className="text-brand-accent" size={32} /> Mis Proyectos
                        </h1>
                        <p className="text-brand-power/60 max-w-2xl">
                            Gestiona tus campañas SEO, colabora con tu equipo y organiza tu calendario editorial.
                        </p>
                    </div>
                    <button
                        onClick={() => { setShowNewProjectModal(true); handleLoadGsc(); }}
                        className="px-6 py-3 bg-brand-power text-brand-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-brand-accent hover:text-brand-power transition-all shadow-lg flex items-center gap-2"
                    >
                        <Plus size={18} /> Nuevo Proyecto
                    </button>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 bg-brand-soft/20 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : projects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map(project => (
                            <div key={project.id} className="h-48">
                                <ProjectCard
                                    project={project}
                                    onDelete={handleDeleteProject}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed border-brand-power/5 rounded-3xl bg-brand-soft/5">
                        <Folder size={48} className="mx-auto text-brand-power/20 mb-4" />
                        <h3 className="text-xl font-bold text-brand-power mb-2">No tienes proyectos activos</h3>
                        <p className="text-brand-power/50 max-w-md mx-auto mb-8">
                            Crea tu primer proyecto para empezar a gestionar tareas, calendarios y análisis SEO.
                        </p>
                        <button
                            onClick={() => setShowNewProjectModal(true)}
                            className="text-brand-accent font-bold uppercase tracking-widest hover:underline"
                        >
                            Crear Proyecto Ahora
                        </button>
                    </div>
                )}

                {/* New Project Modal */}
                <AnimatePresence>
                    {showNewProjectModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setShowNewProjectModal(false)}
                                className="absolute inset-0 bg-brand-power/80 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                                className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl p-8"
                            >
                                <h2 className="text-2xl font-bold text-brand-power mb-6">Nuevo Proyecto</h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/50 mb-2">Nombre del Proyecto</label>
                                        <input
                                            autoFocus
                                            value={newName} onChange={e => setNewName(e.target.value)}
                                            className="w-full bg-brand-soft/20 border border-brand-power/10 rounded-lg p-3 text-brand-power outline-none focus:border-brand-accent"
                                            placeholder="Ej. E-commerce Zapatos"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/50 mb-2">Descripción (Opcional)</label>
                                        <textarea
                                            value={newDesc} onChange={e => setNewDesc(e.target.value)}
                                            className="w-full bg-brand-soft/20 border border-brand-power/10 rounded-lg p-3 text-brand-power outline-none focus:border-brand-accent h-24 resize-none"
                                            placeholder="Breve descripción de los objetivos..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/50 mb-2">Propiedad Google Search Console</label>
                                        {isLoadingGsc ? (
                                            <div className="p-3 bg-brand-soft/10 border border-dashed rounded-lg text-xs text-brand-power/50 text-center">
                                                Cargando tus propiedades...
                                            </div>
                                        ) : gscSites.length > 0 ? (
                                            <select
                                                value={newGsc}
                                                onChange={e => setNewGsc(e.target.value)}
                                                className="w-full bg-brand-soft/20 border border-brand-power/10 rounded-lg p-3 text-brand-power outline-none focus:border-brand-accent appearance-none text-sm"
                                            >
                                                <option value="">Seleccionar Propiedad...</option>
                                                {gscSites.map((s: any) => (
                                                    <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="space-y-2">
                                                <input
                                                    value={newGsc} onChange={e => setNewGsc(e.target.value)}
                                                    className="w-full bg-brand-soft/20 border border-brand-power/10 rounded-lg p-3 text-brand-power outline-none focus:border-brand-accent font-mono text-sm"
                                                    placeholder="https://misitio.com"
                                                />
                                                <button
                                                    onClick={handleLoadGsc}
                                                    className="text-[10px] text-brand-accent hover:underline font-bold uppercase tracking-widest"
                                                >
                                                    Cargar mis propiedades de Google
                                                </button>
                                            </div>
                                        )}
                                        <p className="text-[10px] text-brand-power/40 mt-1">Necesario para las métricas automáticas.</p>
                                    </div>

                                    <div className="flex gap-3 mt-8">
                                        <button
                                            onClick={() => setShowNewProjectModal(false)}
                                            className="flex-1 py-3 bg-brand-soft text-brand-power rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleCreateProject}
                                            disabled={isCreating}
                                            className="flex-1 py-3 bg-brand-power text-brand-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-brand-accent hover:text-brand-power transition-all shadow-lg"
                                        >
                                            {isCreating ? 'Creando...' : 'Crear Proyecto'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </ToolWrapper>
    );
};

export default ProjectsDashboard;
