-- Add custom_permissions JSONB column to project_members and project_invites
-- This enables granular access control (Admin, Edit, Take Tasks, etc.)

BEGIN;

ALTER TABLE public.project_members
ADD COLUMN IF NOT EXISTS custom_permissions jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.project_invites
ADD COLUMN IF NOT EXISTS custom_permissions jsonb DEFAULT '{}'::jsonb;

-- Basic RLS Policies for Teams
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view members of their projects') THEN
        CREATE POLICY "Users can view members of their projects" ON public.project_members FOR SELECT USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
        CREATE POLICY "Users can manage members of their projects" ON public.project_members FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view invites of their projects') THEN
        CREATE POLICY "Users can view invites of their projects" ON public.project_invites FOR SELECT USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
        CREATE POLICY "Users can manage invites of their projects" ON public.project_invites FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
    END IF;
END $$;

COMMIT;
