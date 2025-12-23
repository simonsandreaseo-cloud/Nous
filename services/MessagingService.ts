import { supabase } from '../lib/supabase';

export interface Message {
    id: number;
    content: string;
    sender_id: string;
    project_id?: number;
    recipient_id?: string;
    created_at: string;
    read_at?: string;
    sender?: { email: string };
}

export const MessagingService = {
    /**
     * Fetch messages for a specific project
     */
    async getProjectMessages(projectId: number) {
        const { data, error } = await supabase
            .from('messages')
            .select('*, sender:sender_id(email)')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data as Message[];
    },

    /**
     * Send a message to a project
     */
    async sendProjectMessage(projectId: number, content: string) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error('MessagingService: User not authenticated');
                throw new Error('User not authenticated');
            }

            console.log('Sending message:', { projectId, userId: user.id, content });

            const { data, error } = await supabase
                .from('messages')
                .insert({
                    content,
                    project_id: projectId,
                    sender_id: user.id
                })
                .select('*, sender:sender_id(email)')
                .single();

            if (error) {
                console.error('MessagingService: Error sending message', error);
                throw error;
            }

            return data as Message;
        } catch (err) {
            console.error('MessagingService: Unexpected error in sendProjectMessage', err);
            throw err;
        }
    },

    /**
     * Subscribe to real-time messages for a project
     */
    subscribeToProjectMessages(projectId: number, callback: (payload: any) => void) {
        return supabase
            .channel(`project-messages-${projectId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `project_id=eq.${projectId}`
                },
                (payload) => {
                    // Ideally we fetch the sender email here or handle it in UI
                    callback(payload);
                }
            )
            .subscribe();
    }
};
