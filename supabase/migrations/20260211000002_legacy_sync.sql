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
