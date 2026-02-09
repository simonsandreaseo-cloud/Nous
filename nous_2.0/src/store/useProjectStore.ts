import { create } from 'zustand';
import { Project } from '@/types/project';
import { supabase } from '@/lib/supabase';

interface ProjectState {
    projects: Project[];
    activeProject: Project | null;
    isLoading: boolean;
    setActiveProject: (projectId: string) => void;
    fetchProjects: () => Promise<void>;
    createProject: (project: Omit<Project, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
    deleteProject: (projectId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
    projects: [],
    activeProject: null,
    isLoading: false,

    setActiveProject: (projectId) => {
        const project = get().projects.find(p => p.id === projectId);
        if (project) {
            set({ activeProject: project });
            localStorage.setItem('activeProjectId', projectId);
        }
    },

    fetchProjects: async () => {
        set({ isLoading: true });
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching projects:', error);
            set({ isLoading: false });
            return;
        }

        const projects = data as Project[];
        const storedId = localStorage.getItem('activeProjectId');
        const active = projects.find(p => p.id === storedId) || projects[0] || null;

        set({ projects, activeProject: active, isLoading: false });
    },

    createProject: async (newProject) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('projects')
            .insert([{ ...newProject, user_id: user.id }])
            .select()
            .single();

        if (error) {
            console.error('Error creating project:', error);
            return;
        }

        const project = data as Project;
        set(state => ({
            projects: [project, ...state.projects],
            activeProject: project
        }));
    },

    deleteProject: async (projectId) => {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (error) {
            console.error('Error deleting project:', error);
            return;
        }

        set(state => ({
            projects: state.projects.filter(p => p.id !== projectId),
            activeProject: state.activeProject?.id === projectId ? null : state.activeProject
        }));
    }
}));
