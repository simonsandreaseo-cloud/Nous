-- Create bucket for screenshots
insert into storage.buckets (id, name, public)
values ('tracker_captures', 'tracker_captures', false)
on conflict (id) do nothing;

-- Time Sessions Table (Using bigint for project_id to match your projects table)
create table if not exists public.time_sessions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    project_id bigint references public.projects(id) on delete set null,
    started_at timestamptz default now() not null,
    ended_at timestamptz,
    device_info jsonb, -- To store OS, Hostname, etc.
    created_at timestamptz default now() not null
);

-- Activity Logs (10-minute blocks or similar events)
create table if not exists public.activity_logs (
    id uuid default gen_random_uuid() primary key,
    session_id uuid references public.time_sessions(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    started_at timestamptz default now() not null,
    ended_at timestamptz, -- Usually 10 mins after start
    activity_percentage int default 0, -- 0-100
    keyboard_events int default 0,
    mouse_events int default 0,
    window_title text,
    app_name text,
    url text,
    screenshot_path text, -- Path in storage bucket
    is_manual boolean default false, -- If added manually
    created_at timestamptz default now() not null
);

-- RLS Policies

-- Time Sessions: Users see their own
alter table public.time_sessions enable row level security;

create policy "Users can view their own sessions"
on public.time_sessions for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own sessions"
on public.time_sessions for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own sessions"
on public.time_sessions for update
to authenticated
using (auth.uid() = user_id);

-- Activity Logs: Users see their own
alter table public.activity_logs enable row level security;

create policy "Users can view their own logs"
on public.activity_logs for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own logs"
on public.activity_logs for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete their own logs"
on public.activity_logs for delete
to authenticated
using (auth.uid() = user_id);

-- Storage Policies
create policy "Users can upload their own screenshots"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'tracker_captures' and (storage.foldername(name))[1] = auth.uid()::text );

create policy "Users can view their own screenshots"
on storage.objects for select
to authenticated
using ( bucket_id = 'tracker_captures' and (storage.foldername(name))[1] = auth.uid()::text );
