BEGIN;

-- Mega-Implementation Phase 2: Consolidate Tasks
-- 1. Rename content_tasks to tasks
ALTER TABLE IF EXISTS public.content_tasks RENAME TO tasks;

-- 2. Add missing fields from the old schema logic
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS brief text,
ADD COLUMN IF NOT EXISTS scheduled_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS content_type text,
ADD COLUMN IF NOT EXISTS volume numeric,
ADD COLUMN IF NOT EXISTS viability text,
ADD COLUMN IF NOT EXISTS refs text[],
ADD COLUMN IF NOT EXISTS word_count integer,
ADD COLUMN IF NOT EXISTS ai_percentage numeric,
ADD COLUMN IF NOT EXISTS docs_url text,
ADD COLUMN IF NOT EXISTS layout_status boolean,
ADD COLUMN IF NOT EXISTS url text;

COMMIT;
