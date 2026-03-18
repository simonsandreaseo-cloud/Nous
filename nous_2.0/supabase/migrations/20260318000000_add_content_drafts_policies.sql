-- Add missing RLS policies for content_drafts

BEGIN;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own content drafts') THEN
        CREATE POLICY "Users can view their own content drafts" ON public.content_drafts 
        FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own content drafts') THEN
        CREATE POLICY "Users can insert their own content drafts" ON public.content_drafts 
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own content drafts') THEN
        CREATE POLICY "Users can update their own content drafts" ON public.content_drafts 
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own content drafts') THEN
        CREATE POLICY "Users can delete their own content drafts" ON public.content_drafts 
        FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

COMMIT;
