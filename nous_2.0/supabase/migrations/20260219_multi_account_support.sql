-- Refactor user_gsc_tokens to support multiple accounts
DO $$ 
BEGIN
    -- 1. Add email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_gsc_tokens' AND column_name = 'email') THEN
        ALTER TABLE user_gsc_tokens ADD COLUMN email text;
    END IF;

    -- 2. Add id column if it doesn't exist to be the new PK
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_gsc_tokens' AND column_name = 'id') THEN
        ALTER TABLE user_gsc_tokens ADD COLUMN id uuid DEFAULT gen_random_uuid();
    END IF;

    -- 3. Update existing records to have an email if possible (we won't know it yet, but we'll fill it on next login)
    -- For now, we'll keep them.

    -- 4. Change Primary Key
    -- First drop the old one (which was user_id)
    ALTER TABLE user_gsc_tokens DROP CONSTRAINT IF EXISTS user_gsc_tokens_pkey;
    -- Add the new PK on id
    ALTER TABLE user_gsc_tokens ADD PRIMARY KEY (id);
    
    -- 5. Add a unique constraint on (user_id, email)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_gsc_tokens_user_id_email_key') THEN
        ALTER TABLE user_gsc_tokens ADD CONSTRAINT user_gsc_tokens_user_id_email_key UNIQUE (user_id, email);
    END IF;

END $$;

-- Update projects to reference a specific account
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS gsc_account_id uuid;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ga4_account_id uuid;
