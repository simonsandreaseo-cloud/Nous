import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Project } from '../../lib/task_manager';

interface ProjectSelectorProps {
    selectedProjectId: string | null;
    onSelectProject: (projectId: string) => void;
    className?: string;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ selectedProjectId, onSelectProject, className }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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

        fetchProjects();
    }, []);

    if (loading) return <span className="text-xs text-brand-power/50">Cargando proyectos...</span>;

    return (
        <select
            value={selectedProjectId || ''}
            onChange={(e) => onSelectProject(e.target.value)}
            className={`px-3 py-2 bg-brand-white border border-brand-power/10 rounded-lg text-sm font-bold text-brand-power outline-none focus:ring-2 focus:ring-brand-power/20 ${className}`}
        >
            <option value="" disabled>Seleccionar Proyecto</option>
            {projects.map((project) => (
                <option key={project.id} value={project.id}>
                    {project.name}
                </option>
            ))}
        </select>
    );
};
