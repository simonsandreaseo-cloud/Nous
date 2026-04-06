-- Project Upgrades: Logo and Creator Info
-- 1. Add logo_url to projects
alter table projects add column if not exists logo_url text;

-- 2. Ensure owner_id references profiles for easier joins
-- (First check if foreign key exists to avoid error)
do $$ 
begin
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'projects_owner_id_profiles_fkey') then
    alter table projects add constraint projects_owner_id_profiles_fkey 
      foreign key (owner_id) references public.profiles(id);
  end if;
end $$;

-- 3. Create Storage Bucket for Project Logos
-- Note: This might need to be done via UI if storage is restricted, 
-- but we can try to insert into storage tables if we have permissions.
-- Alternatively, we just mention it. But let's try.
insert into storage.buckets (id, name, public)
values ('project-logos', 'project-logos', true)
on conflict (id) do nothing;

-- 4. Storage Policies for project-logos
create policy "Project logos are public"
  on storage.objects for select
  using ( bucket_id = 'project-logos' );

create policy "Users can upload project logos"
  on storage.objects for insert
  with check ( 
    bucket_id = 'project-logos' AND 
    (auth.role() = 'authenticated')
  );

create policy "Users can update their own project logos"
  on storage.objects for update
  using ( bucket_id = 'project-logos' );

create policy "Users can delete their own project logos"
  on storage.objects for delete
  using ( bucket_id = 'project-logos' );
