-- Create projects table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  domain text,
  budget_settings jsonb default '{"type": "count", "target": 10, "current": 0}'::jsonb,
  scraper_settings jsonb default '{"paths": ["/blog/"]}'::jsonb,
  gsc_connected boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create contents table
create table public.contents (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  status text check (status in ('idea', 'briefing', 'drafting', 'review', 'scheduled', 'published')) default 'idea',
  scheduled_date timestamp with time zone,
  content_body text,
  metrics jsonb default '{}'::jsonb, -- Store GSC metrics snapshot here
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.projects enable row level security;
alter table public.contents enable row level security;

-- Policies
create policy "Users can view their own projects" 
  on public.projects for select 
  using (auth.uid() = user_id);

create policy "Users can insert their own projects" 
  on public.projects for insert 
  with check (auth.uid() = user_id);

create policy "Users can update their own projects" 
  on public.projects for update 
  using (auth.uid() = user_id);

create policy "Users can delete their own projects" 
  on public.projects for delete 
  using (auth.uid() = user_id);

create policy "Users can manage contents of their projects" 
  on public.contents for all 
  using (
    project_id in (select id from public.projects where user_id = auth.uid())
  );
