
-- Add gsc_settings column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS gsc_settings jsonb DEFAULT '{ "frequency_days": 2, "last_sync_at": null, "initial_sync_done": false }'::jsonb;

-- Optional: Initialize existing projects with GSC URL if they had one
-- (This is just to ensure existing data is treated as having a potential sync need)
UPDATE public.projects 
SET gsc_settings = jsonb_build_object(
    'frequency_days', 2,
    'last_sync_at', (SELECT max(updated_at) FROM public.gsc_daily_metrics WHERE project_id = projects.id),
    'initial_sync_done', EXISTS (SELECT 1 FROM public.gsc_daily_metrics WHERE project_id = projects.id)
)
WHERE gsc_property_url IS NOT NULL;
