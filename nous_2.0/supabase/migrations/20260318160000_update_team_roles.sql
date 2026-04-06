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
