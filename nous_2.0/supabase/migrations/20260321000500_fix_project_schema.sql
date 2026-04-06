-- Migration to ensure all project fields required for the new flow exist
-- This also fixes the "Could not find column logo_url" error by refreshing the schema cache

-- 1. Update projects table
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

-- 2. Create user_gsc_tokens table for OAuth credentials
CREATE TABLE IF NOT EXISTS public.user_gsc_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, email)
);

-- Enable RLS for security
ALTER TABLE public.user_gsc_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own GSC tokens" 
ON public.user_gsc_tokens FOR ALL 
USING (auth.uid() = user_id);

-- 3. Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';

