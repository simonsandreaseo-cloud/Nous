import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
export type { Project, Task } from '@/types/project';
import { Project, Task } from '@/types/project';

interface ProjectState {
    projects: Project[];
    activeProject: Project | null;
    tasks: Task[];
    isLoading: boolean;
    setActiveProject: (projectId: string) => void;
    fetchProjects: () => Promise<void>;
    fetchProjectTasks: (projectId: string) => Promise<void>;
    createProject: (project: Omit<Project, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
    updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
    deleteProject: (projectId: string) => Promise<void>;
    addTask: (task: Omit<Task, 'id' | 'created_at'>) => Promise<void>;
    updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
    syncGscData: (siteUrl: string, startDate: string, endDate: string) => Promise<void>;
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
            await get().fetchProjectTasks(active.id);
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
            alert(`Error al crear tarea: ${error.message}`);
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
        if (!user) {
            alert("No se pudo detectar la sesión. Por favor, asegúrate de estar logueado.");
            return;
        }

        const { data, error } = await supabase
            .from('projects')
            .insert([{ ...newProject, user_id: user.id }])
            .select()
            .single();

        if (error) {
            console.error('Error creating project:', error);
            alert(`Error al crear proyecto: ${error.message}`);
            return;
        }

        const project = data as Project;
        set(state => ({
            projects: [project, ...state.projects],
            activeProject: project
        }));
    },

    updateProject: async (projectId, updates) => {
        const { error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', projectId);

        if (error) {
            console.error('Error updating project:', error);
            alert(`Error al actualizar proyecto: ${error.message}`);
            return;
        }

        set(state => ({
            projects: state.projects.map(p => p.id === projectId ? { ...p, ...updates } : p),
            activeProject: state.activeProject?.id === projectId ? { ...state.activeProject, ...updates } : state.activeProject
        }));
    },

    deleteProject: async (projectId) => {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (error) {
            console.error('Error deleting project:', error);
            alert(`No se pudo eliminar el proyecto: ${error.message}`);
            return;
        }

        set(state => ({
            projects: state.projects.filter(p => p.id !== projectId),
            activeProject: state.activeProject?.id === projectId ? null : state.activeProject
        }));
    },

    syncGscData: async (siteUrl, startDate, endDate) => {
        const active = get().activeProject;
        if (!active) return;

        set({ isLoading: true });

        // This will eventually call the GscService ported logic
        // For now, it's a placeholder to show the capability
        console.log(`Syncing GSC data for ${siteUrl} from ${startDate} to ${endDate}`);

        // Simplified mock sync
        const { error } = await supabase
            .from('gsc_daily_metrics')
            .upsert([{
                project_id: active.id,
                date: startDate,
                clicks: 0,
                impressions: 0,
                ctr: 0,
                position: 0,
                updated_at: new Date().toISOString()
            }], { onConflict: 'project_id,date' });

        if (error) {
            console.error('Error syncing GSC data:', error);
            alert(`Error sincronizando datos: ${error.message}`);
        } else {
            console.log('GSC data synced successfully (placeholder)');
        }

        set({ isLoading: false });
    }
}));
