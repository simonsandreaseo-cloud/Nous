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
