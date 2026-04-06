-- Agency Roles & RBAC (Phase 7)

-- 1. Update Team Members roles checking
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_role_check;
ALTER TABLE public.team_members ADD CONSTRAINT team_members_role_check CHECK (role IN ('owner', 'partner', 'manager', 'specialist', 'client'));

-- 2. Add Presence Tracking fields to Team Members
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS presence_status TEXT DEFAULT 'offline' CHECK (presence_status IN ('online', 'busy', 'offline'));
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS current_task_id BIGINT REFERENCES public.tasks(id) ON DELETE SET NULL;


-- 3. Refine RLS Policies for Projects
DROP POLICY IF EXISTS "Users can view projects of their teams" ON public.projects;

-- Projects: Partners see all, Managers see their team, Specialists see their team, Clients see their team.
CREATE POLICY "Users can view projects of their teams" ON public.projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm 
            WHERE tm.team_id = projects.team_id 
            AND tm.user_id = auth.uid()
        )
    );

-- Projects: All roles except 'client' can create projects within their team (Managers and above usually)
-- For now, let's say 'manager' and above can manage projects
CREATE POLICY "Managers and above can manage projects" ON public.projects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm 
            WHERE tm.team_id = projects.team_id 
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'partner', 'manager')
        )
    );

-- 4. Refine RLS Policies for Tasks
-- Tasks inherit visibility from projects usually, but let's be explicit
DROP POLICY IF EXISTS "Users can view tasks of their active projects" ON public.tasks;
CREATE POLICY "Users can view tasks of their teams" ON public.tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.team_members tm ON tm.team_id = p.team_id
            WHERE p.id::text = tasks.project_id::text AND tm.user_id = auth.uid()
        )
    );

-- Clients can't create or modify tasks
CREATE POLICY "Specialists and above can manage tasks" ON public.tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.team_members tm ON tm.team_id = p.team_id
            WHERE p.id::text = tasks.project_id::text 
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'partner', 'manager', 'specialist')
        )
    );


-- 5. Real-time Presence Notification
NOTIFY pgrst, 'reload schema';
