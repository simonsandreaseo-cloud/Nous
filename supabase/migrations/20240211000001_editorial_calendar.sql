-- Create content_tasks table for editorial calendar
CREATE TABLE IF NOT EXISTS public.content_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    brief text,
    scheduled_date timestamp with time zone,
    status text CHECK (status IN ('todo', 'in_progress', 'review', 'done')) DEFAULT 'todo',
    content_type text DEFAULT 'blog',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create content_drafts table
CREATE TABLE IF NOT EXISTS public.content_drafts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    title text,
    html_content text,
    strategy_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create task_artifacts table for linking drafts to tasks
CREATE TABLE IF NOT EXISTS public.task_artifacts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid REFERENCES public.content_tasks(id) ON DELETE CASCADE NOT NULL,
    artifact_type text NOT NULL, -- 'draft', 'image', etc.
    artifact_reference uuid NOT NULL, -- ID of the drafted content
    name text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(task_id, artifact_type, artifact_reference)
);

-- Enable RLS
ALTER TABLE public.content_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_artifacts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage content_tasks of their projects" 
ON public.content_tasks FOR ALL 
USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
);

CREATE POLICY "Users can manage their own drafts" 
ON public.content_drafts FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage artifacts of their project tasks" 
ON public.task_artifacts FOR ALL 
USING (
    task_id IN (
        SELECT id FROM public.content_tasks WHERE project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    )
);
