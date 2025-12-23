-- Migration: Task Assignment System
-- Description: Adds functionality for users to claim/release tasks and articles
-- Date: 2025-12-23

-- ============================================================================
-- 1. Ensure assignee_id column exists (should already exist based on Task interface)
-- ============================================================================

-- Check if assignee_id exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'assignee_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
    END IF;
END $$;

-- ============================================================================
-- 2. Create RPC function to assign task to current user
-- ============================================================================

CREATE OR REPLACE FUNCTION assign_task_to_user(task_id_param UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_assignee UUID;
    result_task json;
BEGIN
    -- Get current user
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check if task exists and get current assignee
    SELECT assignee_id INTO current_assignee
    FROM tasks
    WHERE id = task_id_param;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    -- Check if task is already assigned to someone else
    IF current_assignee IS NOT NULL AND current_assignee != auth.uid() THEN
        RAISE EXCEPTION 'Task is already assigned to another user';
    END IF;

    -- Assign task to current user
    UPDATE tasks
    SET assignee_id = auth.uid()
    WHERE id = task_id_param
    RETURNING row_to_json(tasks.*) INTO result_task;

    RETURN result_task;
END;
$$;

-- ============================================================================
-- 3. Create RPC function to release task assignment
-- ============================================================================

CREATE OR REPLACE FUNCTION release_task_assignment(task_id_param UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_assignee UUID;
    result_task json;
BEGIN
    -- Get current user
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check if task exists and get current assignee
    SELECT assignee_id INTO current_assignee
    FROM tasks
    WHERE id = task_id_param;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    -- Only allow releasing if user is the assignee or project owner/admin
    IF current_assignee != auth.uid() THEN
        -- Check if user is project owner or admin
        IF NOT EXISTS (
            SELECT 1 FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = auth.uid()
            WHERE t.id = task_id_param
            AND (p.owner_id = auth.uid() OR pm.role IN ('admin', 'owner'))
        ) THEN
            RAISE EXCEPTION 'You can only release tasks assigned to you or if you are project admin';
        END IF;
    END IF;

    -- Release the task
    UPDATE tasks
    SET assignee_id = NULL
    WHERE id = task_id_param
    RETURNING row_to_json(tasks.*) INTO result_task;

    RETURN result_task;
END;
$$;

-- ============================================================================
-- 4. Add RLS policies for task assignment (if not already covered)
-- ============================================================================

-- Allow users to view assignee information
-- (This should already be covered by existing SELECT policies)

-- Allow users to update tasks they have access to
-- (This should already be covered by existing UPDATE policies)

-- Grant execute permissions on the new functions
GRANT EXECUTE ON FUNCTION assign_task_to_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION release_task_assignment(UUID) TO authenticated;

-- ============================================================================
-- 5. Add helpful comment
-- ============================================================================

COMMENT ON FUNCTION assign_task_to_user IS 'Assigns a task to the current user if it is not already assigned';
COMMENT ON FUNCTION release_task_assignment IS 'Releases a task assignment, making it available for others to claim';
