-- 1. Create RPC for unique categories
DROP FUNCTION IF EXISTS public.get_unique_categories(UUID);

CREATE OR REPLACE FUNCTION public.get_unique_categories(p_project_id UUID)
RETURNS TABLE (category TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT pu.category
  FROM public.project_urls pu
  WHERE pu.project_id = p_project_id 
    AND pu.category IS NOT NULL 
    AND pu.category != '';
END;
$$;

-- 2. Create RPC for semantic inventory matches
DROP FUNCTION IF EXISTS public.get_semantic_inventory_matches_v3(UUID, TEXT, TEXT, INT);
-- Also try dropping any other signature if they exist just in case
DROP FUNCTION IF EXISTS public.get_semantic_inventory_matches_v3(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_semantic_inventory_matches_v3(
  p_project_id UUID,
  p_base_regex TEXT,
  p_ask_regex TEXT,
  p_limit INT DEFAULT 120
)
RETURNS TABLE (
  url TEXT,
  title TEXT,
  category TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pu.url,
    COALESCE(pu.top_query, split_part(pu.url, '/', -1), pu.url) AS title,
    pu.category
  FROM public.project_urls pu
  WHERE pu.project_id = p_project_id
    AND (
      (p_base_regex = '' AND p_ask_regex = '')
      OR
      (p_base_regex != '' AND (pu.url ~* p_base_regex OR pu.top_query ~* p_base_regex))
      OR
      (p_ask_regex != '' AND (pu.url ~* p_ask_regex OR pu.top_query ~* p_ask_regex))
    )
  ORDER BY 
    pu.clicks_30d DESC NULLS LAST, 
    pu.impressions_30d DESC NULLS LAST
  LIMIT p_limit;
END;
$$;
