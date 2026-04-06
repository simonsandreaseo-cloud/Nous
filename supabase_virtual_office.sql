-- Virtual Office Tables
-- RUN THIS SCRIPT TO SETUP THE DATABASE

-- Cleanup (to handle re-runs)
DROP TABLE IF EXISTS public.office_states;
-- Only drop avatars if you want to lose user configs, otherwise keep it. 
-- But for schema updates, let's keep it safe? 
-- Actually, the error was in office_states. Avatars might be fine.
-- But if we want to ensure everything is correct:
-- DROP TABLE IF EXISTS public.avatars; 
-- (Commented out to prevent accidental data loss of avatars if re-run later. 
--  If this is the FIRST install that failed half-way, you might need to manually drop avatars or just uncomment this)

-- 1. Avatars Table
CREATE TABLE IF NOT EXISTS public.avatars (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    config JSONB DEFAULT '{"hair": 0, "color": "#ffffff", "outfit": 0}'::JSONB,
    last_position JSONB DEFAULT '{"x": 10, "y": 10}'::JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for Avatars
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

-- Policies (Drop first to avoid duplication errors if table existed)
DROP POLICY IF EXISTS "Users can view all avatars" ON public.avatars;
DROP POLICY IF EXISTS "Users can update their own avatar" ON public.avatars;
DROP POLICY IF EXISTS "Users can insert their own avatar" ON public.avatars;

CREATE POLICY "Users can view all avatars" 
    ON public.avatars FOR SELECT 
    USING (true);

CREATE POLICY "Users can update their own avatar" 
    ON public.avatars FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own avatar" 
    ON public.avatars FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 2. Office States Table
-- Stores persistent state for the office (Layouts, Whiteboard snapshots).
CREATE TABLE IF NOT EXISTS public.office_states (
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE PRIMARY KEY,
    layout_id TEXT DEFAULT 'preset-small', -- e.g. 'preset-small', 'preset-medium'
    whiteboard_data JSONB, -- Snapshot of Tldraw state
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for Office States
ALTER TABLE public.office_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project members can view office state" ON public.office_states;
DROP POLICY IF EXISTS "Project members can update office state" ON public.office_states;
DROP POLICY IF EXISTS "Project members can insert office state" ON public.office_states;

CREATE POLICY "Project members can view office state" 
    ON public.office_states FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_members.project_id = office_states.project_id 
            AND project_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Project members can update office state" 
    ON public.office_states FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_members.project_id = office_states.project_id 
            AND project_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Project members can insert office state" 
    ON public.office_states FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_members.project_id = office_states.project_id 
            AND project_members.user_id = auth.uid()
        )
    );
