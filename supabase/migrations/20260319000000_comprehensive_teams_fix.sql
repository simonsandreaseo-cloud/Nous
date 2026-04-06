-- Comprehensive Fix for Teams & Team Members RLS
-- Copy and run this in the Supabase SQL Editor if you can't see your created teams.

-- 1. Helper Function (Bypass RLS for checking membership)
CREATE OR REPLACE FUNCTION public.is_team_member(t_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = t_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Teams Policies
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
CREATE POLICY "Authenticated users can create teams" 
    ON public.teams FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can manage their teams" ON public.teams;
CREATE POLICY "Owners can manage their teams" 
    ON public.teams FOR ALL TO authenticated 
    USING (owner_id = auth.uid() OR public.is_team_member(id));

DROP POLICY IF EXISTS "Users can view teams they are members of" ON public.teams;
CREATE POLICY "Users can view teams they are members of" 
    ON public.teams FOR SELECT TO authenticated 
    USING (owner_id = auth.uid() OR public.is_team_member(id));

-- 3. Team Members Policies
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert themselves as team owners" ON public.team_members;
CREATE POLICY "Users can insert themselves as team owners"
    ON public.team_members FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND role = 'owner');

DROP POLICY IF EXISTS "View team members" ON public.team_members;
CREATE POLICY "View team members" 
    ON public.team_members FOR SELECT TO authenticated
    USING (
        public.is_team_member(team_id)
        OR EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "Manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Owners and Admins can manage team members" ON public.team_members;
CREATE POLICY "Manage team members"
    ON public.team_members FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND owner_id = auth.uid())
        OR (user_id = auth.uid() AND role IN ('owner', 'partner', 'manager'))
    );

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
