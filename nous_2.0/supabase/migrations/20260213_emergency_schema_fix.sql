-- Emergency Fix for seo_reports table (Comprehensive)
-- 1. Ensure Table Exists
create table if not exists public.seo_reports (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null,
  project_id uuid null references projects (id) on delete cascade,
  user_id uuid not null,
  title text null,
  html_content text null,
  payload_json jsonb null,
  period_label text null,
  constraint seo_reports_pkey primary key (id)
);

-- 2. Add columns if they don't exist (Idempotent check)
DO $$
BEGIN
    -- payload_json
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seo_reports' AND column_name = 'payload_json') THEN
        ALTER TABLE public.seo_reports ADD COLUMN payload_json jsonb DEFAULT '{}'::jsonb;
    END IF;

    -- html_content
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seo_reports' AND column_name = 'html_content') THEN
        ALTER TABLE public.seo_reports ADD COLUMN html_content text;
    END IF;
    
    -- period_label
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seo_reports' AND column_name = 'period_label') THEN
        ALTER TABLE public.seo_reports ADD COLUMN period_label text;
    END IF;
END $$;

-- 3. Force Schema Cache Reload
-- This is critical for PostgREST to see the new columns immediately
NOTIFY pgrst, 'reload schema';

