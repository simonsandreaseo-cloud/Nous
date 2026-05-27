-- Create the missing team_projects table that the frontend is expecting

CREATE TABLE IF NOT EXISTS public.team_projects (
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (team_id, project_id)
);

ALTER TABLE public.team_projects ENABLE ROW LEVEL SECURITY;

-- Policy to view team_projects
DROP POLICY IF EXISTS "View team_projects" ON public.team_projects;
CREATE POLICY "View team_projects" ON public.team_projects
    FOR SELECT TO authenticated
    USING (
        public.check_team_access(team_id) OR
        EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
    );

-- Policy to insert/manage team_projects
DROP POLICY IF EXISTS "Manage team_projects" ON public.team_projects;
CREATE POLICY "Manage team_projects" ON public.team_projects
    FOR ALL TO authenticated
    USING (
        public.check_team_access(team_id)
    )
    WITH CHECK (
        public.check_team_access(team_id)
    );

-- Migrate existing 1:N relations to M:N table (backward compatibility)
INSERT INTO public.team_projects (team_id, project_id)
SELECT team_id, id FROM public.projects WHERE team_id IS NOT NULL
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
