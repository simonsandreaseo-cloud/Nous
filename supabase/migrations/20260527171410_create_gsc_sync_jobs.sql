-- Migration: Create gsc_sync_jobs table to track GSC URL sync progress

CREATE TABLE IF NOT EXISTS public.gsc_sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'fetching_urls', 'processing', 'completed', 'error')),
    total_urls INTEGER DEFAULT 0,
    processed_urls INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.gsc_sync_jobs ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view their project's sync jobs"
    ON public.gsc_sync_jobs FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
        OR
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.team_members tm ON tm.team_id = p.team_id
            WHERE tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert jobs for their projects"
    ON public.gsc_sync_jobs FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
        OR
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.team_members tm ON tm.team_id = p.team_id
            WHERE tm.user_id = auth.uid()
        )
    );

-- Habilitar Supabase Realtime para la tabla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'gsc_sync_jobs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.gsc_sync_jobs;
    END IF;
END $$;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_gsc_sync_jobs_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gsc_sync_jobs_modtime
    BEFORE UPDATE ON public.gsc_sync_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_gsc_sync_jobs_updated_at();

NOTIFY pgrst, 'reload schema';
