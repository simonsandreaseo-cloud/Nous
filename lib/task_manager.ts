import { supabase } from './supabase';

export interface Project {
    id: number;
    name: string;
    description?: string;
    owner_id: string;
    gsc_property_url?: string;
    settings?: any;
    created_at: string;
    role?: 'owner' | 'admin' | 'editor' | 'viewer'; // Computed for current user
}

export interface ProjectMember {
    id: number;
    project_id: number;
    user_id: string;
    role: 'admin' | 'editor' | 'viewer';
    status: 'active' | 'pending';
    email?: string; // Joined from auth.users or invites
}

export const ProjectService = {

    async getProjects() {
        // Fetch projects where user is owner
        const { data: ownedData, error: ownedError } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (ownedError) throw ownedError;

        // Fetch projects where user is a member
        const { data: memberData, error: memberError } = await supabase
            .from('project_members')
            .select('project_id, role, projects(*)')
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

        if (memberError) throw memberError;

        // Combine and format
        const ownedProjects = ownedData.map((p: any) => ({ ...p, role: 'owner' }));
        const memberProjects = memberData.map((m: any) => ({ ...m.projects, role: m.role }));

        // Dedup logic if needed (though queries shouldn't overlap usually if RLS is strict, but safe to filter)
        return [...ownedProjects, ...memberProjects];
    },

    async createProject(name: string, description?: string, gscUrl?: string) {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error("Not authenticated");

        const { data, error } = await supabase
            .from('projects')
            .insert([{
                name,
                description,
                gsc_property_url: gscUrl,
                owner_id: user.id
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getProjectDetails(id: number) {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async getMembers(projectId: number) {
        // Get active members
        const { data: members, error } = await supabase
            .from('project_members')
            .select('*, user:user_id(email, user_metadata)')
            .eq('project_id', projectId);

        if (error) throw error;

        // Get pending invites
        const { data: invites, error: inviteError } = await supabase
            .from('project_invites')
            .select('*')
            .eq('project_id', projectId);

        if (inviteError) throw inviteError;

        return { members: members || [], invites: invites || [] };
    },

    async inviteMember(projectId: number, email: string, role: string = 'editor') {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error("Not authenticated");

        // 1. Check if user already exists in system to add directly (Optional optimization)
        // For MVP, we'll just create an invite record.

        const { data, error } = await supabase
            .from('project_invites')
            .insert([{
                project_id: projectId,
                email,
                role,
                invited_by: user.id,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteProject(id: number) {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

export interface Task {
    id: number;
    project_id: number;
    title: string;
    description?: string;
    status: 'idea' | 'todo' | 'in_progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high' | 'critical';
    assignee_id?: string;
    due_date?: string;
    target_keyword?: string;
    target_url_slug?: string;
    associated_url?: string;
    created_at: string;
    assignee?: { email: string; user_metadata: any };
}

export const TaskService = {
    async getTasks(projectId: number) {
        const { data, error } = await supabase
            .from('tasks')
            .select('*, assignee:assignee_id(email, user_metadata)')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Task[];
    },

    async createTask(projectId: number, task: Partial<Task>) {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error("Not authenticated");

        const { data, error } = await supabase
            .from('tasks')
            .insert([{
                ...task,
                project_id: projectId,
                created_by: user.id
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateTask(id: number, updates: Partial<Task>) {
        const { data, error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteTask(id: number) {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};
