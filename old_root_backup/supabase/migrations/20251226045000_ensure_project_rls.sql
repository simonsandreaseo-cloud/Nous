-- Ensure Projects RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own projects
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view their own projects"
    ON public.projects
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own projects
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
CREATE POLICY "Users can create their own projects"
    ON public.projects
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own projects
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update their own projects"
    ON public.projects
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own projects
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
CREATE POLICY "Users can delete their own projects"
    ON public.projects
    FOR DELETE
    USING (auth.uid() = user_id);
