import { supabase } from '@/lib/supabase';

export interface TimeSession {
    id: string;
    project_id?: string;
    started_at: string;
    ended_at?: string;
    duration?: number; // Calculated in frontend
}

export interface ActivityLog {
    id: string;
    session_id: string;
    window_title: string;
    app_name: string;
    url?: string;
    activity_percentage: number;
    screenshot_path?: string;
    created_at: string;
}

export class ActivityService {
    /**
     * Starts a new time tracking session.
     */
    static async startSession(projectId?: string): Promise<TimeSession> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('time_sessions')
            .insert({
                user_id: user.id,
                project_id: projectId,
                started_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return data as TimeSession;
    }

    /**
     * Ends the current session.
     */
    static async endSession(sessionId: string): Promise<void> {
        const { error } = await supabase
            .from('time_sessions')
            .update({ ended_at: new Date().toISOString() })
            .eq('id', sessionId);

        if (error) throw error;
    }

    /**
     * Logs activity (called by Electron app or extension).
     */
    static async logActivity(log: Omit<ActivityLog, 'id' | 'created_at'>): Promise<void> {
        const { error } = await supabase
            .from('activity_logs')
            .insert(log);

        if (error) throw error;
    }

    /**
     * Get sessions for a project (for visualization).
     */
    static async getProjectSessions(projectId: string): Promise<TimeSession[]> {
        const { data, error } = await supabase
            .from('time_sessions')
            .select('*')
            .eq('project_id', projectId)
            .order('started_at', { ascending: false });

        if (error) throw error;
        return data as TimeSession[];
    }
}
