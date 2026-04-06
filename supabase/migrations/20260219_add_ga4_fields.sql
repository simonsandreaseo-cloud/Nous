
-- Migration to add GA4 fields to projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS ga4_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ga4_property_id TEXT;
