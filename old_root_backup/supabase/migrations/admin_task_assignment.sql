-- RPC for Admin/Owner to assign tasks to any member of the project
CREATE OR REPLACE FUNCTION admin_assign_task(
    task_id_param BIGINT,
    target_user_id UUID DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    task_project_id BIGINT;
    current_user_role TEXT;
    is_project_owner BOOLEAN;
BEGIN
    -- Get task's project
    SELECT project_id INTO task_project_id FROM tasks WHERE id = task_id_param;
    
    IF task_project_id IS NULL THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    -- Check if the current user is project owner
    SELECT (owner_id = auth.uid()) INTO is_project_owner
    FROM projects
    WHERE id = task_project_id;
    
    -- Check current user's role if not owner
    IF NOT COALESCE(is_project_owner, FALSE) THEN
        SELECT role INTO current_user_role
        FROM project_members
        WHERE project_id = task_project_id 
        AND user_id = auth.uid()
        AND status = 'active';
        
        IF current_user_role IS NULL OR current_user_role != 'admin' THEN
            RAISE EXCEPTION 'Only project owners and admins can assign tasks to others';
        END IF;
    END IF;
    
    -- If target_user_id is provided, verify they are a member of the project
    IF target_user_id IS NOT NULL THEN
        -- Check if target user is owner
        IF NOT EXISTS (SELECT 1 FROM projects WHERE id = task_project_id AND owner_id = target_user_id) THEN
            -- Check if target user is active member
            IF NOT EXISTS (SELECT 1 FROM project_members WHERE project_id = task_project_id AND user_id = target_user_id AND status = 'active') THEN
                RAISE EXCEPTION 'Target user must be a member of the project';
            END IF;
        END IF;
    END IF;
    
    -- Assign the task
    UPDATE tasks SET assignee_id = target_user_id WHERE id = task_id_param;
    
    RETURN task_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
