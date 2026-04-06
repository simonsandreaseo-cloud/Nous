
-- Migration: Add missing columns to tasks table for Editorial Calendar and Content Tracking
-- This script ensures the tasks table has all necessary fields for content management, 
-- locking, and GSC metrics tracking.

DO $$ 
BEGIN
    -- 1. Add 'type' column to distinguish between general tasks and content/articles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'type') THEN
        ALTER TABLE tasks ADD COLUMN type text DEFAULT 'task' CHECK (type IN ('task', 'content'));
    END IF;

    -- 2. Add 'secondary_url' for tracking multiple URLs (e.g. for metrics)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'secondary_url') THEN
        ALTER TABLE tasks ADD COLUMN secondary_url text;
    END IF;

    -- 3. Add 'tracking_metrics' toggle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'tracking_metrics') THEN
        ALTER TABLE tasks ADD COLUMN tracking_metrics boolean DEFAULT false;
    END IF;

    -- 4. Add 'completed_at' for performance tracking over time
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'completed_at') THEN
        ALTER TABLE tasks ADD COLUMN completed_at timestamp with time zone;
    END IF;

    -- 5. Add Content Locking fields for collaborative editing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'locked_by') THEN
        ALTER TABLE tasks ADD COLUMN locked_by uuid REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'locked_until') THEN
        ALTER TABLE tasks ADD COLUMN locked_until timestamp with time zone;
    END IF;

    -- 6. Add Content-specific fields for the AI Redactor
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'content_status') THEN
        ALTER TABLE tasks ADD COLUMN content_status text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'content_body') THEN
        ALTER TABLE tasks ADD COLUMN content_body text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'metadata') THEN
        ALTER TABLE tasks ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
    END IF;

END $$;

-- 7. Ensure RLS Policies are correct for INSERT
-- Sometimes 'FOR ALL' with 'USING' doesn't cover 'WITH CHECK' correctly for new rows if the check depends on joined data.
-- Re-defining them explicitly to be safe.

DROP POLICY IF EXISTS "Manage tasks" ON tasks;
DROP POLICY IF EXISTS "View tasks" ON tasks;

CREATE POLICY "View tasks" ON tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM projects WHERE id = tasks.project_id AND owner_id = auth.uid())
  );

CREATE POLICY "Insert tasks" ON tasks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM projects WHERE id = tasks.project_id AND owner_id = auth.uid())
  );

CREATE POLICY "Update tasks" ON tasks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM projects WHERE id = tasks.project_id AND owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM projects WHERE id = tasks.project_id AND owner_id = auth.uid())
  );

CREATE POLICY "Delete tasks" ON tasks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM projects WHERE id = tasks.project_id AND owner_id = auth.uid())
  );
