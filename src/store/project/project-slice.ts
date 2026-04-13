import { StateCreator } from 'zustand';
import { supabase } from '@/lib/supabase';
import { ProjectStore, ProjectActions } from './types';
import { getRandomNousColor } from '@/constants/colors';
import { NotificationService } from '@/lib/services/notifications';

export const createProjectSlice: StateCreator<ProjectStore, [], [], ProjectActions> = (set, get) => ({
    toggleProjectActive: (projectId) => {
        const { activeProjectIds } = get();
        const isActive = activeProjectIds.includes(projectId);
        let newIds = [];

        if (isActive) {
            newIds = activeProjectIds.filter(id => id !== projectId);
        } else {
            newIds = [...activeProjectIds, projectId];
        }

        set({
            activeProjectIds: newIds,
            activeProject: get().projects.find(p => p.id === newIds[0]) || null
        });
        localStorage.setItem('activeProjectIds', JSON.stringify(newIds));

        if (newIds.length > 0) {
            get().fetchProjectTasks(newIds[newIds.length - 1]); 
        } else {
            set({ tasks: [] });
        }
    },

    setActiveProject: (projectId) => {
        const { activeProjectIds, projects } = get();
        const filtered = activeProjectIds.filter(id => id !== projectId);
        const newIds = [projectId, ...filtered];

        set({
            activeProjectIds: newIds,
            activeProject: projects.find(p => p.id === projectId) || null
        });
        localStorage.setItem('activeProjectIds', JSON.stringify(newIds));

        if (newIds.length > 0) {
            get().fetchProjectTasks(newIds[0]);
        }
    },

    setAllProjectsActive: (active) => {
        const { projects } = get();
        if (active) {
            const allIds = projects.map(p => p.id);
            set({
                activeProjectIds: allIds,
                activeProject: projects[0] || null
            });
            localStorage.setItem('activeProjectIds', JSON.stringify(allIds));
        } else {
            set({
                activeProjectIds: [],
                activeProject: null,
                tasks: []
            });
            localStorage.setItem('activeProjectIds', JSON.stringify([]));
        }
    },

    fetchProjects: async (teamId) => {
        console.log("🚀 [DEBUG] fetchProjects starting... TeamID:", teamId);
        set({ isLoading: true });
        const targetTeamId = teamId || get().activeTeam?.id;
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            set({ projects: [], isLoading: false });
            return;
        }

        let projectsData: any[] = [];
        let fetchError;

        if (targetTeamId) {
            console.log("[DEBUG] Fetching projects for team via team_projects:", targetTeamId);
            const { data, error } = await supabase
                .from('projects')
                .select('*, team_projects!inner(team_id)')
                .eq('team_projects.team_id', targetTeamId)
                .order('created_at', { ascending: false });
            projectsData = data || [];
            fetchError = error;
        } else {
            console.log("[DEBUG] Fetching all accessible projects (no team selected)");
            // Fetch projects where user is owner OR linked via team_projects
            // To do this in one go with current Supabase RLS and JS client:
            const { data, error } = await supabase
                .from('projects')
                .select('*, team_projects(team_id)')
                .order('created_at', { ascending: false });
            
            // Note: RLS should already be filtering this to only show projects 
            // the user has access to.
            projectsData = data || [];
            fetchError = error;
        }

        if (fetchError) {
            console.error('Error fetching projects:', fetchError);
            set({ isLoading: false });
            return;
        }

        const projects = projectsData;
        let activeIds: string[] = [];

        try {
            const storedIds = localStorage.getItem('activeProjectIds');
            if (storedIds) {
                activeIds = JSON.parse(storedIds);
            }
        } catch (e) {}

        if (activeIds.length === 0 && projects.length > 0) {
            activeIds = projects.map(p => p.id);
            localStorage.setItem('activeProjectIds', JSON.stringify(activeIds));
        }

        activeIds = activeIds.filter(id => projects.some(p => p.id === id));
        
        // Final fallback: if we have projects but no active ID matches, pick the first one
        if (activeIds.length === 0 && projects.length > 0) {
            activeIds = [projects[0].id];
            localStorage.setItem('activeProjectIds', JSON.stringify(activeIds));
        }

        set({
            projects,
            activeProjectIds: activeIds,
            activeProject: projects.find(p => p.id === activeIds[0]) || null,
            isLoading: false
        });
    },

    createProject: async (newProject) => {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) {
            NotificationService.error('Sesión no detectada', 'Asegúrate de estar logueado.');
            return null;
        }

        const colorToAssign = newProject.color || getRandomNousColor();
        const teamId = get().activeTeam?.id;
        const { data, error } = await supabase
            .from('projects')
            .insert([{ 
                ...newProject, 
                user_id: user.id, 
                team_id: teamId, // Mantener por compatibilidad legacy
                color: colorToAssign
            }])
            .select()
            .single();

        if (error) {
            NotificationService.error('Error al crear proyecto', error.message);
            return null;
        }

        const project = data as any;

        // Registrar vínculo en team_projects si hay un equipo activo
        if (teamId) {
            await supabase.from('team_projects').insert({
                team_id: teamId,
                project_id: project.id
            });
        }
        const newActiveIds = [...get().activeProjectIds, project.id];
        set(state => ({
            projects: [project, ...state.projects],
            activeProjectIds: newActiveIds,
            activeProject: get().projects.find(p => p.id === newActiveIds[0]) || project
        }));
        localStorage.setItem('activeProjectIds', JSON.stringify(newActiveIds));
        NotificationService.success('Proyecto creado', `"${project.name}" se creó correctamente.`);
        return project;
    },

    updateProject: async (projectId, updates) => {
        const { data, error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', projectId)
            .select();

        if (error) {
            NotificationService.error('Error al actualizar proyecto', error.message);
            return;
        }

        set(state => ({
            projects: state.projects.map(p => p.id === projectId ? { ...p, ...updates } : p),
            activeProject: state.activeProject?.id === projectId ? { ...state.activeProject, ...updates } : state.activeProject
        }));
        NotificationService.notify('Proyecto actualizado');
    },

    deleteProject: async (projectId) => {
        set({ isLoading: true });
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (error) {
            set({ isLoading: false });
            NotificationService.error('Error al eliminar proyecto', error.message);
            throw error;
        }

        const currentProjects = get().projects;
        const newProjects = currentProjects.filter(p => p.id !== projectId);
        const newActiveIds = get().activeProjectIds.filter(id => id !== projectId);

        set({
            projects: newProjects,
            activeProjectIds: newActiveIds,
            activeProject: newProjects.find(p => p.id === newActiveIds[0]) || null,
            isLoading: false
        });
        localStorage.setItem('activeProjectIds', JSON.stringify(newActiveIds));
        NotificationService.notify('Proyecto eliminado');
    },
});
