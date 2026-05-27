-- Re-apply the team recursion fixes that were accidentally overwritten in 20260410_ensure_profiles_and_teams.sql

-- 1. Drop bad Teams Policy introduced in 20260410
DROP POLICY IF EXISTS "Users can view teams they are members of" ON public.teams;

-- 2. Restore Team Members Policy
DROP POLICY IF EXISTS "View team members" ON public.team_members;

CREATE POLICY "View team members" 
    ON public.team_members FOR SELECT TO authenticated
    USING (public.check_team_access(team_id));

-- 3. Reload schema cache
NOTIFY pgrst, 'reload schema';
