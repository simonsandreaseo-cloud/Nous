-- Enable execution of dynamic SQL from the client (Required for automated migrations)
create or replace function exec_sql(sql text)
returns void
language plpgsql
security definer
as $$
begin
  execute sql;
end;
$$;
