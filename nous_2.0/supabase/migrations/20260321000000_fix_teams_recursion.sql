-- 1. Helper Function (SECURITY DEFINER bypasses RLS)
-- This function checks if the current user has access (owner or member) to a team
-- without triggering RLS recursively.
CREATE OR REPLACE FUNCTION public.check_team_access(t_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_owner BOOLEAN;
    is_member BOOLEAN;
BEGIN
    -- Check if user is owner of the team (from teams table)
    SELECT EXISTS (SELECT 1 FROM public.teams WHERE id = t_id AND owner_id = auth.uid()) INTO is_owner;
    IF is_owner THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user is a member of the team (from team_members table)
    SELECT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = t_id AND user_id = auth.uid()) INTO is_member;
    IF is_member THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Clean up old recursive policies
-- Drop all conflicting policies to start fresh
DROP POLICY IF EXISTS "Users can view teams they have access to" ON public.teams;
DROP POLICY IF EXISTS "Owners can manage their teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;

DROP POLICY IF EXISTS "View team members" ON public.team_members;
DROP POLICY IF EXISTS "Owners can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can manage their own membership" ON public.team_members;
DROP POLICY IF EXISTS "Owners and Admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can insert themselves as team owners" ON public.team_members;

-- 3. Teams Policies
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can create teams" 
    ON public.teams FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can view teams they have access to" 
    ON public.teams FOR SELECT TO authenticated 
    USING (owner_id = auth.uid() OR public.check_team_access(id));

CREATE POLICY "Owners can manage their teams" 
    ON public.teams FOR ALL TO authenticated 
    USING (owner_id = auth.uid());

-- 4. Team Members Policies
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Allow initial insertion of own record (broken during team creation otherwise)
CREATE POLICY "Users can manage their own membership"
    ON public.team_members FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "View team members" 
    ON public.team_members FOR SELECT TO authenticated
    USING (public.check_team_access(team_id));

CREATE POLICY "Owners can manage team members" 
    ON public.team_members FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND owner_id = auth.uid())
    );

-- 5. Reload Schema
NOTIFY pgrst, 'reload schema';
