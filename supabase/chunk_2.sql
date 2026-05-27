anage team members" ON public.team_members;
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


-- Migration: 20260321000100_team_invitations.sql
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


-- Migration: 20260321000200_fix_relationships.sql
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


-- Migration: 20260321000300_add_project_color.sql
-- Add color column if not exists
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#06b6d4';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';


-- Migration: 20260321000500_fix_project_schema.sql
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



-- Migration: 20260330000001_content_research.sql
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


-- Migration: 20260331000100_fix_project_urls_schema.sql
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


-- Migration: 20260402143000_fix_task_project_id_uuid.sql
-- Migration to fix project_id type in tasks table
-- This converts project_id from bigint to uuid to match projects(id)

BEGIN;

-- 1. Eliminar restricciones si existen
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;

-- 2. Cambiar el tipo de columna. 
-- Dado que bigint no se puede convertir a uuid directamente, limpiamos los datos antiguos (que eran de una versiÃ³n legacy incompatible).
ALTER TABLE public.tasks 
ALTER COLUMN project_id TYPE uuid USING NULL;

-- 3. Volver a crear la relaciÃ³n correcta con la tabla de proyectos UUID
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- 3. Update RLS policies to remove unnecessary ::text casts where possible
-- (Optional but clean, though existing policies usually work with implicit casting if types match)

NOTIFY pgrst, 'reload schema';

COMMIT;


-- Migration: 20260402170000_consolidate_tasks_contents.sql
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


-- Migration: 20260404164500_smart_architecture.sql
-- Add architecture settings to projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS architecture_rules JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS architecture_instructions TEXT;

-- Add category to project_urls for better segmentation
ALTER TABLE project_urls 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Index for category search
CREATE INDEX IF NOT EXISTS idx_project_urls_category ON project_urls(category);


-- Migration: 20260406_schema_updates.sql
-- 1. AÃ±adir columnas de mÃ©tricas GA4 a project_urls
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

-- 3. Ãndices para project_kws
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


-- Migration: 20260408_auto_activate_teams.sql
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


-- Migration: 20260410_ensure_profiles_and_teams.sql
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


-- Migration: 20260410_unify_google_connections.sql
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


-- Migration: 20260413120000_create_task_competitors.sql
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


-- Migration: 20260413130000_fix_team_invitations.sql
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
    RETURN jsonb_build_object('status', 'success', 'message', 'Usuario aÃ±adido al equipo directamente', 'type', 'member');
  ELSE
    -- User does not exist, insert into team_invites
    INSERT INTO public.team_invites (team_id, email, role, inviter_id)
    VALUES (p_team_id, p_email, p_role, auth.uid())
    ON CONFLICT (team_id, email) DO UPDATE SET role = EXCLUDED.role;
    RETURN jsonb_build_object('status', 'success', 'message', 'InvitaciÃ³n enviada (usuario nuevo)', 'type', 'invite');
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

-- Migration: task_assets_storage.sql
-- =============================================================
-- NOUS 2.0 â€” Supabase Storage Setup for Task Assets (Images)
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




