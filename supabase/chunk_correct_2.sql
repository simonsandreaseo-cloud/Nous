
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


-- Migration: 20260318150000_fix_teams_rls.sql
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


-- Migration: 20260318160000_update_team_roles.sql
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


-- Migration: 20260318170000_fix_recursion_rls.sql
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


-- Migration: 20260319000000_comprehensive_teams_fix.sql
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


-- Migration: 20260321000000_fix_teams_recursion.sql
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