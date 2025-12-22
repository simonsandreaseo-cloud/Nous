import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ProjectService, Project } from '../../lib/task_manager';
import ToolWrapper from '../../components/layout/ToolWrapper';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Folder, Users, Search, ChevronRight, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';

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

    const handleCreateProject = async () => {
        if (!newName.trim()) return alert("Nombre requerido");
        setIsCreating(true);
        try {
            await ProjectService.createProject(newName, newDesc, newGsc);
            setNewName('');
            setNewDesc('');
            setNewGsc('');
            setShowNewProjectModal(false);
            loadProjects();
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setIsCreating(false);
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
                        onClick={() => setShowNewProjectModal(true)}
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
                            <Link
                                to={`/proyectos/${project.id}`}
                                key={project.id}
                                className="group bg-white p-6 rounded-2xl border border-brand-power/5 shadow-sm hover:shadow-xl hover:border-brand-accent/30 transition-all flex flex-col justify-between h-48"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-brand-soft flex items-center justify-center text-brand-power font-bold text-lg group-hover:bg-brand-accent group-hover:text-white transition-colors">
                                            {project.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${project.role === 'owner' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'
                                            }`}>
                                            {project.role === 'owner' ? 'Propietario' : project.role}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-brand-power mb-2 truncate">{project.name}</h3>
                                    <p className="text-sm text-brand-power/50 line-clamp-2">
                                        {project.description || "Sin descripción"}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-brand-power/5 mt-4">
                                    <div className="flex items-center gap-4 text-xs text-brand-power/40 font-mono">
                                        <span className="flex items-center gap-1"><Users size={12} /> --</span>
                                        {project.gsc_property_url && <span className="flex items-center gap-1 text-green-600/60"><BarChart2 size={12} /> GSC</span>}
                                    </div>
                                    <span className="text-brand-power/20 group-hover:translate-x-1 transition-transform">
                                        <ChevronRight size={18} />
                                    </span>
                                </div>
                            </Link>
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
                                        <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/50 mb-2">Dominio GSC (Opcional)</label>
                                        <input
                                            value={newGsc} onChange={e => setNewGsc(e.target.value)}
                                            className="w-full bg-brand-soft/20 border border-brand-power/10 rounded-lg p-3 text-brand-power outline-none focus:border-brand-accent font-mono text-sm"
                                            placeholder="https://misitio.com"
                                        />
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
