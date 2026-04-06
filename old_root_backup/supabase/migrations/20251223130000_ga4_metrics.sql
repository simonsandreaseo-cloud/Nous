
-- Create table for storing daily GA4 metrics per project
create table if not exists public.ga4_daily_metrics (
  id uuid default gen_random_uuid() primary key,
  project_id bigint references public.projects(id) on delete cascade not null,
  date date not null,
  sessions integer default 0,
  active_users integer default 0,
  new_users integer default 0,
  bounce_rate float default 0, -- Stored as percentage or decimal (0.45 or 45) depending on input, usually decimal from API (0.45)
  avg_session_duration float default 0, -- In seconds
  ai_sessions integer default 0, -- Custom metric for sessions from AI sources
  top_sources jsonb default '[]'::jsonb, -- Stores top traffic sources
  top_pages jsonb default '[]'::jsonb,   -- Stores top performing pages with metrics
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id, date)
);

-- Index for fast range queries
create index if not exists idx_ga4_daily_metrics_project_date on public.ga4_daily_metrics(project_id, date);

-- Enable RLS
alter table public.ga4_daily_metrics enable row level security;

-- Policies
create policy "Users can view ga4 metrics"
  on public.ga4_daily_metrics for select
  using ( auth.uid() in (
    select user_id from public.project_members where project_id = ga4_daily_metrics.project_id
  ));

create policy "Users can insert ga4 metrics"
  on public.ga4_daily_metrics for insert
  with check ( auth.uid() in (
    select user_id from public.project_members where project_id = ga4_daily_metrics.project_id
  ));

create policy "Users can update ga4 metrics"
  on public.ga4_daily_metrics for update
  using ( auth.uid() in (
    select user_id from public.project_members where project_id = ga4_daily_metrics.project_id
  ));
