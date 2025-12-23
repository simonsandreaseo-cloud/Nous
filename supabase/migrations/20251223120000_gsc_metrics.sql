
-- Create table for storing daily GSC metrics per project
create table if not exists public.gsc_daily_metrics (
  id uuid default gen_random_uuid() primary key,
  project_id bigint references public.projects(id) on delete cascade not null,
  date date not null,
  clicks integer default 0,
  impressions integer default 0,
  ctr float default 0,
  position float default 0,
  top_queries jsonb default '[]'::jsonb, -- Stores top performing queries for the day
  top_pages jsonb default '[]'::jsonb,   -- Stores top performing pages for the day
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id, date)
);

-- Index for fast range queries
create index if not exists idx_gsc_daily_metrics_project_date on public.gsc_daily_metrics(project_id, date);

-- Enable RLS
alter table public.gsc_daily_metrics enable row level security;

-- Policies
create policy "Users can view gsc metrics"
  on public.gsc_daily_metrics for select
  using ( auth.uid() in (
    select user_id from public.project_members where project_id = gsc_daily_metrics.project_id
  ));

create policy "Users can insert gsc metrics"
  on public.gsc_daily_metrics for insert
  with check ( auth.uid() in (
    select user_id from public.project_members where project_id = gsc_daily_metrics.project_id
  ));

create policy "Users can update gsc metrics"
  on public.gsc_daily_metrics for update
  using ( auth.uid() in (
    select user_id from public.project_members where project_id = gsc_daily_metrics.project_id
  ));
