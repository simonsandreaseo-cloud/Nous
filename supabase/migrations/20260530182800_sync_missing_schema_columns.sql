-- Sincronizar columnas faltantes detectadas en los tipos de TypeScript

-- 1. projects table missing columns
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS nous_extractors jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS current_sprint_start timestamp with time zone,
ADD COLUMN IF NOT EXISTS current_sprint_end timestamp with time zone,
ADD COLUMN IF NOT EXISTS i18n_settings jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_discovery_at timestamp with time zone;

-- 2. tasks table missing columns
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS associated_url text,
ADD COLUMN IF NOT EXISTS secondary_url text;

-- 3. teams table missing columns
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS header_color text,
ADD COLUMN IF NOT EXISTS icon_color text,
ADD COLUMN IF NOT EXISTS icon_url text,
ADD COLUMN IF NOT EXISTS icon_library text;

-- 4. team_members table missing columns
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS presence_status text,
ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS current_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

-- 5. time_entries table missing columns
ALTER TABLE public.time_entries
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS duration_minutes integer,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- 6. activity_logs table missing columns
ALTER TABLE public.activity_logs
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS action text,
ADD COLUMN IF NOT EXISTS entity_type text,
ADD COLUMN IF NOT EXISTS entity_id uuid,
ADD COLUMN IF NOT EXISTS details jsonb;

-- Recargar el esquema de PostgREST para evitar errores de cache
NOTIFY pgrst, 'reload schema';
