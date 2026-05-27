-- Add missing columns to projects that were skipped due to CREATE TABLE IF NOT EXISTS
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS description text;

NOTIFY pgrst, 'reload schema';
