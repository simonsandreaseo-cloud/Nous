import { create } from 'zustand';
import { Project } from '@/types/project';
import { supabase } from '@/lib/supabase';

// Define Task Interface locally for now, or move to types/task.ts
export interface Task {
    id: number;
    title: string;
    status: 'todo' | 'in_progress' | 'done' | 'review';
    project_id: string;
    created_at?: string;
}

interface ProjectState {
    projects: Project[];
    activeProject: Project | null;
    tasks: Task[]; // NEW: Tasks for the active project
    isLoading: boolean;
    setActiveProject: (projectId: string) => void;
    fetchProjects: () => Promise<void>;
    fetchProjectTasks: (projectId: string) => Promise<void>; // NEW
    createProject: (project: Omit<Project, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
    deleteProject: (projectId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
    projects: [],
    activeProject: null,
    tasks: [],
    isLoading: false,

    setActiveProject: (projectId) => {
        const project = get().projects.find(p => p.id === projectId);
        if (project) {
            set({ activeProject: project });
            localStorage.setItem('activeProjectId', projectId);
            get().fetchProjectTasks(projectId); // Auto-fetch tasks
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

        if (active) {
            get().fetchProjectTasks(active.id);
        }
    },

    fetchProjectTasks: async (projectId) => {
        const { data, error } = await supabase
            .from('content_tasks') // Assuming table name is content_tasks based on context
            .select('*')
            .eq('project_id', projectId);

        if (error) {
            console.error('Error fetching tasks:', error);
            return;
        }

        set({ tasks: data as Task[] });
    },

    createProject: async (newProject) => {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
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
