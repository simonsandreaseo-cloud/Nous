-- Create time_entries table
CREATE TABLE IF NOT EXISTS public.time_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id uuid REFERENCES public.content_tasks(id) ON DELETE SET NULL, -- Can track time without a specific task if needed
    start_time timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    end_time timestamp with time zone,
    description text,
    is_manual boolean DEFAULT false, -- differentiates manual entries from auto-tracked
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create activity_logs table for desktop app tracking
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_id uuid REFERENCES public.time_entries(id) ON DELETE CASCADE NOT NULL,
    screenshot_url text, -- Supabase Storage URL
    activity_level integer CHECK (activity_level >= 0 AND activity_level <= 100), -- 0-100%
    keyboard_events integer DEFAULT 0,
    mouse_events integer DEFAULT 0,
    captured_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies for time_entries
CREATE POLICY "Users can manage their own time entries" 
ON public.time_entries FOR ALL 
USING (auth.uid() = user_id);

-- Policies for activity_logs
CREATE POLICY "Users can manage their own activity logs" 
ON public.activity_logs FOR ALL 
USING (
    entry_id IN (
        SELECT id FROM public.time_entries WHERE user_id = auth.uid()
    )
);

-- Indexes for performance
CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_task_id ON public.time_entries(task_id);
CREATE INDEX idx_activity_logs_entry_id ON public.activity_logs(entry_id);
