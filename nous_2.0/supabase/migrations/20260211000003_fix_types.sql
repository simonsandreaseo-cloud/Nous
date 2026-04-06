-- NUCLEAR FIX for Type Mismatch (BigInt vs UUID)
-- The error confirms that 'projects.id' is likely BIGINT (from legacy schema), 
-- but Nous 2.0 requires it to be UUID.
-- This script will:
-- 1. Rename existing incompatible tables to *_backup
-- 2. Create correct tables with UUIDs
-- 3. Apply all new features

BEGIN;

-- 1. Backup and Move Aside Incompatible Tables
DO $$ BEGIN
    -- Check if projects exists and is BigInt
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'id' AND data_type = 'bigint'
    ) THEN
        RAISE NOTICE 'Backing up BigInt projects table...';
        ALTER TABLE IF EXISTS public.task_artifacts RENAME TO task_artifacts_legacy;
        ALTER TABLE IF EXISTS public.content_tasks RENAME TO content_tasks_legacy;
        ALTER TABLE IF EXISTS public.contents RENAME TO contents_legacy;
        ALTER TABLE IF EXISTS public.project_members RENAME TO project_members_legacy;
        ALTER TABLE IF EXISTS public.projects RENAME TO projects_legacy;
    END IF;
END $$;

-- 2. Create CORRECT Base Schema (UUIDs)
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  domain text,
  budget_settings jsonb default '{"type": "count", "target": 10, "current": 0}'::jsonb,
  scraper_settings jsonb default '{"paths": ["/blog/"]}'::jsonb,
  gsc_connected boolean default false,
  settings jsonb default '{}'::jsonb,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.contents (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  status text check (status in ('idea', 'briefing', 'drafting', 'review', 'scheduled', 'published')) default 'idea',
  scheduled_date timestamp with time zone,
  content_body text,
  metrics jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Editorial Schema
CREATE TABLE IF NOT EXISTS public.content_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    brief text,
    scheduled_date timestamp with time zone,
    status text CHECK (status IN ('todo', 'in_progress', 'review', 'done')) DEFAULT 'todo',
    content_type text DEFAULT 'blog',
    priority text check (priority in ('low', 'medium', 'high', 'critical')) default 'medium',
    target_keyword text,
    target_url_slug text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.content_drafts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    title text,
    html_content text,
    strategy_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.task_artifacts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid REFERENCES public.content_tasks(id) ON DELETE CASCADE NOT NULL,
    artifact_type text NOT NULL,
    artifact_reference uuid NOT NULL,
    name text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Legacy Integration Schema
create table if not exists public.gsc_daily_metrics (
    id uuid default gen_random_uuid() primary key,
    project_id uuid references public.projects(id) on delete cascade not null,
    date date not null,
    clicks integer default 0,
    impressions integer default 0,
    ctr double precision default 0,
    position double precision default 0,
    top_queries jsonb default '[]'::jsonb,
    top_pages jsonb default '[]'::jsonb,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    unique(project_id, date)
);

create table if not exists public.project_members (
    id uuid default gen_random_uuid() primary key,
    project_id uuid references public.projects(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    role text check (role in ('owner', 'admin', 'editor', 'viewer')) default 'editor',
    created_at timestamp with time zone default now() not null,
    unique(project_id, user_id)
);

create table if not exists public.project_invites (
    id uuid default gen_random_uuid() primary key,
    project_id uuid references public.projects(id) on delete cascade not null,
    email text not null,
    role text default 'editor',
    token uuid default gen_random_uuid(),
    invited_by uuid references auth.users(id),
    created_at timestamp with time zone default now() not null,
    expires_at timestamp with time zone default (now() + interval '7 days') not null,
    unique(project_id, email)
);

create table if not exists public.time_sessions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    project_id uuid references public.projects(id) on delete cascade,
    started_at timestamp with time zone default now() not null,
    ended_at timestamp with time zone,
    created_at timestamp with time zone default now() not null
);

create table if not exists public.activity_logs (
    id uuid default gen_random_uuid() primary key,
    session_id uuid references public.time_sessions(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    window_title text,
    app_name text,
    url text,
    activity_percentage integer,
    screenshot_path text,
    created_at timestamp with time zone default now() not null
);

-- 5. Enable RLS
alter table public.projects enable row level security;
alter table public.contents enable row level security;
alter table public.content_tasks enable row level security;
alter table public.content_drafts enable row level security;
alter table public.task_artifacts enable row level security;
alter table public.gsc_daily_metrics enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;
alter table public.time_sessions enable row level security;
alter table public.activity_logs enable row level security;

-- 6. Apply Essential Policies
do $$ begin
    -- Projects
    if not exists (select 1 from pg_policies where policyname = 'Users can view their own projects') then
        create policy "Users can view their own projects" on public.projects for select using (auth.uid() = user_id);
        create policy "Users can insert their own projects" on public.projects for insert with check (auth.uid() = user_id);
    end if;

    -- Contents
    if not exists (select 1 from pg_policies where policyname = 'Users can manage contents of their projects') then
        create policy "Users can manage contents of their projects" on public.contents for all using (project_id in (select id from public.projects where user_id = auth.uid()));
    end if;

    -- Tasks
    if not exists (select 1 from pg_policies where policyname = 'Users can manage content_tasks of their projects') then
        create policy "Users can manage content_tasks of their projects" on public.content_tasks for all using (project_id in (select id from public.projects where user_id = auth.uid()));
    end if;
end $$;

COMMIT;
