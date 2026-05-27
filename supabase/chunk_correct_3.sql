


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



