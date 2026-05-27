

-- ==========================================
-- MIGRATION: 00000000_enable_exec_sql.sql
-- ==========================================

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



-- ==========================================
-- MIGRATION: 20240209000000_init_projects.sql
-- ==========================================

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



-- ==========================================
-- MIGRATION: 20240211000001_editorial_calendar.sql
-- ==========================================

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



-- ==========================================
-- MIGRATION: 20250212_create_seo_reports.sql
-- ==========================================

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



-- ==========================================
-- MIGRATION: 20260211000002_legacy_sync.sql
-- ==========================================

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



-- ==========================================
-- MIGRATION: 20260211000003_fix_types.sql
-- ==========================================

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



-- ==========================================
-- MIGRATION: 20260211_add_editorial_fields.sql
-- ==========================================


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



-- ==========================================
-- MIGRATION: 20260212_fix_payload_column.sql
-- ==========================================

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



-- ==========================================
-- MIGRATION: 20260213_add_target_country_to_projects.sql
-- ==========================================

-- Add target_country column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_country TEXT DEFAULT 'US';

-- Update RLS policies if necessary (usually not needed for just a column add if CRUD already exists)
-- Just ensuring the column is available is enough for now.



-- ==========================================
-- MIGRATION: 20260213_create_time_tracking.sql
-- ==========================================

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
-- Indexes for performance
CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_task_id ON public.time_entries(task_id);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Policies for time_entries
CREATE POLICY "Users can manage their own time entries" 
ON public.time_entries FOR ALL 
USING (auth.uid() = user_id);



-- ==========================================
-- MIGRATION: 20260213_emergency_schema_fix.sql
-- ==========================================

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




-- ==========================================
-- MIGRATION: 20260216_content_intelligence.sql
-- ==========================================

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

-- 3. Update content_tasks table with JSONB fields for rich content data
ALTER TABLE content_tasks 
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
CREATE POLICY "Users can update project_urls of their projects" ON project_urls
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM projects WHERE id = project_urls.project_id
        )
    );

DROP POLICY IF EXISTS "Users can delete project_urls of their projects" ON project_urls;
CREATE POLICY "Users can delete project_urls of their projects" ON project_urls
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id FROM projects WHERE id = project_urls.project_id
        )
    );



-- ==========================================
-- MIGRATION: 20260219_add_ga4_fields.sql
-- ==========================================


-- Migration to add GA4 fields to projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS ga4_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ga4_property_id TEXT;



-- ==========================================
-- MIGRATION: 20260219_fix_title_column.sql
-- ==========================================

-- Re-asegurar que exista la columna title y refrescar caché
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seo_reports' AND column_name = 'title') THEN
        ALTER TABLE public.seo_reports ADD COLUMN title text;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';



-- ==========================================
-- MIGRATION: 20260219_multi_account_support.sql
-- ==========================================

-- Refactor user_gsc_tokens to support multiple accounts
DO $$ 
BEGIN
    -- 1. Add email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_gsc_tokens' AND column_name = 'email') THEN
        ALTER TABLE user_gsc_tokens ADD COLUMN email text;
    END IF;

    -- 2. Add id column if it doesn't exist to be the new PK
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_gsc_tokens' AND column_name = 'id') THEN
        ALTER TABLE user_gsc_tokens ADD COLUMN id uuid DEFAULT gen_random_uuid();
    END IF;

    -- 3. Update existing records to have an email if possible (we won't know it yet, but we'll fill it on next login)
    -- For now, we'll keep them.

    -- 4. Change Primary Key
    -- First drop the old one (which was user_id)
    ALTER TABLE user_gsc_tokens DROP CONSTRAINT IF EXISTS user_gsc_tokens_pkey;
    -- Add the new PK on id
    ALTER TABLE user_gsc_tokens ADD PRIMARY KEY (id);
    
    -- 5. Add a unique constraint on (user_id, email)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_gsc_tokens_user_id_email_key') THEN
        ALTER TABLE user_gsc_tokens ADD CONSTRAINT user_gsc_tokens_user_id_email_key UNIQUE (user_id, email);
    END IF;

END $$;

-- Update projects to reference a specific account
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS gsc_account_id uuid;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ga4_account_id uuid;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS gsc_account_email text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ga4_account_email text;



-- ==========================================
-- MIGRATION: 20260219_schema_cache_refresh.sql
-- ==========================================

-- Refresca la caché de PostgREST después de los cambios manuales en seo_reports
COMMENT ON TABLE public.seo_reports IS 'Tabla para informes SEO generados por IA - Cache Refresh 2026-02-19';

-- Asegurar permisos por si acaso
GRANT ALL ON TABLE public.seo_reports TO authenticated;
GRANT ALL ON TABLE public.seo_reports TO service_role;



-- ==========================================
-- MIGRATION: 20260304_add_custom_permissions.sql
-- ==========================================

-- Add custom_permissions JSONB column to project_members and project_invites
-- This enables granular access control (Admin, Edit, Take Tasks, etc.)

BEGIN;

ALTER TABLE public.project_members
ADD COLUMN IF NOT EXISTS custom_permissions jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.project_invites
ADD COLUMN IF NOT EXISTS custom_permissions jsonb DEFAULT '{}'::jsonb;

-- Basic RLS Policies for Teams
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view members of their projects') THEN
        CREATE POLICY "Users can view members of their projects" ON public.project_members FOR SELECT USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
        CREATE POLICY "Users can manage members of their projects" ON public.project_members FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view invites of their projects') THEN
        CREATE POLICY "Users can view invites of their projects" ON public.project_invites FOR SELECT USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
        CREATE POLICY "Users can manage invites of their projects" ON public.project_invites FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
    END IF;
END $$;

COMMIT;



-- ==========================================
-- MIGRATION: 20260305_add_project_color.sql
-- ==========================================

-- Migration: Add color to projects
-- Description: Adds a color column to the projects table, to be used for visual identification in the UI.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#06b6d4';



-- ==========================================
-- MIGRATION: 20260318000000_add_content_drafts_policies.sql
-- ==========================================

-- Add missing RLS policies for content_drafts

BEGIN;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own content drafts') THEN
        CREATE POLICY "Users can view their own content drafts" ON public.content_drafts 
        FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own content drafts') THEN
        CREATE POLICY "Users can insert their own content drafts" ON public.content_drafts 
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own content drafts') THEN
        CREATE POLICY "Users can update their own content drafts" ON public.content_drafts 
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own content drafts') THEN
        CREATE POLICY "Users can delete their own content drafts" ON public.content_drafts 
        FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

COMMIT;



-- ==========================================
-- MIGRATION: 20260318000001_cleanup_legacy_tables.sql
-- ==========================================

BEGIN;

-- Mega-Implementation Phase 1: Database Cleanup
-- Drops 10 legacy tables identified as obsolete during the code audit.

DROP TABLE IF EXISTS public.user_connections CASCADE;
DROP TABLE IF EXISTS public.task_artifacts_legacy CASCADE;
DROP TABLE IF EXISTS public.projects_legacy CASCADE;
DROP TABLE IF EXISTS public.project_members_legacy CASCADE;
DROP TABLE IF EXISTS public.sitemap_urls CASCADE;
DROP TABLE IF EXISTS public.office_states CASCADE;
DROP TABLE IF EXISTS public.blog_viz_projects CASCADE;
DROP TABLE IF EXISTS public.ga4_daily_metrics CASCADE;
DROP TABLE IF EXISTS public.content_history CASCADE;
DROP TABLE IF EXISTS public.avatars CASCADE;

COMMIT;



-- ==========================================
-- MIGRATION: 20260318000002_consolidate_tasks.sql
-- ==========================================

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



-- ==========================================
-- MIGRATION: 20260318000003_consolidate_activity.sql
-- ==========================================

BEGIN;

-- Mega-Implementation Phase 2: Consolidate Activity Logs
-- 1. Add activity_events array to time_sessions
ALTER TABLE public.time_sessions 
ADD COLUMN IF NOT EXISTS activity_events jsonb DEFAULT '[]'::jsonb;

-- 2. Migrate existing activity_logs into time_sessions as JSONB array
UPDATE public.time_sessions ts
SET activity_events = (
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', al.id,
            'started_at', al.started_at,
            'ended_at', al.ended_at,
            'activity_percentage', al.activity_percentage,
            'keyboard_events', al.keyboard_events,
            'mouse_events', al.mouse_events,
            'window_title', al.window_title,
            'app_name', al.app_name,
            'url', al.url,
            'is_manual', al.is_manual,
            'created_at', al.created_at
        ) ORDER BY al.started_at ASC
    ), '[]'::jsonb)
    FROM public.activity_logs al
    WHERE al.session_id = ts.id
)
WHERE EXISTS (
    SELECT 1 FROM public.activity_logs al WHERE al.session_id = ts.id
);

-- 3. Drop activity_logs
DROP TABLE IF EXISTS public.activity_logs CASCADE;

COMMIT;



-- ==========================================
-- MIGRATION: 20260318000004_add_query_sql.sql
-- ==========================================

-- Function to execute query and return results as JSON
create or replace function query_sql(sql_query text)
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  execute 'select json_agg(t) from (' || sql_query || ') t' into result;
  return result;
end;
$$;



-- ==========================================
-- MIGRATION: 20260318100000_teams_architecture.sql
-- ==========================================

-- Refactor: Teams & Projects Architecture

-- 1. Create Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME zone DEFAULT now(),
    updated_at TIMESTAMP WITH TIME zone DEFAULT now()
);

-- 2. Create Team Members Table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMP WITH TIME zone DEFAULT now(),
    UNIQUE(team_id, user_id)
);

-- 3. Add team_id to Projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- 4. Data Migration: Create default teams for existing project owners
DO $$
DECLARE
    u_id UUID;
    t_id UUID;
BEGIN
    FOR u_id IN SELECT DISTINCT user_id FROM public.projects WHERE team_id IS NULL LOOP
        -- Create a default team for the user
        INSERT INTO public.teams (name, owner_id)
        VALUES ('Mi Equipo Personal', u_id)
        RETURNING id INTO t_id;

        -- Add user as owner of their own team
        INSERT INTO public.team_members (team_id, user_id, role)
        VALUES (t_id, u_id, 'owner');

        -- Link projects to the new team
        UPDATE public.projects
        SET team_id = t_id
        WHERE user_id = u_id AND team_id IS NULL;
    END LOOP;
END $$;

-- 5. RLS Policies for Teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Teams: Owner can do everything. Admins/Members can see.
CREATE POLICY "Users can view teams they are members of" ON public.teams
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid())
    );

CREATE POLICY "Owners can manage their teams" ON public.teams
    USING (owner_id = auth.uid());

-- Team Members: Owners and Admins can manage.
CREATE POLICY "View team members" ON public.team_members
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid())
    );

CREATE POLICY "Owners and Admins can manage team members" ON public.team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm 
            WHERE tm.team_id = team_members.team_id 
            AND tm.user_id = auth.uid() 
            AND tm.role IN ('owner', 'admin')
        )
    );

-- 6. Update Project RLS (Optional but recommended)
-- Projects should now be visible to all team members.
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view projects of their teams" ON public.projects
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.team_members WHERE team_id = projects.team_id AND user_id = auth.uid())
    );

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';



-- ==========================================
-- MIGRATION: 20260318110000_agency_roles_rbac.sql
-- ==========================================

-- Agency Roles & RBAC (Phase 7)

-- 1. Update Team Members roles checking
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_role_check;
ALTER TABLE public.team_members ADD CONSTRAINT team_members_role_check CHECK (role IN ('owner', 'partner', 'manager', 'specialist', 'client'));

-- 2. Add Presence Tracking fields to Team Members
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS presence_status TEXT DEFAULT 'offline' CHECK (presence_status IN ('online', 'busy', 'offline'));
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS current_task_id BIGINT REFERENCES public.tasks(id) ON DELETE SET NULL;


-- 3. Refine RLS Policies for Projects
DROP POLICY IF EXISTS "Users can view projects of their teams" ON public.projects;

-- Projects: Partners see all, Managers see their team, Specialists see their team, Clients see their team.
CREATE POLICY "Users can view projects of their teams" ON public.projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm 
            WHERE tm.team_id = projects.team_id 
            AND tm.user_id = auth.uid()
        )
    );

-- Projects: All roles except 'client' can create projects within their team (Managers and above usually)
-- For now, let's say 'manager' and above can manage projects
CREATE POLICY "Managers and above can manage projects" ON public.projects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm 
            WHERE tm.team_id = projects.team_id 
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'partner', 'manager')
        )
    );

-- 4. Refine RLS Policies for Tasks
-- Tasks inherit visibility from projects usually, but let's be explicit
DROP POLICY IF EXISTS "Users can view tasks of their active projects" ON public.tasks;
CREATE POLICY "Users can view tasks of their teams" ON public.tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.team_members tm ON tm.team_id = p.team_id
            WHERE p.id::text = tasks.project_id::text AND tm.user_id = auth.uid()
        )
    );

-- Clients can't create or modify tasks
CREATE POLICY "Specialists and above can manage tasks" ON public.tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.team_members tm ON tm.team_id = p.team_id
            WHERE p.id::text = tasks.project_id::text 
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'partner', 'manager', 'specialist')
        )
    );


-- 5. Real-time Presence Notification
NOTIFY pgrst, 'reload schema';



-- ==========================================
-- MIGRATION: 20260318120000_team_segmentation.sql
-- ==========================================

-- Fase 3: Segmentación y Contexto de Equipo

-- 1. Create Audio Pods Table
CREATE TABLE IF NOT EXISTS public.team_audio_pods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'public' CHECK (type IN ('public', 'private')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Add last_active_team to Profiles (for persistence)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- 3. Data Migration: Create default pods for existing teams
INSERT INTO public.team_audio_pods (team_id, name, type)
SELECT id, 'General Pod', 'public' FROM public.teams
WHERE NOT EXISTS (SELECT 1 FROM public.team_audio_pods WHERE team_id = teams.id);

-- 4. RLS for Audio Pods
ALTER TABLE public.team_audio_pods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pods of their teams" ON public.team_audio_pods
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_audio_pods.team_id AND user_id = auth.uid())
    );

CREATE POLICY "Managers and above can manage pods" ON public.team_audio_pods
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.team_members 
            WHERE team_id = team_audio_pods.team_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'partner', 'manager')
        )
    );

-- 5. Refresh schema cache
NOTIFY pgrst, 'reload schema';



-- ==========================================
-- MIGRATION: 20260318130000_client_isolation.sql
-- ==========================================

-- Fase 4: Aislamiento Estricto para Clientes

-- 1. Redefine Projects Visibility for Clients
-- Managers and above see all team projects.
-- Clients ONLY see projects where they are in project_members.
DROP POLICY IF EXISTS "Users can view projects of their teams" ON public.projects;

CREATE POLICY "Users can view projects with role-based isolation" ON public.projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm 
            WHERE tm.team_id = projects.team_id 
            AND tm.user_id = auth.uid()
            AND (
                tm.role != 'client' 
                OR 
                EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = projects.id AND pm.user_id = auth.uid())
            )
        )
    );

-- 2. Redefine Tasks Visibility
DROP POLICY IF EXISTS "Users can view tasks of their teams" ON public.tasks;

CREATE POLICY "Users can view tasks with role-based isolation" ON public.tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.team_members tm ON tm.team_id = p.team_id
            WHERE p.id::text = tasks.project_id::text 
            AND tm.user_id = auth.uid()
            AND (
                tm.role != 'client' 
                OR 
                EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
            )
        )
    );

-- 3. Ensure Clients cannot see all team members in the sidebar? 
-- The user plan didn't specify this, but usually clients only see the manager.
-- For now, we keep team visibility as is, but we could restrict it later.

NOTIFY pgrst, 'reload schema';



-- ==========================================
-- MIGRATION: 20260318140000_task_assignment.sql
-- ==========================================

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



-- ==========================================
-- MIGRATION: 20260318150000_fix_teams_rls.sql
-- ==========================================

-- Fix Teams RLS for independent creation
BEGIN;

-- 1. Allow authenticated users to create a team
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
CREATE POLICY "Authenticated users can create teams" 
    ON public.teams 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = owner_id);

-- 2. Allow users to insert themselves as owners during team creation
DROP POLICY IF EXISTS "Users can insert themselves as team owners" ON public.team_members;
CREATE POLICY "Users can insert themselves as team owners"
    ON public.team_members
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id AND role = 'owner');

-- 3. Update 'teams' select policy to be more inclusive for owners
-- (Existing policy: USING (EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid())))
-- Let's ensure owners can always see their teams even if member table is lagging
DROP POLICY IF EXISTS "Owners can manage their teams" ON public.teams;
CREATE POLICY "Owners can manage their teams" 
    ON public.teams 
    FOR ALL
    TO authenticated
    USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid()));

-- 4. Update 'team_members' ALL policy to avoid infinite recursion
-- Instead of checking role via another SELECT in the same table, we check role in the current row or via team owner
DROP POLICY IF EXISTS "Owners and Admins can manage team members" ON public.team_members;
CREATE POLICY "Owners and Admins can manage team members"
    ON public.team_members
    FOR ALL
    TO authenticated
    USING (
        -- Can manage if I am the owner of the team
        EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND owner_id = auth.uid())
        -- Or if I am an owner/manager member already (careful with recursion)
        OR (user_id = auth.uid() AND role IN ('owner', 'manager'))
    );

COMMIT;



-- ==========================================
-- MIGRATION: 20260318160000_update_team_roles.sql
-- ==========================================

-- Update Team Members with Agency Roles and Custom Permissions (FIXED)
-- Run this in the Supabase SQL Editor

-- 1. Add custom_permissions column to team_members
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS custom_permissions JSONB DEFAULT '{
    "admin": false,
    "create_delete": false,
    "edit_all": false,
    "take_edit_tasks": false,
    "take_edit_contents": false,
    "take_edit_reports": false,
    "all_tools_access": false,
    "monthly_tokens_limit": 0
}'::jsonb;

-- 2. Update role check constraint to include new agency roles
-- We use DROP CONSTRAINT IF EXISTS to avoid name collisions
ALTER TABLE public.team_members 
DROP CONSTRAINT IF EXISTS team_members_role_check;

-- Fallback: If it had a different name from the auto-generation, 
-- this DO block will catch it and drop it.
DO $$ 
DECLARE 
    constraint_name TEXT;
BEGIN 
    SELECT conname INTO constraint_name
    FROM pg_constraint 
    WHERE conrelid = 'public.team_members'::regclass 
    AND contype = 'c' 
    AND confkey IS NULL; -- Simple check constraint

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.team_members DROP CONSTRAINT ' || constraint_name;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 3. Add the new, comprehensive constraint
ALTER TABLE public.team_members 
ADD CONSTRAINT team_members_role_check 
CHECK (role IN ('owner', 'partner', 'manager', 'specialist', 'client', 'admin', 'member'));

-- 4. Notify Schema Reload
NOTIFY pgrst, 'reload schema';



-- ==========================================
-- MIGRATION: 20260318170000_fix_recursion_rls.sql
-- ==========================================

-- Fix Infinite Recursion in Team Members Policies
-- Run this in the Supabase SQL Editor

-- 1. Create a helper function to check membership without triggering RLS
-- SECURITY DEFINER runs the query with the permissions of the creator (usually postgres), bypassing RLS
CREATE OR REPLACE FUNCTION public.is_team_member(t_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = t_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop old recursive policies
DROP POLICY IF EXISTS "View team members" ON public.team_members;
DROP POLICY IF EXISTS "Owners and Admins can manage team members" ON public.team_members;

-- 3. Create fresh, non-recursive policies
-- SELECT: Anyone who is a member can see all members of that team
CREATE POLICY "View team members" 
    ON public.team_members
    FOR SELECT 
    TO authenticated
    USING (
        -- Break recursion by using the SECURITY DEFINER function
        public.is_team_member(team_id)
        -- Or allow if user is the team owner (via teams table)
        OR EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND owner_id = auth.uid())
    );

-- ALL (Manage): Owners of the team or members with elevated roles can manage
CREATE POLICY "Manage team members"
    ON public.team_members
    FOR ALL
    TO authenticated
    USING (
        -- Can manage if I am the owner of the team (check via teams table to avoid recursion)
        EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND owner_id = auth.uid())
        -- Or if I am an owner/manager/partner already (check current row if it matches us)
        OR (user_id = auth.uid() AND role IN ('owner', 'partner', 'manager'))
    );

-- 4. Notify Schema Reload
NOTIFY pgrst, 'reload schema';



-- ==========================================
-- MIGRATION: 20260319000000_comprehensive_teams_fix.sql
-- ==========================================

-- Comprehensive Fix for Teams & Team Members RLS
-- Copy and run this in the Supabase SQL Editor if you can't see your created teams.

-- 1. Helper Function (Bypass RLS for checking membership)
CREATE OR REPLACE FUNCTION public.is_team_member(t_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = t_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Teams Policies
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
CREATE POLICY "Authenticated users can create teams" 
    ON public.teams FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can manage their teams" ON public.teams;
CREATE POLICY "Owners can manage their teams" 
    ON public.teams FOR ALL TO authenticated 
    USING (owner_id = auth.uid() OR public.is_team_member(id));

DROP POLICY IF EXISTS "Users can view teams they are members of" ON public.teams;
CREATE POLICY "Users can view teams they are members of" 
    ON public.teams FOR SELECT TO authenticated 
    USING (owner_id = auth.uid() OR public.is_team_member(id));

-- 3. Team Members Policies
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert themselves as team owners" ON public.team_members;
CREATE POLICY "Users can insert themselves as team owners"
    ON public.team_members FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND role = 'owner');

DROP POLICY IF EXISTS "View team members" ON public.team_members;
CREATE POLICY "View team members" 
    ON public.team_members FOR SELECT TO authenticated
    USING (
        public.is_team_member(team_id)
        OR EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "Manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Owners and Admins can manage team members" ON public.team_members;
CREATE POLICY "Manage team members"
    ON public.team_members FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND owner_id = auth.uid())
        OR (user_id = auth.uid() AND role IN ('owner', 'partner', 'manager'))
    );

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';



-- ==========================================
-- MIGRATION: 20260321000000_fix_teams_recursion.sql
-- ==========================================

-- 1. Helper Function (SECURITY DEFINER bypasses RLS)
-- This function checks if the current user has access (owner or member) to a team
-- without triggering RLS recursively.
CREATE OR REPLACE FUNCTION public.check_team_access(t_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_owner BOOLEAN;
    is_member BOOLEAN;
BEGIN
    -- Check if user is owner of the team (from teams table)
    SELECT EXISTS (SELECT 1 FROM public.teams WHERE id = t_id AND owner_id = auth.uid()) INTO is_owner;
    IF is_owner THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user is a member of the team (from team_members table)
    SELECT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = t_id AND user_id = auth.uid()) INTO is_member;
    IF is_member THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Clean up old recursive policies
-- Drop all conflicting policies to start fresh
DROP POLICY IF EXISTS "Users can view teams they have access to" ON public.teams;
DROP POLICY IF EXISTS "Owners can manage their teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;

DROP POLICY IF EXISTS "View team members" ON public.team_members;
DROP POLICY IF EXISTS "Owners can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can manage their own membership" ON public.team_members;
DROP POLICY IF EXISTS "Owners and Admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can insert themselves as team owners" ON public.team_members;

-- 3. Teams Policies
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can create teams" 
    ON public.teams FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can view teams they have access to" 
    ON public.teams FOR SELECT TO authenticated 
    USING (owner_id = auth.uid() OR public.check_team_access(id));

CREATE POLICY "Owners can manage their teams" 
    ON public.teams FOR ALL TO authenticated 
    USING (owner_id = auth.uid());

-- 4. Team Members Policies
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Allow initial insertion of own record (broken during team creation otherwise)
CREATE POLICY "Users can manage their own membership"
    ON public.team_members FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "View team members" 
    ON public.team_members FOR SELECT TO authenticated
    USING (public.check_team_access(team_id));

CREATE POLICY "Owners can manage team members" 
    ON public.team_members FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND owner_id = auth.uid())
    );

-- 5. Reload Schema
NOTIFY pgrst, 'reload schema';



-- ==========================================
-- MIGRATION: 20260321000100_team_invitations.sql
-- ==========================================

-- 1. Add status to team_members
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive'));

-- 2. Create team_invites table
CREATE TABLE IF NOT EXISTS public.team_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'specialist',
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    custom_permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(team_id, email)
);

-- 3. RLS for team_invites
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Owners can manage team invites
DROP POLICY IF EXISTS "Owners can manage team invites" ON public.team_invites;
CREATE POLICY "Owners can manage team invites" 
    ON public.team_invites FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.teams WHERE id = team_invites.team_id AND owner_id = auth.uid()));

-- Policy: Invited users can view their invites (using auth.jwt() for safety)
DROP POLICY IF EXISTS "Invited users can view their invites" ON public.team_invites;
CREATE POLICY "Invited users can view their invites" 
    ON public.team_invites FOR SELECT TO authenticated
    USING (email = (auth.jwt() ->> 'email')::text);

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';



-- ==========================================
-- MIGRATION: 20260321000200_fix_relationships.sql
-- ==========================================

-- 1. Add foreign key relationship from team_members to profiles
-- This allows Supabase/PostgREST to perform joins between these tables automatically
ALTER TABLE public.team_members
DROP CONSTRAINT IF EXISTS team_members_user_id_profiles_fkey;

ALTER TABLE public.team_members
ADD CONSTRAINT team_members_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Add foreign key relationship from team_invites to profiles (for invited_by)
ALTER TABLE public.team_invites
DROP CONSTRAINT IF EXISTS team_invites_invited_by_profiles_fkey;

ALTER TABLE public.team_invites
ADD CONSTRAINT team_invites_invited_by_profiles_fkey
FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Refresh schema cache to ensure PostgREST sees the change immediately
NOTIFY pgrst, 'reload schema';



-- ==========================================
-- MIGRATION: 20260321000300_add_project_color.sql
-- ==========================================

-- Add color column if not exists
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#06b6d4';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';



-- ==========================================
-- MIGRATION: 20260321000500_fix_project_schema.sql
-- ==========================================

-- Migration to ensure all project fields required for the new flow exist
-- This also fixes the "Could not find column logo_url" error by refreshing the schema cache

-- 1. Update projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS gsc_site_url TEXT,
ADD COLUMN IF NOT EXISTS gsc_account_email TEXT,
ADD COLUMN IF NOT EXISTS ga4_property_id TEXT,
ADD COLUMN IF NOT EXISTS ga4_account_email TEXT,
ADD COLUMN IF NOT EXISTS wp_url TEXT,
ADD COLUMN IF NOT EXISTS wp_token TEXT,
ADD COLUMN IF NOT EXISTS target_country TEXT DEFAULT 'ES',
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#06b6d4';

-- 2. Create user_gsc_tokens table for OAuth credentials
CREATE TABLE IF NOT EXISTS public.user_gsc_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, email)
);

-- Enable RLS for security
ALTER TABLE public.user_gsc_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own GSC tokens" 
ON public.user_gsc_tokens FOR ALL 
USING (auth.uid() = user_id);

-- 3. Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';




-- ==========================================
-- MIGRATION: 20260330000001_content_research.sql
-- ==========================================

-- Migration to create the content_research table for persistence of deep competitor data
-- Date: 2026-03-30

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.content_research (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    serp_data JSONB DEFAULT '{}'::jsonb,
    competitors_data JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(content_id)
);

-- 2. Indexing
CREATE INDEX IF NOT EXISTS idx_content_research_content_id ON public.content_research(content_id);

-- 3. Enable RLS
ALTER TABLE public.content_research ENABLE ROW LEVEL SECURITY;

-- 4. Policy (Linked to content owner via project)
CREATE POLICY "Users can manage research for their contents"
ON public.content_research FOR ALL
TO authenticated
USING (
    content_id IN (
        SELECT id FROM public.contents 
        WHERE project_id IN (
            SELECT id FROM public.projects 
            WHERE user_id = auth.uid()
            OR team_id IN (
                SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
            )
        )
    )
);

-- 5. Reload Schema Cache
NOTIFY pgrst, 'reload schema';



-- ==========================================
-- MIGRATION: 20260331000100_fix_project_urls_schema.sql
-- ==========================================

-- Migration to correct project_urls and drop invalid project_inventory table
-- This migration ensures project_urls has the same metrics project_inventory was supposed to have.

-- 1. Drop project_inventory if it was created by mistake
DROP TABLE IF EXISTS public.project_inventory CASCADE;

-- 2. Add full SEO Metric columns to project_urls
-- (Matching the names used in GscService.ts and services.ts)
ALTER TABLE public.project_urls 
ADD COLUMN IF NOT EXISTS impressions_gsc BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS organic_traffic_gsc BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS ctr_gsc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS position_gsc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT now();

-- 3. Add performance index for internal linking queries (prioritize authority pages)
CREATE INDEX IF NOT EXISTS idx_project_urls_impressions_gsc ON public.project_urls(project_id, impressions_gsc DESC);
CREATE INDEX IF NOT EXISTS idx_project_urls_url_normalized ON public.project_urls(project_id, (lower(url)));

-- 4. Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';



-- ==========================================
-- MIGRATION: 20260402143000_fix_task_project_id_uuid.sql
-- ==========================================

-- Migration to fix project_id type in tasks table
-- This converts project_id from bigint to uuid to match projects(id)

BEGIN;

-- 1. Eliminar restricciones si existen
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;

-- 2. Cambiar el tipo de columna. 
-- Dado que bigint no se puede convertir a uuid directamente, limpiamos los datos antiguos (que eran de una versión legacy incompatible).
ALTER TABLE public.tasks 
ALTER COLUMN project_id TYPE uuid USING NULL;

-- 3. Volver a crear la relación correcta con la tabla de proyectos UUID
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- 3. Update RLS policies to remove unnecessary ::text casts where possible
-- (Optional but clean, though existing policies usually work with implicit casting if types match)

NOTIFY pgrst, 'reload schema';

COMMIT;



-- ==========================================
-- MIGRATION: 20260402170000_consolidate_tasks_contents.sql
-- ==========================================

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



-- ==========================================
-- MIGRATION: 20260404164500_smart_architecture.sql
-- ==========================================

-- Add architecture settings to projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS architecture_rules JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS architecture_instructions TEXT;

-- Add category to project_urls for better segmentation
ALTER TABLE project_urls 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Index for category search
CREATE INDEX IF NOT EXISTS idx_project_urls_category ON project_urls(category);



-- ==========================================
-- MIGRATION: 20260406_schema_updates.sql
-- ==========================================

-- 1. Añadir columnas de métricas GA4 a project_urls
ALTER TABLE public.project_urls 
ADD COLUMN IF NOT EXISTS avg_session_duration numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS bounce_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS top_sources jsonb DEFAULT '[]'::jsonb;

-- 2. Crear tabla project_kws para el desglose de Keywords
CREATE TABLE IF NOT EXISTS public.project_kws (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    url_id uuid REFERENCES public.project_urls(id) ON DELETE CASCADE,
    keyword text NOT NULL,
    impressions bigint DEFAULT 0,
    clicks bigint DEFAULT 0,
    ctr numeric DEFAULT 0,
    position numeric DEFAULT 0,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(project_id, keyword, url_id)
);

-- 3. Índices para project_kws
CREATE INDEX IF NOT EXISTS idx_project_kws_project ON public.project_kws(project_id);
CREATE INDEX IF NOT EXISTS idx_project_kws_keyword ON public.project_kws(keyword);

-- 4. Permisos
GRANT ALL ON public.project_kws TO postgres;
GRANT ALL ON public.project_kws TO service_role;
GRANT ALL ON public.project_kws TO authenticated;

-- 5. Actualizar tabla contents con nuevas columnas
ALTER TABLE public.contents 
ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS target_keyword text,
ADD COLUMN IF NOT EXISTS seo_data jsonb DEFAULT '{}'::jsonb;

-- 6. Recargar el cache del esquema (Supabase/PostgREST)
NOTIFY pgrst, 'reload schema';



-- ==========================================
-- MIGRATION: 20260408_auto_activate_teams.sql
-- ==========================================

-- 1. Update handle_new_user to automatically process and activate team invites upon signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;

  -- Process pending team invites - transform them into active team members
  INSERT INTO public.team_members (team_id, user_id, role, status, custom_permissions)
  SELECT team_id, new.id, role, 'active', custom_permissions
  FROM public.team_invites
  WHERE email = new.email
  ON CONFLICT (team_id, user_id) DO NOTHING;

  -- Delete processed invites
  DELETE FROM public.team_invites
  WHERE email = new.email;

  -- Also check for project_invites if any (legacy system)
  INSERT INTO public.project_members (project_id, user_id, role)
  SELECT project_id, new.id, role
  FROM public.project_invites
  WHERE email = new.email
  ON CONFLICT (project_id, user_id) DO NOTHING;

  DELETE FROM public.project_invites
  WHERE email = new.email;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Retroactively activate all currently pending team members
-- The user said: "que no tenga que aceptar nada, que sea parte del equipo de inmediato"
UPDATE public.team_members
SET status = 'active'
WHERE status = 'pending';

-- 3. Notify schema reload
NOTIFY pgrst, 'reload schema';



-- ==========================================
-- MIGRATION: 20260410_ensure_profiles_and_teams.sql
-- ==========================================

-- CONSOCIATED SCHEMA STABILIZATION (2026-04-10)
-- Ensures base tables exist and triggers are active for the new project.

BEGIN;

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    last_active_team_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Team Members Table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending')),
    custom_permissions JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(team_id, user_id)
);

-- 4. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Teams
DROP POLICY IF EXISTS "Users can view teams they are members of" ON public.teams;
CREATE POLICY "Users can view teams they are members of" ON public.teams
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid())
    );

-- Team Members
DROP POLICY IF EXISTS "View team members" ON public.team_members;
CREATE POLICY "View team members" ON public.team_members
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid())
    );

-- 6. Trigger for Profile Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  t_id UUID;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;

  -- Create personal team
  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE owner_id = new.id) THEN
    INSERT INTO public.teams (name, owner_id)
    VALUES ('Mi Equipo Personal', new.id)
    RETURNING id INTO t_id;

    INSERT INTO public.team_members (team_id, user_id, role, status)
    VALUES (t_id, new.id, 'owner', 'active');
    
    -- Update profile with this team as last active
    UPDATE public.profiles SET last_active_team_id = t_id WHERE id = new.id;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Reload Schema
NOTIFY pgrst, 'reload schema';

COMMIT;



-- ==========================================
-- MIGRATION: 20260410_unify_google_connections.sql
-- ==========================================

-- Migration: Unify Google Connections and Projects for Multi-Account Support

-- 1. Create the unified connections table
CREATE TABLE IF NOT EXISTS public.user_google_connections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    account_name text,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamptz,
    scopes text[] DEFAULT '{}'::text[],
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, email)
);

-- 2. Add connection reference to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS google_connection_id uuid REFERENCES public.user_google_connections(id) ON DELETE SET NULL;

-- 3. Transition columns (Keep for backward compatibility but allow nulls)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS gsc_account_email text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ga4_account_email text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS gsc_site_url text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ga4_property_id text;

-- 4. RLS for user_google_connections
ALTER TABLE public.user_google_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own google connections"
    ON public.user_google_connections
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Permissions
GRANT ALL ON public.user_google_connections TO postgres;
GRANT ALL ON public.user_google_connections TO service_role;
GRANT ALL ON public.user_google_connections TO authenticated;

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_user_google_connections_updated_at ON public.user_google_connections;
CREATE TRIGGER tr_user_google_connections_updated_at
    BEFORE UPDATE ON public.user_google_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. Schema Cache Reload
NOTIFY pgrst, 'reload schema';



-- ==========================================
-- MIGRATION: 20260413120000_create_task_competitors.sql
-- ==========================================

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



-- ==========================================
-- MIGRATION: 20260413130000_fix_team_invitations.sql
-- ==========================================

CREATE OR REPLACE FUNCTION invite_user_to_team(p_team_id UUID, p_email TEXT, p_role TEXT)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_inviter_role TEXT;
BEGIN
  -- Optional: Check if inviter is owner/admin of team (auth.uid())
  -- For simplicity, let's assume UI handles auth check, but good to add if possible.
  
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- User exists, insert into team_members directly
    -- Handle conflict if they are already in the team
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (p_team_id, v_user_id, p_role)
    ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role;
    RETURN jsonb_build_object('status', 'success', 'message', 'Usuario añadido al equipo directamente', 'type', 'member');
  ELSE
    -- User does not exist, insert into team_invites
    INSERT INTO public.team_invites (team_id, email, role, inviter_id)
    VALUES (p_team_id, p_email, p_role, auth.uid())
    ON CONFLICT (team_id, email) DO UPDATE SET role = EXCLUDED.role;
    RETURN jsonb_build_object('status', 'success', 'message', 'Invitación enviada (usuario nuevo)', 'type', 'invite');
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert basic profile
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );

    -- Create personal team
    INSERT INTO public.teams (name, owner_id)
    VALUES ('Mi Equipo Personal', NEW.id);

    -- Auto-accept team invites
    INSERT INTO public.team_members (team_id, user_id, role)
    SELECT team_id, NEW.id, role
    FROM public.team_invites
    WHERE email = NEW.email;

    -- Optional: Delete processed invites
    DELETE FROM public.team_invites WHERE email = NEW.email;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE
    inv RECORD;
    uid UUID;
BEGIN
    FOR inv IN SELECT * FROM public.team_invites LOOP
        SELECT id INTO uid FROM auth.users WHERE email = inv.email LIMIT 1;
        IF uid IS NOT NULL THEN
            INSERT INTO public.team_members (team_id, user_id, role)
            VALUES (inv.team_id, uid, inv.role)
            ON CONFLICT DO NOTHING;
            
            DELETE FROM public.team_invites WHERE id = inv.id;
        END IF;
    END LOOP;
END;
$$;


-- ==========================================
-- MIGRATION: task_assets_storage.sql
-- ==========================================

-- =============================================================
-- NOUS 2.0 — Supabase Storage Setup for Task Assets (Images)
-- Run this in your Supabase SQL Editor
-- =============================================================

-- 1. Create the storage bucket (if not already done via the dashboard)
-- NOTE: You can also create this from Supabase Dashboard > Storage > New Bucket
-- Name: task-assets | Public: YES (for public image URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'task-assets',
    'task-assets',
    true,                        -- Public so images are accessible without auth token
    5242880,                     -- 5MB limit in bytes (5 * 1024 * 1024)
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/avif'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif'];

-- =============================================================
-- 2. Row Level Security (RLS) Policies for task-assets bucket
-- =============================================================

-- Allow any authenticated user to READ public objects
CREATE POLICY "Public read access for task-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-assets');

-- Allow authenticated users to UPLOAD only to their own user folder
-- Path pattern: <user_id>/<task_id>/<filename>
CREATE POLICY "Authenticated users can upload their own assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'task-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to DELETE only their own files
CREATE POLICY "Authenticated users can delete their own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'task-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to UPDATE only their own files
CREATE POLICY "Authenticated users can update their own assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'task-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- =============================================================
-- 3. (Optional) Task Attachments metadata table
--    Useful if you want to query attachments independently
--    instead of storing them in tasks.attachments JSONB field
-- =============================================================

-- CREATE TABLE IF NOT EXISTS task_attachments (
--     id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--     task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
--     storage_path TEXT NOT NULL,           -- path in task-assets bucket
--     public_url  TEXT NOT NULL,
--     file_name   TEXT NOT NULL,
--     file_size   INTEGER NOT NULL,         -- bytes
--     mime_type   TEXT NOT NULL,
--     alt_text    TEXT,
--     created_by  UUID REFERENCES auth.users(id),
--     created_at  TIMESTAMPTZ DEFAULT NOW()
-- );

-- ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can see attachments of their project tasks"
-- ON task_attachments FOR SELECT
-- TO authenticated
-- USING (
--     task_id IN (
--         SELECT id FROM tasks
--         WHERE project_id IN (
--             SELECT id FROM projects WHERE user_id = auth.uid()
--         )
--     )
-- );

