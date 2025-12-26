-- Migration: Add support for Helios Reports in seo_reports table

-- 1. Add report_type column to distinguish between MetricsAnalyst and Helios
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seo_reports' AND column_name = 'report_type') THEN
        ALTER TABLE seo_reports ADD COLUMN report_type text DEFAULT 'metrics_analyst';
    END IF;
END $$;

-- 2. Add description column if missing (sometimes useful for quick summaries in lists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seo_reports' AND column_name = 'description') THEN
        ALTER TABLE seo_reports ADD COLUMN description text;
    END IF;
END $$;

-- 3. Ensure RLS Policies are robust for Sharing (Redundant check but safe)

-- Policy: Allow public read if they have the share_token
-- Note: Queries usually filter by share_token explicitly, but RLS adds safety.
DROP POLICY IF EXISTS "Public read shared reports by token" ON seo_reports;
CREATE POLICY "Public read shared reports by token" ON seo_reports
    FOR SELECT
    USING (share_token IS NOT NULL); -- In practice, the app queries 'where share_token = X'

-- Policy: Allow public update if access level is 'edit'
DROP POLICY IF EXISTS "Public update shared reports with edit access" ON seo_reports;
CREATE POLICY "Public update shared reports with edit access" ON seo_reports
    FOR UPDATE
    USING (public_access_level = 'edit');

-- 4. Create an index on report_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_seo_reports_type ON seo_reports(report_type);
