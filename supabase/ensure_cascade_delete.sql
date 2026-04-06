-- Ensure all tables referencing projects have ON DELETE CASCADE
-- This prevents projects from "reappearing" if the delete was blocked by foreign keys

-- 1. content_tasks
ALTER TABLE IF EXISTS public.content_tasks 
DROP CONSTRAINT IF EXISTS content_tasks_project_id_fkey,
ADD CONSTRAINT content_tasks_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- 2. gsc_daily_metrics (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gsc_daily_metrics') THEN
        ALTER TABLE public.gsc_daily_metrics 
        DROP CONSTRAINT IF EXISTS gsc_daily_metrics_project_id_fkey,
        ADD CONSTRAINT gsc_daily_metrics_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. saved_reports
ALTER TABLE IF EXISTS public.saved_reports 
DROP CONSTRAINT IF EXISTS saved_reports_project_id_fkey,
ADD CONSTRAINT saved_reports_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- 4. project_settings (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_settings') THEN
        ALTER TABLE public.project_settings 
        DROP CONSTRAINT IF EXISTS project_settings_project_id_fkey,
        ADD CONSTRAINT project_settings_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
    END IF;
END $$;
