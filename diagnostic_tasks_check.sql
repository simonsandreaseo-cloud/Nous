-- Diagnostic Script: Check Tasks Table Schema and RLS Policies
-- Run this in your Supabase SQL Editor to verify everything is set up correctly

-- 1. Check if all required columns exist in tasks table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

-- 2. Check RLS policies on tasks table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'tasks';

-- 3. Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'tasks';

-- 4. Check if the user can see any tasks (run this while logged in)
SELECT 
    id,
    project_id,
    title,
    status,
    type,
    created_at
FROM tasks
LIMIT 5;

-- 5. Check project membership for current user
SELECT 
    pm.id,
    pm.project_id,
    pm.role,
    pm.status,
    p.name as project_name
FROM project_members pm
JOIN projects p ON p.id = pm.project_id
WHERE pm.user_id = auth.uid();

-- 6. Check projects owned by current user
SELECT 
    id,
    name,
    owner_id,
    created_at
FROM projects
WHERE owner_id = auth.uid();
