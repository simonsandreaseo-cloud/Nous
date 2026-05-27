-- Migration: 00000000_enable_exec_sql.sql
-- Enable execution of dynamic SQL from the client (Required for automated migrations)
create or replace function exec_sql(sql text)
returns void
language plpgsql
security definer
as $$
begin
  execute sql;
end;
$$;


-- Migration: 20240209000000_init_projects.sql
-- Create projects table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  domain text,
  budget_settings jsonb default '{"type": "count", "target": 10, "current": 0}'::jsonb,
  scraper_settings jsonb default '{"paths": ["/blog/"]}'::jsonb,
  gsc_connected boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create contents table
create table public.contents (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  status text check (status in ('idea', 'briefing', 'drafting', 'review', 'scheduled', 'published')) default 'idea',
  scheduled_date timestamp with time zone,
  content_body text,
  metrics jsonb default '{}'::jsonb, -- Store GSC metrics snapshot here
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.projects enable row level security;
alter table public.contents enable row level security;

-- Policies
create policy "Users can view their own projects" 
  on public.projects for select 
  using (auth.uid() = user_id);

create policy "Users can insert their own projects" 
  on public.projects for insert 
  with check (auth.uid() = user_id);

create policy "Users can update their own projects" 
  on public.projects for update 
  using (auth.uid() = user_id);

create policy "Users can delete their own projects" 
  on public.projects for delete 
  using (auth.uid() = user_id);

create policy "Users can manage contents of their projects" 
  on public.contents for all 
  using (
    project_id in (select id from public.projects where user_id = auth.uid())
  );


-- Migration: 20240211000001_editorial_calendar.sql
-- Create content_tasks table for editorial calendar
CREATE TABLE IF NOT EXISTS public.content_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    brief text,
    scheduled_date timestamp with time zone,
    status text CHECK (status IN ('todo', 'in_progress', 'review', 'done')) DEFAULT 'todo',
    content_type text DEFAULT 'blog',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create content_drafts table
CREATE TABLE IF NOT EXISTS public.content_drafts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    title text,
    html_content text,
    strategy_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create task_artifacts table for linking drafts to tasks
CREATE TABLE IF NOT EXISTS public.task_artifacts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid REFERENCES public.content_tasks(id) ON DELETE CASCADE NOT NULL,
    artifact_type text NOT NULL, -- 'draft', 'image', etc.
    artifact_reference uuid NOT NULL, -- ID of the drafted content
    name text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(task_id, artifact_type, artifact_reference)
);

-- Enable RLS
ALTER TABLE public.content_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_artifacts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage content_tasks of their projects" 
ON public.content_tasks FOR ALL 
USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
);

CREATE POLICY "Users can manage their own drafts" 
ON public.content_drafts FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage artifacts of their project tasks" 
ON public.task_artifacts FOR ALL 
USING (
    task_id IN (
        SELECT id FROM public.content_tasks WHERE project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    )
);


-- Migration: 20250212_create_seo_reports.sql
create table if not exists public.seo_reports (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null,
  project_id uuid null references projects (id) on delete cascade,
  user_id uuid not null, -- references auth.users (id) omitted to avoid complex dependency if auth schema differs
  title text null,
  html_content text null,
  payload_json jsonb null,
  period_label text null,
  constraint seo_reports_pkey primary key (id)
);


-- Migration: 20260211_add_editorial_fields.sql

-- Add explicit columns for Editorial Calendar CSV fields
ALTER TABLE public.content_tasks
ADD COLUMN IF NOT EXISTS volume integer,
ADD COLUMN IF NOT EXISTS viability text, -- Maps to 'Viabilidad' (e.g. optimo, no vendemos marca)
ADD COLUMN IF NOT EXISTS refs text[], -- Maps to 'Referencias'. Stored as array of URLs.
ADD COLUMN IF NOT EXISTS word_count integer, -- Maps to 'Palabras'
ADD COLUMN IF NOT EXISTS ai_percentage integer, -- Maps to '% IA'. Stored as integer (e.g. 65)
ADD COLUMN IF NOT EXISTS docs_url text, -- Maps to 'Docs'
ADD COLUMN IF NOT EXISTS layout_status boolean DEFAULT false; -- Maps to 'Maquetado'

-- Update comments
COMMENT ON COLUMN public.content_tasks.volume IS 'Search Volume';
COMMENT ON COLUMN public.content_tasks.viability IS 'Viability/Feasibility (e.g. optimo, contenido duplicado)';
COMMENT ON COLUMN public.content_tasks.refs IS 'List of reference URLs';
COMMENT ON COLUMN public.content_tasks.ai_percentage IS 'Percentage of AI used (0-100)';
COMMENT ON COLUMN public.content_tasks.layout_status IS 'Whether the content has been laid out/formatted';


-- Migration: 20260211000002_legacy_sync.sql
-- URGENT FIX: TYPE MISMATCH RESOLUTION
-- This script detects if 'projects' uses BIGINT (Legacy) and migrates it to UUID (Nous 2.0 Standard).
-- It renames old tables to *_legacy to prevent data loss.

BEGIN;

-- 1. DETECT AND ARCHIVE LEGACY TABLES
DO $$ 
DECLARE
    pid_type text;
BEGIN
    SELECT data_type INTO pid_type 
    FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'id';

    IF pid_type = 'bigint' THEN
        RAISE NOTICE 'Legacy BIGINT schema detected. Archiving...';
        
        -- Drop foreign keys first to allow renaming
        ALTER TABLE IF EXISTS public.contents DROP CONSTRAINT IF EXISTS contents_project_id_fkey;
        ALTER TABLE IF EXISTS public.content_tasks DROP CONSTRAINT IF EXISTS content_tasks_project_id_fkey;
        ALTER TABLE IF EXISTS public.project_members DROP CONSTRAINT IF EXISTS project_members_project_id_fkey;
        
        -- Rename tables
        ALTER TABLE IF EXISTS public.projects RENAME TO projects_legacy;
        ALTER TABLE IF EXISTS public.contents RENAME TO contents_legacy;
        ALTER TABLE IF EXISTS public.content_tasks RENAME TO content_tasks_legacy;
        ALTER TABLE IF EXISTS public.task_artifacts RENAME TO task_artifacts_legacy;
        ALTER TABLE IF EXISTS public.project_members RENAME TO project_members_legacy;
        
    END IF;
END $$;

-- 2. CREATE NEW SCHEMA (UUID STANDARD)

-- Projects (Master Table)
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  domain text,
  budget_settings jsonb DEFAULT '{"type": "count", "target": 10, "current": 0}'::jsonb,
  scraper_settings jsonb DEFAULT '{"paths": ["/blog/"]}'::jsonb,
  gsc_connected boolean DEFAULT false,
  settings jsonb DEFAULT '{}'::jsonb,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Contents
CREATE TABLE IF NOT EXISTS public.contents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  status text CHECK (status IN ('idea', 'briefing', 'drafting', 'review', 'scheduled', 'published')) DEFAULT 'idea',
  scheduled_date timestamp with time zone,
  content_body text,
  metrics jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Content Tasks (Editorial)
CREATE TABLE IF NOT EXISTS public.content_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    brief text,
    scheduled_date timestamp with time zone,
    status text CHECK (status IN ('todo', 'in_progress', 'review', 'done')) DEFAULT 'todo',
    content_type text DEFAULT 'blog',
    priority text check (priority in ('low', 'medium', 'high', 'critical')) default 'medium',
    target_keyword text,
    target_url_slug text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Task Artifacts
CREATE TABLE IF NOT EXISTS public.task_artifacts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid REFERENCES public.content_tasks(id) ON DELETE CASCADE NOT NULL,
    artifact_type text NOT NULL,
    artifact_reference uuid NOT NULL,
    name text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Legacy Integration Feature: GSC Metrics
CREATE TABLE IF NOT EXISTS public.gsc_daily_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    date date NOT NULL,
    clicks integer DEFAULT 0,
    impressions integer DEFAULT 0,
    ctr double precision DEFAULT 0,
    position double precision DEFAULT 0,
    top_queries jsonb DEFAULT '[]'::jsonb,
    top_pages jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(project_id, date)
);

-- Legacy Integration Feature: Members
CREATE TABLE IF NOT EXISTS public.project_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text CHECK (role IN ('owner', 'admin', 'editor', 'viewer')) DEFAULT 'editor',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(project_id, user_id)
);

-- Legacy Integration Feature: Invites
CREATE TABLE IF NOT EXISTS public.project_invites (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'editor',
    token uuid DEFAULT gen_random_uuid(),
    invited_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + interval '7 days') NOT NULL,
    UNIQUE(project_id, email)
);

-- Legacy Integration Feature: Time Tracking
CREATE TABLE IF NOT EXISTS public.time_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid REFERENCES public.time_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    window_title text,
    app_name text,
    url text,
    activity_percentage integer,
    screenshot_path text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. ENABLE RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gsc_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES
DO $$ BEGIN
    -- Basic Owner Policies for Projects
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own projects') THEN
        CREATE POLICY "Users can view their own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    -- Contents
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage contents of their projects') THEN
        CREATE POLICY "Users can manage contents of their projects" ON public.contents FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
    END IF;
END $$;

COMMIT;


-- Migration: 20260211000003_fix_types.sql
-- NUCLEAR FIX for Type Mismatch (BigInt vs UUID)
-- The error confirms that 'projects.id' is likely BIGINT (from legacy schema), 
-- but Nous 2.0 requires it to be UUID.
-- This script will:
-- 1. Rename existing incompatible tables to *_backup
-- 2. Create correct tables with UUIDs
-- 3. Apply all new features

BEGIN;

-- 1. Backup and Move Aside Incompatible Tables
DO $$ BEGIN
    -- Check if projects exists and is BigInt
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'id' AND data_type = 'bigint'
    ) THEN
        RAISE NOTICE 'Backing up BigInt projects table...';
        ALTER TABLE IF EXISTS public.task_artifacts RENAME TO task_artifacts_legacy;
        ALTER TABLE IF EXISTS public.content_tasks RENAME TO content_tasks_legacy;
        ALTER TABLE IF EXISTS public.contents RENAME TO contents_legacy;
        ALTER TABLE IF EXISTS public.project_members RENAME TO project_members_legacy;
        ALTER TABLE IF EXISTS public.projects RENAME TO projects_legacy;
    END IF;
END $$;

-- 2. Create CORRECT Base Schema (UUIDs)
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  domain text,
  budget_settings jsonb default '{"type": "count", "target": 10, "current": 0}'::jsonb,
  scraper_settings jsonb default '{"paths": ["/blog/"]}'::jsonb,
  gsc_connected boolean default false,
  settings jsonb default '{}'::jsonb,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.contents (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  status text check (status in ('idea', 'briefing', 'drafting', 'review', 'scheduled', 'published')) default 'idea',
  scheduled_date timestamp with time zone,
  content_body text,
  metrics jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Editorial Schema
CREATE TABLE IF NOT EXISTS public.content_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    brief text,
    scheduled_date timestamp with time zone,
    status text CHECK (status IN ('todo', 'in_progress', 'review', 'done')) DEFAULT 'todo',
    content_type text DEFAULT 'blog',
    priority text check (priority in ('low', 'medium', 'high', 'critical')) default 'medium',
    target_keyword text,
    target_url_slug text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.content_drafts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    title text,
    html_content text,
    strategy_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.task_artifacts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid REFERENCES public.content_tasks(id) ON DELETE CASCADE NOT NULL,
    artifact_type text NOT NULL,
    artifact_reference uuid NOT NULL,
    name text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Legacy Integration Schema
create table if not exists public.gsc_daily_metrics (
    id uuid default gen_random_uuid() primary key,
    project_id uuid references public.projects(id) on delete cascade not null,
    date date not null,
    clicks integer default 0,
    impressions integer default 0,
    ctr double precision default 0,
    position double precision default 0,
    top_queries jsonb default '[]'::jsonb,
    top_pages jsonb default '[]'::jsonb,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    unique(project_id, date)
);

create table if not exists public.project_members (
    id uuid default gen_random_uuid() primary key,
    project_id uuid references public.projects(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    role text check (role in ('owner', 'admin', 'editor', 'viewer')) default 'editor',
    created_at timestamp with time zone default now() not null,
    unique(project_id, user_id)
);

create table if not exists public.project_invites (
    id uuid default gen_random_uuid() primary key,
    project_id uuid references public.projects(id) on delete cascade not null,
    email text not null,
    role text default 'editor',
    token uuid default gen_random_uuid(),
    invited_by uuid references auth.users(id),
    created_at timestamp with time zone default now() not null,
    expires_at timestamp with time zone default (now() + interval '7 days') not null,
    unique(project_id, email)
);

create table if not exists public.time_sessions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    project_id uuid references public.projects(id) on delete cascade,
    started_at timestamp with time zone default now() not null,
    ended_at timestamp with time zone,
    created_at timestamp with time zone default now() not null
);

create table if not exists public.activity_logs (
    id uuid default gen_random_uuid() primary key,
    session_id uuid references public.time_sessions(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    window_title text,
    app_name text,
    url text,
    activity_percentage integer,
    screenshot_path text,
    created_at timestamp with time zone default now() not null
);

-- 5. Enable RLS
alter table public.projects enable row level security;
alter table public.contents enable row level security;
alter table public.content_tasks enable row level security;
alter table public.content_drafts enable row level security;
alter table public.task_artifacts enable row level security;
alter table public.gsc_daily_metrics enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;
alter table public.time_sessions enable row level security;
alter table public.activity_logs enable row level security;

-- 6. Apply Essential Policies
do $$ begin
    -- Projects
    if not exists (select 1 from pg_policies where policyname = 'Users can view their own projects') then
        create policy "Users can view their own projects" on public.projects for select using (auth.uid() = user_id);
        create policy "Users can insert their own projects" on public.projects for insert with check (auth.uid() = user_id);
    end if;

    -- Contents
    if not exists (select 1 from pg_policies where policyname = 'Users can manage contents of their projects') then
        create policy "Users can manage contents of their projects" on public.contents for all using (project_id in (select id from public.projects where user_id = auth.uid()));
    end if;

    -- Tasks
    if not exists (select 1 from pg_policies where policyname = 'Users can manage content_tasks of their projects') then
        create policy "Users can manage content_tasks of their projects" on public.content_tasks for all using (project_id in (select id from public.projects where user_id = auth.uid()));
    end if;
end $$;

COMMIT;


-- Migration: 20260212_fix_payload_column.sql
-- Ensure seo_reports table exists
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

-- Add column if it doesn't exist (idempotent)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'seo_reports' and column_name = 'payload_json') then
    alter table public.seo_reports add column payload_json jsonb null;
  end if;
end $$;


-- Migration: 20260213_add_target_country_to_projects.sql
-- Add target_country column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_country TEXT DEFAULT 'US';

-- Update RLS policies if necessary (usually not needed for just a column add if CRUD already exists)
-- Just ensuring the column is available is enough for now.


-- Migration: 20260213_create_time_tracking.sql
-- Create time_entries table
CREATE TABLE IF NOT EXISTS public.time_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id uuid REFERENCES public.content_tasks(id) ON DELETE SET NULL, -- Can track time without a specific task if needed
    start_time timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    end_time timestamp with time zone,
    description text,
    is_manual boolean DEFAULT false, -- differentiates manual entries from auto-tracked
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create activity_logs table for desktop app tracking
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_id uuid REFERENCES public.time_entries(id) ON DELETE CASCADE NOT NULL,
    screenshot_url text, -- Supabase Storage URL
    activity_level integer CHECK (activity_level >= 0 AND activity_level <= 100), -- 0-100%
    keyboard_events integer DEFAULT 0,
    mouse_events integer DEFAULT 0,
    captured_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies for time_entries
CREATE POLICY "Users can manage their own time entries" 
ON public.time_entries FOR ALL 
USING (auth.uid() = user_id);

-- Policies for activity_logs
CREATE POLICY "Users can manage their own activity logs" 
ON public.activity_logs FOR ALL 
USING (
    entry_id IN (
        SELECT id FROM public.time_entries WHERE user_id = auth.uid()
    )
);

-- Indexes for performance
CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_task_id ON public.time_entries(task_id);
CREATE INDEX idx_activity_logs_entry_id ON public.activity_logs(entry_id);


-- Migration: 20260213_emergency_schema_fix.sql
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



-- Migration: 20260216_content_intelligence.sql
-- Migration for Content Intelligence Features
-- Creates project_urls table and updates tasks table with detailed content fields

-- 1. Create project_urls table for deep inventory
CREATE TABLE IF NOT EXISTS project_urls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- GSC Metrics (Rolling 30 days usually)
    clicks_30d INTEGER DEFAULT 0,
    impressions_30d INTEGER DEFAULT 0,
    ctr_30d FLOAT DEFAULT 0,
    position_30d FLOAT DEFAULT 0,

    -- Intelligence
    top_query TEXT, 
    top_query_vol INTEGER DEFAULT 0,
    strategic_score INTEGER DEFAULT 0, -- 0-100 score based on opportunity
    
    status TEXT DEFAULT 'indexed', -- 'indexed', 'excluded', 'not_found'
    last_audited_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(project_id, url)
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_urls_project_id ON project_urls(project_id);
CREATE INDEX IF NOT EXISTS idx_project_urls_strategic_score ON project_urls(strategic_score DESC);

-- 3. Update tasks table with JSONB fields for rich content data
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS research_dossier JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS outline_structure JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS quality_checklist JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS semantic_refs JSONB DEFAULT '[]'::jsonb; -- Holds the selected top 3 competitor URLs

-- 4. Enable RLS on project_urls
ALTER TABLE project_urls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view project_urls of their projects" ON project_urls;
CREATE POLICY "Users can view project_urls of their projects" ON project_urls
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM projects WHERE id = project_urls.project_id
        )
    );

DROP POLICY IF EXISTS "Users can insert project_urls for their projects" ON project_urls;
CREATE POLICY "Users can insert project_urls for their projects" ON project_urls
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM projects WHERE id = project_urls.project_id
        )
    );

DROP POLICY IF EXISTS "Users can update project_urls of their projects" ON project_urls;
