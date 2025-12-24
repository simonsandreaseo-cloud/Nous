-- FIX: Project Visibility for Invited Members
-- Issue: Users who are invited and accept the invitation cannot see the project in the dashboard.
-- Cause: Circular dependency in RLS policies. The 'projects' table policy checks for membership in 'project_members',
--        but 'project_members' policy checks for access to the 'project'.
-- Solution: Add a specific policy to 'project_members' allowing users to ALWAYS view their own membership rows.
--           This breaks the recursion and allows the 'projects' policy to successfully validate membership.

-- 1. Add policy to allow users to see their own membership
DROP POLICY IF EXISTS "Users can view own project memberships" ON project_members;

CREATE POLICY "Users can view own project memberships" ON project_members
    FOR SELECT USING (user_id = auth.uid());

-- 2. Verify/Ensure 'projects' SELECT policy is correct (This is the existing one, just ensuring it's there/refreshed)
-- Note: We don't need to change it if it uses EXISTS(project_members where user_id = auth.uid())
-- But for completeness, we ensure the logic holds.

-- 3. Additional fix: Ensure 'get_project_members' logic is robust (already handled in previous scripts but good to have)
-- No changes needed there if the table access is fixed.

-- 4. Grant permissions just in case (usually handled by default, but ensuring reliability)
GRANT SELECT ON project_members TO authenticated;
