-- Migration to create task_competitors table
-- Mega Refactor: Studio, Task Competitors DB, Research Fixes

-- 1. Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create the table
CREATE TABLE IF NOT EXISTS public.task_competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    rank_position INTEGER,
    headers JSONB DEFAULT '[]'::jsonb,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Indexing for fast lookups by task
CREATE INDEX IF NOT EXISTS idx_task_competitors_task_id ON public.task_competitors(task_id);

-- 4. Enable RLS
ALTER TABLE public.task_competitors ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Allow users to manage competitors for tasks in their projects/teams
CREATE POLICY "Users can manage competitors for their tasks"
ON public.task_competitors FOR ALL
TO authenticated
USING (
    task_id IN (
        SELECT t.id FROM public.tasks t
        JOIN public.projects p ON p.id = t.project_id
        WHERE p.user_id = auth.uid()
        OR p.team_id IN (
            SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
        )
    )
);

-- 6. Reload Schema Cache for PostgREST
NOTIFY pgrst, 'reload schema';
