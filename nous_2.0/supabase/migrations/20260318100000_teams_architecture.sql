-- Refactor: Teams & Projects Architecture

-- 1. Create Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME zone DEFAULT now(),
    updated_at TIMESTAMP WITH TIME zone DEFAULT now()
);

-- 2. Create Team Members Table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMP WITH TIME zone DEFAULT now(),
    UNIQUE(team_id, user_id)
);

-- 3. Add team_id to Projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- 4. Data Migration: Create default teams for existing project owners
DO $$
DECLARE
    u_id UUID;
    t_id UUID;
BEGIN
    FOR u_id IN SELECT DISTINCT user_id FROM public.projects WHERE team_id IS NULL LOOP
        -- Create a default team for the user
        INSERT INTO public.teams (name, owner_id)
        VALUES ('Mi Equipo Personal', u_id)
        RETURNING id INTO t_id;

        -- Add user as owner of their own team
        INSERT INTO public.team_members (team_id, user_id, role)
        VALUES (t_id, u_id, 'owner');

        -- Link projects to the new team
        UPDATE public.projects
        SET team_id = t_id
        WHERE user_id = u_id AND team_id IS NULL;
    END LOOP;
END $$;

-- 5. RLS Policies for Teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Teams: Owner can do everything. Admins/Members can see.
CREATE POLICY "Users can view teams they are members of" ON public.teams
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid())
    );

CREATE POLICY "Owners can manage their teams" ON public.teams
    USING (owner_id = auth.uid());

-- Team Members: Owners and Admins can manage.
CREATE POLICY "View team members" ON public.team_members
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid())
    );

CREATE POLICY "Owners and Admins can manage team members" ON public.team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm 
            WHERE tm.team_id = team_members.team_id 
            AND tm.user_id = auth.uid() 
            AND tm.role IN ('owner', 'admin')
        )
    );

-- 6. Update Project RLS (Optional but recommended)
-- Projects should now be visible to all team members.
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view projects of their teams" ON public.projects
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.team_members WHERE team_id = projects.team_id AND user_id = auth.uid())
    );

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
