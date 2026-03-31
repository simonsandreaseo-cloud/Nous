-- Migration to create the content_research table for persistence of deep competitor data
-- Date: 2026-03-30

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.content_research (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    serp_data JSONB DEFAULT '{}'::jsonb,
    competitors_data JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(content_id)
);

-- 2. Indexing
CREATE INDEX IF NOT EXISTS idx_content_research_content_id ON public.content_research(content_id);

-- 3. Enable RLS
ALTER TABLE public.content_research ENABLE ROW LEVEL SECURITY;

-- 4. Policy (Linked to content owner via project)
CREATE POLICY "Users can manage research for their contents"
ON public.content_research FOR ALL
TO authenticated
USING (
    content_id IN (
        SELECT id FROM public.contents 
        WHERE project_id IN (
            SELECT id FROM public.projects 
            WHERE user_id = auth.uid()
            OR team_id IN (
                SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
            )
        )
    )
);

-- 5. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
