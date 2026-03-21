-- Migration to ensure all project fields required for the new flow exist
-- This also fixes the "Could not find column logo_url" error by refreshing the schema cache

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS gsc_site_url TEXT,
ADD COLUMN IF NOT EXISTS gsc_account_email TEXT,
ADD COLUMN IF NOT EXISTS ga4_property_id TEXT,
ADD COLUMN IF NOT EXISTS ga4_account_email TEXT,
ADD COLUMN IF NOT EXISTS wp_url TEXT,
ADD COLUMN IF NOT EXISTS wp_token TEXT,
ADD COLUMN IF NOT EXISTS target_country TEXT DEFAULT 'ES',
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#06b6d4';

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
