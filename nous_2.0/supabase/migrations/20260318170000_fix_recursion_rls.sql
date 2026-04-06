-- Fix Infinite Recursion in Team Members Policies
-- Run this in the Supabase SQL Editor

-- 1. Create a helper function to check membership without triggering RLS
-- SECURITY DEFINER runs the query with the permissions of the creator (usually postgres), bypassing RLS
CREATE OR REPLACE FUNCTION public.is_team_member(t_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = t_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop old recursive policies
DROP POLICY IF EXISTS "View team members" ON public.team_members;
DROP POLICY IF EXISTS "Owners and Admins can manage team members" ON public.team_members;

-- 3. Create fresh, non-recursive policies
-- SELECT: Anyone who is a member can see all members of that team
CREATE POLICY "View team members" 
    ON public.team_members
    FOR SELECT 
    TO authenticated
    USING (
        -- Break recursion by using the SECURITY DEFINER function
        public.is_team_member(team_id)
        -- Or allow if user is the team owner (via teams table)
        OR EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND owner_id = auth.uid())
    );

-- ALL (Manage): Owners of the team or members with elevated roles can manage
CREATE POLICY "Manage team members"
    ON public.team_members
    FOR ALL
    TO authenticated
    USING (
        -- Can manage if I am the owner of the team (check via teams table to avoid recursion)
        EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND owner_id = auth.uid())
        -- Or if I am an owner/manager/partner already (check current row if it matches us)
        OR (user_id = auth.uid() AND role IN ('owner', 'partner', 'manager'))
    );

-- 4. Notify Schema Reload
NOTIFY pgrst, 'reload schema';
