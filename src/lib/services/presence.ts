import { supabase } from '../supabase';

export type PresenceStatus = 'online' | 'busy' | 'offline';

export const PresenceService = {
    /**
     * Updates the current user's presence status and activity in a specific team.
     */
    async updatePresence(teamId: string, status: PresenceStatus, taskId?: string | number) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        const updates: any = {
            presence_status: status,
            last_seen_at: new Date().toISOString(),
        };

        if (taskId !== undefined) {
            updates.current_task_id = taskId;
        }

        const { error } = await supabase
            .from('team_members')
            .update(updates)
            .eq('team_id', teamId)
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Error updating presence:', error);
        }
    },

    /**
     * Sends a simple heartbeat to update last_seen_at.
     */
    async sendHeartbeat(teamId: string) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        // Note: Using a raw RPC or just updating last_seen_at
        await supabase
            .from('team_members')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('team_id', teamId)
            .eq('user_id', session.user.id);
    },


    /**
     * Subscribes to realtime changes in team_members for a specific team.
     */
    subscribeToTeam(teamId: string, onUpdate: (payload: any) => void) {
        return supabase
            .channel(`team-presence-${teamId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'team_members',
                    filter: `team_id=eq.${teamId}`,
                },
                (payload) => {
                    onUpdate(payload.new);
                }
            )
            .subscribe();
    }
};
