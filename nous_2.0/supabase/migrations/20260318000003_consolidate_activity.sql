BEGIN;

-- Mega-Implementation Phase 2: Consolidate Activity Logs
-- 1. Add activity_events array to time_sessions
ALTER TABLE public.time_sessions 
ADD COLUMN IF NOT EXISTS activity_events jsonb DEFAULT '[]'::jsonb;

-- 2. Migrate existing activity_logs into time_sessions as JSONB array
UPDATE public.time_sessions ts
SET activity_events = (
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', al.id,
            'started_at', al.started_at,
            'ended_at', al.ended_at,
            'activity_percentage', al.activity_percentage,
            'keyboard_events', al.keyboard_events,
            'mouse_events', al.mouse_events,
            'window_title', al.window_title,
            'app_name', al.app_name,
            'url', al.url,
            'is_manual', al.is_manual,
            'created_at', al.created_at
        ) ORDER BY al.started_at ASC
    ), '[]'::jsonb)
    FROM public.activity_logs al
    WHERE al.session_id = ts.id
)
WHERE EXISTS (
    SELECT 1 FROM public.activity_logs al WHERE al.session_id = ts.id
);

-- 3. Drop activity_logs
DROP TABLE IF EXISTS public.activity_logs CASCADE;

COMMIT;
