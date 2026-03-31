-- Migration to create the project_inventory table for automated URL management
-- Date: 2026-03-30

-- 1. Create the inventory table
CREATE TABLE IF NOT EXISTS public.project_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    type TEXT DEFAULT 'page', -- 'page', 'post', 'product', etc.
    last_synced_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, url)
);

-- 2. Performance Indexing
CREATE INDEX IF NOT EXISTS idx_project_inventory_project_id ON public.project_inventory(project_id);

-- 3. Enable RLS
ALTER TABLE public.project_inventory ENABLE ROW LEVEL SECURITY;

-- 4. Simple RLS Policy (Access tied to project owner or project membership)
-- Since the app uses a team-based architecture, we'll allow all authenticated users
-- for now, or match the project-level access if we have a robust project_members check.
-- For simplicity and to match common patterns in this repo:
CREATE POLICY "Users can manage inventory for accessible projects"
ON public.project_inventory FOR ALL
TO authenticated
USING (
    project_id IN (
        SELECT id FROM public.projects 
        WHERE user_id = auth.uid()
        OR team_id IN (
            SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
        )
    )
);

-- 5. Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
