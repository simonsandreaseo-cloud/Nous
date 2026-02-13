-- Emergency Fix for seo_reports table
-- Force creation of payload_json column if it doesn't exist
-- formatting:off

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'seo_reports' 
        AND column_name = 'payload_json'
    ) THEN
        ALTER TABLE public.seo_reports ADD COLUMN payload_json jsonb DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Verify other columns exist too
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seo_reports' AND column_name = 'html_content') THEN
        ALTER TABLE public.seo_reports ADD COLUMN html_content text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seo_reports' AND column_name = 'period_label') THEN
        ALTER TABLE public.seo_reports ADD COLUMN period_label text;
    END IF;
END $$;
