
-- Add explicit columns for Editorial Calendar CSV fields
ALTER TABLE public.content_tasks
ADD COLUMN IF NOT EXISTS volume integer,
ADD COLUMN IF NOT EXISTS viability text, -- Maps to 'Viabilidad' (e.g. optimo, no vendemos marca)
ADD COLUMN IF NOT EXISTS refs text[], -- Maps to 'Referencias'. Stored as array of URLs.
ADD COLUMN IF NOT EXISTS word_count integer, -- Maps to 'Palabras'
ADD COLUMN IF NOT EXISTS ai_percentage integer, -- Maps to '% IA'. Stored as integer (e.g. 65)
ADD COLUMN IF NOT EXISTS docs_url text, -- Maps to 'Docs'
ADD COLUMN IF NOT EXISTS layout_status boolean DEFAULT false; -- Maps to 'Maquetado'

-- Update comments
COMMENT ON COLUMN public.content_tasks.volume IS 'Search Volume';
COMMENT ON COLUMN public.content_tasks.viability IS 'Viability/Feasibility (e.g. optimo, contenido duplicado)';
COMMENT ON COLUMN public.content_tasks.refs IS 'List of reference URLs';
COMMENT ON COLUMN public.content_tasks.ai_percentage IS 'Percentage of AI used (0-100)';
COMMENT ON COLUMN public.content_tasks.layout_status IS 'Whether the content has been laid out/formatted';
