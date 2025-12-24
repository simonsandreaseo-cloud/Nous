-- FIX: Permission Denied for table users
-- This script fixes the RLS policies that were incorrectly querying auth.users directly.
-- Standard users do not have permissions to query the auth schema.
-- We use auth.jwt() ->> 'email' to get the current user's email safely.

-- 1. Drop existing problematic policies on project_invites
-- Dropping all potential variations to ensure a clean state
DROP POLICY IF EXISTS "View project invites" ON project_invites;
DROP POLICY IF EXISTS "Invited Users View Invites" ON project_invites;
DROP POLICY IF EXISTS "Invited Users Decline Invites" ON project_invites;
DROP POLICY IF EXISTS "Admins View Invites" ON project_invites;
DROP POLICY IF EXISTS "Admins Insert Invites" ON project_invites;
DROP POLICY IF EXISTS "Admins Delete Invites" ON project_invites;
DROP POLICY IF EXISTS "Insert project invites" ON project_invites;
DROP POLICY IF EXISTS "Delete project invites" ON project_invites;

-- 2. Create new secure and efficient policies for project_invites
-- Use (auth.jwt() ->> 'email')::text for comparison

-- Policy: View invites
CREATE POLICY "View project invites" ON project_invites
  FOR SELECT USING (
    -- User sent the invite
    auth.uid() = invited_by OR 
    -- User is the one invited (compare email from JWT)
    email = (auth.jwt() ->> 'email')::text OR
    -- User is project owner
    EXISTS (SELECT 1 FROM projects WHERE id = project_invites.project_id AND owner_id = auth.uid()) OR
    -- User is project admin
    EXISTS (SELECT 1 FROM project_members WHERE project_id = project_invites.project_id AND user_id = auth.uid() AND role = 'admin')
  );

-- Policy: Insert invites
CREATE POLICY "Insert project invites" ON project_invites
  FOR INSERT WITH CHECK (
    -- Only owners and admins can invite
    EXISTS (SELECT 1 FROM projects WHERE id = project_invites.project_id AND owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM project_members WHERE project_id = project_invites.project_id AND user_id = auth.uid() AND role = 'admin')
  );

-- Policy: Delete invites (Cancel or Decline)
CREATE POLICY "Delete project invites" ON project_invites
  FOR DELETE USING (
    -- Invited user can decline
    email = (auth.jwt() ->> 'email')::text OR
    -- Owner/Admin can cancel
    EXISTS (SELECT 1 FROM projects WHERE id = project_invites.project_id AND owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM project_members WHERE project_id = project_invites.project_id AND user_id = auth.uid() AND role = 'admin')
  );

-- 3. Ensure profiles table and basic RLS (just in case messaging wasn't fully set up)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." 
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 4. Secure RPC for members (already exists but ensuring it works with profiles if possible)
-- Re-defining it to use public.profiles instead of auth.users for extra safety if needed,
-- but since it's already SECURITY DEFINER, auth.users is fine.
-- Let's keep it as is if it's working, or optimize it.
CREATE OR REPLACE FUNCTION get_project_members(p_project_id BIGINT)
RETURNS TABLE (
    id BIGINT,
    project_id BIGINT,
    user_id UUID,
    role TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    email TEXT
) SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.id,
        pm.project_id,
        pm.user_id,
        pm.role,
        pm.status,
        pm.created_at,
        COALESCE(p.email, u.email)::TEXT
    FROM 
        project_members pm
    LEFT JOIN 
        public.profiles p ON pm.user_id = p.id
    LEFT JOIN
        auth.users u ON pm.user_id = u.id
    WHERE 
        pm.project_id = p_project_id;
END;
$$;
