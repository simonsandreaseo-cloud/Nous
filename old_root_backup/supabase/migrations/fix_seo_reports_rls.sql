-- Fix RLS policies for seo_reports directly
-- The previous migration missed the UPDATE policy for owners and public editors

-- 1. Policy: Users can update their own reports
drop policy if exists "Users can update own reports" on seo_reports;
create policy "Users can update own reports" on seo_reports
  for update using (auth.uid() = user_id);

-- 2. Policy: Public access (Edit) - allowing anyone with the link to edit if permission is 'edit'
-- Note: This might need careful consideration for security, but follows the pattern of content_drafts
drop policy if exists "Public edit shared reports" on seo_reports;
create policy "Public edit shared reports" on seo_reports
  for update using (public_access_level = 'edit');
