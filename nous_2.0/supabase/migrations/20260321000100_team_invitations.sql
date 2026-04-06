-- 1. Add status to team_members
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive'));

-- 2. Create team_invites table
CREATE TABLE IF NOT EXISTS public.team_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'specialist',
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    custom_permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(team_id, email)
);

-- 3. RLS for team_invites
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Owners can manage team invites
DROP POLICY IF EXISTS "Owners can manage team invites" ON public.team_invites;
CREATE POLICY "Owners can manage team invites" 
    ON public.team_invites FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.teams WHERE id = team_invites.team_id AND owner_id = auth.uid()));

-- Policy: Invited users can view their invites (using auth.jwt() for safety)
DROP POLICY IF EXISTS "Invited users can view their invites" ON public.team_invites;
CREATE POLICY "Invited users can view their invites" 
    ON public.team_invites FOR SELECT TO authenticated
    USING (email = (auth.jwt() ->> 'email')::text);

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
