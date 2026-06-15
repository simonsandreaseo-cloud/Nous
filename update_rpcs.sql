-- 0. Helper function to extract category from URL
CREATE OR REPLACE FUNCTION public.extract_category_from_url(url TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN array_length(string_to_array(btrim(regexp_replace(url, '^https?://[^/]+', ''), '/'), '/'), 1) < 2 
      THEN 'Sin categorizar'
    ELSE (string_to_array(btrim(regexp_replace(url, '^https?://[^/]+', ''), '/'), '/'))[array_length(string_to_array(btrim(regexp_replace(url, '^https?://[^/]+', ''), '/'), '/'), 1) - 1]
  END;
$$;

-- 1. Modified get_unique_categories
CREATE OR REPLACE FUNCTION public.get_unique_categories(p_project_id UUID)
RETURNS TABLE (category TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH parsed AS (
    SELECT 
      pu.url,
      COALESCE(pu.category, public.extract_category_from_url(pu.url)) as computed_category
    FROM public.project_urls pu
    WHERE pu.project_id = p_project_id 
  )
  SELECT DISTINCT p.computed_category
  FROM parsed p
  WHERE p.computed_category IS NOT NULL 
    AND p.computed_category != '';
END;
$$;

-- 2. Modified get_semantic_inventory_matches_v3
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
    COALESCE(pu.category, public.extract_category_from_url(pu.url)) AS category
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
