const fs = require('fs');

const sql = `
CREATE OR REPLACE FUNCTION public.get_semantic_inventory_matches_v2(p_project_id uuid, p_base_regex text, p_ask_regex text, p_limit integer DEFAULT 100)
RETURNS TABLE(url text, title text, impressions double precision, m_count integer, category text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_base_terms text[] := ARRAY[]::text[];
  v_ask_terms text[] := ARRAY[]::text[];
BEGIN
  IF p_base_regex IS NOT NULL AND p_base_regex != '' THEN
    SELECT array_agg(term) INTO v_base_terms FROM (
      SELECT trim(word) as term FROM regexp_split_to_table(p_base_regex, '\\|') as word WHERE length(trim(word)) > 0
    ) t;
  END IF;
  
  IF p_ask_regex IS NOT NULL AND p_ask_regex != '' THEN
    SELECT array_agg(term) INTO v_ask_terms FROM (
      SELECT trim(word) as term FROM regexp_split_to_table(p_ask_regex, '\\|') as word WHERE length(trim(word)) > 0
    ) t;
  END IF;

  RETURN QUERY
  SELECT 
    pu.url,
    COALESCE(pu.title, pu.url) as title,
    COALESCE(pu.impressions_gsc, 0)::float as impressions,
    (
      (SELECT COALESCE(sum(1), 0)::int FROM unnest(v_base_terms) as term WHERE pu.url ~* term OR COALESCE(pu.title, '') ~* term)
      +
      (SELECT COALESCE(sum(5), 0)::int FROM unnest(v_ask_terms) as term WHERE pu.url ~* term OR COALESCE(pu.title, '') ~* term)
    ) as m_count,
    pu.category
  FROM project_urls pu
  WHERE pu.project_id = p_project_id
    AND (
      (p_base_regex != '' AND (pu.url ~* p_base_regex OR COALESCE(pu.title, '') ~* p_base_regex))
      OR 
      (p_ask_regex != '' AND (pu.url ~* p_ask_regex OR COALESCE(pu.title, '') ~* p_ask_regex))
    )
  ORDER BY 4 DESC, pu.impressions_gsc DESC NULLS LAST
  LIMIT p_limit;
END;
$function$;
`;

async function run() {
  try {
    const response = await fetch('https://api.supabase.com/v1/projects/pugbtgqfxylmovcwvmbo/database/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer sbp_6d4e1d1d9112b9a362ae31e74dea999b3132f9ca`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (response.ok) {
      console.log("Migration executed successfully!");
    } else {
      const errorText = await response.text();
      console.error("Failed to execute migration:", response.status, errorText);
    }
  } catch (error) {
    console.error("Network error:", error);
  }
}

run();