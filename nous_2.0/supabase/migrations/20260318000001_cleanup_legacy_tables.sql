BEGIN;

-- Mega-Implementation Phase 1: Database Cleanup
-- Drops 10 legacy tables identified as obsolete during the code audit.

DROP TABLE IF EXISTS public.user_connections CASCADE;
DROP TABLE IF EXISTS public.task_artifacts_legacy CASCADE;
DROP TABLE IF EXISTS public.projects_legacy CASCADE;
DROP TABLE IF EXISTS public.project_members_legacy CASCADE;
DROP TABLE IF EXISTS public.sitemap_urls CASCADE;
DROP TABLE IF EXISTS public.office_states CASCADE;
DROP TABLE IF EXISTS public.blog_viz_projects CASCADE;
DROP TABLE IF EXISTS public.ga4_daily_metrics CASCADE;
DROP TABLE IF EXISTS public.content_history CASCADE;
DROP TABLE IF EXISTS public.avatars CASCADE;

COMMIT;
