import { StateCreator } from 'zustand';
import { supabase } from '@/lib/supabase';
import { ProjectStore, TeamActions } from './types';
import { NotificationService } from '@/lib/services/notifications';

export const createTeamSlice: StateCreator<ProjectStore, [], [], TeamActions> = (set, get) => ({
    fetchTeamMembers: async (teamId?: string) => {
        const targetId = teamId || get().activeTeam?.id;
        if (!targetId) return;

        const { data, error } = await supabase
            .from('team_members')
            .select('*, profile:profiles(id, full_name, avatar_url)')
            .eq('team_id', targetId);

        if (error) {
            console.error('[fetchTeamMembers] Error:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            return;
        }

        set({ teamMembers: data as any[] });
    },

    fetchUnassignedMembers: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        try {
            // First get all user_ids that ARE assigned to a team
            const { data: assignedData, error: assignedError } = await supabase
                .from('team_members')
                .select('user_id');

            if (assignedError) throw assignedError;

            const assignedIds = assignedData?.map(m => m.user_id).filter(Boolean) || [];

            // Fetch profiles that are NOT in that list
            let query = supabase.from('profiles').select('*');
            
            if (assignedIds.length > 0) {
                query = query.not('id', 'in', `(${assignedIds.join(',')})`);
            }

            const { data: unassigned, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            set({ unassignedMembers: unassigned || [] });
        } catch (e: any) {
            console.error('[fetchUnassignedMembers] Critical Error:', e);
            NotificationService.error("Error al cargar miembros sin equipo", e.message);
        }
    },

    updateTeamStyling: async (teamId, updates) => {
        const { error } = await supabase
            .from('teams')
            .update(updates)
            .eq('id', teamId);

        if (error) {
            NotificationService.error('Error al actualizar estilo', error.message);
            return;
        }

        await get().fetchTeams();
        NotificationService.success('Estilo actualizado');
    },

    fetchTeams: async () => {
        if (get().isLoading) return;
        set({ isLoading: true, unassignedMembers: [] });
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            set({ isLoading: false });
            return;
        }

        // Fetch teams where user is member or owner, including all members and their profiles + project counts
        const { data: teamsData, error: teamsError } = await supabase
            .from('teams')
            .select(`
                *,
                team_members (
                    id,
                    role,
                    user_id,
                    profiles (
                        id,
                        full_name,
                        email,
                        avatar_url
                    )
                ),
                team_projects (
                    project_id
                )
            `);

        if (teamsError) {
            console.error('[fetchTeams] Error:', teamsError);
            set({ isLoading: false });
            get().fetchProjects();
            return;
        }

        const teams = teamsData || [];
        set({ teams: teams as any[], isLoading: false });

        const { data: profileData } = await supabase
            .from('profiles')
            .select('last_active_team_id')
            .eq('id', session.user.id)
            .maybeSingle();

        if (teams.length > 0) {
            const lastTeamId = profileData?.last_active_team_id;
            const targetTeam = teams.find(t => (t as any).id === lastTeamId) || teams[0];
            
            set({ activeTeam: targetTeam as any });
            get().fetchProjects((targetTeam as any).id);
        }
    },

    createTeam: async (name: string) => {
        set({ isLoading: true });
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data: team, error: teamError } = await supabase
            .from('teams')
            .insert({ name, owner_id: session.user.id })
            .select()
            .single();

        if (teamError) {
            NotificationService.error('Error al crear equipo', teamError.message);
            set({ isLoading: false });
            return;
        }

        const { error: memberError } = await supabase
            .from('team_members')
            .insert({
                team_id: team.id,
                user_id: session.user.id,
                role: 'owner'
            });

        if (memberError) {
            NotificationService.warning('Error al unirse al equipo', memberError.message);
        }

        await get().fetchTeams();
        await get().setActiveTeam(team.id);
        set({ isLoading: false });
        NotificationService.success('Equipo creado correctamente');
    },

    setActiveTeam: async (teamId) => {
        const { teams } = get();
        const team = teams.find(t => t.id === teamId) || null;
        set({ activeTeam: team });
        
        if (team) {
            get().fetchProjects(teamId);
            get().fetchTeamMembers(teamId);
            
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                await supabase
                    .from('profiles')
                    .update({ last_active_team_id: teamId })
                    .eq('id', session.user.id);
            }
        }
    },
});
