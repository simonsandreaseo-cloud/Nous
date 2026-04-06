import { supabase } from '../lib/supabase';

export interface Notification {
    id: number;
    user_id: string;
    actor_id?: string;
    type: 'mention' | 'message' | 'task_assigned' | 'system';
    title: string;
    message: string;
    resource_link?: string;
    is_read: boolean;
    created_at: string;
}

export const NotificationService = {
    /**
     * Fetch unread notifications for current user
     */
    async getMyNotifications() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return data as Notification[];
    },

    /**
     * Create a notification (e.g. when tagging)
     */
    async createNotification(userId: string, type: string, title: string, message: string, link?: string) {
        const { data: { user } } = await supabase.auth.getUser(); // Actor

        // Don't notify self?
        if (user && user.id === userId) return;

        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                actor_id: user?.id,
                type,
                title,
                message,
                resource_link: link
            });

        if (error) console.error('Error creating notification', error);
    },

    /**
     * Mark notification as read
     */
    async markAsRead(id: number) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Mark all as read
     */
    async markAllAsRead() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (error) throw error;
    }
};
