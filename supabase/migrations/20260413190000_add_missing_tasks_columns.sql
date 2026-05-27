-- Add missing columns to tasks table that the frontend is expecting

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS target_word_count integer,
ADD COLUMN IF NOT EXISTS word_count_real integer,
ADD COLUMN IF NOT EXISTS lsi_keywords text[],
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS seo_title text,
ADD COLUMN IF NOT EXISTS meta_description text,
ADD COLUMN IF NOT EXISTS h1 text,
ADD COLUMN IF NOT EXISTS excerpt text,
ADD COLUMN IF NOT EXISTS schemas jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS language text,
ADD COLUMN IF NOT EXISTS translation_parent_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS researcher_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS writer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS corrector_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
