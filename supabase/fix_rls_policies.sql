-- FIX: Missing UPDATE and DELETE policies for 'projects'
-- This was preventing GSC property selection from being saved 
-- and preventing project deletion.

-- 1. Policies for 'projects'
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update their own projects" 
ON public.projects FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
CREATE POLICY "Users can delete their own projects" 
ON public.projects FOR DELETE 
USING (auth.uid() = user_id);

-- 2. Policies for 'user_gsc_tokens' (Security Check)
DROP POLICY IF EXISTS "Users can manage their own gsc tokens" ON public.user_gsc_tokens;
CREATE POLICY "Users can manage their own gsc tokens" 
ON public.user_gsc_tokens FOR ALL 
USING (auth.uid() = user_id);

-- 3. Ensure 'seo_reports' has policies
ALTER TABLE public.seo_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own reports" ON public.seo_reports;
CREATE POLICY "Users can manage their own reports" 
ON public.seo_reports FOR ALL 
USING (auth.uid() = user_id);

-- 4. Double check all cascades (Extra safety)
ALTER TABLE IF EXISTS public.content_tasks 
DROP CONSTRAINT IF EXISTS content_tasks_project_id_fkey,
ADD CONSTRAINT content_tasks_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.seo_reports 
DROP CONSTRAINT IF EXISTS seo_reports_project_id_fkey,
ADD CONSTRAINT seo_reports_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
