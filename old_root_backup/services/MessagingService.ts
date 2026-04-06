import { supabase } from '../lib/supabase';

export interface Message {
    id: number;
    content: string;
    sender_id: string;
    project_id?: number;
    recipient_id?: string;
    created_at: string;
    updated_at?: string;
    read_at?: string;
    sender?: { email: string };
    is_edited?: boolean;
}

export const MessagingService = {
    /**
     * Fetch messages for a specific project
     */
    async getProjectMessages(projectId: number) {
        const { data, error } = await supabase
            .from('messages')
            .select('*, sender:profiles(email)')
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
                .select('*, sender:profiles(email)')
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
     * Send a direct message to a user
     */
    async sendDirectMessage(recipientId: string, content: string) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { data, error } = await supabase
                .from('messages')
                .insert({
                    content,
                    recipient_id: recipientId,
                    sender_id: user.id,
                    project_id: null
                })
                .select('*, sender:profiles(email)')
                .single();

            if (error) throw error;
            return data as Message;
        } catch (err) {
            console.error('MessagingService: Error sending DM', err);
            throw err;
        }
    },

    /**
     * Get conversation with a specific user
     */
    async getDirectMessages(otherUserId: string) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { data, error } = await supabase
                .from('messages')
                .select('*, sender:profiles(email)')
                .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data as Message[];
        } catch (err) {
            console.error('MessagingService: Error fetching DMs', err);
            throw err;
        }
    },

    /**
     * Delete a message
     */
    async deleteMessage(messageId: number) {
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);

        if (error) throw error;
        return true;
    },

    /**
     * Update a message content
     */
    async updateMessage(messageId: number, content: string) {
        const { data, error } = await supabase
            .from('messages')
            .update({
                content,
                is_edited: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', messageId)
            .select('*, sender:profiles(email)')
            .single();

        if (error) throw error;
        return data as Message;
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
                    event: '*', // Listen to INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'messages',
                    filter: `project_id=eq.${projectId}`
                },
                (payload) => {
                    callback(payload);
                }
            )
            .subscribe();
    }
};
