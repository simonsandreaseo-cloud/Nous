import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { getRandomNousColor } from '@/constants/colors';
import { GscService } from '@/lib/services/gsc';
import { NotificationService } from '@/lib/services/notifications';
export type { Project, Task, Team, TeamMember } from '@/types/project';
import type { Project, Task, Team, TeamMember } from '@/types/project';

export const STATUS_LABELS: Record<string, string> = {
    'idea': 'Idea',
    'en_investigacion': 'En Investigación',
    'investigacion_proceso': 'En Investigación',
    'in_progress': 'En Investigación',
    'por_redactar': 'Por Redactar',
    'en_redaccion': 'Por Redactar',
    'doing': 'Por Redactar',
    'por_corregir': 'Por Corregir',
    'por_maquetar': 'Por Maquetar',
    'publicado': 'Publicado',
    'done': 'Publicado'
};

export type TaskStatus = keyof typeof STATUS_LABELS;

interface ProjectState {
    projects: Project[];
    activeProjectIds: string[]; // Array of active project IDs
    activeProject: Project | null; // Primary project for creations
    teams: Team[];
    teamMembers: TeamMember[]; // NEW: Members of the active team
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
    createProject: (project: Omit<Project, 'id' | 'created_at' | 'user_id'>) => Promise<Project | null>;
    updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
    deleteProject: (projectId: string) => Promise<void>;
    addTask: (task: Omit<Task, 'id' | 'created_at'>) => Promise<void>;
    updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
    deleteTask: (taskId: string) => Promise<void>;
    fetchPersonalTasks: () => Promise<void>;
    assignTask: (taskId: string, userId: string | null) => Promise<void>;
    claimTask: (taskId: string) => Promise<void>;
    validateStatusTransition: (task: Task, nextStatus: string) => { valid: boolean; error?: string };
    syncGscData: (siteUrl: string, startDate: string, endDate: string) => Promise<void>;
    syncProjectInventory: (projectId: string, siteUrl: string) => Promise<void>;
    fetchProjectInventory: (projectId: string) => Promise<{url: string, title?: string, type?: string, category?: string}[]>;
}


export const useProjectStore = create<ProjectState>((set, get) => ({
    projects: [],
    activeProjectIds: [],
    activeProject: null,
    teams: [],
    teamMembers: [],
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
            get().fetchTeamMembers(teamId);
            
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

    fetchTeamMembers: async (teamId) => {
        const targetId = teamId || get().activeTeam?.id;
        if (!targetId) return;

        const { data, error } = await supabase
            .from('team_members')
            .select('*, profile:profiles(id, full_name, avatar_url)')
            .eq('team_id', targetId);

        if (error) {
            console.error('[fetchTeamMembers] Error:', error);
            return;
        }

        set({ teamMembers: data as any[] });
    },

    fetchTeams: async () => {
        if (get().isLoading && get().teams.length > 0) return;
        set({ isLoading: true });
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            set({ isLoading: false });
            return;
        }

        // Fetch teams where user is a member
        const { data: memberData, error: memberError } = await supabase
            .from('team_members')
            .select('team_id, teams(*)')
            .eq('user_id', session.user.id);

        if (memberError) {
            console.error('[fetchTeams] Error fetching teams:', memberError);
            set({ isLoading: false });
            return;
        }

        console.log('[fetchTeams] Member data:', memberData);

        const teams = memberData.map(m => Array.isArray(m.teams) ? m.teams[0] : m.teams)
            .filter(Boolean) as Team[];
        
        console.log('[fetchTeams] Filtered teams:', teams);
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
            alert(`Error al unirse al equipo: ${memberError.message}`);
            // Don't return, as the team might have been created
        } else {
            console.log('Successfully created team member for owner');
        }

        // 3. Refresh and set active
        await get().fetchTeams();
        await get().setActiveTeam(team.id);
        set({ isLoading: false });
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

    /**
     * Valida si una tarea puede pasar de su estado actual al siguiente.
     * Implementa las reglas del Ciclo de Vida de Nous:
     * Idea -> En Investigación -> Por Redactar -> Por Corregir -> Por Maquetar
     */
    validateStatusTransition: (task: Task, nextStatus: string): { valid: boolean; error?: string } => {
        const statusOrder = ['idea', 'en_investigacion', 'por_redactar', 'por_corregir', 'por_maquetar', 'publicado'];
        const currentIndex = statusOrder.indexOf(task.status as any);
        const nextIndex = statusOrder.indexOf(nextStatus as any);

        // Allow backward moves without restriction (UI will handle warning)
        if (nextIndex <= currentIndex) return { valid: true };

        // Logic for Forward Moves
        if (nextStatus === 'en_investigacion') {
            if (!task.title && !task.target_keyword) return { valid: false, error: "Debes tener al menos una idea o keyword para iniciar la investigación." };
        }
        
        if (nextStatus === 'por_redactar') {
            const hasResearch = task.research_dossier && Object.keys(task.research_dossier).length > 0;
            if (!hasResearch) return { valid: false, error: "La investigación SEO debe estar completa para pasar a 'Por Redactar'." };
        }

        // Special Bypass: Por Redactar -> Por Corregir (Manual approval)
        if (task.status === 'por_redactar' && nextStatus === 'por_corregir') {
            return { valid: true }; // Permitted bypass
        }

        // General rule: Cannot skip steps unless explicitly allowed
        if (nextIndex > currentIndex + 1 && !(task.status === 'por_redactar' && nextStatus === 'por_corregir')) {
            return { valid: false, error: `No puedes saltar a '${nextStatus}' desde '${task.status}'. Sigue el flujo editorial.` };
        }

        return { valid: true };
    },

    addTask: async (newTask) => {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        const { data, error } = await supabase
            .from('tasks')
            .insert([{
                ...newTask,
                creator_id: user?.id,
                assigned_to: newTask.assigned_to || user?.id, // Auto-assign to creator if free
                assigned_at: (newTask.assigned_to || user?.id) ? new Date().toISOString() : null
            }])
            .select()
            .single();

        if (error) {
            console.error('Error adding task:', error);
            alert(`Error al crear contenido: ${error.message}`);
            return;
        }

        set(state => ({ tasks: [...state.tasks, data as Task] }));
    },

    updateTask: async (taskId, updates) => {
        const currentTask = get().tasks.find(t => t.id === taskId);
        
        if (currentTask && updates.status && updates.status !== currentTask.status) {
            const validation = get().validateStatusTransition(currentTask, updates.status);
            if (!validation.valid) {
                alert(validation.error);
                return;
            }

            // Optional: Log backward moves
            const statusOrder = ['idea', 'en_investigacion', 'por_redactar', 'por_corregir', 'por_maquetar', 'publicado'];
            const currentIndex = statusOrder.indexOf(currentTask.status as any);
            const nextIndex = statusOrder.indexOf(updates.status as any);
            if (nextIndex < currentIndex) {
                console.log(`[Store] Backward move detected: ${currentTask.status} -> ${updates.status}`);
            }
        }

        // --- AUTOMATIC TRACKING LOGIC ---
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        const finalUpdates: any = { ...updates };

        if (userId) {
            // 1. Researcher Tracking
            if (updates.research_dossier && !currentTask?.researcher_id) {
                finalUpdates.researcher_id = userId;
                if (!currentTask?.assigned_to) {
                    finalUpdates.assigned_to = userId;
                    finalUpdates.assigned_at = new Date().toISOString();
                }
            }

            // 2. Writer Tracking
            if (updates.content_body && !currentTask?.writer_id) {
                finalUpdates.writer_id = userId;
                if (!currentTask?.assigned_to) {
                    finalUpdates.assigned_to = userId;
                    finalUpdates.assigned_at = new Date().toISOString();
                }
            }

            // 3. Corrector Tracking
            const approvalStatuses = ['por_maquetar', 'publicado'];
            if (updates.status && approvalStatuses.includes(updates.status) && !currentTask?.corrector_id) {
                finalUpdates.corrector_id = userId;
            }
        }

        const { data, error } = await supabase
            .from('tasks')
            .update(finalUpdates)
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
        if (!taskId) {
            console.error("[DEBUG] deleteTask called without taskId");
            return;
        }
        console.log("[DEBUG] Starting deleteTask for:", taskId);
        
        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);

            if (error) {
                console.error('[DEBUG] Supabase Delete Error:', error);
                
                // Construct a helpful message for the "rare and deep error"
                const technicalDetail = error.details || error.hint || 'Sin detalles técnicos adicionales.';
                alert(`Error al eliminar contenido:\n\n${error.message}\n\nDetalles: ${technicalDetail}\n\nEsto suele suceder si el contenido tiene imágenes o datos vinculados en otras tablas.`);
                return;
            }

            console.log("[DEBUG] Task deleted from Supabase, updating local state...");
            
            set(state => {
                const filtered = state.tasks.filter(t => t.id !== taskId);
                console.log(`[DEBUG] Task count before: ${state.tasks.length}, after: ${filtered.length}`);
                return { tasks: filtered };
            });
            
            NotificationService.notify('Contenido eliminado correctamente');
        } catch (e: any) {
            console.error('[DEBUG] Unexpected Error in deleteTask:', e);
            alert(`Error inesperado al eliminar: ${e.message}`);
        }
    },

    createProject: async (newProject) => {

        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) {
            alert("No se pudo detectar la sesión. Por favor, asegúrate de estar logueado.");
            return null;
        }

        const colorToAssign = newProject.color || getRandomNousColor();
        console.log("[DEBUG] Assigning color to project:", colorToAssign);

        const { data, error } = await supabase
            .from('projects')
            .insert([{ 
                ...newProject, 
                user_id: user.id, 
                team_id: get().activeTeam?.id,
                color: colorToAssign
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating project:', error);
            alert(`Error al crear proyecto: ${error.message}`);
            return null;
        }

        const project = data as Project;
        const newActiveIds = [...get().activeProjectIds, project.id];
        set(state => ({
            projects: [project, ...state.projects],
            activeProjectIds: newActiveIds,
            activeProject: get().projects.find(p => p.id === newActiveIds[0]) || project
        }));
        localStorage.setItem('activeProjectIds', JSON.stringify(newActiveIds));
        return project;
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
            alert(`Error al asignar contenido: ${error.message}`);
            return;
        }
        set(state => ({
            tasks: state.tasks.map(t => t.id === taskId ? (data as Task) : t)
        }));
    },

    claimTask: async (taskId) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        
        await get().assignTask(taskId, session.user.id);
    },

    syncProjectInventory: async (projectId, siteUrl) => {
        set({ isLoading: true });
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No hay sesión activa.");

            const response = await fetch('/api/gsc/sync-urls', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ projectId })
            });

            const result = await response.json();
            if (!response.ok) {
                // Check for specific GSC auth errors
                if (result.error?.includes('invalid authentication credentials') || response.status === 401) {
                    throw new Error("Conexión con Google Search Console expirada. Por favor, ve a Mis Proyectos y vuelve a vincular tu cuenta.");
                }
                throw new Error(result.error || "Error al sincronizar con GSC");
            }

            console.log(`Synced ${result.count} URLs for project ${projectId}`);
            return result.count;
        } catch (error: any) {
            console.error('[syncProjectInventory] Error:', error);
            alert(`Error al sincronizar inventario: ${error.message}`);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchProjectInventory: async (projectId) => {
        const { data, error } = await supabase
            .from('project_urls')
            .select('url, title, category')
            .eq('project_id', projectId);

        if (error) {
            console.error('[fetchProjectInventory] Error:', error);
            return [];
        }

        return data || [];
    }
}));
