import { supabase } from './supabase';

export interface Project {
    id: string | number;
    name: string;
    description?: string;
    owner_id: string;
    gsc_property_url?: string;
    settings?: any;
    created_at: string;
    role?: 'owner' | 'admin' | 'editor' | 'viewer'; // Computed for current user
    slug?: string;
    share_token?: string;
    public_access_level?: 'none' | 'view' | 'edit';
}

export interface ProjectMember {
    id: number;
    project_id: string | number;
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

        // Generate Slug
        const slug = name.toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove non-word chars
            .replace(/\s+/g, '-') // Replace spaces with -
            .replace(/--+/g, '-') // Replace multiple - with single -
            .trim();

        const { data, error } = await supabase
            .from('projects')
            .insert([{
                name,
                description,
                gsc_property_url: gscUrl,
                owner_id: user.id,
                slug: slug + '-' + Date.now().toString().slice(-4) // Append partial TS to ensure uniqueness
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getProjectDetails(identifier: string | number) {
        let query = supabase.from('projects').select('*');

        // Check if identifier is likely a UUID (basic validation) or ID
        // But simplifying: assume param is slug if we changed routes to slug.
        // Or better: try to match either.

        // Since Supabase doesn't support convenient "OR" across columns easily in one chained `eq` without syntax,
        // and we want to prioritize SLUG if implementation is clean.
        // Let's assume the 'identifier' IS the slug if we updated the router.

        // However, to support both legacy (UUID/ID) and Slug during transition or mixed use:
        // We can check if 'identifier' looks like a UUID.

        const isUuid = typeof identifier === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

        if (isUuid || typeof identifier === 'number') {
            query = query.eq('id', identifier);
        } else {
            query = query.eq('slug', identifier);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("Project not found or access denied");
        return data;
    },

    async getMembers(projectId: string | number) {
        // Get active members using secure RPC
        const { data: members, error } = await supabase
            .rpc('get_project_members', { p_project_id: projectId });

        if (error) throw error;

        // Get pending invites
        const { data: invites, error: inviteError } = await supabase
            .from('project_invites')
            .select('*')
            .eq('project_id', projectId);

        if (inviteError) throw inviteError;

        return { members: members || [], invites: invites || [] };
    },

    async inviteMember(projectId: string | number, email: string, role: string = 'editor') {
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

    async updateProject(id: string | number, updates: Partial<Project>) {
        const { data, error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', id)
            .select()
            .maybeSingle(); // Use maybeSingle to avoid crash if 0 rows (though it should be 1)

        if (error) throw error;
        if (!data) throw new Error("No se pudo actualizar el proyecto. Verifica permisos o si existe.");
        return data;
    },

    async deleteProject(id: string | number) {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

export interface Task {
    id: string | number;
    project_id: string | number;
    title: string;
    description?: string;
    status: 'idea' | 'todo' | 'in_progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high' | 'critical';
    type?: 'task' | 'content'; // New field to distinguish types
    assignee_id?: string;
    due_date?: string;
    target_keyword?: string;
    target_url_slug?: string;
    associated_url?: string;
    secondary_url?: string; // New field for metrics tracking
    tracking_metrics?: boolean; // New field to enable GSC tracking
    completed_at?: string; // New field for completion timestamp
    locked_by?: string;
    locked_until?: string;
    created_at: string;
    assignee?: { email: string; user_metadata: any };
    share_token?: string;
    public_access_level?: 'none' | 'view' | 'edit';
}

export const TaskService = {
    async getTasks(projectId: string | number) {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Task[];
    },

    async createTask(projectId: string | number, task: Partial<Task>) {
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

    async updateTask(id: string | number, updates: Partial<Task>) {
        const { data, error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteTask(id: string | number) {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};
