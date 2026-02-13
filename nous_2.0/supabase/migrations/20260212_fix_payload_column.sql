-- Ensure seo_reports table exists
create table if not exists public.seo_reports (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null,
  project_id uuid null references projects (id) on delete cascade,
  user_id uuid not null,
  title text null,
  html_content text null,
  payload_json jsonb null,
  period_label text null,
  constraint seo_reports_pkey primary key (id)
);

-- Add column if it doesn't exist (idempotent)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'seo_reports' and column_name = 'payload_json') then
    alter table public.seo_reports add column payload_json jsonb null;
  end if;
end $$;
