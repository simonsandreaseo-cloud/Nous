-- Add missing columns to tasks that were skipped due to CREATE TABLE IF NOT EXISTS on content_tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS priority text check (priority in ('low', 'medium', 'high', 'critical')) default 'medium',
ADD COLUMN IF NOT EXISTS target_keyword text,
ADD COLUMN IF NOT EXISTS target_url_slug text,
ADD COLUMN IF NOT EXISTS metadata jsonb default '{}'::jsonb;

NOTIFY pgrst, 'reload schema';
