-- Add project_id column to seo_reports table if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'seo_reports' and column_name = 'project_id') then
    alter table seo_reports add column project_id bigint references projects(id);
  end if;
end $$;
