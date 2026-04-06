-- Phase 6: Task Assignment & Personal Workflow (FIXED for Type Mismatch)
BEGIN;

-- 1. Add assignment columns to tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

-- 2. Index for performance on the personal dashboard
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);

-- 3. Update RLS policies to support Personal View
-- We use ::text cast to avoid bigint vs uuid operator errors (legacy compatibility)

DROP POLICY IF EXISTS "Users can update tasks assigned to them" ON public.tasks;
CREATE POLICY "Users can update tasks assigned to them"
    ON public.tasks
    FOR UPDATE
    TO authenticated
    USING (
        assigned_to = auth.uid() 
        OR project_id::text IN (
            SELECT id::text FROM public.projects WHERE user_id = auth.uid()
        )
        OR project_id::text IN (
            SELECT project_id::text FROM public.project_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view tasks assigned to them" ON public.tasks;
CREATE POLICY "Users can view tasks assigned to them"
    ON public.tasks
    FOR SELECT
    TO authenticated
    USING (
        assigned_to = auth.uid()
        OR project_id::text IN (
            SELECT project_id::text FROM public.project_members WHERE user_id = auth.uid()
        )
    );

COMMIT;
