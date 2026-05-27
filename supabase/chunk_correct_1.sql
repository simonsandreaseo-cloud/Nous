

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


-- Migration: 20260219_add_ga4_fields.sql

-- Migration to add GA4 fields to projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS ga4_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ga4_property_id TEXT;


-- Migration: 20260219_fix_title_column.sql
-- Re-asegurar que exista la columna title y refrescar cachÃ©
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seo_reports' AND column_name = 'title') THEN
        ALTER TABLE public.seo_reports ADD COLUMN title text;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';


-- Migration: 20260219_multi_account_support.sql
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


-- Migration: 20260219_schema_cache_refresh.sql
-- Refresca la cachÃ© de PostgREST despuÃ©s de los cambios manuales en seo_reports
COMMENT ON TABLE public.seo_reports IS 'Tabla para informes SEO generados por IA - Cache Refresh 2026-02-19';

-- Asegurar permisos por si acaso
GRANT ALL ON TABLE public.seo_reports TO authenticated;
GRANT ALL ON TABLE public.seo_reports TO service_role;


-- Migration: 20260304_add_custom_permissions.sql
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


-- Migration: 20260305_add_project_color.sql
-- Migration: Add color to projects
-- Description: Adds a color column to the projects table, to be used for visual identification in the UI.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#06b6d4';


-- Migration: 20260318000000_add_content_drafts_policies.sql
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


-- Migration: 20260318000001_cleanup_legacy_tables.sql
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


-- Migration: 20260318000002_consolidate_tasks.sql
BEGIN;

-- Mega-Implementation Phase 2: Consolidate Tasks
-- 1. Add missing fields from content_tasks to tasks

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

-- 2. Drop content_tasks (Table was fully empty, 0 rows)
DROP TABLE IF EXISTS public.content_tasks CASCADE;

COMMIT;


-- Migration: 20260318000003_consolidate_activity.sql
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


-- Migration: 20260318000004_add_query_sql.sql
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


-- Migration: 20260318100000_teams_architecture.sql
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


-- Migration: 20260318110000_agency_roles_rbac.sql
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


-- Migration: 20260318120000_team_segmentation.sql
-- Fase 3: SegmentaciÃ³n y Contexto de Equipo

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


-- Migration: 20260318130000_client_isolation.sql
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


-- Migration: 20260318140000_task_assignment.sql
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