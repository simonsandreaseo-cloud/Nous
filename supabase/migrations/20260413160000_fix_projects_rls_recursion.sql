-- 1. Helper Function (SECURITY DEFINER bypasses RLS)
-- Checks if the user has access to the project via ownership, team membership, or client assignment
CREATE OR REPLACE FUNCTION public.check_project_access(p_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_owner BOOLEAN;
    t_id UUID;
    t_role text;
    is_project_member BOOLEAN;
BEGIN
    -- 1. Is the user the direct owner?
    SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = p_id AND user_id = auth.uid()) INTO is_owner;
    IF is_owner THEN RETURN TRUE; END IF;

    -- 2. What team does this project belong to?
    SELECT team_id INTO t_id FROM public.projects WHERE id = p_id;
    IF t_id IS NULL THEN RETURN FALSE; END IF;

    -- 3. What is the user's role in this team?
    SELECT role INTO t_role FROM public.team_members WHERE team_id = t_id AND user_id = auth.uid();
    
    -- If user is in the team and is NOT a client, they have access
    IF t_role IS NOT NULL AND t_role != 'client' THEN RETURN TRUE; END IF;

    -- 4. If user is a client, are they explicitly added to this project?
    IF t_role = 'client' THEN
        SELECT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = p_id AND user_id = auth.uid()) INTO is_project_member;
        IF is_project_member THEN RETURN TRUE; END IF;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Clean up old recursive policies
DROP POLICY IF EXISTS "Users can view projects with role-based isolation" ON public.projects;
DROP POLICY IF EXISTS "Users can view tasks with role-based isolation" ON public.tasks;

-- 3. Recreate safe policies
CREATE POLICY "Users can view projects with role-based isolation" ON public.projects
    FOR SELECT USING (
        user_id = auth.uid() OR public.check_project_access(id)
    );

CREATE POLICY "Users can view tasks with role-based isolation" ON public.tasks
    FOR SELECT USING (
        public.check_project_access(project_id)
    );

-- 4. Reload schema cache
NOTIFY pgrst, 'reload schema';
