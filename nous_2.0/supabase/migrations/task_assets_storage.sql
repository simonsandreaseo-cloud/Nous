-- =============================================================
-- NOUS 2.0 — Supabase Storage Setup for Task Assets (Images)
-- Run this in your Supabase SQL Editor
-- =============================================================

-- 1. Create the storage bucket (if not already done via the dashboard)
-- NOTE: You can also create this from Supabase Dashboard > Storage > New Bucket
-- Name: task-assets | Public: YES (for public image URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'task-assets',
    'task-assets',
    true,                        -- Public so images are accessible without auth token
    5242880,                     -- 5MB limit in bytes (5 * 1024 * 1024)
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/avif'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif'];

-- =============================================================
-- 2. Row Level Security (RLS) Policies for task-assets bucket
-- =============================================================

-- Allow any authenticated user to READ public objects
CREATE POLICY "Public read access for task-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-assets');

-- Allow authenticated users to UPLOAD only to their own user folder
-- Path pattern: <user_id>/<task_id>/<filename>
CREATE POLICY "Authenticated users can upload their own assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'task-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to DELETE only their own files
CREATE POLICY "Authenticated users can delete their own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'task-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to UPDATE only their own files
CREATE POLICY "Authenticated users can update their own assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'task-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- =============================================================
-- 3. (Optional) Task Attachments metadata table
--    Useful if you want to query attachments independently
--    instead of storing them in tasks.attachments JSONB field
-- =============================================================

-- CREATE TABLE IF NOT EXISTS task_attachments (
--     id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--     task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
--     storage_path TEXT NOT NULL,           -- path in task-assets bucket
--     public_url  TEXT NOT NULL,
--     file_name   TEXT NOT NULL,
--     file_size   INTEGER NOT NULL,         -- bytes
--     mime_type   TEXT NOT NULL,
--     alt_text    TEXT,
--     created_by  UUID REFERENCES auth.users(id),
--     created_at  TIMESTAMPTZ DEFAULT NOW()
-- );

-- ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can see attachments of their project tasks"
-- ON task_attachments FOR SELECT
-- TO authenticated
-- USING (
--     task_id IN (
--         SELECT id FROM tasks
--         WHERE project_id IN (
--             SELECT id FROM projects WHERE user_id = auth.uid()
--         )
--     )
-- );
