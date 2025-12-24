-- COMPREHENSIVE FIX: Project Access and Visibility
-- This script addresses multiple potential failure points: RLS recursion, case-sensitivity in emails, and profile checking.

-- 1. FIX: Project Members RLS (The Core Issue)
-- Allow users to see their own membership rows unconditionally.
DROP POLICY IF EXISTS "Users can view own project memberships" ON project_members;
CREATE POLICY "Users can view own project memberships" ON project_members
    FOR SELECT USING (user_id = auth.uid());

-- 2. FIX: Projects RLS
-- Ensure users can see project details if they are the owner OR they have a membership row.
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT USING (
        owner_id = auth.uid() 
        OR 
        EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid())
    );

-- 3. FIX: Invites Visibility (Case Insensitivity)
-- Ensure users can see their invites even if email capitalization differs slightly.
DROP POLICY IF EXISTS "View project invites" ON project_invites;
DROP POLICY IF EXISTS "Invited Users View Invites" ON project_invites;

CREATE POLICY "View project invites" ON project_invites
    FOR SELECT USING (
        invited_by = auth.uid() 
        OR 
        lower(email) = lower((auth.jwt() ->> 'email')::text)
    );

-- 4. FIX: Profiles Access (Prevent Join Errors)
-- If the dashboard tries to join 'profiles', ensure it's viewable.
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

-- 5. FUNCTION: Verify Invite Acceptance Logic
-- Ensure the acceptance function works correctly
CREATE OR REPLACE FUNCTION accept_project_invite(invite_id bigint)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  invite_record record;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Fetch invite
  SELECT * INTO invite_record FROM project_invites WHERE id = invite_id;
  
  IF invite_record IS NULL THEN
    RAISE EXCEPTION 'Invitación no encontrada';
  END IF;
  
  -- Verify email matches current user (Case Insensitive)
  IF lower(invite_record.email) != lower((SELECT email FROM auth.users WHERE id = current_user_id)) THEN
    RAISE EXCEPTION 'Esta invitación no te pertenece';
  END IF;
  
  -- Insert into members
  INSERT INTO project_members (project_id, user_id, role, status)
  VALUES (invite_record.project_id, current_user_id, invite_record.role, 'active')
  ON CONFLICT (project_id, user_id) DO UPDATE SET status = 'active', role = EXCLUDED.role;
  
  -- Delete invite
  DELETE FROM project_invites WHERE id = invite_id;
  
  RETURN true;
END;
$$;
