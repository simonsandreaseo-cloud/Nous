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
-- Indexes for performance
CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_task_id ON public.time_entries(task_id);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Policies for time_entries
CREATE POLICY "Users can manage their own time entries" 
ON public.time_entries FOR ALL 
USING (auth.uid() = user_id);
