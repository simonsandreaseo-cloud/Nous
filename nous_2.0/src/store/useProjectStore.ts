import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
export type { Project, Task, Team, TeamMember } from '@/types/project';
import { Project, Task, Team, TeamMember } from '@/types/project';

interface ProjectState {
    projects: Project[];
    activeProjectIds: string[]; // Array of active project IDs
    activeProject: Project | null; // Primary project for creations
    teams: Team[];
    activeTeam: Team | null;
    tasks: Task[];
    isLoading: boolean;
    toggleProjectActive: (projectId: string) => void;
    setAllProjectsActive: (active: boolean) => void;
    setActiveProject: (projectId: string) => void;
    setActiveTeam: (teamId: string) => void;
    fetchTeams: () => Promise<void>;
    createTeam: (name: string) => Promise<void>;
    fetchProjects: (teamId?: string) => Promise<void>;

    fetchProjectTasks: (projectId: string) => Promise<void>;
    createProject: (project: Omit<Project, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
    updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
    deleteProject: (projectId: string) => Promise<void>;
    addTask: (task: Omit<Task, 'id' | 'created_at'>) => Promise<void>;
    updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
    deleteTask: (taskId: string) => Promise<void>;
    fetchPersonalTasks: () => Promise<void>;
    assignTask: (taskId: string, userId: string | null) => Promise<void>;
    syncGscData: (siteUrl: string, startDate: string, endDate: string) => Promise<void>;
}


export const useProjectStore = create<ProjectState>((set, get) => ({
    projects: [],
    activeProjectIds: [],
    activeProject: null,
    teams: [],
    activeTeam: null,
    tasks: [],
    isLoading: false,

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

        // Auto-fetch tasks for current active projects
        if (newIds.length > 0) {
            get().fetchProjectTasks(newIds[newIds.length - 1]); // Quick temporary fix for typing, should ideally fetch all
        } else {
            set({ tasks: [] });
        }
    },

    setActiveProject: (projectId) => {
        const { activeProjectIds, projects } = get();
        // Remove it if it's there
        const filtered = activeProjectIds.filter(id => id !== projectId);
        // Put it at the front (setting it as primary)
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

    setActiveTeam: async (teamId) => {
        const { teams } = get();
        const team = teams.find(t => t.id === teamId) || null;
        set({ activeTeam: team });
        
        if (team) {
            get().fetchProjects(teamId);
            
            // Persist preference in Profile
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                await supabase
                    .from('profiles')
                    .update({ last_active_team_id: teamId })
                    .eq('id', session.user.id);
            }
        }
    },

    fetchTeams: async () => {
        set({ isLoading: true });
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // Fetch teams where user is a member
        const { data: memberData, error: memberError } = await supabase
            .from('team_members')
            .select('team_id, teams(*)')
            .eq('user_id', session.user.id);

        if (memberError) {
            console.error('Error fetching teams:', memberError);
            set({ isLoading: false });
            return;
        }

        const teams = memberData.map(m => Array.isArray(m.teams) ? m.teams[0] : m.teams)
            .filter(Boolean) as Team[];
        set({ teams });

        // Fetch last active team from Profile
        const { data: profileData } = await supabase
            .from('profiles')
            .select('last_active_team_id')
            .eq('id', session.user.id)
            .maybeSingle();

        if (teams.length > 0) {
            const lastTeamId = profileData?.last_active_team_id;
            const targetTeam = teams.find(t => t.id === lastTeamId) || teams[0];
            
            set({ activeTeam: targetTeam });
            get().fetchProjects(targetTeam.id);
        } else {
            set({ isLoading: false });
        }
    },

    createTeam: async (name: string) => {
        set({ isLoading: true });
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // 1. Create Team
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .insert({ name, owner_id: session.user.id })
            .select()
            .single();

        if (teamError) {
            console.error('Error creating team:', teamError);
            alert(`Error al crear equipo: ${teamError.message}`);
            set({ isLoading: false });
            return;
        }

        // 2. Create Owner Member
        const { error: memberError } = await supabase
            .from('team_members')
            .insert({
                team_id: team.id,
                user_id: session.user.id,
                role: 'owner'
            });

        if (memberError) {
            console.error('Error creating team member:', memberError);
            // Non-fatal if team was created? But user won't see it due to RLS.
        }

        // 3. Refresh and set active
        await get().fetchTeams();
        set({ activeTeam: team, isLoading: false });
    },

    fetchProjects: async (teamId) => {

        set({ isLoading: true });
        const targetTeamId = teamId || get().activeTeam?.id;
        
        if (!targetTeamId) {
            set({ projects: [], isLoading: false });
            return;
        }

        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('team_id', targetTeamId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching projects:', error);
            set({ isLoading: false });
            return;
        }

        const projects = data as Project[];
        let activeIds: string[] = [];

        try {
            const storedIds = localStorage.getItem('activeProjectIds');
            if (storedIds) {
                activeIds = JSON.parse(storedIds);
            }
        } catch (e) {}

        // Default to all projects active if no stored preferences
        if (activeIds.length === 0 && projects.length > 0) {
            activeIds = projects.map(p => p.id);
            localStorage.setItem('activeProjectIds', JSON.stringify(activeIds));
        }

        // Filter out any IDs that no longer exist
        activeIds = activeIds.filter(id => projects.some(p => p.id === id));

        set({
            projects,
            activeProjectIds: activeIds,
            activeProject: projects.find(p => p.id === activeIds[0]) || null,
            isLoading: false
        });
    },

    fetchProjectTasks: async (projectId) => {
        const activeIds = get().activeProjectIds;
        if (activeIds.length === 0) {
            set({ tasks: [] });
            return;
        }

        // If a specific projectId is requested we can still filter, but usually we want all active
        // Let's modify the query to use `.in` if we want to fetch all active projects' tasks
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .in('project_id', activeIds)
            .order('scheduled_date', { ascending: true });

        if (error) {
            console.error('Error fetching tasks:', error);
            return;
        }

        set({ tasks: data as Task[] });
    },

    addTask: async (newTask) => {
        const { data, error } = await supabase
            .from('tasks')
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
            .from('tasks')
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

    deleteTask: async (taskId) => {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

        if (error) {
            console.error('Error deleting task:', error);
            alert(`Error al eliminar tarea: ${error.message}`);
            return;
        }

        set(state => ({
            tasks: state.tasks.filter(t => t.id !== taskId)
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
            .insert([{ ...newProject, user_id: user.id, team_id: get().activeTeam?.id }])
            .select()
            .single();

        if (error) {
            console.error('Error creating project:', error);
            alert(`Error al crear proyecto: ${error.message}`);
            return;
        }

        const project = data as Project;
        const newActiveIds = [...get().activeProjectIds, project.id];
        set(state => ({
            projects: [project, ...state.projects],
            activeProjectIds: newActiveIds,
            activeProject: get().projects.find(p => p.id === newActiveIds[0]) || project
        }));
        localStorage.setItem('activeProjectIds', JSON.stringify(newActiveIds));
    },

    updateProject: async (projectId, updates) => {
        console.log("[DEBUG] Updating project in DB:", projectId, updates);
        const { data, error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', projectId)
            .select();

        if (error) {
            console.error('[DEBUG] Error updating project:', error);
            alert(`Error al actualizar proyecto: ${error.message}`);
            return;
        }

        console.log("[DEBUG] Project updated successfully in DB:", data);

        set(state => ({
            projects: state.projects.map(p => p.id === projectId ? { ...p, ...updates } : p),
            activeProject: state.activeProject?.id === projectId ? { ...state.activeProject, ...updates } : state.activeProject
        }));
    },

    deleteProject: async (projectId) => {
        console.log("[DEBUG] Deleting project from DB:", projectId);
        set({ isLoading: true });
        const { error, count } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (error) {
            set({ isLoading: false });
            console.error('[DEBUG] Error deleting project:', error);
            throw error;
        }

        console.log("[DEBUG] Project deleted successfully, rows affected:", count);

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
    },

    fetchPersonalTasks: async () => {
        set({ isLoading: true });
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('assigned_to', session.user.id)
            .order('scheduled_date', { ascending: true });

        if (error) {
            console.error('Error fetching personal tasks:', error);
            set({ isLoading: false });
            return;
        }

        set({ tasks: data as Task[], isLoading: false });
    },

    assignTask: async (taskId, userId) => {
        const updates: any = {
            assigned_to: userId,
            assigned_at: userId ? new Date().toISOString() : null
        };

        const { data, error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', taskId)
            .select()
            .single();

        if (error) {
            console.error('Error assigning task:', error);
            alert(`Error al asignar tarea: ${error.message}`);
            return;
        }

        set(state => ({
            tasks: state.tasks.map(t => t.id === taskId ? (data as Task) : t)
        }));
    }
}));
