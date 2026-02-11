import { create } from 'zustand';
import { Project } from '@/types/project';
import { supabase } from '@/lib/supabase';

// Define Task Interface
export interface Task {
    id: string; // Changed to string for UUID compatibility
    title: string;
    description?: string;
    brief?: string;
    status: 'todo' | 'in_progress' | 'done' | 'review';
    scheduled_date: string; // New field for calendar
    project_id: string;
    created_at?: string;
}

interface ProjectState {
    projects: Project[];
    activeProject: Project | null;
    tasks: Task[];
    isLoading: boolean;
    setActiveProject: (projectId: string) => void;
    fetchProjects: () => Promise<void>;
    fetchProjectTasks: (projectId: string) => Promise<void>;
    createProject: (project: Omit<Project, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
    deleteProject: (projectId: string) => Promise<void>;
    addTask: (task: Omit<Task, 'id' | 'created_at'>) => Promise<void>;
    updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
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
            .from('content_tasks')
            .select('*')
            .eq('project_id', projectId)
            .order('scheduled_date', { ascending: true });

        if (error) {
            console.error('Error fetching tasks:', error);
            return;
        }

        set({ tasks: data as Task[] });
    },

    addTask: async (newTask) => {
        const { data, error } = await supabase
            .from('content_tasks')
            .insert([newTask])
            .select()
            .single();

        if (error) {
            console.error('Error adding task:', error);
            return;
        }

        set(state => ({ tasks: [...state.tasks, data as Task] }));
    },

    updateTask: async (taskId, updates) => {
        const { data, error } = await supabase
            .from('content_tasks')
            .update(updates)
            .eq('id', taskId)
            .select()
            .single();

        if (error) {
            console.error('Error updating task:', error);
            return;
        }

        set(state => ({
            tasks: state.tasks.map(t => t.id === taskId ? (data as Task) : t)
        }));
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
