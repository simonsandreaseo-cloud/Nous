-- Migration: Unify Google Connections and Projects for Multi-Account Support

-- 1. Create the unified connections table
CREATE TABLE IF NOT EXISTS public.user_google_connections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    account_name text,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamptz,
    scopes text[] DEFAULT '{}'::text[],
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, email)
);

-- 2. Add connection reference to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS google_connection_id uuid REFERENCES public.user_google_connections(id) ON DELETE SET NULL;

-- 3. Transition columns (Keep for backward compatibility but allow nulls)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS gsc_account_email text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ga4_account_email text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS gsc_site_url text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ga4_property_id text;

-- 4. RLS for user_google_connections
ALTER TABLE public.user_google_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own google connections"
    ON public.user_google_connections
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Permissions
GRANT ALL ON public.user_google_connections TO postgres;
GRANT ALL ON public.user_google_connections TO service_role;
GRANT ALL ON public.user_google_connections TO authenticated;

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_user_google_connections_updated_at ON public.user_google_connections;
CREATE TRIGGER tr_user_google_connections_updated_at
    BEFORE UPDATE ON public.user_google_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. Schema Cache Reload
NOTIFY pgrst, 'reload schema';
