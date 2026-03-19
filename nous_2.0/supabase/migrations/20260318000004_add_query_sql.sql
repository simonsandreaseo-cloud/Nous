-- Function to execute query and return results as JSON
create or replace function query_sql(sql_query text)
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  execute 'select json_agg(t) from (' || sql_query || ') t' into result;
  return result;
end;
$$;
