-- Add color column if not exists
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#06b6d4';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
