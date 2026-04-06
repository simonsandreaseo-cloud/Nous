-- Fix Teams RLS for independent creation
BEGIN;

-- 1. Allow authenticated users to create a team
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
CREATE POLICY "Authenticated users can create teams" 
    ON public.teams 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = owner_id);

-- 2. Allow users to insert themselves as owners during team creation
DROP POLICY IF EXISTS "Users can insert themselves as team owners" ON public.team_members;
CREATE POLICY "Users can insert themselves as team owners"
    ON public.team_members
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id AND role = 'owner');

-- 3. Update 'teams' select policy to be more inclusive for owners
-- (Existing policy: USING (EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid())))
-- Let's ensure owners can always see their teams even if member table is lagging
DROP POLICY IF EXISTS "Owners can manage their teams" ON public.teams;
CREATE POLICY "Owners can manage their teams" 
    ON public.teams 
    FOR ALL
    TO authenticated
    USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid()));

-- 4. Update 'team_members' ALL policy to avoid infinite recursion
-- Instead of checking role via another SELECT in the same table, we check role in the current row or via team owner
DROP POLICY IF EXISTS "Owners and Admins can manage team members" ON public.team_members;
CREATE POLICY "Owners and Admins can manage team members"
    ON public.team_members
    FOR ALL
    TO authenticated
    USING (
        -- Can manage if I am the owner of the team
        EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND owner_id = auth.uid())
        -- Or if I am an owner/manager member already (careful with recursion)
        OR (user_id = auth.uid() AND role IN ('owner', 'manager'))
    );

COMMIT;
