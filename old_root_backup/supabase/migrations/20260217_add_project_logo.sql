-- Add logo_url column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Ensure storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO NOTHING;
