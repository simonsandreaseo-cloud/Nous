import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Project, ProjectService } from '../../lib/task_manager';
import { GscService } from '../../services/gscService';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';

interface ProjectSelectorProps {
    selectedProjectId: string | null;
    onSelectProject: (projectId: string) => void;
    className?: string;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ selectedProjectId, onSelectProject, className }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newGsc, setNewGsc] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [gscSites, setGscSites] = useState<any[]>([]);
    const [isLoadingGsc, setIsLoadingGsc] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setProjects(data);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
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
            const newProject = await ProjectService.createProject(newName, newDesc, newGsc);
            setNewName('');
            setNewDesc('');
            setNewGsc('');
            setGscSites([]);
            setShowNewProjectModal(false);

            // Refresh projects and select the new one
            await fetchProjects();
            // Note: Since fetchProjects updates state asynchronously, we might not have the new project in 'projects' immediately for sync selection logic if we relied on that.
            // But onSelectProject just needs the ID.
            if (newProject && newProject.id) {
                onSelectProject(newProject.id.toString());
            }
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setIsCreating(false);
        }
    };

    if (loading) return <span className="text-xs text-brand-power/50">Cargando proyectos...</span>;

    return (
        <>
            <select
                value={selectedProjectId || ''}
                onChange={(e) => {
                    if (e.target.value === 'NEW_PROJECT_ACTION') {
                        setShowNewProjectModal(true);
                        handleLoadGsc();
                    } else {
                        onSelectProject(e.target.value);
                    }
                }}
                className={`px-3 py-2 bg-brand-white border border-brand-power/10 rounded-lg text-sm font-bold text-brand-power outline-none focus:ring-2 focus:ring-brand-power/20 ${className}`}
            >
                <option value="" disabled>Seleccionar Proyecto</option>
                <option value="NEW_PROJECT_ACTION" className="bg-brand-soft font-bold text-brand-accent">
                    + Crear Nuevo Proyecto
                </option>
                <optgroup label="Mis Proyectos">
                    {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                            {project.name}
                        </option>
                    ))}
                </optgroup>
            </select>

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
                                        className="flex-1 py-3 bg-brand-power text-brand-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-brand-accent hover:text-brand-power transition-all shadow-lg flex items-center justify-center gap-2"
                                    >
                                        {isCreating ? 'Creando...' : <><Plus size={16} /> Crear Proyecto</>}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};
