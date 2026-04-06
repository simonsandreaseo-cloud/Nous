-- Fase 3: Segmentación y Contexto de Equipo

-- 1. Create Audio Pods Table
CREATE TABLE IF NOT EXISTS public.team_audio_pods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'public' CHECK (type IN ('public', 'private')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Add last_active_team to Profiles (for persistence)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- 3. Data Migration: Create default pods for existing teams
INSERT INTO public.team_audio_pods (team_id, name, type)
SELECT id, 'General Pod', 'public' FROM public.teams
WHERE NOT EXISTS (SELECT 1 FROM public.team_audio_pods WHERE team_id = teams.id);

-- 4. RLS for Audio Pods
ALTER TABLE public.team_audio_pods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pods of their teams" ON public.team_audio_pods
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_audio_pods.team_id AND user_id = auth.uid())
    );

CREATE POLICY "Managers and above can manage pods" ON public.team_audio_pods
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.team_members 
            WHERE team_id = team_audio_pods.team_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'partner', 'manager')
        )
    );

-- 5. Refresh schema cache
NOTIFY pgrst, 'reload schema';
