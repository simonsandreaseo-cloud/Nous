-- Grant permissions to anon and authenticated roles to allow public editing if RLS permits it
GRANT SELECT, UPDATE ON TABLE seo_reports TO anon;
GRANT SELECT, UPDATE ON TABLE seo_reports TO authenticated;

-- Ensure RLS is enforced
ALTER TABLE seo_reports ENABLE ROW LEVEL SECURITY;

-- Re-verify the RLS policy for public editing (just in case)
-- This was likely added in previous migrations, but we ensure it covers the UPDATE case properly
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'seo_reports' AND policyname = 'Public edit shared reports'
    ) THEN
        CREATE POLICY "Public edit shared reports" ON seo_reports
        FOR UPDATE
        USING (public_access_level = 'edit');
    END IF;
END $$;
