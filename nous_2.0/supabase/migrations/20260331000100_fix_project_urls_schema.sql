-- Migration to correct project_urls and drop invalid project_inventory table
-- This migration ensures project_urls has the same metrics project_inventory was supposed to have.

-- 1. Drop project_inventory if it was created by mistake
DROP TABLE IF EXISTS public.project_inventory CASCADE;

-- 2. Add full SEO Metric columns to project_urls
-- (Matching the names used in GscService.ts and services.ts)
ALTER TABLE public.project_urls 
ADD COLUMN IF NOT EXISTS impressions_gsc BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS organic_traffic_gsc BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS ctr_gsc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS position_gsc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT now();

-- 3. Add performance index for internal linking queries (prioritize authority pages)
CREATE INDEX IF NOT EXISTS idx_project_urls_impressions_gsc ON public.project_urls(project_id, impressions_gsc DESC);
CREATE INDEX IF NOT EXISTS idx_project_urls_url_normalized ON public.project_urls(project_id, (lower(url)));

-- 4. Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
