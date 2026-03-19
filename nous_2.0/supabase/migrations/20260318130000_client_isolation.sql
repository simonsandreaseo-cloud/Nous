-- Fase 4: Aislamiento Estricto para Clientes

-- 1. Redefine Projects Visibility for Clients
-- Managers and above see all team projects.
-- Clients ONLY see projects where they are in project_members.
DROP POLICY IF EXISTS "Users can view projects of their teams" ON public.projects;

CREATE POLICY "Users can view projects with role-based isolation" ON public.projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm 
            WHERE tm.team_id = projects.team_id 
            AND tm.user_id = auth.uid()
            AND (
                tm.role != 'client' 
                OR 
                EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = projects.id AND pm.user_id = auth.uid())
            )
        )
    );

-- 2. Redefine Tasks Visibility
DROP POLICY IF EXISTS "Users can view tasks of their teams" ON public.tasks;

CREATE POLICY "Users can view tasks with role-based isolation" ON public.tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.team_members tm ON tm.team_id = p.team_id
            WHERE p.id::text = tasks.project_id::text 
            AND tm.user_id = auth.uid()
            AND (
                tm.role != 'client' 
                OR 
                EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
            )
        )
    );

-- 3. Ensure Clients cannot see all team members in the sidebar? 
-- The user plan didn't specify this, but usually clients only see the manager.
-- For now, we keep team visibility as is, but we could restrict it later.

NOTIFY pgrst, 'reload schema';
