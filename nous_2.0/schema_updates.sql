-- 1. Añadir columnas de métricas GA4 a project_urls
ALTER TABLE public.project_urls 
ADD COLUMN IF NOT EXISTS avg_session_duration numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS bounce_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS top_sources jsonb DEFAULT '[]'::jsonb;

-- 2. Crear tabla project_kws para el desglose de Keywords
CREATE TABLE IF NOT EXISTS public.project_kws (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    url_id uuid REFERENCES public.project_urls(id) ON DELETE CASCADE,
    keyword text NOT NULL,
    impressions bigint DEFAULT 0,
    clicks bigint DEFAULT 0,
    ctr numeric DEFAULT 0,
    position numeric DEFAULT 0,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(project_id, keyword, url_id)
);

-- 3. Índices para project_kws
CREATE INDEX IF NOT EXISTS idx_project_kws_project ON public.project_kws(project_id);
CREATE INDEX IF NOT EXISTS idx_project_kws_keyword ON public.project_kws(keyword);

-- 4. Permisos
GRANT ALL ON public.project_kws TO postgres;
GRANT ALL ON public.project_kws TO service_role;
GRANT ALL ON public.project_kws TO authenticated;

-- 5. Actualizar tabla contents con nuevas columnas
ALTER TABLE public.contents 
ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS target_keyword text,
ADD COLUMN IF NOT EXISTS seo_data jsonb DEFAULT '{}'::jsonb;

-- 6. Recargar el cache del esquema (Supabase/PostgREST)
NOTIFY pgrst, 'reload schema';
