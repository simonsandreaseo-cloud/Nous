import { supabase } from './supabase';
import { Task } from './task_manager';

export interface ContentItem extends Task {
    content_status?: string;
    locked_by?: string;
    locked_until?: string;
    content_body?: string;
    metadata?: any;
}

export const ContentService = {

    /**
     * Checks if a content item is locked by another user.
     */
    isLocked(item: ContentItem, currentUserId: string): boolean {
        if (!item.locked_by || !item.locked_until) return false;
        if (item.locked_by === currentUserId) return false; // Locked by me is fine
        return new Date(item.locked_until) > new Date(); // True if locked by someone else and not expired
    },

    /**
     * Locks a content item for the current user for a duration (default 5 mins).
     */
    async lockContent(taskId: string | number) {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error("Not authenticated");

        const lockedUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 mins

        const { data, error } = await supabase
            .from('tasks')
            .update({
                locked_by: user.id,
                locked_until: lockedUntil
            })
            .eq('id', taskId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Unlocks a content item.
     */
    async unlockContent(taskId: string | number) {
        const { error } = await supabase
            .from('tasks')
            .update({
                locked_by: null,
                locked_until: null
            })
            .eq('id', taskId);

        if (error) throw error;
    },

    /**
     * Extends the lock (Heartbeat).
     */
    async heartbeat(taskId: string | number) {
        return this.lockContent(taskId);
    },

    /**
     * Assigns the content to the current user.
     */
    async assignToMe(taskId: string | number) {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error("Not authenticated");

        const { data, error } = await supabase
            .from('tasks')
            .update({ assignee_id: user.id })
            .eq('id', taskId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
