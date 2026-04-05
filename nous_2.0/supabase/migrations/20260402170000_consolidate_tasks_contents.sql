-- Migration to consolidate 'contents' into 'tasks' table
-- This allows both the Planner (Editorial Calendar) and Writer Studio to use a single unified source of truth.

BEGIN;

-- 1. Add missing columns to 'tasks' table if they don't exist
-- We first change 'id' to UUID if it's currently bigint to avoid type conflicts with 'contents'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'id' AND data_type = 'bigint'
    ) THEN
        -- 1.A Handle dependencies (team_members.current_task_id)
        -- We drop the constraint first
        ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_current_task_id_fkey;
        
        -- We convert the column in team_members as well
        -- Setting it to NULL for existing rows to avoid bigint->uuid cast issues 
        -- since we are generating new random UUIDs for tasks anyway.
        ALTER TABLE public.team_members ALTER COLUMN current_task_id TYPE UUID USING NULL;

        -- 1.B Now handle tasks table
        -- If it's bigint and identity, we drop the identity first
        ALTER TABLE public.tasks ALTER COLUMN id DROP IDENTITY IF EXISTS;
        
        -- Then change type to UUID
        ALTER TABLE public.tasks ALTER COLUMN id TYPE UUID USING (gen_random_uuid());
        ALTER TABLE public.tasks ALTER COLUMN id SET DEFAULT gen_random_uuid();

        -- 1.C Restore connection if needed (optional, but good practice)
        ALTER TABLE public.team_members ADD CONSTRAINT team_members_current_task_id_fkey 
        FOREIGN KEY (current_task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS content_body TEXT,
ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS seo_data JSONB DEFAULT '{}'::jsonb;

-- 2. Update status check constraint to use the NEW editorial lifecycle
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
CHECK (status IN (
    'idea', 
    'investigacion_proceso', 
    'por_redactar', 
    'en_redaccion', 
    'por_corregir', 
    'publicado',
    'todo',      -- Legacy (mapped to idea/por_redactar)
    'drafting',  -- Legacy (mapped to en_redaccion)
    'review',    -- Legacy (mapped to por_corregir)
    'done'       -- Legacy (mapped to publicado)
));

-- 3. (Optional) Sync existing data from 'contents' to 'tasks'
-- We map old 'contents' statuses to the new lifecycle
INSERT INTO public.tasks (
    id, project_id, title, target_keyword, status, content_body, seo_data, created_at
)
SELECT 
    id, project_id, title, target_keyword, 
    CASE 
        WHEN status = 'idea' THEN 'idea'
        WHEN status = 'briefing' THEN 'investigacion_proceso'
        WHEN status = 'drafting' THEN 'en_redaccion'
        WHEN status = 'review' THEN 'por_corregir'
        WHEN status = 'scheduled' THEN 'publicado'
        WHEN status = 'published' THEN 'publicado'
        ELSE 'idea'
    END, 
    content_body, seo_data, created_at
FROM public.contents
ON CONFLICT (id) DO UPDATE SET
    content_body = EXCLUDED.content_body,
    seo_data = EXCLUDED.seo_data,
    status = EXCLUDED.status;

-- 4. Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
