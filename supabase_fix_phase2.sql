
-- 1. Policy to allow project owners to delete their projects
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = owner_id);

-- 2. Secure RPC to fetch project members with emails
-- This bypasses the direct auth.users restriction by running as security definer
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
SET search_path = public
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
        u.email::TEXT
    FROM 
        project_members pm
    JOIN 
        auth.users u ON pm.user_id = u.id
    WHERE 
        pm.project_id = p_project_id;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_project_members(BIGINT) TO authenticated;

-- 3. Ensure projects update policy allows returning the updated row correctly
-- The current policy is: auth.uid() = owner_id or admin member.
-- If the user is owner, they should definitely be able to update.
-- The error "No se pudo actualizar el proyecto" in my previous implementation
-- suggests that either the update failed or the .select() returned empty.
-- Ensuring UPDATE policy is solid.

DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (
    auth.uid() = owner_id OR
    EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.uid() = owner_id OR
    EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid() AND role = 'admin')
  );
